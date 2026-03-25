import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../context/ItemsContext';
import { pickFiles, formatFileSize } from '../services/fileService';

const { width } = Dimensions.get('window');

export default function AddFilesScreen({ navigation }) {
  const { collections, addItems } = useItems();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePickFiles = async () => {
    try {
      setIsPicking(true);
      const files = await pickFiles();
      if (files.length > 0) {
        setSelectedFiles(prev => [...prev, ...files]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick files');
    } finally {
      setIsPicking(false);
    }
  };

  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(f => f.file_id !== fileId));
  };

  const clearAllFiles = () => {
    Alert.alert(
      'Clear All',
      'Remove all selected files?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setSelectedFiles([]) },
      ]
    );
  };

  const handleAddFiles = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No files', 'Please select files to add');
      return;
    }

    try {
      setIsLoading(true);
      await addItems(selectedFiles, selectedCollection);
      Alert.alert('Success', `Added ${selectedFiles.length} item(s) to your library`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add files');
    } finally {
      setIsLoading(false);
    }
  };

  const getFileTypeColor = (type) => {
    return type === 'video' ? '#6366f1' : '#f59e0b';
  };

  const getFileTypeGradient = (type) => {
    return type === 'video' 
      ? ['#6366f120', '#8b5cf620'] 
      : ['#f59e0b20', '#f59e0b10'];
  };

  const renderFileItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.fileItem,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }
      ]}
    >
      <LinearGradient
        colors={['#1a1a2e', '#13131a']}
        style={styles.fileItemInner}
      >
        <LinearGradient
          colors={getFileTypeGradient(item.type)}
          style={styles.fileIcon}
        >
          <Ionicons
            name={item.type === 'video' ? 'videocam' : 'document'}
            size={22}
            color={getFileTypeColor(item.type)}
          />
        </LinearGradient>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.fileMetaRow}>
            <View style={[styles.fileTypeTag, { backgroundColor: getFileTypeColor(item.type) + '20' }]}>
              <Text style={[styles.fileTypeText, { color: getFileTypeColor(item.type) }]}>
                {item.type.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.fileMeta}>
              {formatFileSize(item.file_size)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFile(item.file_id)}
        >
          <View style={styles.removeButtonInner}>
            <Ionicons name="close" size={16} color="#ef4444" />
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderCollectionOption = ({ item }) => {
    const isSelected = selectedCollection === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setSelectedCollection(isSelected ? null : item.id)}
      >
        {isSelected ? (
          <LinearGradient
            colors={[item.color, item.color + 'cc']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.collectionOptionSelected}
          >
            <Ionicons name={item.icon} size={18} color="#fff" />
            <Text style={styles.collectionNameSelected}>{item.name}</Text>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={styles.collectionOption}>
            <View style={[styles.collectionIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={16} color={item.color} />
            </View>
            <Text style={styles.collectionName}>{item.name}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Background */}
      <LinearGradient
        colors={['#0f0f1a', '#0a0a0f']}
        style={styles.backgroundGradient}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Files</Text>
          <Text style={styles.headerSubtitle}>
            Import videos and PDFs to track your learning progress
          </Text>
        </View>

        {/* File Picker Area */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePickFiles}
          disabled={isPicking}
        >
          <LinearGradient
            colors={['#1a1a2e', '#13131a']}
            style={styles.pickerArea}
          >
            <View style={styles.pickerBorder}>
              {isPicking ? (
                <ActivityIndicator size="large" color="#6366f1" />
              ) : (
                <>
                  <LinearGradient
                    colors={['#6366f120', '#8b5cf620']}
                    style={styles.pickerIconContainer}
                  >
                    <Ionicons name="cloud-upload-outline" size={40} color="#6366f1" />
                  </LinearGradient>
                  <Text style={styles.pickerTitle}>Tap to select files</Text>
                  <Text style={styles.pickerSubtitle}>
                    Videos: MP4, MKV, AVI, MOV, WEBM
                  </Text>
                  <Text style={styles.pickerSubtitle}>
                    Documents: PDF
                  </Text>
                  <View style={styles.pickerHint}>
                    <Ionicons name="information-circle-outline" size={14} color="#64748b" />
                    <Text style={styles.pickerHintText}>
                      You can select multiple files at once
                    </Text>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Selected Files</Text>
                <Text style={styles.sectionCount}>{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready to import</Text>
              </View>
              <TouchableOpacity onPress={clearAllFiles} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {selectedFiles.map((item, index) => (
              <View key={item.file_id}>
                {renderFileItem({ item, index })}
              </View>
            ))}
            
            {/* Add more files button */}
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={handlePickFiles}
              disabled={isPicking}
            >
              <Ionicons name="add" size={20} color="#6366f1" />
              <Text style={styles.addMoreText}>Add more files</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Collection Selection */}
        {collections.length > 0 && selectedFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add to Collection</Text>
            <Text style={styles.sectionSubtitle}>Optional - organize your files</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectionsRow}
            >
              {collections.map(item => (
                <View key={item.id.toString()}>
                  {renderCollectionOption({ item })}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Spacer for footer */}
        {selectedFiles.length > 0 && <View style={styles.footerSpacer} />}
      </ScrollView>

      {/* Bottom Action Button */}
      {selectedFiles.length > 0 && (
        <View style={styles.footer}>
          <LinearGradient
            colors={['transparent', '#0a0a0f']}
            style={styles.footerGradient}
          />
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleAddFiles}
            disabled={isLoading}
          >
            <LinearGradient
              colors={isLoading ? ['#4b5563', '#374151'] : ['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.addButtonText}>
                    Import {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  pickerArea: {
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#252530',
    overflow: 'hidden',
  },
  pickerBorder: {
    padding: 32,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#6366f140',
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  pickerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    gap: 6,
  },
  pickerHintText: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  sectionCount: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ef444420',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  fileItem: {
    marginBottom: 10,
  },
  fileItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252530',
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileTypeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fileMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  removeButton: {
    padding: 8,
  },
  removeButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef444420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f140',
    borderStyle: 'dashed',
    gap: 8,
  },
  addMoreText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  collectionsRow: {
    paddingVertical: 4,
    gap: 10,
  },
  collectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#252530',
    gap: 8,
  },
  collectionOptionSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  collectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionName: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  collectionNameSelected: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  footerSpacer: {
    height: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  footerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
