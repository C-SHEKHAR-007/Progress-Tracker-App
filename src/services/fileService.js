import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

// Supported file types
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'];
const PDF_EXTENSIONS = ['.pdf'];

/**
 * Generate a unique file ID
 */
export const generateFileId = () => {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get file type based on extension
 */
export const getFileType = (filename) => {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  return null;
};

/**
 * Check if file type is supported
 */
export const isSupportedFile = (filename) => {
  return getFileType(filename) !== null;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Pick files using document picker
 * Returns array of file objects ready for database
 */
export const pickFiles = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/*', 'application/pdf'],
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return [];
    }

    const files = result.assets || [result];
    const processedFiles = [];

    for (const file of files) {
      const type = getFileType(file.name);
      if (!type) continue;

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      
      processedFiles.push({
        name: file.name,
        type,
        file_id: generateFileId(),
        file_uri: file.uri,
        file_path: file.uri, // On mobile, URI is the path
        file_size: fileInfo.size || file.size || 0,
        duration: 0, // Will be set when video loads
      });
    }

    return processedFiles;
  } catch (error) {
    console.error('Error picking files:', error);
    throw error;
  }
};

/**
 * Pick videos from media library
 */
export const pickFromMediaLibrary = async () => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission not granted');
    }

    const media = await MediaLibrary.getAssetsAsync({
      mediaType: ['video'],
      first: 100,
      sortBy: ['creationTime'],
    });

    return media.assets.map(asset => ({
      id: asset.id,
      name: asset.filename,
      type: 'video',
      uri: asset.uri,
      duration: asset.duration,
      width: asset.width,
      height: asset.height,
      createdAt: asset.creationTime,
    }));
  } catch (error) {
    console.error('Error accessing media library:', error);
    throw error;
  }
};

/**
 * Convert media library asset to importable item
 */
export const convertMediaAssetToItem = async (asset) => {
  // Get file info for the asset
  const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
  
  return {
    name: asset.name || asset.filename,
    type: 'video',
    file_id: generateFileId(),
    file_uri: assetInfo.localUri || asset.uri,
    file_path: assetInfo.localUri || asset.uri,
    file_size: assetInfo.fileSize || 0,
    duration: asset.duration || 0,
  };
};

/**
 * Check if file exists at URI
 */
export const fileExists = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
};

/**
 * Get file info
 */
export const getFileInfo = async (uri) => {
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
};

/**
 * Copy file to app's document directory (for persistence)
 */
export const copyToAppStorage = async (sourceUri, filename) => {
  try {
    const destDir = FileSystem.documentDirectory + 'media/';
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(destDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    }

    const destUri = destDir + filename;
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destUri,
    });

    return destUri;
  } catch (error) {
    console.error('Error copying file:', error);
    throw error;
  }
};

/**
 * Delete file from app storage
 */
export const deleteFromAppStorage = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri);
    }
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Get content type for a file
 */
export const getContentType = (type) => {
  switch (type) {
    case 'video':
      return 'video/mp4';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
};
