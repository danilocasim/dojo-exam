// T043: QuestionCard component with option selection
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Check, X, Lightbulb, CheckCircle2, XCircle } from 'lucide-react-native';
import { Question, QuestionOption, QuestionType } from '../storage/schema';

export interface QuestionCardProps {
  question: Question;
  selectedAnswers: string[];
  onSelectAnswer: (optionId: string) => void;
  showResult?: boolean;
  isCorrect?: boolean | null;
  disabled?: boolean;
}

// AWS Dark Color Palette
const colors = {
  // Backgrounds
  background: '#232F3E', // AWS Squid Ink
  surface: '#161E2D', // Deep Navy
  surfaceHover: '#1D2939',
  surfaceSelected: '#2D3B4E',
  // Borders
  borderDefault: '#374151',
  borderSubtle: '#2D3B4E',
  borderAccent: '#FF9900', // AWS Orange
  // Text
  textHeading: '#FFFFFF',
  textBody: '#D1D5DB', // Light Gray
  textMuted: '#9CA3AF',
  textDisabled: '#6B7280',
  // Accents
  primaryOrange: '#FF9900', // AWS Orange
  secondaryOrange: '#EC7211', // Darker Orange
  // Status
  success: '#059669', // Professional Emerald
  successBg: '#064E3B',
  successText: '#6EE7B7',
  error: '#DC2626', // Professional Red
  errorBg: '#7F1D1D',
  errorText: '#FCA5A5',
};

/**
 * QuestionCard - displays a question with selectable options
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedAnswers,
  onSelectAnswer,
  showResult = false,
  isCorrect = null,
  disabled = false,
}) => {
  const isMultipleChoice = question.type === 'MULTIPLE_CHOICE';

  const handleOptionPress = (optionId: string) => {
    console.warn(`[QuestionCard] Option pressed: ${optionId}, disabled: ${disabled}`);
    if (disabled) return;
    onSelectAnswer(optionId);
  };

  const getOptionStyle = (option: QuestionOption) => {
    const isSelected = selectedAnswers.includes(option.id);
    const isCorrectOption = question.correctAnswers.includes(option.id);

    if (showResult) {
      if (isCorrectOption) {
        return { backgroundColor: colors.successBg, borderColor: colors.success };
      }
      if (isSelected && !isCorrectOption) {
        return { backgroundColor: colors.errorBg, borderColor: colors.error };
      }
      return { backgroundColor: colors.surface, borderColor: colors.borderDefault };
    }

    if (isSelected) {
      return {
        backgroundColor: colors.surfaceSelected,
        borderColor: colors.borderAccent,
        // Subtle glow effect via shadow
        shadowColor: colors.primaryOrange,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      };
    }

    return { backgroundColor: colors.surface, borderColor: colors.borderDefault };
  };

  const getCheckboxStyle = (option: QuestionOption) => {
    const isSelected = selectedAnswers.includes(option.id);
    const isCorrectOption = question.correctAnswers.includes(option.id);

    if (showResult) {
      if (isCorrectOption) {
        return { backgroundColor: colors.success, borderColor: colors.success };
      }
      if (isSelected && !isCorrectOption) {
        return { backgroundColor: colors.error, borderColor: colors.error };
      }
      return { backgroundColor: 'transparent', borderColor: colors.borderDefault };
    }

    if (isSelected) {
      return { backgroundColor: colors.primaryOrange, borderColor: colors.primaryOrange };
    }

    return { backgroundColor: 'transparent', borderColor: colors.textMuted };
  };

  const getOptionTextColor = (option: QuestionOption) => {
    const isSelected = selectedAnswers.includes(option.id);
    const isCorrectOption = question.correctAnswers.includes(option.id);

    if (showResult) {
      if (isCorrectOption) return colors.successText;
      if (isSelected && !isCorrectOption) return colors.errorText;
    }
    if (isSelected) return colors.textHeading;
    return colors.textBody;
  };

  const getQuestionTypeLabel = (type: QuestionType): string => {
    switch (type) {
      case 'SINGLE_CHOICE':
        return 'Select one answer';
      case 'MULTIPLE_CHOICE':
        return 'Select all that apply';
      case 'TRUE_FALSE':
        return 'True or False';
      default:
        return '';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Question type badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getQuestionTypeLabel(question.type)}</Text>
          </View>
        </View>

        {/* Question text */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{question.text}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleOptionPress(option.id)}
              disabled={disabled}
              activeOpacity={disabled ? 1 : 0.7}
              style={[styles.optionButton, getOptionStyle(option)]}
            >
              {/* Checkbox/Radio */}
              <View
                style={[
                  styles.checkbox,
                  isMultipleChoice ? styles.checkboxSquare : styles.checkboxRound,
                  getCheckboxStyle(option),
                ]}
              >
                {selectedAnswers.includes(option.id) && (
                  <Check size={14} color={colors.textHeading} strokeWidth={3} />
                )}
              </View>

              {/* Option text */}
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionText, { color: getOptionTextColor(option) }]}>
                  <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}. </Text>
                  {option.text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Result indicator */}
        {showResult && isCorrect !== null && (
          <View
            style={[
              styles.resultContainer,
              isCorrect ? styles.resultCorrect : styles.resultIncorrect,
            ]}
          >
            <View style={styles.resultIcon}>
              {isCorrect ? (
                <CheckCircle2 size={24} color={colors.success} strokeWidth={2} />
              ) : (
                <XCircle size={24} color={colors.error} strokeWidth={2} />
              )}
            </View>
            <Text
              style={[
                styles.resultText,
                { color: isCorrect ? colors.successText : colors.errorText },
              ]}
            >
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </Text>
          </View>
        )}

        {/* Explanation */}
        {showResult && question.explanation && (
          <View style={styles.explanationBox}>
            <View style={styles.explanationHeader}>
              <View style={styles.explanationIcon}>
                <Lightbulb size={16} color={colors.primaryOrange} strokeWidth={2} />
              </View>
              <Text style={styles.explanationLabel}>Explanation</Text>
            </View>
            <Text style={styles.explanationText}>{question.explanation}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  questionBox: {
    marginBottom: 32,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  questionText: {
    fontSize: 18,
    color: colors.textHeading,
    lineHeight: 28,
    fontWeight: '400',
    fontFamily: 'System',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquare: {
    borderRadius: 6,
  },
  checkboxRound: {
    borderRadius: 11,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  optionLetter: {
    fontWeight: '600',
    color: colors.textMuted,
  },
  resultContainer: {
    marginTop: 28,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  resultCorrect: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  resultIncorrect: {
    backgroundColor: colors.errorBg,
    borderColor: colors.error,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '600',
  },
  explanationBox: {
    marginTop: 24,
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationIcon: {
    marginRight: 10,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryOrange,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  explanationText: {
    fontSize: 15,
    color: colors.textBody,
    lineHeight: 24,
  },
});

export default QuestionCard;
