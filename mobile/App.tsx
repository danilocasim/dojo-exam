import './src/global.css';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initializeDatabase } from './src/storage/database';
import { performFullSync } from './src/services/sync.service';
import { getTotalQuestionCount } from './src/storage/repositories/question.repository';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize SQLite database
        setSyncStatus('Setting up database...');
        await initializeDatabase();
        console.warn('[App] Database initialized');

        // Check if we already have cached questions
        const existingCount = await getTotalQuestionCount();
        console.warn(`[App] Existing questions in DB: ${existingCount}`);

        // Sync questions from API
        setSyncStatus('Syncing questions from server...');
        const result = await performFullSync();

        if (!result.success) {
          console.warn('[App] Sync failed:', result.error);
          if (existingCount === 0) {
            // No cached questions and sync failed - show warning
            Alert.alert(
              'Sync Failed',
              `Could not download questions: ${result.error}\n\nMake sure the API server is running and accessible.`,
              [{ text: 'OK' }],
            );
          }
        } else {
          console.warn(
            `[App] Sync complete: ${result.questionsAdded} added, ${result.questionsUpdated} updated`,
          );
        }

        // Get final question count
        const finalCount = await getTotalQuestionCount();
        console.warn(`[App] Total questions after sync: ${finalCount}`);

        setIsReady(true);
      } catch (e) {
        console.error('[App] Initialization failed:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    };

    initialize();
  }, []);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: '#0f172a',
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 32 }}>⚠️</Text>
        </View>
        <Text style={{ color: '#f87171', fontSize: 16, textAlign: 'center', fontWeight: '500' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0f172a',
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 40 }}>☁️</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
          CloudPrep
        </Text>
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 16 }} />
        <Text style={{ marginTop: 16, color: '#94a3b8', fontWeight: '500' }}>{syncStatus}</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
