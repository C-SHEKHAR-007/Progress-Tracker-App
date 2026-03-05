import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../context/ItemsContext';
import * as FileSystem from 'expo-file-system/legacy';

export default function ManageScreen({ navigation }) {
  const { items, collections, fetchItems, fetchCollections, deleteItem, updateItemCollection } = useItems();
  const [autoPlay, setAutoPlay] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Calculate storage info
  const totalSize = items.reduce((acc, item) => acc + (item.file_size || 0), 0);
  const videoCount = items.filter(i => i.type === 'video').length;
  const pdfCount = items.filter(i => i.type === 'pdf').length;
  const completedCount = items.filter(i => i.is_completed).length;

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Select all / Deselect all
  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  // Cancel bulk mode
  const cancelBulkMode = () => {
    setBulkMode(false);
    setSelectedItems([]);
  };

  // Bulk delete
  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    
    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${selectedItems.length} item(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedItems) {
                await deleteItem(id);
              }
              Alert.alert('Success', `Deleted ${selectedItems.length} item(s)`);
              cancelBulkMode();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete some items');
            }
          },
        },
      ]
    );
  };

  // Bulk move to collection
  const handleBulkMove = async (collectionId) => {
    try {
      for (const id of selectedItems) {
        await updateItemCollection(id, collectionId);
      }
      Alert.alert('Success', `Moved ${selectedItems.length} item(s)`);
      setShowMoveModal(false);
      cancelBulkMode();
    } catch (error) {
      Alert.alert('Error', 'Failed to move some items');
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchItems();
      await fetchCollections();
      Alert.alert('Success', 'Data refreshed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear temporary files. Your library items and progress will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const cacheDir = FileSystem.cacheDirectory;
              await FileSystem.deleteAsync(cacheDir, { idempotent: true });
              Alert.alert('Success', 'Cache cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={22} color="#6366f1" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && (
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      ))}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Bulk Operations Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bulk Operations</Text>
        <View style={styles.card}>
          {!bulkMode ? (
            <SettingItem
              icon="checkbox"
              title="Select Items"
              subtitle="Select multiple items for bulk actions"
              onPress={() => setBulkMode(true)}
            />
          ) : (
            <>
              <View style={styles.bulkHeader}>
                <Text style={styles.bulkTitle}>
                  {selectedItems.length} selected
                </Text>
                <TouchableOpacity onPress={toggleSelectAll}>
                  <Text style={styles.selectAllText}>
                    {selectedItems.length === items.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Item selection list */}
              <View style={styles.selectionList}>
                {items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.selectableItem}
                    onPress={() => toggleItemSelection(item.id)}
                  >
                    <View style={[
                      styles.checkbox,
                      selectedItems.includes(item.id) && styles.checkboxSelected
                    ]}>
                      {selectedItems.includes(item.id) && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                    <Ionicons
                      name={item.type === 'video' ? 'videocam' : 'document'}
                      size={18}
                      color={item.type === 'video' ? '#6366f1' : '#f59e0b'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.selectableItemText} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Bulk action buttons */}
              <View style={styles.bulkActions}>
                <TouchableOpacity
                  style={[styles.bulkButton, styles.bulkButtonSecondary]}
                  onPress={cancelBulkMode}
                >
                  <Text style={styles.bulkButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bulkButton, selectedItems.length === 0 && styles.bulkButtonDisabled]}
                  onPress={() => setShowMoveModal(true)}
                  disabled={selectedItems.length === 0}
                >
                  <Ionicons name="folder" size={18} color="#fff" />
                  <Text style={styles.bulkButtonText}>Move</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bulkButton, styles.bulkButtonDanger, selectedItems.length === 0 && styles.bulkButtonDisabled]}
                  onPress={handleBulkDelete}
                  disabled={selectedItems.length === 0}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.bulkButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Library Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{items.length}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{videoCount}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pdfCount}</Text>
            <Text style={styles.statLabel}>PDFs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>

      {/* Storage Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.card}>
          <SettingItem
            icon="folder"
            title="Library Size"
            subtitle={formatSize(totalSize)}
          />
          <SettingItem
            icon="albums"
            title="Collections"
            subtitle={`${collections.length} collections`}
          />
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.card}>
          <SettingItem
            icon="play-circle"
            title="Auto-play Next"
            subtitle="Automatically play next item"
            rightElement={
              <Switch
                value={autoPlay}
                onValueChange={setAutoPlay}
                trackColor={{ false: '#1e1e2e', true: '#6366f180' }}
                thumbColor={autoPlay ? '#6366f1' : '#64748b'}
              />
            }
          />
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.card}>
          <SettingItem
            icon="refresh"
            title="Refresh Data"
            subtitle="Reload items and collections"
            onPress={handleRefresh}
          />
          <SettingItem
            icon="trash"
            title="Clear Cache"
            subtitle="Free up temporary storage"
            onPress={handleClearCache}
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingItem
            icon="information-circle"
            title="Version"
            subtitle="1.0.0"
          />
          <SettingItem
            icon="code-slash"
            title="Progress Tracker"
            subtitle="Track your learning journey"
          />
        </View>
      </View>

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
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.collectionOption}
              onPress={() => handleBulkMove(null)}
            >
              <Ionicons name="folder-outline" size={22} color="#64748b" />
              <Text style={styles.collectionOptionText}>No Collection</Text>
            </TouchableOpacity>
            {collections.map(collection => (
              <TouchableOpacity
                key={collection.id}
                style={styles.collectionOption}
                onPress={() => handleBulkMove(collection.id)}
              >
                <View style={[styles.collectionDot, { backgroundColor: collection.color }]} />
                <Text style={styles.collectionOptionText}>{collection.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#13131a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#13131a',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  statItem: {
    width: '50%',
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#6366f120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  // Bulk operation styles
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  bulkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  selectAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  selectionList: {
    maxHeight: 250,
  },
  selectableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  selectableItemText: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
  },
  bulkActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  bulkButtonSecondary: {
    backgroundColor: '#1e1e2e',
  },
  bulkButtonDanger: {
    backgroundColor: '#ef4444',
  },
  bulkButtonDisabled: {
    opacity: 0.5,
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#13131a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  collectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  collectionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 12,
  },
  collectionOptionText: {
    fontSize: 16,
    color: '#e2e8f0',
    marginLeft: 12,
  },
});
