import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import type {
  Category,
  GoalType,
  Cadence,
  LifeState,
  DeathCause,
  Rating,
  ProgressSource,
} from '../domain/types.ts';

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  why: text('why'),
  category: text('category').$type<Category>().notNull(),
  type: text('type').$type<GoalType>().notNull(),
  cadence: text('cadence').$type<Cadence>().notNull(),
  cadenceDay: integer('cadence_day').notNull().default(0),
  reminderMinutes: integer('reminder_minutes').notNull().default(1080), // default 18:00 (6 PM)
  targetValue: real('target_value'),
  unit: text('unit'),
  targetDate: integer('target_date'),
  stake: text('stake'),
  stakePaid: integer('stake_paid', { mode: 'boolean' }).notNull().default(false),
  health: real('health').notNull().default(60),
  noProgressStreak: integer('no_progress_streak').notNull().default(0),
  onTimeStreak: integer('on_time_streak').notNull().default(0),
  bestStreak: integer('best_streak').notNull().default(0),
  lifeState: text('life_state').$type<LifeState>().notNull().default('active'),
  nextDueAt: integer('next_due_at').notNull(),
  lastChanceStartedAt: integer('last_chance_started_at'),
  lastChanceEndsAt: integer('last_chance_ends_at'),
  pausedAt: integer('paused_at'),
  pausedUntil: integer('paused_until'),
  pausedFromState: text('paused_from_state').$type<LifeState>(),
  welcomeBack: integer('welcome_back', { mode: 'boolean' }).notNull().default(false),
  deathCause: text('death_cause').$type<DeathCause>(),
  diedAt: integer('died_at'),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  doneAt: integer('done_at'),
  createdAt: integer('created_at').notNull(),
});

export const progressLogs = sqliteTable('progress_logs', {
  id: text('id').primaryKey(),
  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull().default(1),
  milestoneId: text('milestone_id').references(() => milestones.id, {
    onDelete: 'set null',
  }),
  note: text('note'),
  // Ready for future automated sync with Health Connect (Android) and HealthKit (iOS)
  source: text('source').$type<ProgressSource>().notNull().default('manual'),
  consumedByCheckInId: text('consumed_by_check_in_id'),
  createdAt: integer('created_at').notNull(),
});

export const checkIns = sqliteTable('check_ins', {
  id: text('id').primaryKey(),
  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  dueAt: integer('due_at').notNull(),
  rating: text('rating').$type<Rating>().notNull(),
  kind: text('kind').notNull(), // 'regular' | 'welcome_back'
  late: integer('late', { mode: 'boolean' }).notNull().default(false),
  note: text('note'),
  healthBefore: real('health_before').notNull(),
  healthAfter: real('health_after').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  payload: text('payload'), // JSON serialized
  createdAt: integer('created_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type GoalRecord = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;
export type MilestoneRecord = typeof milestones.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;
export type ProgressLogRecord = typeof progressLogs.$inferSelect;
export type InsertProgressLog = typeof progressLogs.$inferInsert;
export type CheckInRecord = typeof checkIns.$inferSelect;
export type InsertCheckIn = typeof checkIns.$inferInsert;
export type EventRecord = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
