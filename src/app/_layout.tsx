import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, type AppStateStatus } from 'react-native';
import { initDatabase } from '../db/init.ts';
import { setupNotificationChannels, requestNotificationPermissions } from '../services/notifications.ts';
import { useGoalStore } from '../store/useGoalStore.ts';
import { Colors } from '../constants/theme.ts';

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

    return () => {
      sub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
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
