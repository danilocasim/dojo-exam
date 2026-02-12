// T043: QuestionCard component with option selection
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Question, QuestionOption, QuestionType } from '../storage/schema';

export interface QuestionCardProps {
  question: Question;
  selectedAnswers: string[];
  onSelectAnswer: (optionId: string) => void;
  showResult?: boolean;
  isCorrect?: boolean | null;
  disabled?: boolean;
}

// Color constants
const colors = {
  slate950: '#020617',
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  white: '#ffffff',
  orange500: '#f97316',
  orange950: '#431407',
  orange100: '#ffedd5',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald800: '#065f46',
  emerald950: '#022c22',
  emerald300: '#6ee7b7',
  red500: '#ef4444',
  red600: '#dc2626',
  red800: '#991b1b',
  red950: '#450a0a',
  red300: '#fca5a5',
  orange400: '#fb923c',
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
        return { backgroundColor: colors.emerald950, borderColor: colors.emerald600 };
      }
      if (isSelected && !isCorrectOption) {
        return { backgroundColor: colors.red950, borderColor: colors.red600 };
      }
      return { backgroundColor: colors.slate900, borderColor: colors.slate700 };
    }

    if (isSelected) {
      return { backgroundColor: colors.orange950, borderColor: colors.orange500 };
    }

    return { backgroundColor: colors.slate900, borderColor: colors.slate700 };
  };

  const getCheckboxStyle = (option: QuestionOption) => {
    const isSelected = selectedAnswers.includes(option.id);
    const isCorrectOption = question.correctAnswers.includes(option.id);

    if (showResult) {
      if (isCorrectOption) {
        return { backgroundColor: colors.emerald500, borderColor: colors.emerald500 };
      }
      if (isSelected && !isCorrectOption) {
        return { backgroundColor: colors.red500, borderColor: colors.red500 };
      }
      return { backgroundColor: colors.slate800, borderColor: colors.slate600 };
    }

    if (isSelected) {
      return { backgroundColor: colors.orange500, borderColor: colors.orange500 };
    }

    return { backgroundColor: colors.slate800, borderColor: colors.slate600 };
  };

  const getOptionTextColor = (option: QuestionOption) => {
    const isSelected = selectedAnswers.includes(option.id);
    const isCorrectOption = question.correctAnswers.includes(option.id);

    if (showResult) {
      if (isCorrectOption) return colors.emerald300;
      if (isSelected && !isCorrectOption) return colors.red300;
    }
    if (isSelected) return colors.orange100;
    return colors.slate300;
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
                {selectedAnswers.includes(option.id) && <Text style={styles.checkmark}>✓</Text>}
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
            <View
              style={[
                styles.resultIcon,
                { backgroundColor: isCorrect ? colors.emerald500 : colors.red500 },
              ]}
            >
              <Text style={styles.resultIconText}>{isCorrect ? '✓' : '✗'}</Text>
            </View>
            <Text
              style={[styles.resultText, { color: isCorrect ? colors.emerald300 : colors.red300 }]}
            >
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </Text>
          </View>
        )}

        {/* Explanation */}
        {showResult && question.explanation && (
          <View style={styles.explanationBox}>
            <View style={styles.explanationHeader}>
              <Text style={styles.explanationEmoji}>💡</Text>
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
    backgroundColor: colors.slate950,
  },
  content: {
    padding: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: colors.slate800,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    color: colors.slate400,
    fontWeight: '500',
  },
  questionBox: {
    backgroundColor: colors.slate900,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.slate800,
  },
  questionText: {
    fontSize: 18,
    color: colors.white,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquare: {
    borderRadius: 6,
  },
  checkboxRound: {
    borderRadius: 12,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
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
    color: colors.slate500,
  },
  resultContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  resultCorrect: {
    backgroundColor: colors.emerald950,
    borderColor: colors.emerald800,
  },
  resultIncorrect: {
    backgroundColor: colors.red950,
    borderColor: colors.red800,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultIconText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
  },
  explanationBox: {
    marginTop: 16,
    backgroundColor: colors.slate900,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate800,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.orange400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  explanationText: {
    fontSize: 14,
    color: colors.slate300,
    lineHeight: 24,
  },
});

export default QuestionCard;
