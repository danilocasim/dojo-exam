// T055: FeedbackCard - Immediate answer feedback with correct/incorrect and explanation
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronRight,
  Trophy,
  Maximize2,
} from 'lucide-react-native';
import { RichExplanation, ExplanationBlock } from './RichExplanation';
import { ExplanationModal } from './ExplanationModal';

// AWS Modern Color Palette
const colors = {
  background: '#232F3E',
  surface: '#1F2937',
  borderDefault: '#374151',
  textHeading: '#F9FAFB',
  textBody: '#D1D5DB',
  textMuted: '#9CA3AF',
  primaryOrange: '#FF9900',
  success: '#10B981',
  successLight: '#6EE7B7',
  successDark: 'rgba(16, 185, 129, 0.15)',
  error: '#EF4444',
  errorLight: '#FCA5A5',
  errorDark: 'rgba(239, 68, 68, 0.15)',
};

export interface FeedbackCardProps {
  isCorrect: boolean;
  explanation: string;
  explanationBlocks?: ExplanationBlock[] | null;
  onContinue: () => void;
  isLastQuestion?: boolean;
}

/**
 * FeedbackCard - shows answer result with explanation and continue button
 */
export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  isCorrect,
  explanation,
  explanationBlocks,
  onContinue,
  isLastQuestion = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenModal = useCallback(() => setModalVisible(true), []);
  const handleCloseModal = useCallback(() => setModalVisible(false), []);

  return (
    <View style={styles.container}>
      {/* Combined result + explanation card */}
      <View
        style={[styles.feedbackCard, isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}
      >
        {/* Accent strip */}
        <View
          style={[
            styles.accentStrip,
            { backgroundColor: isCorrect ? colors.success : colors.error },
          ]}
        />

        {/* Result header */}
        <View style={styles.resultRow}>
          {isCorrect ? (
            <View style={styles.iconWrap}>
              <CheckCircle2 size={22} color={colors.success} strokeWidth={2.5} />
            </View>
          ) : (
            <View style={styles.iconWrap}>
              <XCircle size={22} color={colors.error} strokeWidth={2.5} />
            </View>
          )}
          <Text
            style={[
              styles.resultText,
              { color: isCorrect ? colors.successLight : colors.errorLight },
            ]}
          >
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
        </View>

        {/* Explanation - scrollable if long */}
        {explanation ? (
          <View style={styles.explanationSection}>
            <View style={styles.explanationHeader}>
              <View style={styles.explanationHeaderLeft}>
                <Lightbulb size={14} color={colors.primaryOrange} strokeWidth={2} />
                <Text style={styles.explanationLabel}>Explanation</Text>
              </View>
              <TouchableOpacity
                onPress={handleOpenModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View explanation full screen"
              >
                <Maximize2 size={16} color={colors.primaryOrange} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.explanationScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <RichExplanation
                explanation={explanation}
                explanationBlocks={explanationBlocks}
                textStyle={styles.explanationText}
              />
            </ScrollView>
          </View>
        ) : null}
      </View>

      {/* Continue button */}
      <TouchableOpacity onPress={onContinue} activeOpacity={0.8} style={styles.continueButton}>
        {isLastQuestion ? (
          <>
            <Trophy size={18} color={colors.textHeading} strokeWidth={2} />
            <Text style={styles.continueText}>View Summary</Text>
          </>
        ) : (
          <>
            <Text style={styles.continueText}>Next Question</Text>
            <ChevronRight size={18} color={colors.textHeading} strokeWidth={2} />
          </>
        )}
      </TouchableOpacity>

      {/* Full-screen explanation modal */}
      <ExplanationModal
        visible={modalVisible}
        explanation={explanation}
        explanationBlocks={explanationBlocks}
        onClose={handleCloseModal}
      />
    </View>
  );
};

const { height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenHeight < 700;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: isSmallDevice ? 4 : 8,
    gap: isSmallDevice ? 6 : 10,
  },
  feedbackCard: {
    borderRadius: 14,
    padding: isSmallDevice ? 12 : 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  feedbackCorrect: {
    backgroundColor: colors.successDark,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  feedbackIncorrect: {
    backgroundColor: colors.errorDark,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  explanationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  explanationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  explanationScroll: {
    maxHeight: isSmallDevice ? 80 : 120,
  },
  explanationText: {
    fontSize: 14,
    color: colors.textBody,
    lineHeight: 21,
  },
  continueButton: {
    backgroundColor: colors.primaryOrange,
    paddingVertical: isSmallDevice ? 12 : 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: isSmallDevice ? 2 : 4,
  },
  continueText: {
    color: colors.textHeading,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default FeedbackCard;
