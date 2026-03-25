import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../context/ItemsContext';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9',
];

const ICONS = [
  'folder', 'book', 'code-slash', 'bulb',
  'school', 'briefcase', 'rocket', 'star',
  'heart', 'trophy', 'musical-notes', 'game-controller',
];

export default function CollectionsScreen({ navigation }) {
  const { collections, items, createCollection, deleteCollection } = useItems();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);

  const getCollectionItemCount = (collectionId) => {
    return items.filter(item => item.collection_id === collectionId).length;
  };

  const getCollectionProgress = (collectionId) => {
    const collectionItems = items.filter(item => item.collection_id === collectionId);
    if (collectionItems.length === 0) return 0;
    return Math.round(
      collectionItems.reduce((acc, item) => acc + item.progress, 0) / collectionItems.length
    );
  };

  const handleCreateCollection = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    try {
      await createCollection(newName.trim(), selectedColor, selectedIcon);
      setModalVisible(false);
      setNewName('');
      setSelectedColor(COLORS[0]);
      setSelectedIcon(ICONS[0]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create collection');
    }
  };

  const handleDeleteCollection = (collection) => {
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collection.name}"? Items will be moved to uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCollection(collection.id),
        },
      ]
    );
  };

  const renderCollection = ({ item: collection }) => {
    const itemCount = getCollectionItemCount(collection.id);
    const progress = getCollectionProgress(collection.id);

    return (
      <TouchableOpacity
        style={styles.collectionCard}
        onPress={() => navigation.navigate('CollectionDetail', { collection })}
        onLongPress={() => handleDeleteCollection(collection)}
      >
        <View style={[styles.iconContainer, { backgroundColor: collection.color + '20' }]}>
          <Ionicons name={collection.icon} size={28} color={collection.color} />
        </View>
        <View style={styles.collectionInfo}>
          <Text style={styles.collectionName}>{collection.name}</Text>
          <Text style={styles.collectionMeta}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{progress}%</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: collection.color },
              ]}
            />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </TouchableOpacity>
    );
  };

  // Uncategorized items count
  const uncategorizedCount = items.filter(item => !item.collection_id).length;

  return (
    <View style={styles.container}>
      <FlatList
        data={collections}
        renderItem={renderCollection}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          uncategorizedCount > 0 ? (
            <TouchableOpacity
              style={styles.collectionCard}
              onPress={() => navigation.navigate('CollectionDetail', { collection: null })}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#64748b20' }]}>
                <Ionicons name="folder-open" size={28} color="#64748b" />
              </View>
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionName}>Uncategorized</Text>
                <Text style={styles.collectionMeta}>
                  {uncategorizedCount} {uncategorizedCount === 1 ? 'item' : 'items'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#64748b" />
            <Text style={styles.emptyTitle}>No collections yet</Text>
            <Text style={styles.emptySubtitle}>
              Create collections to organize your learning content
            </Text>
          </View>
        }
      />

      {/* Add Collection FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Collection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Collection</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Collection name"
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorGrid}>
              {COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon && styles.iconSelected,
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Ionicons
                    name={icon}
                    size={24}
                    color={selectedIcon === icon ? '#6366f1' : '#64748b'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateCollection}
            >
              <Text style={styles.createButtonText}>Create Collection</Text>
            </TouchableOpacity>
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  collectionMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  progressContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#1e1e2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 30,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  input: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    color: '#e2e8f0',
    fontSize: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelected: {
    backgroundColor: '#6366f120',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  createButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
