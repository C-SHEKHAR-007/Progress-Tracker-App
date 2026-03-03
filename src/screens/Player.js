import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useItems } from '../context/ItemsContext';
import { fileExists } from '../services/fileService';
import PDFViewer from '../components/PDFViewer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PlayerScreen({ route, navigation }) {
  const { item } = route.params;
  const { updateProgress, markCompleted } = useItems();
  
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const playbackRates = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const controlsTimeout = useRef(null);

  // Hide controls after delay
  const hideControlsWithDelay = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (status.isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [status.isPlaying]);

  // Show controls temporarily
  const handleScreenTouch = useCallback(() => {
    setShowControls(true);
    hideControlsWithDelay();
  }, [hideControlsWithDelay]);

  // Check if file exists
  useEffect(() => {
    const checkFile = async () => {
      const uri = item.file_uri || item.file_path;
      if (!uri) {
        setError('No file path available');
        setIsLoading(false);
        return;
      }

      const exists = await fileExists(uri);
      if (!exists) {
        setError('File not found');
      }
      setIsLoading(false);
    };

    if (item.type === 'video') {
      checkFile();
    } else {
      setIsLoading(false);
    }
  }, [item]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      // Save final progress on exit
      if (status.positionMillis && status.durationMillis) {
        const progress = Math.round((status.positionMillis / status.durationMillis) * 100);
        updateProgress(item.id, progress, status.positionMillis / 1000);
      }
    };
  }, [status, item.id, updateProgress]);

  // Handle video status updates
  const handlePlaybackStatusUpdate = useCallback((newStatus) => {
    setStatus(newStatus);

    if (newStatus.isLoaded) {
      setIsLoading(false);
      
      // Auto-save progress periodically
      if (newStatus.positionMillis && newStatus.durationMillis) {
        const progress = Math.round((newStatus.positionMillis / newStatus.durationMillis) * 100);
        
        // Save every 10% progress change
        if (progress > 0 && progress % 10 === 0) {
          updateProgress(item.id, progress, newStatus.positionMillis / 1000);
        }
      }

      // Mark as completed when near end
      if (newStatus.didJustFinish) {
        markCompleted(item.id, true);
      }
    }
  }, [item.id, updateProgress, markCompleted]);

  // Play/Pause toggle
  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
        // Save progress on pause
        if (status.positionMillis && status.durationMillis) {
          const progress = Math.round((status.positionMillis / status.durationMillis) * 100);
          updateProgress(item.id, progress, status.positionMillis / 1000);
        }
      } else {
        await videoRef.current.playAsync();
        hideControlsWithDelay();
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
    setIsFullscreen(!isFullscreen);
  };

  // Seek forward/backward
  const seek = async (seconds) => {
    if (videoRef.current && status.positionMillis !== undefined) {
      const newPosition = status.positionMillis + (seconds * 1000);
      await videoRef.current.setPositionAsync(
        Math.max(0, Math.min(newPosition, status.durationMillis || 0))
      );
    }
  };

  // Toggle playback rate
  const togglePlaybackRate = async () => {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackRates.length;
    const newRate = playbackRates[nextIndex];
    setPlaybackRate(newRate);
    
    if (videoRef.current) {
      await videoRef.current.setRateAsync(newRate, true);
    }
  };

  // Format time
  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = status.positionMillis && status.durationMillis
    ? (status.positionMillis / status.durationMillis) * 100
    : 0;

  // Handle mark complete
  const handleMarkComplete = () => {
    Alert.alert(
      'Mark as Complete',
      'Mark this item as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            markCompleted(item.id, true);
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Render PDF viewer
  if (item.type === 'pdf') {
    return (
      <PDFViewer
        item={item}
        onBack={() => navigation.goBack()}
        onComplete={() => markCompleted(item.id, true)}
      />
    );
  }

  // Render video player
  return (
    <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      <StatusBar hidden={isFullscreen} />

      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={handleScreenTouch}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: item.file_uri || item.file_path }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            positionMillis={item.last_position ? item.last_position * 1000 : 0}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(err) => {
              console.error('Video error:', err);
              setError('Failed to load video');
            }}
          />
        )}

        {/* Controls Overlay */}
        {showControls && !isLoading && !error && (
          <View style={styles.controlsOverlay}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-down" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>
                {item.name}
              </Text>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleMarkComplete}
              >
                <Ionicons name="checkmark-circle-outline" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Center Controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.seekButton}
                onPress={() => seek(-10)}
              >
                <Ionicons name="play-back" size={32} color="#fff" />
                <Text style={styles.seekText}>10s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}
              >
                <Ionicons
                  name={status.isPlaying ? 'pause' : 'play'}
                  size={48}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.seekButton}
                onPress={() => seek(10)}
              >
                <Ionicons name="play-forward" size={32} color="#fff" />
                <Text style={styles.seekText}>10s</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>
                  {formatTime(status.positionMillis)}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${progressPercent}%` }]}
                  />
                </View>
                <Text style={styles.timeText}>
                  {formatTime(status.durationMillis)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.speedButton}
                  onPress={togglePlaybackRate}
                >
                  <Text style={styles.speedText}>{playbackRate}x</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={toggleFullscreen}
                >
                  <Ionicons
                    name={isFullscreen ? 'contract' : 'expand'}
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    marginTop: 12,
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  seekText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    width: 50,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    marginRight: 8,
  },
  speedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
