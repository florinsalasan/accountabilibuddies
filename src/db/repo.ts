import { eq, desc, asc } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { getDb } from './client.ts';
import * as schema from './schema.ts';
import {
  tick,
  applyCheckIn,
  pause as domainPause,
  resume as domainResume,
  complete as domainComplete,
  abandon as domainAbandon,
  initialEngineState,
} from '../domain/health.ts';
import { healthConfig } from '../domain/healthConfig.ts';
import type {
  GoalCore,
  Rating,
  Category,
  GoalType,
  Cadence,
  ProgressSource,
} from '../domain/types.ts';

function toGoalCore(record: schema.GoalRecord): GoalCore {
  return {
    id: record.id,
    category: record.category,
    type: record.type,
    cadence: record.cadence,
    cadenceDay: record.cadenceDay,
    reminderMinutes: record.reminderMinutes,
    health: record.health,
    noProgressStreak: record.noProgressStreak,
    onTimeStreak: record.onTimeStreak,
    bestStreak: record.bestStreak,
    lifeState: record.lifeState,
    nextDueAt: record.nextDueAt,
    lastChanceStartedAt: record.lastChanceStartedAt,
    lastChanceEndsAt: record.lastChanceEndsAt,
    pausedAt: record.pausedAt,
    pausedUntil: record.pausedUntil,
    pausedFromState: record.pausedFromState,
    welcomeBack: Boolean(record.welcomeBack),
    deathCause: record.deathCause,
    diedAt: record.diedAt,
    completedAt: record.completedAt,
  };
}

export const GoalRepo = {
  async getAll() {
    const db = getDb();
    return db.select().from(schema.goals).orderBy(desc(schema.goals.createdAt));
  },

  async getById(id: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.id, id))
      .limit(1);
    if (!rows.length) return null;

    const goal = rows[0];
    const milestones = await db
      .select()
      .from(schema.milestones)
      .where(eq(schema.milestones.goalId, id))
      .orderBy(asc(schema.milestones.orderIndex));

    const recentLogs = await db
      .select()
      .from(schema.progressLogs)
      .where(eq(schema.progressLogs.goalId, id))
      .orderBy(desc(schema.progressLogs.createdAt))
      .limit(20);

    const recentCheckIns = await db
      .select()
      .from(schema.checkIns)
      .where(eq(schema.checkIns.goalId, id))
      .orderBy(desc(schema.checkIns.createdAt))
      .limit(10);

    const goalEvents = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.goalId, id))
      .orderBy(desc(schema.events.createdAt))
      .limit(20);

    return {
      goal,
      milestones,
      recentLogs,
      recentCheckIns,
      events: goalEvents,
    };
  },

  async create(data: {
    title: string;
    why?: string;
    category: Category;
    type: GoalType;
    cadence: Cadence;
    cadenceDay?: number;
    reminderMinutes?: number;
    targetValue?: number;
    unit?: string;
    targetDate?: number;
    stake?: string;
    milestoneTitles?: string[];
  }) {
    const db = getDb();
    const now = Date.now();
    const id = Crypto.randomUUID();

    const sched = {
      cadence: data.cadence,
      cadenceDay: data.cadenceDay ?? 0,
      reminderMinutes: data.reminderMinutes ?? 1080,
    };

    const engineInit = initialEngineState(sched, now, healthConfig);

    const newGoal: schema.InsertGoal = {
      id,
      title: data.title.trim(),
      why: data.why?.trim() || null,
      category: data.category,
      type: data.type,
      cadence: data.cadence,
      cadenceDay: data.cadenceDay ?? 0,
      reminderMinutes: data.reminderMinutes ?? 1080,
      targetValue: data.targetValue ?? null,
      unit: data.unit?.trim() || null,
      targetDate: data.targetDate ?? null,
      stake: data.stake?.trim() || null,
      stakePaid: false,
      health: engineInit.health,
      noProgressStreak: engineInit.noProgressStreak,
      onTimeStreak: engineInit.onTimeStreak,
      bestStreak: engineInit.bestStreak,
      lifeState: engineInit.lifeState,
      nextDueAt: engineInit.nextDueAt,
      lastChanceStartedAt: engineInit.lastChanceStartedAt,
      lastChanceEndsAt: engineInit.lastChanceEndsAt,
      pausedAt: engineInit.pausedAt,
      pausedUntil: engineInit.pausedUntil,
      pausedFromState: engineInit.pausedFromState,
      welcomeBack: engineInit.welcomeBack,
      deathCause: engineInit.deathCause,
      diedAt: engineInit.diedAt,
      completedAt: engineInit.completedAt,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schema.goals).values(newGoal);

    if (data.milestoneTitles && data.milestoneTitles.length > 0) {
      const milestoneInserts: schema.InsertMilestone[] = data.milestoneTitles.map(
        (title, index) => ({
          id: Crypto.randomUUID(),
          goalId: id,
          title: title.trim(),
          orderIndex: index,
          doneAt: null,
          createdAt: now,
        }),
      );
      await db.insert(schema.milestones).values(milestoneInserts);
    }

    return id;
  },

  async syncAll(now = Date.now()) {
    const db = getDb();
    const allGoals = await db.select().from(schema.goals);

    for (const record of allGoals) {
      if (record.lifeState === 'completed' || record.lifeState === 'dead') {
        continue;
      }
      const core = toGoalCore(record);
      const { goal: updated, events } = tick(core, now, healthConfig);

      // If state changed or events fired, update DB
      if (
        updated.health !== record.health ||
        updated.lifeState !== record.lifeState ||
        updated.nextDueAt !== record.nextDueAt ||
        updated.noProgressStreak !== record.noProgressStreak ||
        events.length > 0
      ) {
        await db
          .update(schema.goals)
          .set({
            health: updated.health,
            lifeState: updated.lifeState,
            nextDueAt: updated.nextDueAt,
            noProgressStreak: updated.noProgressStreak,
            onTimeStreak: updated.onTimeStreak,
            bestStreak: updated.bestStreak,
            lastChanceStartedAt: updated.lastChanceStartedAt,
            lastChanceEndsAt: updated.lastChanceEndsAt,
            deathCause: updated.deathCause,
            diedAt: updated.diedAt,
            welcomeBack: updated.welcomeBack,
            updatedAt: now,
          })
          .where(eq(schema.goals.id, record.id));

        for (const evt of events) {
          if (evt.kind === 'missed') {
            await db.insert(schema.checkIns).values({
              id: Crypto.randomUUID(),
              goalId: record.id,
              dueAt: evt.dueAt,
              rating: 'missed',
              kind: 'regular',
              late: true,
              note: 'Missed check-in (period rolled over)',
              healthBefore: evt.healthBefore,
              healthAfter: evt.healthAfter,
              createdAt: evt.at,
            });
          }
          await db.insert(schema.events).values({
            id: Crypto.randomUUID(),
            goalId: record.id,
            kind: evt.kind,
            payload: JSON.stringify(evt),
            createdAt: evt.at,
          });
        }
      }
    }
  },

  async checkIn(goalId: string, rating: Exclude<Rating, 'missed'>, note?: string, now = Date.now()) {
    const db = getDb();
    const rows = await db.select().from(schema.goals).where(eq(schema.goals.id, goalId));
    if (!rows.length) throw new Error('Goal not found');
    const record = rows[0];

    // Tick first to ensure it's up to date
    const core = toGoalCore(record);
    const ticked = tick(core, now, healthConfig);
    const result = applyCheckIn(ticked.goal, rating, now, healthConfig);
    const updated = result.goal;

    await db
      .update(schema.goals)
      .set({
        health: updated.health,
        lifeState: updated.lifeState,
        nextDueAt: updated.nextDueAt,
        noProgressStreak: updated.noProgressStreak,
        onTimeStreak: updated.onTimeStreak,
        bestStreak: updated.bestStreak,
        lastChanceStartedAt: updated.lastChanceStartedAt,
        lastChanceEndsAt: updated.lastChanceEndsAt,
        welcomeBack: updated.welcomeBack,
        updatedAt: now,
      })
      .where(eq(schema.goals.id, goalId));

    // Save check-in record
    await db.insert(schema.checkIns).values({
      id: Crypto.randomUUID(),
      goalId,
      dueAt: result.checkIn.dueAt,
      rating,
      kind: result.checkIn.kind,
      late: result.checkIn.late,
      note: note?.trim() || null,
      healthBefore: result.checkIn.healthBefore,
      healthAfter: result.checkIn.healthAfter,
      createdAt: now,
    });

    for (const evt of [...ticked.events, ...result.events]) {
      await db.insert(schema.events).values({
        id: Crypto.randomUUID(),
        goalId,
        kind: evt.kind,
        payload: JSON.stringify(evt),
        createdAt: evt.at,
      });
    }

    return result;
  },

  async logProgress(data: {
    goalId: string;
    amount?: number;
    milestoneId?: string;
    note?: string;
    source?: ProgressSource;
    now?: number;
  }) {
    const db = getDb();
    const now = data.now ?? Date.now();
    const id = Crypto.randomUUID();

    await db.insert(schema.progressLogs).values({
      id,
      goalId: data.goalId,
      amount: data.amount ?? 1,
      milestoneId: data.milestoneId ?? null,
      note: data.note?.trim() || null,
      source: data.source ?? 'manual',
      consumedByCheckInId: null,
      createdAt: now,
    });

    return id;
  },

  async toggleMilestone(milestoneId: string, done: boolean) {
    const db = getDb();
    const now = Date.now();
    await db
      .update(schema.milestones)
      .set({ doneAt: done ? now : null })
      .where(eq(schema.milestones.id, milestoneId));
  },

  async pause(goalId: string, reflectionReason?: string, until: number | null = null, now = Date.now()) {
    const db = getDb();
    const rows = await db.select().from(schema.goals).where(eq(schema.goals.id, goalId));
    if (!rows.length) throw new Error('Goal not found');

    const core = toGoalCore(rows[0]);
    const paused = domainPause(core, now, until, healthConfig);

    await db
      .update(schema.goals)
      .set({
        health: paused.health,
        lifeState: paused.lifeState,
        pausedAt: paused.pausedAt,
        pausedUntil: paused.pausedUntil,
        pausedFromState: paused.pausedFromState,
        welcomeBack: false,
        updatedAt: now,
      })
      .where(eq(schema.goals.id, goalId));

    if (reflectionReason) {
      await db.insert(schema.events).values({
        id: Crypto.randomUUID(),
        goalId,
        kind: 'reflection',
        payload: JSON.stringify({ reason: reflectionReason, context: 'pause' }),
        createdAt: now,
      });
    }
    await db.insert(schema.events).values({
      id: Crypto.randomUUID(),
      goalId,
      kind: 'paused',
      payload: JSON.stringify({ until }),
      createdAt: now,
    });
  },

  async resume(goalId: string, now = Date.now()) {
    const db = getDb();
    const rows = await db.select().from(schema.goals).where(eq(schema.goals.id, goalId));
    if (!rows.length) throw new Error('Goal not found');

    const core = toGoalCore(rows[0]);
    const { goal: resumed, events: resEvents } = domainResume(core, now, healthConfig);

    await db
      .update(schema.goals)
      .set({
        lifeState: resumed.lifeState,
        nextDueAt: resumed.nextDueAt,
        pausedAt: null,
        pausedUntil: null,
        pausedFromState: null,
        welcomeBack: true,
        lastChanceStartedAt: resumed.lastChanceStartedAt,
        lastChanceEndsAt: resumed.lastChanceEndsAt,
        updatedAt: now,
      })
      .where(eq(schema.goals.id, goalId));

    for (const evt of resEvents) {
      await db.insert(schema.events).values({
        id: Crypto.randomUUID(),
        goalId,
        kind: evt.kind,
        payload: JSON.stringify(evt),
        createdAt: evt.at,
      });
    }
  },

  async complete(goalId: string, now = Date.now()) {
    const db = getDb();
    const rows = await db.select().from(schema.goals).where(eq(schema.goals.id, goalId));
    if (!rows.length) throw new Error('Goal not found');

    const core = toGoalCore(rows[0]);
    const completed = domainComplete(core, now, healthConfig);

    await db
      .update(schema.goals)
      .set({
        health: completed.health,
        lifeState: 'completed',
        completedAt: now,
        welcomeBack: false,
        updatedAt: now,
      })
      .where(eq(schema.goals.id, goalId));

    await db.insert(schema.events).values({
      id: Crypto.randomUUID(),
      goalId,
      kind: 'completed',
      payload: JSON.stringify({ at: now }),
      createdAt: now,
    });
  },

  async abandon(goalId: string, now = Date.now()) {
    const db = getDb();
    const rows = await db.select().from(schema.goals).where(eq(schema.goals.id, goalId));
    if (!rows.length) throw new Error('Goal not found');

    const core = toGoalCore(rows[0]);
    const { events: abandonEvents } = domainAbandon(core, now);

    await db
      .update(schema.goals)
      .set({
        health: 0,
        lifeState: 'dead',
        deathCause: 'abandoned',
        diedAt: now,
        welcomeBack: false,
        updatedAt: now,
      })
      .where(eq(schema.goals.id, goalId));

    for (const evt of abandonEvents) {
      await db.insert(schema.events).values({
        id: Crypto.randomUUID(),
        goalId,
        kind: evt.kind,
        payload: JSON.stringify(evt),
        createdAt: evt.at,
      });
    }
  },

  async markStakePaid(goalId: string, paid: boolean) {
    const db = getDb();
    await db
      .update(schema.goals)
      .set({ stakePaid: paid, updatedAt: Date.now() })
      .where(eq(schema.goals.id, goalId));

    await db.insert(schema.events).values({
      id: Crypto.randomUUID(),
      goalId,
      kind: 'stake_paid',
      payload: JSON.stringify({ paid }),
      createdAt: Date.now(),
    });
  },

  async setHealth(goalId: string, newHealth: number) {
    const db = getDb();
    const clamped = Math.max(0, Math.min(100, Math.round(newHealth)));
    const now = Date.now();
    await db
      .update(schema.goals)
      .set({
        health: clamped,
        lifeState: clamped === 0 ? 'lastChance' : 'active',
        lastChanceStartedAt: clamped === 0 ? now : null,
        lastChanceEndsAt: clamped === 0 ? now + 86400000 : null,
        updatedAt: now,
      })
      .where(eq(schema.goals.id, goalId));
  },

  async update(
    goalId: string,
    data: {
      title?: string;
      why?: string;
      reminderMinutes?: number;
      targetValue?: number;
      unit?: string;
      targetDate?: number;
      stake?: string;
    },
  ) {
    const db = getDb();
    const now = Date.now();
    await db
      .update(schema.goals)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(schema.goals.id, goalId));
    return this.getById(goalId);
  },

  async delete(goalId: string) {
    const db = getDb();
    await db.delete(schema.goals).where(eq(schema.goals.id, goalId));
  },
};

export const SettingsRepo = {
  async get(key: string, defaultVal: string = ''): Promise<string> {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.key, key));
    return rows.length ? rows[0].value : defaultVal;
  },

  async set(key: string, value: string) {
    const db = getDb();
    await db
      .insert(schema.appSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: schema.appSettings.key,
        set: { value },
      });
  },
};
