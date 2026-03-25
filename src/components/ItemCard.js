import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ItemCard({ item, onPress, onLongPress, showProgress, compact, selected }) {
  const getTypeIcon = () => {
    return item.type === 'video' ? 'videocam' : 'document';
  };

  const getTypeColor = () => {
    return item.type === 'video' ? '#6366f1' : '#f59e0b';
  };

  const getTypeGradient = () => {
    return item.type === 'video' 
      ? ['#6366f120', '#8b5cf620'] 
      : ['#f59e0b20', '#f59e0b10'];
  };

  if (compact) {
    const isCompleted = item.is_completed;
    const hasProgress = showProgress && item.progress > 0 && !isCompleted;
    // Get short name - remove extension and limit length
    const shortName = item.name.replace(/\.[^/.]+$/, '').slice(0, 12);

    return (
      <TouchableOpacity 
        style={[styles.compactCard, selected && styles.compactCardSelected]} 
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={selected ? ['#6366f130', '#6366f120'] : ['#1a1a2e', '#13131a']}
          style={styles.compactCardInner}
        >
          {/* Icon */}
          <LinearGradient
            colors={getTypeGradient()}
            style={styles.compactIcon}
          >
            <Ionicons name={getTypeIcon()} size={20} color={getTypeColor()} />
          </LinearGradient>
          
          {/* Status badge */}
          {isCompleted && (
            <View style={styles.compactStatusBadge}>
              <Ionicons name="checkmark-circle" size={10} color="#10b981" />
            </View>
          )}
          
          {/* Title */}
          <Text style={styles.compactName} numberOfLines={1}>
            {shortName}
          </Text>
          
          {/* Progress bar */}
          {hasProgress && (
            <View style={styles.compactProgress}>
              <View style={[styles.compactProgressFill, { width: `${item.progress}%`, backgroundColor: getTypeColor() }]} />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#1a1a2e', '#13131a']}
        style={styles.card}
      >
        <LinearGradient
          colors={getTypeGradient()}
          style={styles.iconContainer}
        >
          <Ionicons name={getTypeIcon()} size={24} color={getTypeColor()} />
        </LinearGradient>
        
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.meta}>
            <View style={[styles.typeTag, { backgroundColor: getTypeColor() + '15' }]}>
              <Text style={[styles.typeText, { color: getTypeColor() }]}>
                {item.type.toUpperCase()}
              </Text>
            </View>
            {item.is_completed ? (
              <View style={styles.completedTag}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            ) : showProgress && item.progress > 0 && (
              <View style={styles.progressTag}>
                <Text style={styles.progressText}>{item.progress}%</Text>
              </View>
            )}
          </View>
          
          {showProgress && !item.is_completed && item.progress > 0 && (
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[getTypeColor(), getTypeColor() + 'aa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${item.progress}%` }]}
              />
            </View>
          )}
        </View>

        <View style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252530',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98115',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  progressTag: {
    backgroundColor: '#6366f115',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#252530',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  arrow: {
    padding: 4,
  },
  // Compact styles - Square cards
  compactCard: {
    aspectRatio: 1,
    borderRadius: 12,
  },
  compactCardSelected: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 12,
  },
  compactCardInner: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#252530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactStatusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  compactName: {
    fontSize: 9,
    fontWeight: '600',
    color: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 12,
  },
  compactProgress: {
    width: '80%',
    height: 2,
    backgroundColor: '#252530',
    borderRadius: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 1,
  },
});
