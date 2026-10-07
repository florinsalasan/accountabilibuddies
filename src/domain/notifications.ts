import type { Category, HealthState, GoalCore, LifeState } from './types.ts';
import { healthState } from './health.ts';

export const NOTIFICATION_CHANNEL_ID = 'buddy-reminders';

export function isEligibleForReminder(lifeState: LifeState): boolean {
  return lifeState === 'active' || lifeState === 'lastChance';
}

export function getEscalatingMessage(
  title: string,
  category: Category,
  hState: HealthState,
): { title: string; body: string } {
  if (hState === 'thriving') {
    return {
      title: `${title} Check-in`,
      body: `Your buddy is thriving! Keep the momentum rolling with a quick update.`,
    };
  }

  if (hState === 'good') {
    return {
      title: `Time for ${title}`,
      body: `Hey friend! How's progress going today? Let's check in.`,
    };
  }

  if (hState === 'meh') {
    return {
      title: `Don't forget ${title}`,
      body: `Your buddy is tapping their foot... don't leave them hanging!`,
    };
  }

  if (hState === 'struggling') {
    if (category === 'fitness') {
      return {
        title: `Softening up on ${title}!`,
        body: `Your gym buddy is currently lounging on the couch. Save them with a workout!`,
      };
    }
    if (category === 'finance') {
      return {
        title: `Cobwebs in ${title}!`,
        body: `Your financial buddy can hear moths in the wallet. Let's make progress!`,
      };
    }
    if (category === 'learning') {
      return {
        title: `Brain rust on ${title}!`,
        body: `Your study buddy is falling asleep with a book on their face. Wake them up with progress!`,
      };
    }
    if (category === 'creative') {
      return {
        title: `Paint drying on ${title}!`,
        body: `Your muse is packing up their bags. Drop in a quick spark to keep them around!`,
      };
    }
    return {
      title: `${title} buddy needs you!`,
      body: `I'm starting to get worried. Check in before things get worse!`,
    };
  }

  // Dying (<20 health)
  return {
    title: `EMERGENCY: ${title}`,
    body: `Your buddy is literally on life support! One check-in can turn this around!`,
  };
}

export function getLastChanceMessage(
  title: string,
  stake?: string | null,
): { title: string; body: string } {
  const hasStake = typeof stake === 'string' && stake.trim().length > 0;
  return {
    title: `LAST CHANCE: ${title}`,
    body: hasStake
      ? `Your buddy has hit 0 health! Check in with progress now or pay your stake: "${stake!.trim()}"!`
      : `Your buddy has hit 0 health! Check in now before they go to the graveyard!`,
  };
}

export interface ReminderTriggerSpec {
  type: 'daily' | 'calendar';
  hour: number;
  minute: number;
  weekday?: number;
  day?: number;
  channelId: string;
}

export function computeReminderTrigger(
  cadence: GoalCore['cadence'],
  cadenceDay: number,
  reminderMinutes: number,
  channelId: string = NOTIFICATION_CHANNEL_ID,
): ReminderTriggerSpec {
  const normalizedMinutes = Math.max(0, Math.min(1439, Math.floor(reminderMinutes || 0)));
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;

  if (cadence === 'daily') {
    return {
      type: 'daily',
      hour,
      minute,
      channelId,
    };
  }

  if (cadence === 'weekly') {
    // 1-indexed weekday where 1 is Sunday
    const weekday = (Math.max(0, Math.floor(cadenceDay)) % 7) + 1;
    return {
      type: 'calendar',
      weekday,
      hour,
      minute,
      channelId,
    };
  }

  // Monthly: day 1-28 (clamped to prevent month overflow)
  const day = Math.min(Math.max(1, Math.floor(cadenceDay)), 28);
  return {
    type: 'calendar',
    day,
    hour,
    minute,
    channelId,
  };
}

export interface GoalReminderPayload {
  identifier: string;
  content: {
    title: string;
    body: string;
    data: { goalId: string; type: 'check_in' };
    sound: boolean;
    priority: 'max';
  };
  trigger: ReminderTriggerSpec;
}

export function buildGoalReminderPayload(
  goal: Pick<GoalCore, 'id' | 'category' | 'health' | 'cadence' | 'cadenceDay' | 'reminderMinutes' | 'lifeState'>,
  goalTitle: string,
): GoalReminderPayload | null {
  if (!isEligibleForReminder(goal.lifeState)) {
    return null;
  }

  const hState = healthState(goal.health);
  const message = getEscalatingMessage(goalTitle, goal.category, hState);
  const trigger = computeReminderTrigger(goal.cadence, goal.cadenceDay, goal.reminderMinutes);

  return {
    identifier: `reminder_${goal.id}`,
    content: {
      title: message.title,
      body: message.body,
      data: { goalId: goal.id, type: 'check_in' },
      sound: true,
      priority: 'max',
    },
    trigger,
  };
}

export function buildImmediateCheckInPayload(
  goalTitle: string,
  category: Category,
  hState: HealthState,
  goalId: string = 'test',
  isAndroid: boolean = false,
) {
  const message = getEscalatingMessage(goalTitle, category, hState);
  return {
    content: {
      title: message.title,
      body: message.body,
      data: { goalId, type: 'check_in' },
      sound: true,
      priority: 'max',
    },
    trigger: isAndroid ? { channelId: NOTIFICATION_CHANNEL_ID } : null,
  };
}

export function buildLastChancePayload(
  goalId: string,
  goalTitle: string,
  stake?: string | null,
  isAndroid: boolean = false,
) {
  const message = getLastChanceMessage(goalTitle, stake);
  return {
    identifier: `lastchance_${goalId}`,
    content: {
      title: message.title,
      body: message.body,
      data: { goalId, type: 'last_chance' },
      sound: true,
      priority: 'max',
    },
    trigger: isAndroid ? { channelId: NOTIFICATION_CHANNEL_ID } : null,
  };
}
