// T045: QuestionNavigator component (flag, jump to question)
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { ExamAnswer } from '../storage/schema';

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
  black: '#000000',
  orange500: '#f97316',
  orange600: '#ea580c',
  orange900: '#7c2d12',
  orange400: '#fb923c',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald900: '#064e3b',
  emerald400: '#34d399',
  transparent: 'transparent',
};

export interface QuestionNavigatorProps {
  answers: ExamAnswer[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onFlag: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * QuestionNavigator - bottom navigation bar for exam
 * Shows prev/next buttons, flag button, and question grid
 */
export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  answers,
  currentIndex,
  onNavigate,
  onFlag,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}) => {
  const [showGrid, setShowGrid] = useState(false);

  const currentAnswer = answers[currentIndex];
  const isFlagged = currentAnswer?.isFlagged ?? false;
  const answeredCount = answers.filter((a) => a.answeredAt !== null).length;
  const flaggedCount = answers.filter((a) => a.isFlagged).length;

  const getQuestionStyle = (answer: ExamAnswer, index: number) => {
    const isCurrentQuestion = index === currentIndex;
    const isAnswered = answer.answeredAt !== null;
    const isQuestionFlagged = answer.isFlagged;

    let bgColor = colors.slate700;
    let borderColor = colors.transparent;

    if (isAnswered) {
      bgColor = colors.emerald600;
    }
    if (isQuestionFlagged) {
      bgColor = isAnswered ? colors.orange500 : colors.orange600;
    }
    if (isCurrentQuestion) {
      borderColor = colors.white;
    }

    return { backgroundColor: bgColor, borderColor };
  };

  const getQuestionTextColor = (answer: ExamAnswer) => {
    return answer.answeredAt !== null || answer.isFlagged ? colors.white : colors.slate400;
  };

  return (
    <>
      {/* Main navigation bar */}
      <View style={styles.container}>
        {/* Progress info */}
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Question <Text style={styles.progressCurrent}>{currentIndex + 1}</Text>
            <Text style={styles.progressTotal}> / {answers.length}</Text>
          </Text>
          <View style={styles.badges}>
            <View style={styles.answeredBadge}>
              <Text style={styles.answeredBadgeText}>✓ {answeredCount}</Text>
            </View>
            {flaggedCount > 0 && (
              <View style={styles.flaggedBadge}>
                <Text style={styles.flaggedBadgeText}>🚩 {flaggedCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(answeredCount / answers.length) * 100}%` },
            ]}
          />
        </View>

        {/* Navigation buttons */}
        <View style={styles.navButtons}>
          {/* Previous */}
          <TouchableOpacity
            onPress={onPrevious}
            disabled={!hasPrevious}
            activeOpacity={0.7}
            style={[
              styles.navButton,
              hasPrevious ? styles.navButtonActive : styles.navButtonInactive,
            ]}
          >
            <Text
              style={[
                styles.navButtonText,
                { color: hasPrevious ? colors.slate300 : colors.slate600 },
              ]}
            >
              ← Prev
            </Text>
          </TouchableOpacity>

          {/* Center controls */}
          <View style={styles.centerControls}>
            <TouchableOpacity
              onPress={onFlag}
              activeOpacity={0.7}
              style={[
                styles.iconButton,
                isFlagged ? styles.iconButtonFlagged : styles.iconButtonDefault,
              ]}
            >
              <Text
                style={[
                  styles.iconButtonText,
                  { color: isFlagged ? colors.orange400 : colors.slate400 },
                ]}
              >
                {isFlagged ? '🚩' : '⚑'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowGrid(true)}
              activeOpacity={0.7}
              style={[styles.iconButton, styles.iconButtonDefault]}
            >
              <Text style={styles.iconButtonText}>⊞</Text>
            </TouchableOpacity>
          </View>

          {/* Next */}
          <TouchableOpacity
            onPress={onNext}
            disabled={!hasNext}
            activeOpacity={0.8}
            style={[styles.navButton, hasNext ? styles.nextButtonActive : styles.navButtonInactive]}
          >
            <Text
              style={[styles.navButtonText, { color: hasNext ? colors.white : colors.slate600 }]}
            >
              Next →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Question grid modal */}
      <Modal
        visible={showGrid}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGrid(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowGrid(false)}>
          <View style={styles.modalDimmer} />
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Jump to Question</Text>
                  <Text style={styles.modalSubtitle}>
                    {answeredCount} of {answers.length} answered
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowGrid(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.slate700 }]} />
                  <Text style={styles.legendText}>Unanswered</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.emerald600 }]} />
                  <Text style={styles.legendText}>Answered</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.orange500 }]} />
                  <Text style={styles.legendText}>Flagged</Text>
                </View>
              </View>

              {/* Question grid */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                <View style={styles.questionGrid}>
                  {answers.map((answer, index) => (
                    <TouchableOpacity
                      key={answer.id}
                      onPress={() => {
                        onNavigate(index);
                        setShowGrid(false);
                      }}
                      style={[styles.gridButton, getQuestionStyle(answer, index)]}
                    >
                      <Text
                        style={[styles.gridButtonText, { color: getQuestionTextColor(answer) }]}
                      >
                        {index + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.slate900,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate800,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    color: colors.slate400,
    fontSize: 14,
  },
  progressCurrent: {
    color: colors.white,
    fontWeight: '600',
  },
  progressTotal: {
    color: colors.slate500,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  answeredBadge: {
    backgroundColor: colors.emerald900,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  answeredBadgeText: {
    color: colors.emerald400,
    fontSize: 12,
    fontWeight: '600',
  },
  flaggedBadge: {
    backgroundColor: colors.orange900,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  flaggedBadgeText: {
    color: colors.orange400,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.slate800,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.emerald500,
    borderRadius: 3,
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navButtonActive: {
    backgroundColor: colors.slate800,
  },
  navButtonInactive: {
    backgroundColor: colors.slate900,
  },
  nextButtonActive: {
    backgroundColor: colors.orange500,
  },
  navButtonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  centerControls: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  iconButtonDefault: {
    backgroundColor: colors.slate800,
  },
  iconButtonFlagged: {
    backgroundColor: colors.orange900,
  },
  iconButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate400,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.black,
  },
  modalDimmer: {
    flex: 1,
    opacity: 0.7,
  },
  modalContent: {
    backgroundColor: colors.slate900,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.slate800,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.slate500,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: colors.slate400,
    fontSize: 18,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    backgroundColor: colors.slate950,
    padding: 12,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: colors.slate500,
  },
  questionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  gridButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QuestionNavigator;
