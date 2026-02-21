import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PDFViewer({ item, onBack, onComplete }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const webViewRef = useRef(null);

  const pdfUri = item.file_uri || item.file_path;

  useEffect(() => {
    loadPDF();
  }, []);

  const loadPDF = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if file exists
      const info = await FileSystem.getInfoAsync(pdfUri);
      if (!info.exists) {
        setError('PDF file not found');
        setIsLoading(false);
        return;
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setBase64Data(base64);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Mark as Complete',
      'Mark this PDF as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            onComplete();
            onBack();
          },
        },
      ]
    );
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      webViewRef.current?.injectJavaScript(`goToPage(${currentPage - 1}); true;`);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      webViewRef.current?.injectJavaScript(`goToPage(${currentPage + 1}); true;`);
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'pageChange') {
        setCurrentPage(data.page);
        setTotalPages(data.total);
      } else if (data.type === 'loaded') {
        setTotalPages(data.total);
        setIsLoading(false);
      } else if (data.type === 'error') {
        setError(data.message || 'Failed to render PDF');
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  };

  // HTML content with pdf.js
  const pdfViewerHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: #1e1e2e;
      overflow-x: hidden;
    }
    #pdf-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
      gap: 20px;
    }
    .page-canvas {
      max-width: 100%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      background: white;
    }
    #loading {
      color: #64748b;
      font-family: system-ui;
      text-align: center;
      padding: 40px;
    }
    #error {
      color: #ef4444;
      font-family: system-ui;
      text-align: center;
      padding: 40px;
    }
  </style>
</head>
<body>
  <div id="pdf-container">
    <div id="loading">Loading PDF...</div>
  </div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    let pdfDoc = null;
    let currentPage = 1;
    const scale = 1.5;
    const container = document.getElementById('pdf-container');
    const pageCanvases = [];

    async function loadPDF(base64Data) {
      try {
        container.innerHTML = '<div id="loading">Loading PDF...</div>';
        
        const pdfData = atob(base64Data);
        const uint8Array = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) {
          uint8Array[i] = pdfData.charCodeAt(i);
        }
        
        pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        container.innerHTML = '';
        
        // Render all pages
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          await renderPage(i);
        }
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'loaded',
          total: pdfDoc.numPages
        }));
        
        // Set up scroll listener
        window.addEventListener('scroll', handleScroll);
        
      } catch (error) {
        console.error('PDF load error:', error);
        container.innerHTML = '<div id="error">Failed to load PDF</div>';
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    }
    
    async function renderPage(pageNum) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      canvas.className = 'page-canvas';
      canvas.id = 'page-' + pageNum;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const context = canvas.getContext('2d');
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      container.appendChild(canvas);
      pageCanvases.push(canvas);
    }
    
    function handleScroll() {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      
      for (let i = 0; i < pageCanvases.length; i++) {
        const canvas = pageCanvases[i];
        const rect = canvas.getBoundingClientRect();
        
        if (rect.top < windowHeight / 2 && rect.bottom > windowHeight / 2) {
          if (currentPage !== i + 1) {
            currentPage = i + 1;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'pageChange',
              page: currentPage,
              total: pdfDoc.numPages
            }));
          }
          break;
        }
      }
    }
    
    function goToPage(pageNum) {
      if (pageNum >= 1 && pageNum <= pageCanvases.length) {
        const canvas = pageCanvases[pageNum - 1];
        canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    
    // Load the PDF
    const base64Data = '${base64Data || ''}';
    if (base64Data) {
      loadPDF(base64Data);
    }
  </script>
</body>
</html>
  `;

  if (isLoading && !base64Data) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onBack}>
            <Ionicons name="chevron-down" size={28} color="#e2e8f0" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onBack}>
            <Ionicons name="chevron-down" size={28} color="#e2e8f0" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPDF}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <Ionicons name="chevron-down" size={28} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
        <View style={styles.headerButton} />
      </View>

      {/* PDF WebView */}
      <View style={styles.pdfContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Rendering pages...</Text>
          </View>
        )}
        {base64Data && (
          <WebView
            ref={webViewRef}
            source={{ html: pdfViewerHTML }}
            style={styles.webview}
            originWhitelist={['*']}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit
            scrollEnabled
            showsVerticalScrollIndicator
            onError={(e) => setError('WebView error')}
          />
        )}
      </View>

      {/* Footer with page info and complete button */}
      <View style={styles.footer}>
        {totalPages > 0 && (
          <View style={styles.pageNav}>
            <TouchableOpacity
              style={[styles.navButton, currentPage <= 1 && styles.navButtonDisabled]}
              onPress={goToPrevPage}
              disabled={currentPage <= 1}
            >
              <Ionicons name="chevron-back" size={20} color={currentPage <= 1 ? '#64748b' : '#e2e8f0'} />
            </TouchableOpacity>
            <Text style={styles.pageInfo}>
              {currentPage} / {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.navButton, currentPage >= totalPages && styles.navButtonDisabled]}
              onPress={goToNextPage}
              disabled={currentPage >= totalPages}
            >
              <Ionicons name="chevron-forward" size={20} color={currentPage >= totalPages ? '#64748b' : '#e2e8f0'} />
            </TouchableOpacity>
          </View>
        )}
        
        {item.is_completed ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.completeButtonText}>Mark Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#13131a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#64748b',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#1e1e2e',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    zIndex: 10,
  },
  webview: {
    flex: 1,
    backgroundColor: '#1e1e2e',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#13131a',
    borderTopWidth: 1,
    borderTopColor: '#1e1e2e',
    gap: 12,
  },
  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e1e2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b98120',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
  },
  completedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
