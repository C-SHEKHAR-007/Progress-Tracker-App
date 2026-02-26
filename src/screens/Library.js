import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../context/ItemsContext';
import ItemCard from '../components/ItemCard';
import FilterChips from '../components/FilterChips';

export default function LibraryScreen({ navigation }) {
  const { items, collections, loading, fetchItems, deleteItem, deleteItems, moveItemsToCollection } = useItems();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    }

    switch (filter) {
      case 'video':
        result = result.filter(item => item.type === 'video');
        break;
      case 'pdf':
        result = result.filter(item => item.type === 'pdf');
        break;
      case 'completed':
        result = result.filter(item => item.is_completed);
        break;
      case 'in-progress':
        result = result.filter(item => item.progress > 0 && !item.is_completed);
        break;
    }

    return result;
  }, [items, searchQuery, filter]);

  const handleItemPress = (item) => {
    if (selectionMode) {
      toggleItemSelection(item.id);
    } else {
      navigation.navigate('Player', { item });
    }
  };

  const handleItemLongPress = (item) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedItems(new Set([item.id]));
    }
  };

  const toggleItemSelection = (id) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      // Exit selection mode if nothing selected
      if (newSet.size === 0) {
        setSelectionMode(false);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
      setSelectionMode(false);
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedItems(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedItems.size;
    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${count} item${count > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItems(Array.from(selectedItems));
              handleCancelSelection();
              Alert.alert('Deleted', `${count} item${count > 1 ? 's' : ''} deleted successfully`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete items');
            }
          },
        },
      ]
    );
  };

  const handleMoveSelected = () => {
    setShowMoveModal(true);
  };

  const handleMoveToCollection = async (collectionId) => {
    try {
      await moveItemsToCollection(Array.from(selectedItems), collectionId);
      setShowMoveModal(false);
      handleCancelSelection();
      const collectionName = collectionId 
        ? collections.find(c => c.id === collectionId)?.name || 'collection'
        : 'No Collection';
      Alert.alert('Moved', `Items moved to ${collectionName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to move items');
    }
  };

  const filterOptions = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'video', label: 'Videos', icon: 'videocam' },
    { key: 'pdf', label: 'PDFs', icon: 'document' },
    { key: 'completed', label: 'Done', icon: 'checkmark-circle' },
    { key: 'in-progress', label: 'In Progress', icon: 'play-circle' },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.itemWrapper}>
      {selectionMode && (
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleItemSelection(item.id)}
        >
          <View style={[
            styles.checkboxInner,
            selectedItems.has(item.id) && styles.checkboxChecked
          ]}>
            {selectedItems.has(item.id) && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      )}
      <View style={[styles.itemCardContainer, selectionMode && styles.itemCardWithCheckbox]}>
        <ItemCard
          item={item}
          onPress={() => handleItemPress(item)}
          onLongPress={() => handleItemLongPress(item)}
          showProgress
          compact={viewMode === 'grid'}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Selection Header */}
      {selectionMode ? (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={handleCancelSelection} style={styles.selectionButton}>
            <Ionicons name="close" size={24} color="#e2e8f0" />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>{selectedItems.size} selected</Text>
          <TouchableOpacity onPress={handleSelectAll} style={styles.selectionButton}>
            <Ionicons 
              name={selectedItems.size === filteredItems.length ? "checkbox" : "checkbox-outline"} 
              size={24} 
              color="#6366f1" 
            />
          </TouchableOpacity>
        </View>
      ) : (
        /* Search Bar */
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your library..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filter Chips */}
      <FilterChips
        options={filterOptions}
        selected={filter}
        onSelect={setFilter}
      />

      {/* View Toggle */}
      <View style={styles.headerRow}>
        <Text style={styles.resultCount}>
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        </Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={20}
              color={viewMode === 'list' ? '#6366f1' : '#64748b'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons
              name="grid"
              size={20}
              color={viewMode === 'grid' ? '#6366f1' : '#64748b'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchItems}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#64748b" />
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Add some files to get started'}
            </Text>
          </View>
        }
      />

      {/* Selection Action Bar */}
      {selectionMode && selectedItems.size > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionButton} onPress={handleMoveSelected}>
            <Ionicons name="folder-open-outline" size={22} color="#6366f1" />
            <Text style={styles.actionButtonText}>Move</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteSelected}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB - hide when in selection mode */}
      {!selectionMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddFiles')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Move to Collection Modal */}
      <Modal
        visible={showMoveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Move to Collection</Text>
              <TouchableOpacity onPress={() => setShowMoveModal(false)}>
                <Ionicons name="close" size={24} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.collectionList}>
              <TouchableOpacity
                style={styles.collectionOption}
                onPress={() => handleMoveToCollection(null)}
              >
                <View style={[styles.collectionIcon, { backgroundColor: '#64748b20' }]}>
                  <Ionicons name="folder-outline" size={20} color="#64748b" />
                </View>
                <Text style={styles.collectionName}>No Collection</Text>
              </TouchableOpacity>
              {collections.map(collection => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.collectionOption}
                  onPress={() => handleMoveToCollection(collection.id)}
                >
                  <View style={[styles.collectionIcon, { backgroundColor: collection.color + '20' }]}>
                    <Ionicons name={collection.icon || 'folder'} size={20} color={collection.color} />
                  </View>
                  <Text style={styles.collectionName}>{collection.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#13131a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  selectionButton: {
    padding: 4,
  },
  selectionCount: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131a',
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultCount: {
    color: '#64748b',
    fontSize: 14,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#13131a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  viewButton: {
    padding: 8,
  },
  viewButtonActive: {
    backgroundColor: '#1e1e2e',
    borderRadius: 6,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    marginRight: 8,
    marginBottom: 10,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  itemCardContainer: {
    flex: 1,
  },
  itemCardWithCheckbox: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#13131a',
    borderTopWidth: 1,
    borderTopColor: '#1e1e2e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef444420',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#13131a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  modalTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
  },
  collectionList: {
    padding: 16,
    paddingBottom: 40,
  },
  collectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    marginBottom: 10,
  },
  collectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collectionName: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '500',
  },
});
