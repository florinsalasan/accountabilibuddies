// Pure domain types. No React Native imports in src/domain so it can be unit-tested with plain Node.

export type Category = 'fitness' | 'finance' | 'learning' | 'creative' | 'generic';
export const CATEGORIES: Category[] = ['fitness', 'finance', 'learning', 'creative', 'generic'];

export type GoalType = 'simple' | 'milestone' | 'recurring' | 'cumulative';
export type Cadence = 'daily' | 'weekly' | 'monthly';

export type LifeState = 'active' | 'lastChance' | 'paused' | 'completed' | 'dead';
export type DeathCause = 'neglect' | 'abandoned';

/** Visual health states, best to worst. */
export type HealthState = 'thriving' | 'good' | 'meh' | 'struggling' | 'dying';
export const HEALTH_STATES: HealthState[] = ['thriving', 'good', 'meh', 'struggling', 'dying'];

/** 'missed' is written by the engine when a period rolls over without a check-in. */
export type Rating = 'on_track' | 'some' | 'none' | 'missed';

export type ProgressSource = 'manual' | 'health_connect' | 'healthkit';

/** The subset of a goal row the engine needs. Mirrors the `goals` table. */
export interface GoalCore {
  id: string;
  category: Category;
  type: GoalType;
  cadence: Cadence;
  /** weekly: 0 (Sun) – 6 (Sat). monthly: 1 – 31 (clamped to month length). daily: ignored. */
  cadenceDay: number;
  /** Minutes after local midnight the check-in is due / reminder fires. */
  reminderMinutes: number;
  /** Base health, before overdue decay for the current pending period is applied. */
  health: number;
  noProgressStreak: number;
  onTimeStreak: number;
  bestStreak: number;
  lifeState: LifeState;
  nextDueAt: number;
  lastChanceStartedAt: number | null;
  /** Death deadline while in last chance: one full period after it started. */
  lastChanceEndsAt: number | null;
  pausedAt: number | null;
  pausedUntil: number | null;
  pausedFromState: LifeState | null;
  welcomeBack: boolean;
  deathCause: DeathCause | null;
  diedAt: number | null;
  completedAt: number | null;
}

/** A side effect the engine wants persisted (check_ins / events rows). */
export type EngineEvent =
  | { kind: 'missed'; at: number; dueAt: number; healthBefore: number; healthAfter: number }
  | { kind: 'last_chance'; at: number }
  | { kind: 'died'; at: number; cause: DeathCause }
  | { kind: 'resumed'; at: number }
  | { kind: 'revived'; at: number };
