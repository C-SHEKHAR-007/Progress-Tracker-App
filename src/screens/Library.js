import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../context/ItemsContext';
import ItemCard from '../components/ItemCard';

const { width } = Dimensions.get('window');

export default function LibraryScreen({ navigation }) {
  const { items, collections, loading, fetchItems, deleteItem, deleteItems, moveItemsToCollection } = useItems();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  
  // Animations
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const selectionBarAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const searchFocused = useRef(new Animated.Value(0)).current;

  // Get stats for the header
  const stats = useMemo(() => {
    const total = items.length;
    const videos = items.filter(i => i.type === 'video').length;
    const pdfs = items.filter(i => i.type === 'pdf').length;
    const completed = items.filter(i => i.is_completed).length;
    return { total, videos, pdfs, completed };
  }, [items]);

  // Animate selection bar
  useEffect(() => {
    Animated.spring(selectionBarAnim, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
    
    Animated.spring(fabScale, {
      toValue: selectionMode ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [selectionMode]);

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
    { key: 'all', label: 'All', icon: 'apps', count: stats.total },
    { key: 'video', label: 'Videos', icon: 'videocam', count: stats.videos, color: '#6366f1' },
    { key: 'pdf', label: 'PDFs', icon: 'document', count: stats.pdfs, color: '#f59e0b' },
    { key: 'completed', label: 'Done', icon: 'checkmark-circle', count: stats.completed, color: '#10b981' },
    { key: 'in-progress', label: 'Active', icon: 'play-circle', color: '#8b5cf6' },
  ];

  const handleSearchFocus = () => {
    Animated.timing(searchFocused, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    Animated.timing(searchFocused, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const renderItem = ({ item, index }) => {
    const isGrid = viewMode === 'grid';
    
    if (isGrid) {
      // Grid mode - simple square cards
      return (
        <View style={styles.gridItemWrapper}>
          <ItemCard
            item={item}
            onPress={() => handleItemPress(item)}
            onLongPress={() => handleItemLongPress(item)}
            showProgress
            compact={true}
            selected={selectionMode && selectedItems.has(item.id)}
          />
        </View>
      );
    }
    
    // List mode
    return (
      <View style={styles.listItemWrapper}>
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
        <View style={styles.listItemCard}>
          <ItemCard
            item={item}
            onPress={() => handleItemPress(item)}
            onLongPress={() => handleItemLongPress(item)}
            showProgress
            compact={false}
          />
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Title Section */}
      <View style={styles.titleSection}>
        <View>
          <Text style={styles.screenTitle}>My Library</Text>
          <Text style={styles.screenSubtitle}>
            {stats.total} {stats.total === 1 ? 'item' : 'items'} • {stats.completed} completed
          </Text>
        </View>
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? '#fff' : '#64748b'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons
              name="grid"
              size={18}
              color={viewMode === 'grid' ? '#fff' : '#64748b'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Search Bar */}
      <View style={styles.searchWrapper}>
        <LinearGradient
          colors={['#1a1a2e', '#16162a']}
          style={styles.searchContainer}
        >
          <Ionicons name="search" size={20} color="#6366f1" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, PDFs..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* Enhanced Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {filterOptions.map((option) => {
          const isActive = filter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => setFilter(option.key)}
              activeOpacity={0.7}
            >
              {isActive ? (
                <LinearGradient
                  colors={option.color ? [option.color, option.color + 'cc'] : ['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterChip}
                >
                  <Ionicons name={option.icon} size={16} color="#fff" />
                  <Text style={styles.filterChipTextActive}>{option.label}</Text>
                  {option.count !== undefined && (
                    <View style={styles.filterChipBadge}>
                      <Text style={styles.filterChipBadgeText}>{option.count}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.filterChipInactive}>
                  <Ionicons name={option.icon} size={16} color={option.color || '#64748b'} />
                  <Text style={styles.filterChipText}>{option.label}</Text>
                  {option.count !== undefined && (
                    <Text style={styles.filterChipCount}>{option.count}</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results count */}
      {filteredItems.length > 0 && filter !== 'all' && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            Showing {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}
          </Text>
        </View>
      )}
    </>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['#1a1a2e', '#13131a']}
        style={styles.emptyIconContainer}
      >
        <Ionicons 
          name={searchQuery ? "search-outline" : "library-outline"} 
          size={48} 
          color="#6366f1" 
        />
      </LinearGradient>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No results found' : 'Your library is empty'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery 
          ? 'Try a different search term or filter' 
          : 'Add videos and PDFs to start tracking your progress'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => navigation.navigate('AddFiles')}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emptyButtonGradient}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Add Files</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Background */}
      <LinearGradient
        colors={['#0f0f1a', '#0a0a0f']}
        style={styles.backgroundGradient}
      />

      {/* Selection Header */}
      {selectionMode && (
        <Animated.View 
          style={[
            styles.selectionHeader,
            {
              transform: [{
                translateY: selectionBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-60, 0],
                })
              }],
              opacity: selectionBarAnim,
            }
          ]}
        >
          <LinearGradient
            colors={['#1a1a2e', '#13131a']}
            style={styles.selectionHeaderInner}
          >
            <TouchableOpacity onPress={handleCancelSelection} style={styles.selectionButton}>
              <Ionicons name="close" size={24} color="#e2e8f0" />
            </TouchableOpacity>
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionCount}>{selectedItems.size}</Text>
              <Text style={styles.selectionLabel}>selected</Text>
            </View>
            <TouchableOpacity onPress={handleSelectAll} style={styles.selectionButton}>
              <Ionicons 
                name={selectedItems.size === filteredItems.length ? "checkbox" : "checkbox-outline"} 
                size={24} 
                color="#6366f1" 
              />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={viewMode === 'grid' ? 3 : 1}
        key={viewMode}
        contentContainerStyle={[
          styles.listContent,
          filteredItems.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={!selectionMode ? renderHeader : null}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchItems}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Selection Action Bar */}
      {selectionMode && selectedItems.size > 0 && (
        <Animated.View 
          style={[
            styles.actionBar,
            {
              transform: [{
                translateY: selectionBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                })
              }],
            }
          ]}
        >
          <LinearGradient
            colors={['#1a1a2e', '#0f0f1a']}
            style={styles.actionBarGradient}
          >
            <TouchableOpacity style={styles.actionButton} onPress={handleMoveSelected}>
              <LinearGradient
                colors={['#1e1e2e', '#252530']}
                style={styles.actionButtonInner}
              >
                <Ionicons name="folder-open-outline" size={22} color="#6366f1" />
                <Text style={styles.actionButtonText}>Move</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleDeleteSelected}>
              <LinearGradient
                colors={['#ef444420', '#ef444410']}
                style={styles.actionButtonInner}
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}

      {/* FAB */}
      <Animated.View 
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: fabScale }],
            opacity: fabScale,
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('AddFiles')}
          activeOpacity={0.9}
          style={styles.fabButton}
        >
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Move to Collection Modal */}
      <Modal
        visible={showMoveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1a1a2e', '#13131a']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Move to Collection</Text>
              <TouchableOpacity 
                onPress={() => setShowMoveModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color="#e2e8f0" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.collectionList}>
              <TouchableOpacity
                style={styles.collectionOption}
                onPress={() => handleMoveToCollection(null)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#1e1e2e', '#252530']}
                  style={styles.collectionOptionGradient}
                >
                  <View style={[styles.collectionIcon, { backgroundColor: '#64748b20' }]}>
                    <Ionicons name="folder-outline" size={20} color="#64748b" />
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName}>No Collection</Text>
                    <Text style={styles.collectionSubtext}>Remove from all collections</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              {collections.map(collection => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.collectionOption}
                  onPress={() => handleMoveToCollection(collection.id)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#1e1e2e', '#252530']}
                    style={styles.collectionOptionGradient}
                  >
                    <View style={[styles.collectionIcon, { backgroundColor: collection.color + '20' }]}>
                      <Ionicons name={collection.icon || 'folder'} size={20} color={collection.color} />
                    </View>
                    <View style={styles.collectionInfo}>
                      <Text style={styles.collectionName}>{collection.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                  </LinearGradient>
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
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 4,
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: '#6366f1',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#252530',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 16,
    paddingVertical: 14,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    gap: 8,
  },
  filterChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#252530',
    gap: 8,
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterChipBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipCount: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  resultsText: {
    color: '#64748b',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
  },
  // Grid mode wrapper - 3 columns
  gridItemWrapper: {
    width: '33.33%',
    padding: 6,
  },
  // List mode wrapper
  listItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  listItemCard: {
    flex: 1,
  },
  checkbox: {
    marginRight: 8,
    marginBottom: 12,
  },
  checkboxInner: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#252530',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectionHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  selectionHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6366f140',
  },
  selectionButton: {
    padding: 6,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  selectionCount: {
    color: '#6366f1',
    fontSize: 24,
    fontWeight: '700',
  },
  selectionLabel: {
    color: '#94a3b8',
    fontSize: 16,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionBarGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 34,
    justifyContent: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#252530',
  },
  actionButton: {
    flex: 1,
    maxWidth: 160,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#252530',
  },
  actionButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 30,
  },
  fabButton: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fab: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#13131a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#252530',
  },
  modalTitle: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  collectionList: {
    padding: 16,
    paddingBottom: 40,
  },
  collectionOption: {
    marginBottom: 10,
  },
  collectionOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252530',
  },
  collectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  collectionSubtext: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
});
