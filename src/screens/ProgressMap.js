import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getHeatmapData,
  getStreak,
  getTodayStats,
  getWeeklyStats,
  getWeekdayPattern,
  getRecentCompletions,
} from '../services/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 80) / 53); // 53 weeks in a year
const CELL_GAP = 2;

// Generate heatmap colors based on activity level
const getHeatmapColor = (count) => {
  if (count === 0) return '#1a1a24';
  if (count === 1) return '#2d4a3e';
  if (count <= 3) return '#3d7a5a';
  if (count <= 5) return '#4da676';
  return '#5dd692';
};

// Format time in hours/minutes
const formatTime = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function ProgressMapScreen() {
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [todayStats, setTodayStats] = useState({ sessions: 0, totalTime: 0 });
  const [weeklyStats, setWeeklyStats] = useState({ sessions: 0, totalTime: 0, activeDays: 0 });
  const [weekdayPattern, setWeekdayPattern] = useState([]);
  const [recentCompletions, setRecentCompletions] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [heatmap, streakData, today, weekly, pattern, completions] = await Promise.all([
        getHeatmapData(365),
        getStreak(),
        getTodayStats(),
        getWeeklyStats(),
        getWeekdayPattern(),
        getRecentCompletions(5),
      ]);

      setHeatmapData(heatmap);
      setStreak(streakData);
      setTodayStats(today);
      setWeeklyStats(weekly);
      setWeekdayPattern(pattern);
      setRecentCompletions(completions);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate heatmap grid (365 days)
  const renderHeatmap = () => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 364);

    // Create a map of dates to counts
    const dateMap = {};
    heatmapData.forEach(item => {
      dateMap[item.session_date] = item.count;
    });

    // Generate 53 weeks x 7 days grid
    const weeks = [];
    let currentDate = new Date(startDate);
    
    // Adjust to start on Sunday
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() - dayOfWeek);

    for (let week = 0; week < 53; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const count = dateMap[dateStr] || 0;
        const isFuture = currentDate > today;

        days.push(
          <View
            key={`${week}-${day}`}
            style={[
              styles.heatmapCell,
              {
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: isFuture ? 'transparent' : getHeatmapColor(count),
                opacity: isFuture ? 0.3 : 1,
              },
            ]}
          />
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(
        <View key={week} style={styles.heatmapWeek}>
          {days}
        </View>
      );
    }

    return weeks;
  };

  // Find max count for weekday pattern chart
  const maxPatternCount = Math.max(...weekdayPattern.map(d => d.count), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchData}
          tintColor="#6366f1"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Progress Map</Text>
        <Text style={styles.subtitle}>Your learning journey visualized</Text>
      </View>

      {/* Streak Cards */}
      <View style={styles.streakContainer}>
        <View style={[styles.streakCard, styles.currentStreak]}>
          <Ionicons name="flame" size={28} color="#f59e0b" />
          <Text style={styles.streakNumber}>{streak.current}</Text>
          <Text style={styles.streakLabel}>Current Streak</Text>
        </View>
        <View style={[styles.streakCard, styles.longestStreak]}>
          <Ionicons name="trophy" size={28} color="#eab308" />
          <Text style={styles.streakNumber}>{streak.longest}</Text>
          <Text style={styles.streakLabel}>Longest Streak</Text>
        </View>
      </View>

      {/* Activity Heatmap */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Heatmap</Text>
        <Text style={styles.sectionSubtitle}>Last 365 days</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.heatmapContainer}>
            <View style={styles.heatmapLabels}>
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, i) => (
                <Text key={i} style={styles.heatmapLabel}>{label}</Text>
              ))}
            </View>
            <View style={styles.heatmapGrid}>{renderHeatmap()}</View>
          </View>
        </ScrollView>
        <View style={styles.heatmapLegend}>
          <Text style={styles.legendText}>Less</Text>
          {[0, 1, 3, 5, 7].map(level => (
            <View
              key={level}
              style={[styles.legendCell, { backgroundColor: getHeatmapColor(level) }]}
            />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>

      {/* Today's Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={24} color="#6366f1" />
            <Text style={styles.statValue}>{formatTime(todayStats.totalTime)}</Text>
            <Text style={styles.statLabel}>Time Spent</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="play-circle-outline" size={24} color="#10b981" />
            <Text style={styles.statValue}>{todayStats.sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>
      </View>

      {/* Weekly Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="time-outline" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{formatTime(weeklyStats.totalTime)}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="calendar-outline" size={24} color="#ec4899" />
            <Text style={styles.statValue}>{weeklyStats.activeDays}</Text>
            <Text style={styles.statLabel}>Active Days</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="analytics-outline" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{weeklyStats.sessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>
      </View>

      {/* Weekday Pattern */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learning Pattern</Text>
        <Text style={styles.sectionSubtitle}>Sessions by day of week</Text>
        <View style={styles.patternChart}>
          {weekdayPattern.map((day, index) => (
            <View key={index} style={styles.patternBar}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max((day.count / maxPatternCount) * 100, 5)}%`,
                      backgroundColor: day.count > 0 ? '#6366f1' : '#2a2a3a',
                    },
                  ]}
                />
              </View>
              <Text style={styles.patternLabel}>{day.day}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Completions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Completions</Text>
        {recentCompletions.length === 0 ? (
          <Text style={styles.emptyText}>No completions yet. Keep learning!</Text>
        ) : (
          recentCompletions.map(item => (
            <View key={item.id} style={styles.completionItem}>
              <View style={styles.completionIcon}>
                <Ionicons
                  name={item.type === 'video' ? 'videocam' : 'document-text'}
                  size={20}
                  color="#10b981"
                />
              </View>
              <View style={styles.completionInfo}>
                <Text style={styles.completionName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.completionDate}>
                  {new Date(item.updated_at).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            </View>
          ))
        )}
      </View>
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  streakContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  streakCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  currentStreak: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  longestStreak: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#16161f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  heatmapContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  heatmapLabels: {
    marginRight: 4,
    justifyContent: 'space-between',
    height: (CELL_SIZE + CELL_GAP) * 7,
  },
  heatmapLabel: {
    fontSize: 10,
    color: '#64748b',
    height: CELL_SIZE,
    lineHeight: CELL_SIZE,
  },
  heatmapGrid: {
    flexDirection: 'row',
  },
  heatmapWeek: {
    flexDirection: 'column',
  },
  heatmapCell: {
    borderRadius: 2,
    margin: CELL_GAP / 2,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#64748b',
    marginHorizontal: 4,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e1e2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  patternChart: {
    flexDirection: 'row',
    height: 120,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  patternBar: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  patternLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2a',
  },
  completionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completionInfo: {
    flex: 1,
  },
  completionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f8fafc',
  },
  completionDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
