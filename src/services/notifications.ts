import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Category, HealthState, GoalCore } from '../domain/types.ts';
import {
  NOTIFICATION_CHANNEL_ID,
  getEscalatingMessage,
  getLastChanceMessage,
  buildGoalReminderPayload,
  buildLastChancePayload,
  buildImmediateCheckInPayload,
} from '../domain/notifications.ts';

export { NOTIFICATION_CHANNEL_ID, getEscalatingMessage, getLastChanceMessage };

// Configure notification presentation when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Accountabilibuddies Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    } catch (e) {
      console.warn('expo-notifications setNotificationChannelAsync failed:', e);
    }
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('expo-notifications requestPermissionsAsync failed:', e);
    return false;
  }
}

export async function scheduleGoalReminder(goal: GoalCore, goalTitle: string) {
  if (!Notifications) return;
  
  try {
    await cancelGoalReminders(goal.id);

    const payload = buildGoalReminderPayload(goal, goalTitle);
    if (!payload) {
      return;
    }

    let schedulableTrigger: any;
    if (payload.trigger.type === 'daily') {
      schedulableTrigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: payload.trigger.hour,
        minute: payload.trigger.minute,
        channelId: payload.trigger.channelId,
      };
    } else if (payload.trigger.type === 'calendar' && payload.trigger.weekday !== undefined) {
      schedulableTrigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday: payload.trigger.weekday,
        hour: payload.trigger.hour,
        minute: payload.trigger.minute,
        channelId: payload.trigger.channelId,
      };
    } else {
      schedulableTrigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: payload.trigger.day,
        hour: payload.trigger.hour,
        minute: payload.trigger.minute,
        channelId: payload.trigger.channelId,
      };
    }

    await Notifications.scheduleNotificationAsync({
      identifier: payload.identifier,
      content: {
        title: payload.content.title,
        body: payload.content.body,
        data: payload.content.data,
        sound: payload.content.sound,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: schedulableTrigger,
    });
  } catch (e) {
    console.warn('expo-notifications scheduleNotificationAsync failed:', e);
  }
}

export async function cancelGoalReminders(goalId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`reminder_${goalId}`);
    await Notifications.cancelScheduledNotificationAsync(`lastchance_${goalId}`);
  } catch {
    // Ignored if not found
  }
}

export async function sendLastChanceAlert(goalId: string, title: string, stake?: string | null) {
  try {
    const isAndroid = Platform.OS === 'android';
    const payload = buildLastChancePayload(goalId, title, stake, isAndroid);

    await Notifications.scheduleNotificationAsync({
      identifier: payload.identifier,
      content: {
        title: payload.content.title,
        body: payload.content.body,
        data: payload.content.data,
        sound: payload.content.sound,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: payload.trigger,
    });
  } catch (e) {
    console.warn('expo-notifications scheduleNotificationAsync failed:', e);
  }
}

export async function sendImmediateCheckInNotification(
  goalTitle: string,
  category: Category,
  hState: HealthState,
  goalId?: string,
) {
  await setupNotificationChannels();
  await requestNotificationPermissions();

  const isAndroid = Platform.OS === 'android';
  const payload = buildImmediateCheckInPayload(goalTitle, category, hState, goalId, isAndroid);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.content.title,
        body: payload.content.body,
        data: payload.content.data,
        sound: payload.content.sound,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: payload.trigger,
    });
    return { title: payload.content.title, body: payload.content.body, sentAsSystem: true };
  } catch (e) {
    console.warn('sendImmediateCheckInNotification failed:', e);
    return { title: payload.content.title, body: payload.content.body, sentAsSystem: false };
  }
}
