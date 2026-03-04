import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useItems } from '../context/ItemsContext';
import { pickFiles, formatFileSize } from '../services/fileService';

export default function AddFilesScreen({ navigation }) {
  const { collections, addItems } = useItems();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

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

  const renderFileItem = ({ item }) => (
    <View style={styles.fileItem}>
      <View style={styles.fileIcon}>
        <Ionicons
          name={item.type === 'video' ? 'videocam' : 'document'}
          size={24}
          color={item.type === 'video' ? '#6366f1' : '#f59e0b'}
        />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileMeta}>
          {item.type.toUpperCase()} • {formatFileSize(item.file_size)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFile(item.file_id)}
      >
        <Ionicons name="close-circle" size={24} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const renderCollectionOption = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.collectionOption,
        selectedCollection === item.id && styles.collectionSelected,
      ]}
      onPress={() => setSelectedCollection(
        selectedCollection === item.id ? null : item.id
      )}
    >
      <View style={[styles.collectionIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <Text style={styles.collectionName}>{item.name}</Text>
      {selectedCollection === item.id && (
        <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* File Picker Section */}
      <TouchableOpacity
        style={styles.pickerArea}
        onPress={handlePickFiles}
        disabled={isPicking}
      >
        {isPicking ? (
          <ActivityIndicator size="large" color="#6366f1" />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={48} color="#6366f1" />
            <Text style={styles.pickerTitle}>Tap to select files</Text>
            <Text style={styles.pickerSubtitle}>
              Supports MP4, MKV, AVI, MOV, WEBM, PDF
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selected Files ({selectedFiles.length})
          </Text>
          <FlatList
            data={selectedFiles}
            renderItem={renderFileItem}
            keyExtractor={(item) => item.file_id}
            style={styles.fileList}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Collection Selection */}
      {collections.length > 0 && selectedFiles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add to Collection (Optional)</Text>
          <FlatList
            data={collections}
            renderItem={renderCollectionOption}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.collectionsRow}
          />
        </View>
      )}

      {/* Add Button */}
      {selectedFiles.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.addButton, isLoading && styles.addButtonDisabled]}
            onPress={handleAddFiles}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.addButtonText}>
                  Add {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
                </Text>
              </>
            )}
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
  pickerArea: {
    margin: 16,
    padding: 40,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1e1e2e',
    backgroundColor: '#13131a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 16,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  fileList: {
    backgroundColor: '#13131a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#e2e8f0',
  },
  fileMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  collectionsRow: {
    paddingVertical: 4,
  },
  collectionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131a',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  collectionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f110',
  },
  collectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  collectionName: {
    fontSize: 14,
    color: '#e2e8f0',
    marginRight: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#0a0a0f',
    borderTopWidth: 1,
    borderTopColor: '#1e1e2e',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
