import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { initDatabase } from '../db/init.ts';
import { setupNotificationChannels, requestNotificationPermissions } from '../services/notifications.ts';
import { useGoalStore } from '../store/useGoalStore.ts';
import { ThemeProvider, useTheme } from '../context/ThemeContext.tsx';

function AppNavigation() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="goals/create"
          options={{
            title: 'New Accountabilibuddy',
            presentation: 'modal',
            headerBackTitle: 'Cancel',
          }}
        />
        <Stack.Screen
          name="goals/[id]"
          options={{
            title: 'Buddy Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // 1. Initialize SQLite schema
    initDatabase();

    // 2. Configure push notification channels & request permissions
    setupNotificationChannels();
    requestNotificationPermissions();

    // 3. Load goals and initial store state
    useGoalStore.getState().init();

    // 4. On app resume / foreground, tick all goals to sync with real elapsed time
    const sub = AppState.addEventListener('change', (nextStatus: AppStateStatus) => {
      if (nextStatus === 'active') {
        useGoalStore.getState().loadGoals();
      }
    });

    // 5. Deep-link on notification tap while running
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const goalId = response.notification.request.content.data?.goalId;
      if (goalId && typeof goalId === 'string' && goalId !== 'test') {
        router.push(`/goals/${goalId}`);
      }
    });

    // 6. Handle cold launch from notification tap
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const goalId = response.notification.request.content.data?.goalId;
        if (goalId && typeof goalId === 'string' && goalId !== 'test') {
          router.push(`/goals/${goalId}`);
        }
      }
    });

    return () => {
      sub.remove();
      notifSub.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <AppNavigation />
    </ThemeProvider>
  );
}
