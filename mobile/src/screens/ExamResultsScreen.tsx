// T046: ExamResultsScreen with score and domain breakdown
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { getExamResult, formatTimeSpent } from '../services';
import { ExamResult, DomainScore } from '../storage/schema';
import { useExamStore } from '../stores';

// Color constants
const colors = {
  slate950: '#020617',
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  white: '#ffffff',
  orange500: '#f97316',
  orange400: '#fb923c',
  orange300: '#fdba74',
  orange200: '#fed7aa',
  orange900: '#7c2d12',
  orange950: '#431407',
  emerald600: '#059669',
  emerald500: '#10b981',
  emerald400: '#34d399',
  emerald950: '#022c22',
  red600: '#dc2626',
  red500: '#ef4444',
  red400: '#f87171',
  red900: '#7f1d1d',
  red950: '#450a0a',
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExamResults'>;
type ResultsRouteProp = RouteProp<RootStackParamList, 'ExamResults'>;

/**
 * ExamResultsScreen - displays exam score and domain breakdown
 */
export const ExamResultsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResultsRouteProp>();
  const { attemptId } = route.params;

  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get result from store if available, otherwise fetch
  const storedResult = useExamStore((state) => state.result);
  const resetExamState = useExamStore((state) => state.resetExamState);

  useEffect(() => {
    loadResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const loadResult = async () => {
    // Use stored result if it matches
    if (storedResult && storedResult.examAttemptId === attemptId) {
      setResult(storedResult);
      setLoading(false);
      return;
    }

    // Otherwise fetch from database
    try {
      setLoading(true);
      const examResult = await getExamResult(attemptId);
      setResult(examResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load results';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    resetExamState();
    navigation.navigate('Home');
  };

  const handleReviewExam = () => {
    navigation.navigate('ReviewScreen', { attemptId });
  };

  const getScoreColor = (score: number, passingScore: number = 70) => {
    if (score >= passingScore) return colors.emerald400;
    if (score >= passingScore - 10) return colors.orange400;
    return colors.red400;
  };

  const getDomainBarColor = (percentage: number) => {
    if (percentage >= 70) return colors.emerald500;
    if (percentage >= 50) return colors.orange500;
    return colors.red500;
  };

  const getDomainTextColor = (percentage: number) => {
    if (percentage >= 70) return colors.emerald400;
    if (percentage >= 50) return colors.orange400;
    return colors.red400;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
        <Text style={styles.loadingText}>Calculating results...</Text>
      </SafeAreaView>
    );
  }

  if (error || !result) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorEmoji}>❌</Text>
        </View>
        <Text style={styles.errorText}>{error ?? 'Failed to load results'}</Text>
        <TouchableOpacity onPress={handleGoHome} activeOpacity={0.8} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, result.passed ? styles.headerPassed : styles.headerFailed]}>
        {/* Status badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIcon,
              result.passed ? styles.statusIconPassed : styles.statusIconFailed,
            ]}
          >
            <Text style={styles.statusEmoji}>{result.passed ? '🎉' : '📚'}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              result.passed ? styles.statusBadgePassed : styles.statusBadgeFailed,
            ]}
          >
            <Text style={styles.statusText}>{result.passed ? 'PASSED' : 'NOT PASSED'}</Text>
          </View>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreValue, { color: getScoreColor(result.score) }]}>
              {result.score}
            </Text>
            <Text style={styles.scorePercent}>%</Text>
          </View>
          <Text style={styles.passingNote}>Passing: 70%</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.emerald400 }]}>
            {result.correctAnswers}
          </Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.red400 }]}>
            {result.totalQuestions - result.correctAnswers}
          </Text>
          <Text style={styles.statLabel}>Incorrect</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.orange400 }]}>
            {formatTimeSpent(result.timeSpentMs)}
          </Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
      </View>

      {/* Domain Performance */}
      <View style={styles.domainCard}>
        <Text style={styles.sectionLabel}>Domain Performance</Text>

        {result.domainBreakdown.map((domain: DomainScore, index: number) => (
          <View key={domain.domainId} style={index > 0 ? styles.domainItemSpaced : undefined}>
            <View style={styles.domainHeader}>
              <Text style={styles.domainName} numberOfLines={1}>
                {domain.domainName}
              </Text>
              <Text
                style={[styles.domainPercent, { color: getDomainTextColor(domain.percentage) }]}
              >
                {domain.percentage}%
              </Text>
            </View>
            <View style={styles.domainBarContainer}>
              <View
                style={[
                  styles.domainBarFill,
                  {
                    width: `${domain.percentage}%`,
                    backgroundColor: getDomainBarColor(domain.percentage),
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Weak Areas */}
      {result.domainBreakdown.some((d) => d.percentage < 70) && (
        <View style={styles.weakAreasCard}>
          <View style={styles.weakAreasHeader}>
            <Text style={styles.weakAreasEmoji}>📚</Text>
            <Text style={styles.weakAreasTitle}>Areas to Improve</Text>
          </View>
          {result.domainBreakdown
            .filter((d) => d.percentage < 70)
            .sort((a, b) => a.percentage - b.percentage)
            .map((domain) => (
              <View key={domain.domainId} style={styles.weakAreaItem}>
                <View style={styles.weakAreaDot} />
                <Text style={styles.weakAreaName}>{domain.domainName}</Text>
                <Text style={styles.weakAreaPercent}>{domain.percentage}%</Text>
              </View>
            ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleReviewExam}
          activeOpacity={0.8}
          style={styles.reviewButton}
        >
          <Text style={styles.reviewButtonText}>Review Answers</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleGoHome} activeOpacity={0.8} style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate950,
  },
  container: {
    flex: 1,
    backgroundColor: colors.slate950,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate950,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.orange500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingText: {
    color: colors.slate400,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate950,
    padding: 24,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.red900,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorEmoji: {
    fontSize: 30,
  },
  errorText: {
    color: colors.red400,
    fontSize: 18,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: colors.slate800,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerPassed: {
    backgroundColor: colors.emerald950,
  },
  headerFailed: {
    backgroundColor: colors.red950,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusIconPassed: {
    backgroundColor: colors.emerald600,
  },
  statusIconFailed: {
    backgroundColor: colors.red600,
  },
  statusEmoji: {
    fontSize: 28,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgePassed: {
    backgroundColor: colors.emerald600,
  },
  statusBadgeFailed: {
    backgroundColor: colors.red600,
  },
  statusText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    backgroundColor: colors.slate900,
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.slate800,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  scorePercent: {
    color: colors.slate500,
    fontSize: 18,
  },
  passingNote: {
    color: colors.slate500,
    marginTop: 8,
    fontSize: 13,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.slate900,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate800,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: colors.slate500,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.slate800,
  },
  domainCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.slate900,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate800,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  domainItemSpaced: {
    marginTop: 12,
  },
  domainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  domainName: {
    fontSize: 14,
    color: colors.slate300,
    flex: 1,
  },
  domainPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  domainBarContainer: {
    height: 6,
    backgroundColor: colors.slate800,
    borderRadius: 3,
    overflow: 'hidden',
  },
  domainBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  weakAreasCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.orange950,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.orange900,
  },
  weakAreasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weakAreasEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  weakAreasTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.orange300,
  },
  weakAreaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  weakAreaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange400,
    marginRight: 12,
  },
  weakAreaName: {
    color: colors.orange200,
    flex: 1,
    fontSize: 14,
  },
  weakAreaPercent: {
    color: colors.orange400,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 32,
  },
  reviewButton: {
    backgroundColor: colors.orange500,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  homeButton: {
    backgroundColor: colors.slate900,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate800,
  },
  homeButtonText: {
    color: colors.slate300,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ExamResultsScreen;
