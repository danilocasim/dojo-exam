/**
 * ExplanationModal — Full-screen scrollable explanation viewer.
 * Used in Practice mode (and anywhere explanations appear) for better readability.
 *
 * Features:
 * - Blur/dim background
 * - Scrollable content with safe-area compliance
 * - Links remain clickable
 * - Images remain tappable with full-screen zoom
 * - Matches existing dark theme
 */
import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Lightbulb } from 'lucide-react-native';
import { RichExplanation, ExplanationBlock } from './RichExplanation';
import { ImageViewer } from './ImageViewer';

// ─── Colors (match existing AWS palette) ────────────────────────────────────────

const colors = {
  background: '#232F3E',
  surface: '#1F2937',
  borderDefault: '#374151',
  textHeading: '#F9FAFB',
  textBody: '#D1D5DB',
  textMuted: '#9CA3AF',
  primaryOrange: '#FF9900',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export interface ExplanationModalProps {
  visible: boolean;
  explanation: string;
  explanationBlocks?: ExplanationBlock[] | null;
  onClose: () => void;
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({
  visible,
  explanation,
  explanationBlocks,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [imageViewerState, setImageViewerState] = useState<{
    visible: boolean;
    uri: string;
    alt?: string;
  }>({ visible: false, uri: '' });

  const handleImagePress = useCallback((uri: string, alt?: string) => {
    setImageViewerState({ visible: true, uri, alt });
  }, []);

  const handleImageViewerClose = useCallback(() => {
    setImageViewerState({ visible: false, uri: '' });
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header bar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Lightbulb size={18} color={colors.primaryOrange} strokeWidth={2} />
              <Text style={styles.headerTitle}>Explanation</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close explanation"
            >
              <X size={22} color={colors.textHeading} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            indicatorStyle="white"
          >
            <RichExplanation
              explanation={explanation}
              explanationBlocks={explanationBlocks}
              textStyle={styles.explanationText}
              onImagePress={handleImagePress}
            />
          </ScrollView>
        </View>
      </View>

      {/* Image full-screen viewer */}
      <ImageViewer
        visible={imageViewerState.visible}
        uri={imageViewerState.uri}
        alt={imageViewerState.alt}
        onClose={handleImageViewerClose}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 40,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textHeading,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  explanationText: {
    fontSize: 16,
    color: colors.textBody,
    lineHeight: 26,
  },
});

export default ExplanationModal;
