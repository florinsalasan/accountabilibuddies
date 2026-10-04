import { getExpoDb } from './client.ts';

const INIT_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY NOT NULL,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id text PRIMARY KEY NOT NULL,
  title text NOT NULL,
  why text,
  category text NOT NULL,
  type text NOT NULL,
  cadence text NOT NULL,
  cadence_day integer DEFAULT 0 NOT NULL,
  reminder_minutes integer DEFAULT 1080 NOT NULL,
  target_value real,
  unit text,
  target_date integer,
  stake text,
  stake_paid integer DEFAULT 0 NOT NULL,
  health real DEFAULT 60 NOT NULL,
  no_progress_streak integer DEFAULT 0 NOT NULL,
  on_time_streak integer DEFAULT 0 NOT NULL,
  best_streak integer DEFAULT 0 NOT NULL,
  life_state text DEFAULT 'active' NOT NULL,
  next_due_at integer NOT NULL,
  last_chance_started_at integer,
  last_chance_ends_at integer,
  paused_at integer,
  paused_until integer,
  paused_from_state text,
  welcome_back integer DEFAULT 0 NOT NULL,
  death_cause text,
  died_at integer,
  completed_at integer,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id text PRIMARY KEY NOT NULL,
  goal_id text NOT NULL,
  title text NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  done_at integer,
  created_at integer NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progress_logs (
  id text PRIMARY KEY NOT NULL,
  goal_id text NOT NULL,
  amount real DEFAULT 1 NOT NULL,
  milestone_id text,
  note text,
  source text DEFAULT 'manual' NOT NULL,
  consumed_by_check_in_id text,
  created_at integer NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON UPDATE NO ACTION ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS check_ins (
  id text PRIMARY KEY NOT NULL,
  goal_id text NOT NULL,
  due_at integer NOT NULL,
  rating text NOT NULL,
  kind text NOT NULL,
  late integer DEFAULT 0 NOT NULL,
  note text,
  health_before real NOT NULL,
  health_after real NOT NULL,
  created_at integer NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY NOT NULL,
  goal_id text NOT NULL,
  kind text NOT NULL,
  payload text,
  created_at integer NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON UPDATE NO ACTION ON DELETE CASCADE
);
`;

export function initDatabase() {
  const db = getExpoDb();
  db.execSync(INIT_SQL);
}
