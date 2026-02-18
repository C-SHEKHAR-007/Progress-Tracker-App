import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ItemCard({ item, onPress, onLongPress, showProgress, compact }) {
  const getTypeIcon = () => {
    return item.type === 'video' ? 'videocam' : 'document';
  };

  const getTypeColor = () => {
    return item.type === 'video' ? '#6366f1' : '#f59e0b';
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactCard} 
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        <View style={[styles.compactIcon, { backgroundColor: getTypeColor() + '20' }]}>
          <Ionicons name={getTypeIcon()} size={24} color={getTypeColor()} />
          {item.is_completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.compactName} numberOfLines={2}>
          {item.name}
        </Text>
        {showProgress && item.progress > 0 && (
          <View style={styles.compactProgress}>
            <View
              style={[
                styles.compactProgressFill,
                { width: `${item.progress}%` },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View style={[styles.iconContainer, { backgroundColor: getTypeColor() + '20' }]}>
        <Ionicons name={getTypeIcon()} size={24} color={getTypeColor()} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {item.type.toUpperCase()}
          </Text>
          {item.is_completed ? (
            <View style={styles.completedTag}>
              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              <Text style={styles.completedText}>Done</Text>
            </View>
          ) : showProgress && item.progress > 0 && (
            <Text style={styles.progressText}>{item.progress}%</Text>
          )}
        </View>
        
        {showProgress && !item.is_completed && item.progress > 0 && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${item.progress}%`, backgroundColor: getTypeColor() },
              ]}
            />
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
  content: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 8,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completedText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#1e1e2e',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Compact styles
  compactCard: {
    width: '48%',
    backgroundColor: '#13131a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: '1%',
    borderWidth: 1,
    borderColor: '#1e1e2e',
    alignItems: 'center',
  },
  compactIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  completedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  compactProgress: {
    width: '100%',
    height: 3,
    backgroundColor: '#1e1e2e',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
});
