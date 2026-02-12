// T041: HomeScreen with "Start Exam" button
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useExamStore } from '../stores';
import { hasInProgressExam } from '../services';
import { getTotalQuestionCount } from '../storage/repositories/question.repository';
import { canGenerateExam } from '../services/exam-generator.service';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

/**
 * HomeScreen - main landing screen with exam start button
 */
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { startExam, resumeExam, isLoading, error, setError } = useExamStore();

  const [hasInProgress, setHasInProgress] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [canStart, setCanStart] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check exam status on focus
  useFocusEffect(
    useCallback(() => {
      checkExamStatus();
    }, []),
  );

  const checkExamStatus = async () => {
    setCheckingStatus(true);
    try {
      console.warn('[HomeScreen] Checking exam status...');
      const inProgress = await hasInProgressExam();
      setHasInProgress(inProgress);
      console.warn(`[HomeScreen] In progress: ${inProgress}`);

      const count = await getTotalQuestionCount();
      setQuestionCount(count);
      console.warn(`[HomeScreen] Question count: ${count}`);

      const canGen = await canGenerateExam();
      setCanStart(canGen.canGenerate);
      console.warn(
        `[HomeScreen] Can start exam: ${canGen.canGenerate}, reason: ${canGen.reason || 'OK'}`,
      );
    } catch (err) {
      console.error('[HomeScreen] Failed to check exam status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleStartExam = async () => {
    try {
      console.warn('[HomeScreen] Starting exam...');
      setError(null);
      await startExam();
      console.warn('[HomeScreen] Exam started, navigating to ExamScreen');
      navigation.navigate('ExamScreen', {});
    } catch (err) {
      console.error('[HomeScreen] Failed to start exam:', err);
      const message = err instanceof Error ? err.message : 'Failed to start exam';
      Alert.alert('Error', message);
    }
  };

  const handleResumeExam = async () => {
    try {
      setError(null);
      const resumed = await resumeExam();
      if (resumed) {
        navigation.navigate('ExamScreen', {});
      } else {
        // No exam to resume, refresh status
        await checkExamStatus();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume exam';
      Alert.alert('Error', message);
    }
  };

  const handleStartNewExam = () => {
    Alert.alert(
      'Start New Exam',
      'You have an exam in progress. Do you want to abandon it and start a new one?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon & Start New',
          style: 'destructive',
          onPress: async () => {
            const { abandonExam } = useExamStore.getState();
            const session = useExamStore.getState().session;
            if (session) {
              await abandonExam();
            }
            await handleStartExam();
          },
        },
      ],
    );
  };

  if (checkingStatus) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <Text style={styles.cloudEmoji}>☁️</Text>
        </View>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>☁️</Text>
            </View>
            <View>
              <Text style={styles.appTitle}>CloudPrep</Text>
              <Text style={styles.appSubtitle}>AWS Cloud Practitioner</Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Exam Info Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Exam Format</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{questionCount}</Text>
                <Text style={styles.statLabel}>In Bank</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>65</Text>
                <Text style={styles.statLabel}>Questions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>90</Text>
                <Text style={styles.statLabel}>Minutes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#34d399' }]}>70%</Text>
                <Text style={styles.statLabel}>To Pass</Text>
              </View>
            </View>
          </View>

          {/* Resume Exam Card */}
          {hasInProgress && (
            <View style={styles.resumeCard}>
              <View style={styles.resumeHeader}>
                <View style={styles.resumeIcon}>
                  <Text style={styles.playEmoji}>▶️</Text>
                </View>
                <View style={styles.resumeTextContainer}>
                  <Text style={styles.resumeTitle}>Exam In Progress</Text>
                  <Text style={styles.resumeSubtitle}>Continue where you left off</Text>
                </View>
              </View>
              <View style={styles.resumeButtons}>
                <TouchableOpacity
                  onPress={handleResumeExam}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  style={styles.resumeButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.resumeButtonText}>Resume Exam</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleStartNewExam}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  style={styles.newButton}
                >
                  <Text style={styles.newButtonText}>New</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Start Exam Button */}
          {!hasInProgress && (
            <TouchableOpacity
              onPress={handleStartExam}
              disabled={isLoading || !canStart}
              activeOpacity={0.8}
              style={[styles.startButton, !canStart && styles.startButtonDisabled]}
            >
              <LinearGradient
                colors={canStart ? ['#f97316', '#ea580c'] : ['#334155', '#1e293b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.startButtonContent}>
                    <Text style={styles.startButtonTitle}>Start Exam</Text>
                    <Text style={styles.startButtonSubtitle}>65 questions • 90 minutes</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Warning */}
          {!canStart && !hasInProgress && (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                ⚠️ Need at least 65 questions to start. Current: {questionCount}
              </Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{error}</Text>
            </View>
          )}

          {/* Quick Actions */}
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('PracticeSetup')}
              activeOpacity={0.7}
              style={styles.actionCard}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#7c3aed' }]}>
                <Text style={styles.actionEmoji}>📝</Text>
              </View>
              <Text style={styles.actionTitle}>Practice</Text>
              <Text style={styles.actionSubtitle}>By domain</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ExamHistory')}
              activeOpacity={0.7}
              style={styles.actionCard}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#0891b2' }]}>
                <Text style={styles.actionEmoji}>📊</Text>
              </View>
              <Text style={styles.actionTitle}>History</Text>
              <Text style={styles.actionSubtitle}>Past exams</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
              style={styles.actionCard}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#475569' }]}>
                <Text style={styles.actionEmoji}>⚙️</Text>
              </View>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Configure</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cloudEmoji: {
    fontSize: 40,
  },
  loadingText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoEmoji: {
    fontSize: 22,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#fb923c',
  },
  content: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#0f172a', // slate-900
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1e293b',
  },
  resumeCard: {
    backgroundColor: '#431407', // orange-950
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7c2d12',
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resumeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playEmoji: {
    fontSize: 16,
  },
  resumeTextContainer: {
    flex: 1,
  },
  resumeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  resumeSubtitle: {
    fontSize: 13,
    color: '#fdba74',
  },
  resumeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resumeButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  newButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  newButtonText: {
    color: '#cbd5e1',
    fontWeight: '500',
  },
  startButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  startButtonContent: {
    alignItems: 'center',
  },
  startButtonTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 2,
  },
  startButtonSubtitle: {
    color: '#fed7aa',
    fontSize: 13,
  },
  warningCard: {
    backgroundColor: '#450a0a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  warningText: {
    color: '#f87171',
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionEmoji: {
    fontSize: 16,
  },
  actionTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  actionSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
});

export default HomeScreen;
