import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Category, HealthState, GoalCore } from '../domain/types.ts';
import { healthState } from '../domain/health.ts';

const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }
  } catch (e) {
    console.warn('expo-notifications require failed:', e);
  }
}

export const NOTIFICATION_CHANNEL_ID = 'buddy-reminders';

export async function setupNotificationChannels() {
  if (Platform.OS === 'android' && Notifications) {
    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Accountabilibuddies Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
    } catch (e) {
      console.warn('expo-notifications setNotificationChannelAsync failed:', e);
    }
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) {
    console.warn('Notifications are disabled in Expo Go.');
    return false;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('expo-notifications requestPermissionsAsync failed:', e);
    return false;
  }
}

function getEscalatingMessage(
  title: string,
  category: Category,
  hState: HealthState,
): { title: string; body: string } {
  if (hState === 'thriving') {
    return {
      title: `✨ ${title} Check-in`,
      body: `Your buddy is thriving! Keep the momentum rolling with a quick update.`,
    };
  }

  if (hState === 'good') {
    return {
      title: `👋 Time for ${title}`,
      body: `Hey friend! How's progress going today? Let's check in.`,
    };
  }

  if (hState === 'meh') {
    return {
      title: `👀 Don't forget ${title}`,
      body: `Your buddy is tapping their foot... don't leave them hanging!`,
    };
  }

  if (hState === 'struggling') {
    if (category === 'fitness') {
      return {
        title: `🛋️ Softening up on ${title}!`,
        body: `Your gym buddy is currently lounging on the couch. Save him with a workout!`,
      };
    }
    if (category === 'finance') {
      return {
        title: `💸 Cobwebs in ${title}!`,
        body: `Your financial buddy can hear moths in the wallet. Let's make progress!`,
      };
    }
    return {
      title: `😰 ${title} buddy needs you!`,
      body: `I'm starting to get worried. Check in before things get worse!`,
    };
  }

  // Dying (<20 health)
  return {
    title: `🚨 EMERGENCY: ${title}`,
    body: `Your buddy is literally on life support! One check-in can turn this around!`,
  };
}

export async function scheduleGoalReminder(goal: GoalCore, goalTitle: string) {
  if (!Notifications) return;
  
  try {
    await cancelGoalReminders(goal.id);

    if (goal.lifeState === 'paused' || goal.lifeState === 'completed' || goal.lifeState === 'dead') {
      return;
    }

    const hState = healthState(goal.health);
    const content = getEscalatingMessage(goalTitle, goal.category, hState);

    const hour = Math.floor(goal.reminderMinutes / 60);
    const minute = goal.reminderMinutes % 60;

    let trigger: any;

    if (goal.cadence === 'daily') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: NOTIFICATION_CHANNEL_ID,
      };
    } else if (goal.cadence === 'weekly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday: goal.cadenceDay + 1,
        hour,
        minute,
        channelId: NOTIFICATION_CHANNEL_ID,
      };
    } else {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        day: Math.min(Math.max(1, goal.cadenceDay), 28),
        hour,
        minute,
        channelId: NOTIFICATION_CHANNEL_ID,
      };
    }

    await Notifications.scheduleNotificationAsync({
      identifier: `reminder_${goal.id}`,
      content: {
        title: content.title,
        body: content.body,
        data: { goalId: goal.id, type: 'check_in' },
        sound: true,
      },
      trigger,
    });
  } catch (e) {
    console.warn('expo-notifications scheduleNotificationAsync failed:', e);
  }
}

export async function cancelGoalReminders(goalId: string) {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`reminder_${goalId}`);
    await Notifications.cancelScheduledNotificationAsync(`lastchance_${goalId}`);
  } catch {
    // Ignored if not found
  }
}

export async function sendLastChanceAlert(goalId: string, title: string, stake?: string | null) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `lastchance_${goalId}`,
      content: {
        title: `⚠️ LAST CHANCE: ${title}`,
        body: stake
          ? `Your buddy has hit 0 health! Check in with progress now or pay your stake: "${stake}"!`
          : `Your buddy has hit 0 health! Check in now before they go to the graveyard!`,
        data: { goalId, type: 'last_chance' },
        sound: true,
      },
      trigger: null, // immediate
    });
  } catch (e) {
    console.warn('expo-notifications scheduleNotificationAsync failed:', e);
  }
}
