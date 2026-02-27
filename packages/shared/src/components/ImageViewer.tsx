/**
 * ImageViewer — Full-screen modal for viewing explanation images with zoom.
 * Displayed when the user taps an image in the explanation.
 */
import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

const colors = {
  background: 'rgba(0, 0, 0, 0.95)',
  textHeading: '#F9FAFB',
  textMuted: '#9CA3AF',
  primaryOrange: '#FF9900',
};

export interface ImageViewerProps {
  visible: boolean;
  uri: string;
  alt?: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ visible, uri, alt, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
          {alt ? (
            <Text style={styles.altText} numberOfLines={1}>
              {alt}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.closeButton}
          >
            <X size={24} color={colors.textHeading} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Zoomable image */}
        <ScrollView
          contentContainerStyle={styles.imageContainer}
          maximumZoomScale={4}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bouncesZoom
          centerContent
        >
          <Image
            source={{ uri }}
            style={{
              width: screenWidth,
              height: screenHeight * 0.75,
            }}
            resizeMode="contain"
            accessibilityLabel={alt || 'Full-screen image'}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  altText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    marginRight: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ImageViewer;
