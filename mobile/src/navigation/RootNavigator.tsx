// React Navigation setup
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Import actual screens (T041, T042, T046)
import { HomeScreen, ExamScreen, ExamResultsScreen } from '../screens';

// Color constants matching the app theme
const colors = {
  slate950: '#020617',
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate400: '#94a3b8',
  white: '#ffffff',
  orange500: '#f97316',
};

// Navigation param types
export type RootStackParamList = {
  // Home screen
  Home: undefined;

  // Exam flow screens
  ExamScreen: { resumeAttemptId?: string };
  ExamResults: { attemptId: string };

  // Practice flow screens
  PracticeSetup: undefined;
  PracticeScreen: { sessionId: string };
  PracticeSummary: { sessionId: string };

  // Review flow screens
  ExamHistory: undefined;
  ReviewScreen: { attemptId: string };

  // Settings
  Settings: undefined;
};

// Create the stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

// Placeholder screens (remaining screens to be implemented)
const PlaceholderScreen: React.FC<{ name: string }> = ({ name }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🚧</Text>
      </View>
      <Text style={styles.text}>{name}</Text>
      <Text style={styles.subtext}>Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate950,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.slate800,
  },
  icon: {
    fontSize: 40,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  subtext: {
    fontSize: 14,
    color: colors.slate400,
    marginTop: 8,
  },
});

// Placeholder screens (remaining to be implemented in future tasks)
const PracticeSetupScreen = () => <PlaceholderScreen name="Practice Setup" />;
const PracticeScreen = () => <PlaceholderScreen name="Practice" />;
const PracticeSummaryScreen = () => <PlaceholderScreen name="Practice Summary" />;
const ExamHistoryScreen = () => <PlaceholderScreen name="Exam History" />;
const ReviewScreen = () => <PlaceholderScreen name="Review" />;
const SettingsScreen = () => <PlaceholderScreen name="Settings" />;

/**
 * Root navigation component
 * Wraps the app in NavigationContainer and defines all screens
 */
export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.slate900,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.slate950,
          },
          animation: 'slide_from_right',
        }}
      >
        {/* Home - no header, custom header in screen */}
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

        {/* Exam Flow - no headers, custom UI */}
        <Stack.Screen
          name="ExamScreen"
          component={ExamScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ExamResults"
          component={ExamResultsScreen}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        {/* Practice Flow */}
        <Stack.Screen
          name="PracticeSetup"
          component={PracticeSetupScreen}
          options={{ title: 'Practice Mode' }}
        />
        <Stack.Screen
          name="PracticeScreen"
          component={PracticeScreen}
          options={{
            title: 'Practice',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="PracticeSummary"
          component={PracticeSummaryScreen}
          options={{ title: 'Session Summary' }}
        />

        {/* Review Flow */}
        <Stack.Screen
          name="ExamHistory"
          component={ExamHistoryScreen}
          options={{ title: 'Exam History' }}
        />
        <Stack.Screen
          name="ReviewScreen"
          component={ReviewScreen}
          options={{ title: 'Review Answers' }}
        />

        {/* Settings */}
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Export navigation types for use in screens
export type { NativeStackNavigationProp } from '@react-navigation/native-stack';
export type { RouteProp } from '@react-navigation/native';
