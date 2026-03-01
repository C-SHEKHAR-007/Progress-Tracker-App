import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../context/ItemsContext';
import ItemCard from '../components/ItemCard';

export default function CollectionDetailScreen({ route, navigation }) {
  const { collection } = route.params;
  const { items, getItemsByCollection } = useItems();

  // Get items for this collection (or uncategorized if null)
  const collectionItems = collection
    ? getItemsByCollection(collection.id)
    : items.filter(item => !item.collection_id);

  const completedCount = collectionItems.filter(i => i.is_completed).length;
  const avgProgress = collectionItems.length > 0
    ? Math.round(collectionItems.reduce((acc, i) => acc + i.progress, 0) / collectionItems.length)
    : 0;

  const handleItemPress = (item) => {
    navigation.navigate('Player', { item });
  };

  const renderItem = ({ item }) => (
    <ItemCard
      item={item}
      onPress={() => handleItemPress(item)}
      showProgress
    />
  );

  return (
    <View style={styles.container}>
      {/* Collection Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: (collection?.color || '#64748b') + '20' },
          ]}
        >
          <Ionicons
            name={collection?.icon || 'folder-open'}
            size={32}
            color={collection?.color || '#64748b'}
          />
        </View>
        <Text style={styles.collectionName}>
          {collection?.name || 'Uncategorized'}
        </Text>
        <Text style={styles.collectionMeta}>
          {collectionItems.length} items • {completedCount} completed • {avgProgress}% avg progress
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${avgProgress}%`,
                backgroundColor: collection?.color || '#6366f1',
              },
            ]}
          />
        </View>
      </View>

      {/* Items List */}
      <FlatList
        data={collectionItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#64748b" />
            <Text style={styles.emptyText}>No items in this collection</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddFiles')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Files</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  collectionName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  collectionMeta: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1e1e2e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
