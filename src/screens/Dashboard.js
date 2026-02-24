import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useItems } from '../context/ItemsContext';
import ItemCard from '../components/ItemCard';
import { getTotalHoursLearned, getCollectionProgress, getStreak } from '../services/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { items, stats, loading, fetchItems, deleteItem } = useItems();
  const [hoursLearned, setHoursLearned] = useState(0);
  const [collectionProgress, setCollectionProgress] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  const fetchAnalytics = useCallback(async () => {
    try {
      const [hours, collections, streakData] = await Promise.all([
        getTotalHoursLearned(),
        getCollectionProgress(),
        getStreak(),
      ]);
      setHoursLearned(hours);
      setCollectionProgress(collections);
      setStreak(streakData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics, items]);

  const handleRefresh = async () => {
    await fetchItems();
    await fetchAnalytics();
  };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get motivational message based on progress
  const getMotivationalMessage = () => {
    if (stats.completed === 0) return "Let's start your learning journey!";
    if (streak.current >= 7) return "You're on fire! Keep the streak going!";
    if (streak.current >= 3) return "Great consistency! Keep it up!";
    if (stats.avgProgress > 50) return "You're making great progress!";
    return "Every step counts. Keep learning!";
  };

  // Get the item to continue
  const continueItem = items
    .filter(item => item.progress > 0 && !item.is_completed)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

  // Get recent items for horizontal scroll
  const recentItems = items
    .filter(item => !item.is_completed)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 8);

  const handleItemPress = (item) => {
    navigation.navigate('Player', { item });
  };

  const handleItemLongPress = (item) => {
    Alert.alert(
      'Options',
      `What would you like to do with "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Item',
              'Are you sure you want to delete this item?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor="#6366f1" />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
              <Text style={styles.motivationalText}>{getMotivationalMessage()}</Text>
            </View>
            {streak.current > 0 && (
              <TouchableOpacity 
                style={styles.streakBadge}
                onPress={() => navigation.navigate('Progress')}
              >
                <View style={styles.streakInner}>
                  <Ionicons name="flame" size={22} color="#f59e0b" />
                  <Text style={styles.streakNumber}>{streak.current}</Text>
                </View>
                <Text style={styles.streakLabel}>day streak</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Overview - Horizontal Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsContainer}
        >
          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.statGradient}>
              <View style={styles.statIconBg}>
                <Ionicons name="library" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.statGradient}>
              <View style={styles.statIconBg}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statGradient}>
              <View style={styles.statIconBg}>
                <Ionicons name="time" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{hoursLearned}h</Text>
              <Text style={styles.statLabel}>Learned</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Progress')}
          >
            <LinearGradient colors={['#ec4899', '#db2777']} style={styles.statGradient}>
              <View style={styles.statIconBg}>
                <Ionicons name="trending-up" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{stats.avgProgress}%</Text>
              <Text style={styles.statLabel}>Avg Progress</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Continue Learning - Featured Card */}
        {continueItem && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
              <TouchableOpacity 
                style={styles.playBadge}
                onPress={() => handleItemPress(continueItem)}
              >
                <Text style={styles.playBadgeText}>Resume</Text>
                <Ionicons name="play" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.continueCard}
              onPress={() => handleItemPress(continueItem)}
              activeOpacity={0.9}
            >
              <LinearGradient 
                colors={['#1e1e2e', '#13131a']} 
                style={styles.continueGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.continueContent}>
                  <View style={[
                    styles.continueIcon, 
                    { backgroundColor: continueItem.type === 'video' ? '#6366f120' : '#f59e0b20' }
                  ]}>
                    <Ionicons 
                      name={continueItem.type === 'video' ? 'videocam' : 'document-text'} 
                      size={32} 
                      color={continueItem.type === 'video' ? '#6366f1' : '#f59e0b'} 
                    />
                  </View>
                  <View style={styles.continueInfo}>
                    <Text style={styles.continueTitle} numberOfLines={2}>{continueItem.name}</Text>
                    <Text style={styles.continueType}>
                      {continueItem.type === 'video' ? 'Video' : 'PDF'} • {continueItem.progress}% complete
                    </Text>
                  </View>
                  <View style={styles.playButton}>
                    <Ionicons name="play-circle" size={48} color="#6366f1" />
                  </View>
                </View>
                <View style={styles.continueProgressBg}>
                  <View 
                    style={[
                      styles.continueProgressFill, 
                      { width: `${continueItem.progress}%` }
                    ]} 
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('AddFiles')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#6366f115' }]}>
                <Ionicons name="add-circle" size={28} color="#6366f1" />
              </View>
              <Text style={styles.quickActionText}>Add Files</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Library')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10b98115' }]}>
                <Ionicons name="grid" size={28} color="#10b981" />
              </View>
              <Text style={styles.quickActionText}>Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Collections')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b15' }]}>
                <Ionicons name="folder" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.quickActionText}>Collections</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Progress')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#ec489915' }]}>
                <Ionicons name="bar-chart" size={28} color="#ec4899" />
              </View>
              <Text style={styles.quickActionText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Collection Progress */}
        {collectionProgress.filter(c => c.total_items > 0).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Collection Progress</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Collections')}>
                <Text style={styles.seeAll}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.collectionsCard}>
              {collectionProgress.filter(c => c.total_items > 0).slice(0, 3).map(collection => {
                const progress = collection.total_items > 0 
                  ? Math.round((collection.completed_items / collection.total_items) * 100) 
                  : 0;
                return (
                  <View key={collection.id} style={styles.collectionRow}>
                    <View style={styles.collectionInfo}>
                      <View style={[styles.collectionDot, { backgroundColor: collection.color }]} />
                      <Text style={styles.collectionName} numberOfLines={1}>{collection.name}</Text>
                    </View>
                    <View style={styles.collectionStats}>
                      <View style={styles.collectionProgressBg}>
                        <View
                          style={[
                            styles.collectionProgressFill,
                            { width: `${progress}%`, backgroundColor: collection.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.collectionPercent}>{progress}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Items - Horizontal Scroll */}
        {recentItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Items</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Library')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentCard}
                  onPress={() => handleItemPress(item)}
                  onLongPress={() => handleItemLongPress(item)}
                  activeOpacity={0.9}
                >
                  <View style={[
                    styles.recentIcon,
                    { backgroundColor: item.type === 'video' ? '#6366f120' : '#f59e0b20' }
                  ]}>
                    <Ionicons
                      name={item.type === 'video' ? 'videocam' : 'document-text'}
                      size={28}
                      color={item.type === 'video' ? '#6366f1' : '#f59e0b'}
                    />
                    {item.progress > 0 && !item.is_completed && (
                      <View style={styles.recentProgressRing}>
                        <Text style={styles.recentProgressText}>{item.progress}%</Text>
                      </View>
                    )}
                    {item.is_completed && (
                      <View style={styles.recentCompleted}>
                        <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.recentTitle} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.recentType}>
                    {item.type === 'video' ? 'Video' : 'PDF'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Empty State */}
        {items.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <LinearGradient 
              colors={['#1e1e2e', '#13131a']} 
              style={styles.emptyGradient}
            >
              <View style={styles.emptyIconContainer}>
                <Ionicons name="rocket-outline" size={64} color="#6366f1" />
              </View>
              <Text style={styles.emptyTitle}>Start Your Journey</Text>
              <Text style={styles.emptySubtitle}>
                Add videos or PDFs to begin tracking your learning progress and build your knowledge library.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddFiles')}
              >
                <LinearGradient 
                  colors={['#6366f1', '#4f46e5']} 
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                  <Text style={styles.emptyButtonText}>Add Your First File</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddFiles')}
        activeOpacity={0.9}
      >
        <LinearGradient 
          colors={['#6366f1', '#4f46e5']} 
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  motivationalText: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
  },
  streakBadge: {
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#f59e0b30',
  },
  streakInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f59e0b',
    marginLeft: 4,
  },
  streakLabel: {
    fontSize: 10,
    color: '#f59e0b',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  statCard: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statGradient: {
    width: 120,
    height: 130,
    padding: 16,
    justifyContent: 'space-between',
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  playBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  playBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  continueCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  continueGradient: {
    padding: 16,
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  continueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 22,
  },
  continueType: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  playButton: {
    marginLeft: 'auto',
  },
  continueProgressBg: {
    height: 4,
    backgroundColor: '#0a0a0f',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  continueProgressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#13131a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  collectionsCard: {
    backgroundColor: '#13131a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  collectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  collectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  collectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    flex: 1,
  },
  collectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  collectionProgressBg: {
    width: 80,
    height: 6,
    backgroundColor: '#0a0a0f',
    borderRadius: 3,
    overflow: 'hidden',
  },
  collectionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  collectionPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    width: 35,
    textAlign: 'right',
  },
  recentScroll: {
    paddingRight: 20,
  },
  recentCard: {
    width: 140,
    backgroundColor: '#13131a',
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  recentIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  recentProgressRing: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recentProgressText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  recentCompleted: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#0a0a0f',
    borderRadius: 10,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    lineHeight: 18,
    marginBottom: 4,
  },
  recentType: {
    fontSize: 11,
    color: '#64748b',
  },
  emptyState: {
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e2e',
    borderRadius: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f115',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  emptyButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
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
});
