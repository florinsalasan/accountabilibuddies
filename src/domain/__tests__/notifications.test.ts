import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOTIFICATION_CHANNEL_ID,
  isEligibleForReminder,
  getEscalatingMessage,
  getLastChanceMessage,
  computeReminderTrigger,
  buildGoalReminderPayload,
  buildImmediateCheckInPayload,
  buildLastChancePayload,
} from '../notifications.ts';
import type { GoalCore, Category, HealthState } from '../types.ts';

function createMockGoal(overrides: Partial<GoalCore> = {}): GoalCore {
  return {
    id: 'goal-uuid-123',
    category: 'fitness',
    type: 'simple',
    cadence: 'daily',
    cadenceDay: 0,
    reminderMinutes: 18 * 60, // 18:00 (6:00 PM)
    health: 75,
    noProgressStreak: 0,
    onTimeStreak: 3,
    bestStreak: 5,
    lifeState: 'active',
    nextDueAt: 86400000,
    lastChanceStartedAt: null,
    lastChanceEndsAt: null,
    pausedAt: null,
    pausedUntil: null,
    pausedFromState: null,
    welcomeBack: false,
    deathCause: null,
    diedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe('Notification Escalation Messages', () => {
  const categories: Category[] = ['fitness', 'finance', 'learning', 'creative', 'generic'];
  const healthStates: HealthState[] = ['thriving', 'good', 'meh', 'struggling', 'dying'];

  test('All combinations of category and healthState generate non-empty title and body', () => {
    for (const cat of categories) {
      for (const hs of healthStates) {
        const msg = getEscalatingMessage('Read Book', cat, hs);
        assert.ok(msg.title.length > 0, `Title missing for ${cat} / ${hs}`);
        assert.ok(msg.body.length > 0, `Body missing for ${cat} / ${hs}`);
        assert.ok(msg.title.includes('Read Book'), `Goal title not included in notification title for ${cat} / ${hs}`);
      }
    }
  });

  test('Thriving tone is positive and mentions momentum', () => {
    const msg = getEscalatingMessage('Morning Run', 'fitness', 'thriving');
    assert.ok(msg.title.includes('Check-in'));
    assert.ok(msg.body.toLowerCase().includes('thriving'));
    assert.ok(msg.body.toLowerCase().includes('momentum'));
  });

  test('Good tone is friendly and prompt', () => {
    const msg = getEscalatingMessage('Meditate', 'generic', 'good');
    assert.ok(msg.title.includes('Time for'));
    assert.ok(msg.body.toLowerCase().includes('progress'));
  });

  test('Meh tone gives a light nudge', () => {
    const msg = getEscalatingMessage('Budget Review', 'finance', 'meh');
    assert.ok(msg.title.includes('forget'));
    assert.ok(msg.body.toLowerCase().includes('foot'));
  });

  test('Struggling tone adapts copy to specific category', () => {
    const fitness = getEscalatingMessage('Squats', 'fitness', 'struggling');
    assert.ok(fitness.body.toLowerCase().includes('couch') || fitness.body.toLowerCase().includes('workout'));

    const finance = getEscalatingMessage('Save $50', 'finance', 'struggling');
    assert.ok(finance.body.toLowerCase().includes('wallet') || finance.body.toLowerCase().includes('moths'));

    const learning = getEscalatingMessage('Spanish', 'learning', 'struggling');
    assert.ok(learning.body.toLowerCase().includes('study') || learning.body.toLowerCase().includes('book'));

    const creative = getEscalatingMessage('Sketching', 'creative', 'struggling');
    assert.ok(creative.body.toLowerCase().includes('muse') || creative.body.toLowerCase().includes('paint'));

    const generic = getEscalatingMessage('Journaling', 'generic', 'struggling');
    assert.ok(generic.body.toLowerCase().includes('worried'));
  });

  test('Dying tone triggers an emergency warning', () => {
    const msg = getEscalatingMessage('Hydrate', 'generic', 'dying');
    assert.ok(msg.title.includes('EMERGENCY'));
    assert.ok(msg.body.toLowerCase().includes('life support'));
  });
});

describe('Last Chance Alerts', () => {
  test('Includes stake copy when stake is specified', () => {
    const alert = getLastChanceMessage('Gym Session', 'Do 100 burpees or pay Florin $20');
    assert.ok(alert.title.includes('LAST CHANCE'));
    assert.ok(alert.title.includes('Gym Session'));
    assert.ok(alert.body.includes('Do 100 burpees or pay Florin $20'));
  });

  test('Uses respectful graveyard fallback when stake is null or empty', () => {
    const alertNull = getLastChanceMessage('Study Rust', null);
    assert.ok(alertNull.body.includes('graveyard'));
    assert.ok(!alertNull.body.includes('pay your stake'));

    const alertEmpty = getLastChanceMessage('Study Rust', '   ');
    assert.ok(alertEmpty.body.includes('graveyard'));
    assert.ok(!alertEmpty.body.includes('pay your stake'));
  });
});

describe('Reminder Eligibility Rules', () => {
  test('Active and Last Chance goals are eligible for reminders', () => {
    assert.equal(isEligibleForReminder('active'), true);
    assert.equal(isEligibleForReminder('lastChance'), true);
  });

  test('Paused, Completed, and Dead goals do not receive scheduled reminders', () => {
    assert.equal(isEligibleForReminder('paused'), false);
    assert.equal(isEligibleForReminder('completed'), false);
    assert.equal(isEligibleForReminder('dead'), false);
  });
});

describe('Cadence Trigger Computation', () => {
  test('Daily cadence calculates correct hour and minute', () => {
    // 18:45 -> 18 * 60 + 45 = 1125
    const trigger = computeReminderTrigger('daily', 0, 1125);
    assert.equal(trigger.type, 'daily');
    assert.equal(trigger.hour, 18);
    assert.equal(trigger.minute, 45);
    assert.equal(trigger.channelId, NOTIFICATION_CHANNEL_ID);
  });

  test('Weekly cadence computes 1-indexed weekday matching calendar requirements', () => {
    // Sunday (cadenceDay 0) -> weekday 1
    const sundayTrigger = computeReminderTrigger('weekly', 0, 9 * 60);
    assert.equal(sundayTrigger.type, 'calendar');
    assert.equal(sundayTrigger.weekday, 1);
    assert.equal(sundayTrigger.hour, 9);
    assert.equal(sundayTrigger.minute, 0);

    // Monday (cadenceDay 1) -> weekday 2
    const mondayTrigger = computeReminderTrigger('weekly', 1, 10 * 60);
    assert.equal(mondayTrigger.weekday, 2);

    // Saturday (cadenceDay 6) -> weekday 7
    const saturdayTrigger = computeReminderTrigger('weekly', 6, 12 * 60);
    assert.equal(saturdayTrigger.weekday, 7);
  });

  test('Monthly cadence clamps day to 1-28 range to prevent invalid dates', () => {
    // Regular 15th
    const midMonth = computeReminderTrigger('monthly', 15, 14 * 60);
    assert.equal(midMonth.type, 'calendar');
    assert.equal(midMonth.day, 15);

    // Day 31 clamped to 28
    const lateMonth = computeReminderTrigger('monthly', 31, 14 * 60);
    assert.equal(lateMonth.day, 28);

    // Day 0 clamped to 1
    const earlyMonth = computeReminderTrigger('monthly', 0, 14 * 60);
    assert.equal(earlyMonth.day, 1);
  });

  test('Handles edge cases in reminder minutes safely', () => {
    // Negative clamped to 0
    const neg = computeReminderTrigger('daily', 0, -50);
    assert.equal(neg.hour, 0);
    assert.equal(neg.minute, 0);

    // Greater than 1439 clamped to 23:59 (1439)
    const over = computeReminderTrigger('daily', 0, 2000);
    assert.equal(over.hour, 23);
    assert.equal(over.minute, 59);
  });
});

describe('Goal Reminder Payload Construction', () => {
  test('Returns null for paused, dead, or completed goals', () => {
    const pausedGoal = createMockGoal({ lifeState: 'paused' });
    assert.equal(buildGoalReminderPayload(pausedGoal, 'Goal 1'), null);

    const completedGoal = createMockGoal({ lifeState: 'completed' });
    assert.equal(buildGoalReminderPayload(completedGoal, 'Goal 2'), null);

    const deadGoal = createMockGoal({ lifeState: 'dead' });
    assert.equal(buildGoalReminderPayload(deadGoal, 'Goal 3'), null);
  });

  test('Builds complete payload for active goal with correct structure and escalation', () => {
    const goal = createMockGoal({
      id: 'active-goal-77',
      category: 'fitness',
      health: 85, // thriving
      cadence: 'daily',
      reminderMinutes: 20 * 60, // 20:00
    });

    const payload = buildGoalReminderPayload(goal, 'Leg Day');
    assert.ok(payload !== null);
    assert.equal(payload.identifier, 'reminder_active-goal-77');
    assert.ok(payload.content.title.includes('Leg Day'));
    assert.ok(payload.content.body.toLowerCase().includes('thriving'));
    assert.equal(payload.content.data.goalId, 'active-goal-77');
    assert.equal(payload.content.data.type, 'check_in');
    assert.equal(payload.content.sound, true);
    assert.equal(payload.content.priority, 'max');
    assert.equal(payload.trigger.type, 'daily');
    assert.equal(payload.trigger.hour, 20);
    assert.equal(payload.trigger.minute, 0);
    assert.equal(payload.trigger.channelId, NOTIFICATION_CHANNEL_ID);
  });
});

describe('Immediate and Platform-Specific Notification Payloads', () => {
  test('Android immediate trigger specifies notification channelId', () => {
    const payload = buildImmediateCheckInPayload('Piano Practice', 'creative', 'good', 'goal-1', true);
    assert.deepEqual(payload.trigger, { channelId: NOTIFICATION_CHANNEL_ID });
    assert.equal(payload.content.data.goalId, 'goal-1');
    assert.equal(payload.content.sound, true);
  });

  test('iOS immediate trigger uses null trigger for instant delivery', () => {
    const payload = buildImmediateCheckInPayload('Piano Practice', 'creative', 'good', 'goal-1', false);
    assert.equal(payload.trigger, null);
  });

  test('Last chance payload formats correct identifier and priority', () => {
    const payloadAndroid = buildLastChancePayload('goal-99', 'Study Korean', 'Wash dishes', true);
    assert.equal(payloadAndroid.identifier, 'lastchance_goal-99');
    assert.ok(payloadAndroid.content.body.includes('Wash dishes'));
    assert.deepEqual(payloadAndroid.trigger, { channelId: NOTIFICATION_CHANNEL_ID });

    const payloadIOS = buildLastChancePayload('goal-99', 'Study Korean', null, false);
    assert.equal(payloadIOS.identifier, 'lastchance_goal-99');
    assert.ok(payloadIOS.content.body.includes('graveyard'));
    assert.equal(payloadIOS.trigger, null);
  });
});
