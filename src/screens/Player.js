import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  BackHandler,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [dimensions, setDimensions] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  const playbackRates = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const controlsTimeout = useRef(null);
  const controlsOpacity = useRef(new Animated.Value(0)).current;

  // Hide navigation header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Handle dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });
    return () => subscription?.remove();
  }, []);

  // Handle back button and cleanup orientation
  useEffect(() => {
    const handleBackPress = () => {
      handleGoBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      backHandler.remove();
      // Always reset to portrait on unmount
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  // Go back with proper cleanup
  const handleGoBack = useCallback(async () => {
    // Save progress before leaving
    if (status.positionMillis && status.durationMillis) {
      const progress = Math.round((status.positionMillis / status.durationMillis) * 100);
      await updateProgress(item.id, progress, status.positionMillis / 1000);
    }
    
    // Reset orientation
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    setIsFullscreen(false);
    
    navigation.goBack();
  }, [status, item.id, updateProgress, navigation]);

  // Hide controls with animation
  const hideControlsWithDelay = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (status.isPlaying) {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }
    }, 2000);
  }, [status.isPlaying, controlsOpacity]);

  // Toggle controls on screen touch
  const handleScreenTouch = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    
    if (showControls) {
      // Hide controls immediately
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      // Show controls
      setShowControls(true);
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Auto-hide if playing
      if (status.isPlaying) {
        hideControlsWithDelay();
      }
    }
  }, [showControls, status.isPlaying, hideControlsWithDelay, controlsOpacity]);

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

  // Fullscreen toggle with proper orientation handling
  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsFullscreen(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Orientation error:', err);
    }
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
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
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
          onPress: async () => {
            await markCompleted(item.id, true);
            handleGoBack();
          },
        },
      ]
    );
  };

  // Handle progress bar touch
  const handleProgressTouch = async (event) => {
    if (!status.durationMillis || !videoRef.current) return;
    
    const touchX = event.nativeEvent.locationX;
    const progressBarWidth = dimensions.width - 120; // Account for padding and time labels
    const seekPercent = Math.max(0, Math.min(1, touchX / progressBarWidth));
    const seekPosition = seekPercent * status.durationMillis;
    
    await videoRef.current.setPositionAsync(seekPosition);
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
      <StatusBar hidden={isFullscreen || showControls === false} barStyle="light-content" />

      <TouchableWithoutFeedback onPress={handleScreenTouch}>
        <View style={styles.videoContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LinearGradient
                colors={['#6366f130', '#8b5cf630']}
                style={styles.loadingIconBg}
              >
                <ActivityIndicator size="large" color="#6366f1" />
              </LinearGradient>
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <LinearGradient
                colors={['#ef444430', '#ef444420']}
                style={styles.errorIconBg}
              >
                <Ionicons name="alert-circle" size={48} color="#ef4444" />
              </LinearGradient>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.errorBackButton}
                onPress={handleGoBack}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.errorBackButtonGradient}
                >
                  <Ionicons name="arrow-back" size={18} color="#fff" />
                  <Text style={styles.errorBackButtonText}>Go Back</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <Video
              ref={videoRef}
              source={{ uri: item.file_uri || item.file_path }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
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
            <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]}>
              {/* Gradient overlay for better visibility */}
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
                locations={[0, 0.2, 0.7, 1]}
                style={StyleSheet.absoluteFill}
              />
              
              {/* Header */}
              <View style={[styles.header, isFullscreen && styles.headerFullscreen]}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleGoBack}
                >
                  <View style={styles.headerButtonBg}>
                    <Ionicons name={isFullscreen ? "arrow-back" : "chevron-down"} size={24} color="#fff" />
                  </View>
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.subtitle}>
                    {item.progress || 0}% completed
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleMarkComplete}
                >
                  <View style={styles.headerButtonBg}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Center Controls */}
              <View style={styles.centerControls}>
                <TouchableOpacity
                  style={styles.seekButton}
                  onPress={() => seek(-10)}
                >
                  <View style={styles.seekButtonInner}>
                    <Ionicons name="play-back" size={28} color="#fff" />
                  </View>
                  <Text style={styles.seekText}>10s</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayPause}
                >
                  <View style={styles.playButtonInner}>
                    <Ionicons
                      name={status.isPlaying ? 'pause' : 'play'}
                      size={40}
                      color="#fff"
                      style={!status.isPlaying && { marginLeft: 4 }}
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.seekButton}
                  onPress={() => seek(10)}
                >
                  <View style={styles.seekButtonInner}>
                    <Ionicons name="play-forward" size={28} color="#fff" />
                  </View>
                  <Text style={styles.seekText}>10s</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Controls */}
              <View style={[styles.bottomControls, isFullscreen && styles.bottomControlsFullscreen]}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <Text style={styles.timeText}>
                    {formatTime(status.positionMillis)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.progressBarTouchable}
                    onPress={handleProgressTouch}
                    activeOpacity={1}
                  >
                    <View style={styles.progressBar}>
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${progressPercent}%` }]}
                      />
                      <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
                    </View>
                  </TouchableOpacity>
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
                      name={isFullscreen ? 'contract-outline' : 'expand-outline'}
                      size={22}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBackButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  errorBackButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  errorBackButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerFullscreen: {
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  headerButton: {
    padding: 4,
  },
  headerButtonBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekButton: {
    alignItems: 'center',
    marginHorizontal: 24,
  },
  seekButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  playButton: {
    marginHorizontal: 16,
  },
  playButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  bottomControlsFullscreen: {
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    width: 50,
    fontVariant: ['tabular-nums'],
  },
  progressBarTouchable: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  speedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
