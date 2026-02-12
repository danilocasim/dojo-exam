// T055: FeedbackCard - Immediate answer feedback with correct/incorrect and explanation
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight } from 'lucide-react-native';

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
  onContinue: () => void;
  isLastQuestion?: boolean;
}

/**
 * FeedbackCard - shows answer result with explanation and continue button
 */
export const FeedbackCard: React.FC<FeedbackCardProps> = ({
  isCorrect,
  explanation,
  onContinue,
  isLastQuestion = false,
}) => {
  return (
    <View style={styles.container}>
      {/* Result badge */}
      <View
        style={[styles.resultBanner, isCorrect ? styles.resultCorrect : styles.resultIncorrect]}
      >
        <View style={styles.resultRow}>
          {isCorrect ? (
            <CheckCircle2 size={24} color={colors.success} strokeWidth={2} />
          ) : (
            <XCircle size={24} color={colors.error} strokeWidth={2} />
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
      </View>

      {/* Explanation */}
      {explanation ? (
        <View style={styles.explanationBox}>
          <View style={styles.explanationHeader}>
            <Lightbulb size={16} color={colors.primaryOrange} strokeWidth={2} />
            <Text style={styles.explanationLabel}>Explanation</Text>
          </View>
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      ) : null}

      {/* Continue button */}
      <TouchableOpacity onPress={onContinue} activeOpacity={0.8} style={styles.continueButton}>
        <Text style={styles.continueText}>{isLastQuestion ? 'View Summary' : 'Next Question'}</Text>
        <ChevronRight size={18} color={colors.textHeading} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  resultBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  resultCorrect: {
    backgroundColor: colors.successDark,
    borderColor: colors.success,
  },
  resultIncorrect: {
    backgroundColor: colors.errorDark,
    borderColor: colors.error,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
  },
  explanationBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  explanationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 14,
    color: colors.textBody,
    lineHeight: 22,
  },
  continueButton: {
    backgroundColor: colors.primaryOrange,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueText: {
    color: colors.textHeading,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default FeedbackCard;
