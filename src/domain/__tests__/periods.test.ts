import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  dueOnOrAfter,
  nextDue,
  prevDue,
  windowOpensAt,
  rolloverAt,
  periodLength,
  type Schedule,
} from '../periods.ts';

describe('Period calculations', () => {
  test('Daily schedule calculates due date and window', () => {
    // 2026-10-03 at 10:00 AM (local)
    const base = new Date(2026, 9, 3, 10, 0, 0).getTime();
    const sched: Schedule = {
      cadence: 'daily',
      cadenceDay: 0,
      reminderMinutes: 18 * 60, // 6:00 PM (1080 mins)
    };

    const due = dueOnOrAfter(sched, base);
    const dueDate = new Date(due);
    assert.equal(dueDate.getFullYear(), 2026);
    assert.equal(dueDate.getMonth(), 9);
    assert.equal(dueDate.getDate(), 3);
    assert.equal(dueDate.getHours(), 18);
    assert.equal(dueDate.getMinutes(), 0);

    const followingDue = nextDue(sched, due);
    const nextDate = new Date(followingDue);
    assert.equal(nextDate.getDate(), 4);
    assert.equal(nextDate.getHours(), 18);

    const previousDue = prevDue(sched, due);
    const prevDate = new Date(previousDue);
    assert.equal(prevDate.getDate(), 2);
    assert.equal(prevDate.getHours(), 18);

    // Window opens 25% before due time: 24h period * 0.25 = 6h before 18:00 -> 12:00 PM
    const windowOpen = windowOpensAt(sched, due, 0.25);
    const openDate = new Date(windowOpen);
    assert.equal(openDate.getDate(), 3);
    assert.equal(openDate.getHours(), 12);

    // Period length is 24 hours
    assert.equal(periodLength(sched, due), 24 * 3600_000);

    // Rollover occurs when next period's window opens (Oct 4 at 12:00 PM)
    const roll = rolloverAt(sched, due, 0.25);
    const rollDate = new Date(roll);
    assert.equal(rollDate.getDate(), 4);
    assert.equal(rollDate.getHours(), 12);
  });

  test('Weekly schedule calculates target weekday', () => {
    // 2026-10-03 is Saturday (day 6)
    const base = new Date(2026, 9, 3, 9, 0, 0).getTime();
    const sched: Schedule = {
      cadence: 'weekly',
      cadenceDay: 1, // Monday
      reminderMinutes: 9 * 60,
    };

    const due = dueOnOrAfter(sched, base);
    const dueDate = new Date(due);
    assert.equal(dueDate.getDay(), 1, 'Should fall on Monday');
    // Saturday Oct 3 -> Sunday Oct 4 -> Monday Oct 5
    assert.equal(dueDate.getDate(), 5);
  });

  test('Monthly schedule handles end of month clamping', () => {
    // February in non-leap year (e.g. 2025 or checking Feb 2026)
    // Jan 15th looking for day 31
    const base = new Date(2026, 0, 15, 8, 0, 0).getTime();
    const sched: Schedule = {
      cadence: 'monthly',
      cadenceDay: 31,
      reminderMinutes: 12 * 60,
    };

    const janDue = dueOnOrAfter(sched, base);
    const janDate = new Date(janDue);
    assert.equal(janDate.getMonth(), 0);
    assert.equal(janDate.getDate(), 31);

    const febDue = nextDue(sched, janDue);
    const febDate = new Date(febDue);
    assert.equal(febDate.getMonth(), 1); // February
    assert.equal(febDate.getDate(), 28, 'Should clamp to Feb 28');
  });
});
