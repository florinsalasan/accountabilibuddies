import type { Cadence } from './types.ts';

/**
 * Period math. A goal's check-ins are anchored on "due moments": the reminder time on the
 * cadence day (every day / chosen weekday / chosen day of month), in local time.
 *
 *   prevDue ─────────── windowOpen ── due ──── (grace) ──── decay ────── nextWindowOpen
 *                         └ last 25% ┘                                   └ rollover: missed
 */

export interface Schedule {
  cadence: Cadence;
  cadenceDay: number;
  reminderMinutes: number;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function atMinutes(d: Date, minutes: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  r.setMinutes(minutes);
  return r;
}

function dueInMonth(year: number, month: number, s: Schedule): Date {
  const day = Math.min(Math.max(1, s.cadenceDay), daysInMonth(year, month));
  return atMinutes(new Date(year, month, day), s.reminderMinutes);
}

/** First due moment at or after `t`. */
export function dueOnOrAfter(s: Schedule, t: number): number {
  const now = new Date(t);
  switch (s.cadence) {
    case 'daily': {
      let d = atMinutes(now, s.reminderMinutes);
      if (d.getTime() < t) d = atMinutes(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), s.reminderMinutes);
      return d.getTime();
    }
    case 'weekly': {
      const delta = (s.cadenceDay - now.getDay() + 7) % 7;
      let d = atMinutes(new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta), s.reminderMinutes);
      if (d.getTime() < t) d = atMinutes(new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta + 7), s.reminderMinutes);
      return d.getTime();
    }
    case 'monthly': {
      let d = dueInMonth(now.getFullYear(), now.getMonth(), s);
      if (d.getTime() < t) d = dueInMonth(now.getFullYear(), now.getMonth() + 1, s);
      return d.getTime();
    }
  }
}

/** The due moment after `due`. */
export function nextDue(s: Schedule, due: number): number {
  return dueOnOrAfter(s, due + 60_000);
}

/** The due moment before `due`. */
export function prevDue(s: Schedule, due: number): number {
  const d = new Date(due);
  switch (s.cadence) {
    case 'daily':
      return atMinutes(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1), s.reminderMinutes).getTime();
    case 'weekly':
      return atMinutes(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7), s.reminderMinutes).getTime();
    case 'monthly':
      return dueInMonth(d.getFullYear(), d.getMonth() - 1, s).getTime();
  }
}

/** When the check-in for the period ending at `due` becomes available. */
export function windowOpensAt(s: Schedule, due: number, windowFraction: number): number {
  return due - windowFraction * (due - prevDue(s, due));
}

/** When the period ending at `due` rolls over (the next period's window opens). */
export function rolloverAt(s: Schedule, due: number, windowFraction: number): number {
  return windowOpensAt(s, nextDue(s, due), windowFraction);
}

/** Nominal period length — used for "one full period" durations (last chance, etc). */
export function periodLength(s: Schedule, due: number): number {
  return nextDue(s, due) - due;
}

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};
