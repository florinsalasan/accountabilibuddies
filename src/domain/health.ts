import { healthConfig as defaultConfig, type HealthConfig } from './healthConfig.ts';
import { dueOnOrAfter, nextDue, rolloverAt, windowOpensAt, type Schedule } from './periods.ts';
import type { EngineEvent, GoalCore, HealthState, Rating } from './types.ts';

/**
 * The health engine. Pure functions: (goal, now) in → (goal', events) out.
 *
 * `goal.health` is the *base* health. While a check-in is overdue, health visibly drains
 * (see `overdueDecay`) without touching the base; the drain is "materialised" into the base
 * whenever something happens (a check-in, a rollover, a pause). That keeps `tick` idempotent.
 */

const clamp = (h: number, cfg: HealthConfig) => Math.max(0, Math.min(cfg.max, h));

const isLive = (g: GoalCore) => g.lifeState === 'active' || g.lifeState === 'lastChance';

export function schedule(g: Pick<GoalCore, 'cadence' | 'cadenceDay' | 'reminderMinutes'>): Schedule {
  return { cadence: g.cadence, cadenceDay: g.cadenceDay, reminderMinutes: g.reminderMinutes };
}

export function healthState(h: number, cfg: HealthConfig = defaultConfig): HealthState {
  const t = cfg.thresholds;
  if (h >= t.thriving) return 'thriving';
  if (h >= t.good) return 'good';
  if (h >= t.meh) return 'meh';
  if (h >= t.struggling) return 'struggling';
  return 'dying';
}

/** Health drained so far for the currently pending (overdue) check-in. */
export function overdueDecay(g: GoalCore, at: number, cfg: HealthConfig = defaultConfig): number {
  if (!isLive(g)) return 0;
  const s = schedule(g);
  const start = g.nextDueAt + cfg.graceMs[g.cadence];
  const end = rolloverAt(s, g.nextDueAt, cfg.windowFraction);
  if (at <= start || end <= start) return 0;
  return cfg.overdueDecayMax * Math.min(1, (at - start) / (end - start));
}

/** What the buddy looks like right now. */
export function effectiveHealth(g: GoalCore, now: number, cfg: HealthConfig = defaultConfig): number {
  if (g.lifeState === 'dead') return 0;
  return clamp(g.health - overdueDecay(g, now, cfg), cfg);
}

export function checkInOpensAt(g: GoalCore, cfg: HealthConfig = defaultConfig): number {
  return windowOpensAt(schedule(g), g.nextDueAt, cfg.windowFraction);
}

export function isCheckInOpen(g: GoalCore, now: number, cfg: HealthConfig = defaultConfig): boolean {
  if (!isLive(g)) return false;
  return g.welcomeBack || now >= checkInOpensAt(g, cfg);
}

export function isOverdue(g: GoalCore, now: number): boolean {
  return isLive(g) && now > g.nextDueAt;
}

/** Extra damage for the Nth consecutive no-progress period. */
export function noProgressPenalty(streak: number, cfg: HealthConfig = defaultConfig): number {
  return Math.min(cfg.noProgressPenaltyMax, Math.max(0, streak - 1) * cfg.noProgressPenaltyStep);
}

function enterLastChanceIfEmpty(g: GoalCore, at: number, events: EngineEvent[], cfg: HealthConfig) {
  if (g.lifeState === 'active' && g.health <= 0) {
    g.health = 0;
    g.lifeState = 'lastChance';
    g.lastChanceStartedAt = at;
    // One full period: the pending check-in's rollover.
    g.lastChanceEndsAt = rolloverAt(schedule(g), g.nextDueAt, cfg.windowFraction);
    events.push({ kind: 'last_chance', at });
  }
}

function die(g: GoalCore, at: number, cause: GoalCore['deathCause'] & string, events: EngineEvent[]) {
  g.lifeState = 'dead';
  g.health = 0;
  g.deathCause = cause;
  g.diedAt = at;
  g.welcomeBack = false;
  events.push({ kind: 'died', at, cause });
}

export interface TickResult {
  goal: GoalCore;
  events: EngineEvent[];
}

/**
 * Bring a goal up to date with `now`: auto-resume finished pauses, record missed periods,
 * enter last chance, and kill buddies whose last chance expired. Idempotent.
 */
export function tick(input: GoalCore, now: number, cfg: HealthConfig = defaultConfig): TickResult {
  let g: GoalCore = { ...input };
  const events: EngineEvent[] = [];

  if (g.lifeState === 'paused' && g.pausedUntil != null && now >= g.pausedUntil) {
    const r = resume(g, g.pausedUntil, cfg);
    g = r.goal;
    events.push(...r.events);
  }

  const s = schedule(g);
  for (let i = 0; i < 5000 && isLive(g); i++) {
    if (g.lifeState === 'lastChance' && g.lastChanceEndsAt != null && now >= g.lastChanceEndsAt) {
      die(g, g.lastChanceEndsAt, 'neglect', events);
      break;
    }
    const roll = rolloverAt(s, g.nextDueAt, cfg.windowFraction);
    if (now < roll) break;

    // The period rolled over with no check-in.
    const before = g.health;
    g.noProgressStreak += 1;
    g.onTimeStreak = 0;
    g.welcomeBack = false;
    g.health = clamp(
      before - cfg.overdueDecayMax - cfg.missPenalty - noProgressPenalty(g.noProgressStreak, cfg),
      cfg,
    );
    events.push({ kind: 'missed', at: roll, dueAt: g.nextDueAt, healthBefore: before, healthAfter: g.health });
    g.nextDueAt = nextDue(s, g.nextDueAt);
    enterLastChanceIfEmpty(g, roll, events, cfg);
  }

  return { goal: g, events };
}

export interface CheckInResult extends TickResult {
  checkIn: {
    dueAt: number;
    rating: Rating;
    kind: 'regular' | 'welcome_back';
    late: boolean;
    healthBefore: number;
    healthAfter: number;
  };
}

const isProgress = (r: Rating) => r === 'on_track' || r === 'some';

/** Apply an official check-in. Caller should `tick` first and ensure `isCheckInOpen`. */
export function applyCheckIn(
  input: GoalCore,
  rating: Exclude<Rating, 'missed'>,
  now: number,
  cfg: HealthConfig = defaultConfig,
): CheckInResult {
  const g: GoalCore = { ...input };
  const events: EngineEvent[] = [];
  const s = schedule(g);
  const kind = now >= windowOpensAt(s, g.nextDueAt, cfg.windowFraction) ? 'regular' : 'welcome_back';
  const dueAt = g.nextDueAt;
  const late = kind === 'regular' && now > g.nextDueAt + cfg.graceMs[g.cadence];

  // Late check-ins count, but decay already taken stays.
  const healthBefore = clamp(g.health - overdueDecay(g, now, cfg), cfg);
  let h = healthBefore;

  if (rating === 'none') {
    g.noProgressStreak += 1;
    h -= noProgressPenalty(g.noProgressStreak, cfg);
  } else {
    g.noProgressStreak = 0;
  }
  h += cfg.checkInGain[rating];
  g.health = clamp(h, cfg);

  if (kind === 'regular') {
    g.onTimeStreak = late ? 0 : g.onTimeStreak + 1;
    g.bestStreak = Math.max(g.bestStreak, g.onTimeStreak);
    g.nextDueAt = nextDue(s, g.nextDueAt);
  }
  g.welcomeBack = false;

  if (g.lifeState === 'lastChance' && isProgress(rating)) {
    g.lifeState = 'active';
    g.lastChanceStartedAt = null;
    g.lastChanceEndsAt = null;
    events.push({ kind: 'revived', at: now });
  }
  enterLastChanceIfEmpty(g, now, events, cfg);

  return {
    goal: g,
    events,
    checkIn: { dueAt, rating, kind, late, healthBefore, healthAfter: g.health },
  };
}

/** Pause (nap). No time limit; `until` is optional. Allowed from last chance too (with a reflection prompt in the UI). */
export function pause(input: GoalCore, now: number, until: number | null, cfg: HealthConfig = defaultConfig): GoalCore {
  if (!isLive(input)) return input;
  return {
    ...input,
    health: effectiveHealth(input, now, cfg),
    pausedFromState: input.lifeState,
    lifeState: 'paused',
    pausedAt: now,
    pausedUntil: until,
    welcomeBack: false,
  };
}

/** Wake up from a nap: fresh schedule, plus a one-off "welcome back" check-in. */
export function resume(input: GoalCore, at: number, cfg: HealthConfig = defaultConfig): TickResult {
  if (input.lifeState !== 'paused') return { goal: input, events: [] };
  const g: GoalCore = {
    ...input,
    lifeState: input.pausedFromState === 'lastChance' ? 'lastChance' : 'active',
    pausedFromState: null,
    pausedAt: null,
    pausedUntil: null,
    welcomeBack: true,
  };
  g.nextDueAt = dueOnOrAfter(schedule(g), at);
  if (g.lifeState === 'lastChance') {
    g.lastChanceStartedAt = at;
    g.lastChanceEndsAt = rolloverAt(schedule(g), g.nextDueAt, cfg.windowFraction);
  }
  return { goal: g, events: [{ kind: 'resumed', at }] };
}

export function complete(input: GoalCore, now: number, cfg: HealthConfig = defaultConfig): GoalCore {
  return {
    ...input,
    health: input.lifeState === 'paused' ? input.health : effectiveHealth(input, now, cfg),
    lifeState: 'completed',
    completedAt: now,
    welcomeBack: false,
  };
}

/** Manual abandon → graveyard, and the stake is served. */
export function abandon(input: GoalCore, now: number): TickResult {
  const g: GoalCore = { ...input };
  const events: EngineEvent[] = [];
  die(g, now, 'abandoned', events);
  return { goal: g, events };
}

/** Initial engine fields for a brand new goal. */
export function initialEngineState(
  s: Schedule,
  now: number,
  cfg: HealthConfig = defaultConfig,
): Pick<
  GoalCore,
  | 'health'
  | 'noProgressStreak'
  | 'onTimeStreak'
  | 'bestStreak'
  | 'lifeState'
  | 'nextDueAt'
  | 'lastChanceStartedAt'
  | 'lastChanceEndsAt'
  | 'pausedAt'
  | 'pausedUntil'
  | 'pausedFromState'
  | 'welcomeBack'
  | 'deathCause'
  | 'diedAt'
  | 'completedAt'
> {
  return {
    health: cfg.initial,
    noProgressStreak: 0,
    onTimeStreak: 0,
    bestStreak: 0,
    lifeState: 'active',
    nextDueAt: dueOnOrAfter(s, now),
    lastChanceStartedAt: null,
    lastChanceEndsAt: null,
    pausedAt: null,
    pausedUntil: null,
    pausedFromState: null,
    welcomeBack: false,
    deathCause: null,
    diedAt: null,
    completedAt: null,
  };
}
