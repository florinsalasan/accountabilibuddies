import type { Cadence, HealthState, Rating } from './types.ts';

/**
 * Every tunable number for the health system lives here.
 * Health is hidden from the user (visible in Settings → Dev mode).
 */
export const healthConfig = {
  max: 100,
  initial: 60,

  /** Lower bound (inclusive) of each visual state. Anything above 0 and below `struggling` is `dying`. */
  thresholds: {
    thriving: 80,
    good: 60,
    meh: 40,
    struggling: 20,
  } satisfies Record<Exclude<HealthState, 'dying'>, number>,

  /** Fixed gain per official check-in, regardless of how big the progress was (habits > outcomes). */
  checkInGain: {
    on_track: 20,
    some: 10,
    none: 0,
    missed: 0,
  } satisfies Record<Rating, number>,

  /**
   * Extra damage for consecutive no-progress check-ins (missed counts too).
   * streak 1 → 0, streak 2 → 5, streak 3 → 10, … capped.
   */
  noProgressPenaltyStep: 5,
  noProgressPenaltyMax: 20,

  /** Applied when a period rolls over with no check-in at all. */
  missPenalty: 15,

  /**
   * After a check-in is due, wait this long before health starts draining.
   * Note: the next period's check-in window opens 75% of the way to the next due date,
   * so the daily grace has to be shorter than that (spec draft said 1d; 6h fits the window model).
   */
  graceMs: {
    daily: 6 * 3600_000,
    weekly: 2 * 86400_000,
    monthly: 5 * 86400_000,
  } satisfies Record<Cadence, number>,

  /**
   * Total health drained linearly between (due + grace) and the period rollover.
   * Same amount for every cadence, so a missed monthly hurts as much as a missed daily.
   */
  overdueDecayMax: 10,

  /** The check-in window opens this fraction of the period before the due time. */
  windowFraction: 0.25,
} as const;

export type HealthConfig = typeof healthConfig;
