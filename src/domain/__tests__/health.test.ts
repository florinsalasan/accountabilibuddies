import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialEngineState,
  healthState,
  overdueDecay,
  effectiveHealth,
  isCheckInOpen,
  applyCheckIn,
  tick,
  pause,
  resume,
  complete,
  abandon,
} from '../health.ts';
import { healthConfig } from '../healthConfig.ts';
import type { GoalCore } from '../types.ts';

function createMockGoal(overrides: Partial<GoalCore> = {}): GoalCore {
  const baseTime = new Date(2026, 9, 3, 12, 0, 0).getTime();
  const sched = { cadence: 'daily' as const, cadenceDay: 0, reminderMinutes: 18 * 60 };
  const engineInit = initialEngineState(sched, baseTime, healthConfig);

  return {
    id: 'test-goal-1',
    category: 'fitness',
    type: 'simple',
    cadence: 'daily',
    cadenceDay: 0,
    reminderMinutes: 18 * 60,
    ...engineInit,
    ...overrides,
  };
}

describe('Health Engine', () => {
  test('Initial state assigns default health (60) and active state', () => {
    const goal = createMockGoal();
    assert.equal(goal.health, 60);
    assert.equal(goal.lifeState, 'active');
    assert.equal(goal.onTimeStreak, 0);
    assert.equal(goal.noProgressStreak, 0);
    assert.equal(healthState(goal.health), 'good');
  });

  test('Check-in adds fixed habit reward and respects max health (100)', () => {
    const goal = createMockGoal({ health: 90 });
    const now = goal.nextDueAt - 3600_000; // 1 hour before due, inside window

    const result = applyCheckIn(goal, 'on_track', now, healthConfig);
    assert.equal(result.goal.health, 100, 'Should cap at 100');
    assert.equal(result.goal.onTimeStreak, 1);
    assert.equal(result.goal.bestStreak, 1);
    assert.equal(result.checkIn.rating, 'on_track');
  });

  test('Multiple no-progress check-ins escalate penalty damage', () => {
    let goal = createMockGoal({ health: 70 });
    const now = goal.nextDueAt - 3600_000;

    // Check-in 1: none
    // gain = 0, noProgressStreak = 1. penalty = 0 (step * 0)
    let res = applyCheckIn(goal, 'none', now, healthConfig);
    assert.equal(res.goal.health, 70);
    assert.equal(res.goal.noProgressStreak, 1);

    // Check-in 2: none
    // noProgressStreak = 2 -> penalty = 5 (step * 1) -> 70 - 5 = 65
    res = applyCheckIn(res.goal, 'none', now, healthConfig);
    assert.equal(res.goal.health, 65);
    assert.equal(res.goal.noProgressStreak, 2);

    // Check-in 3: none
    // noProgressStreak = 3 -> penalty = 10 (step * 2) -> 65 - 10 = 55
    res = applyCheckIn(res.goal, 'none', now, healthConfig);
    assert.equal(res.goal.health, 55);
    assert.equal(res.goal.noProgressStreak, 3);

    // Next check-in has progress -> resets streak
    res = applyCheckIn(res.goal, 'on_track', now, healthConfig);
    assert.equal(res.goal.noProgressStreak, 0);
    assert.equal(res.goal.health, 75); // 55 + 20
  });

  test('Overdue decay does not start during grace period', () => {
    const goal = createMockGoal({ health: 80 });
    // Next due is at 18:00
    // Daily grace period is 6 hours (until 00:00)
    const withinGrace = goal.nextDueAt + 2 * 3600_000; // 2 hours after due
    assert.equal(overdueDecay(goal, withinGrace, healthConfig), 0);
    assert.equal(effectiveHealth(goal, withinGrace, healthConfig), 80);

    // After grace period (8 hours after due)
    const afterGrace = goal.nextDueAt + 8 * 3600_000;
    const decay = overdueDecay(goal, afterGrace, healthConfig);
    assert.ok(decay > 0, 'Decay should start accumulating after grace period');
    assert.ok(effectiveHealth(goal, afterGrace, healthConfig) < 80);
  });

  test('Rollover occurs when period lapses without check-in, reducing health', () => {
    const goal = createMockGoal({ health: 50 });
    // Simulate time advancing 2 days into the future
    const futureTime = goal.nextDueAt + 48 * 3600_000;
    const tickResult = tick(goal, futureTime, healthConfig);

    assert.ok(tickResult.events.length > 0, 'Should generate missed events');
    assert.equal(tickResult.events[0].kind, 'missed');
    assert.ok(tickResult.goal.health < 50, 'Health should have drained from missed rollover');
  });

  test('Health dropping to 0 enters Last Chance state before dying', () => {
    const goal = createMockGoal({ health: 10 });
    // Miss several days so health bottoms out
    const farFuture = goal.nextDueAt + 7 * 86400_000;
    const tickResult = tick(goal, farFuture, healthConfig);

    // The buddy should be in last chance or dead depending on how far the time advanced
    assert.ok(
      tickResult.goal.lifeState === 'lastChance' || tickResult.goal.lifeState === 'dead',
      'Should enter last chance or death',
    );
  });

  test('Progress check-in during Last Chance revives the buddy', () => {
    const now = new Date(2026, 9, 3, 15, 0, 0).getTime();
    const goal = createMockGoal({
      health: 0,
      lifeState: 'lastChance',
      lastChanceStartedAt: now - 3600_000,
      lastChanceEndsAt: now + 86400_000,
    });

    const checkInResult = applyCheckIn(goal, 'some', now, healthConfig);
    assert.equal(checkInResult.goal.lifeState, 'active', 'Should revive back to active');
    assert.equal(checkInResult.goal.lastChanceStartedAt, null);
    assert.equal(checkInResult.goal.lastChanceEndsAt, null);
    assert.equal(checkInResult.goal.health, 10); // 0 + 10 for some
    assert.ok(
      checkInResult.events.some((e) => e.kind === 'revived'),
      'Should emit revived event',
    );
  });

  test('Last Chance expires without check-in -> Dead by neglect', () => {
    const now = new Date(2026, 9, 3, 12, 0, 0).getTime();
    const deadline = now + 86400_000;
    const goal = createMockGoal({
      health: 0,
      lifeState: 'lastChance',
      lastChanceStartedAt: now,
      lastChanceEndsAt: deadline,
    });

    // Time ticks past the deadline
    const tickResult = tick(goal, deadline + 1000, healthConfig);
    assert.equal(tickResult.goal.lifeState, 'dead');
    assert.equal(tickResult.goal.deathCause, 'neglect');
    assert.ok(
      tickResult.events.some((e) => e.kind === 'died'),
      'Should emit died event',
    );
  });

  test('Pause halts decay and resume provides welcome-back check-in', () => {
    const now = new Date(2026, 9, 3, 12, 0, 0).getTime();
    const goal = createMockGoal({ health: 75 });

    const pausedGoal = pause(goal, now, null, healthConfig);
    assert.equal(pausedGoal.lifeState, 'paused');
    assert.equal(pausedGoal.health, 75);

    // Fast-forward 30 days
    const later = now + 30 * 86400_000;
    const tickWhilePaused = tick(pausedGoal, later, healthConfig);
    // Paused goal must not take any decay or missed penalties
    assert.equal(tickWhilePaused.goal.health, 75);
    assert.equal(tickWhilePaused.goal.lifeState, 'paused');

    // Resume
    const resumeResult = resume(pausedGoal, later, healthConfig);
    assert.equal(resumeResult.goal.lifeState, 'active');
    assert.equal(resumeResult.goal.welcomeBack, true);
    assert.ok(isCheckInOpen(resumeResult.goal, later, healthConfig));
  });

  test('Manual abandon moves goal immediately to graveyard', () => {
    const goal = createMockGoal({ health: 80 });
    const now = Date.now();
    const result = abandon(goal, now);

    assert.equal(result.goal.lifeState, 'dead');
    assert.equal(result.goal.deathCause, 'abandoned');
    assert.equal(result.goal.health, 0);
    assert.ok(
      result.events.some((e) => e.kind === 'died' && e.cause === 'abandoned'),
    );
  });

  test('Completion marks goal completed and preserves final health', () => {
    const goal = createMockGoal({ health: 85 });
    const now = goal.nextDueAt - 3600_000;
    const completedGoal = complete(goal, now, healthConfig);

    assert.equal(completedGoal.lifeState, 'completed');
    assert.equal(completedGoal.health, 85);
    assert.equal(completedGoal.completedAt, now);
  });
});
