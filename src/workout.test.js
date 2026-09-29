import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBackgroundId } from './backgrounds.js';
import { evaluateBadges } from './badges.js';
import {
  CLIMBER_MS,
  currentStreak,
  finishedDates,
  formatClock,
  normalizeWorkoutLog,
  pauseTimer,
  resetTimer,
  startTimer,
  timerSnapshot,
} from './workout.js';

function meal(date) {
  return { date, kcal: 100 };
}

function days(start, count) {
  const [y, m, d] = start.split('-').map(Number);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    rows.push({ date: date.toISOString().slice(0, 10) });
  }
  return rows;
}

test('the 20 minute clock formats whole seconds', () => {
  assert.equal(formatClock(CLIMBER_MS), '20:00');
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(12 * 60 * 1000), '12:00');
  assert.equal(formatClock(61 * 1000), '1:01');
});

test('start, pause, and resume the climber timer', () => {
  resetTimer();
  const start = 1_000_000;
  startTimer(start);
  const later = timerSnapshot(start + 5000);
  assert.equal(later.running, true);
  assert.equal(later.remaining, CLIMBER_MS - 5000);
  pauseTimer(start + 5000);
  const held = timerSnapshot(start + 20000);
  assert.equal(held.running, false);
  assert.equal(held.remaining, CLIMBER_MS - 5000);
  startTimer(start + 20000);
  const resumed = timerSnapshot(start + 25000);
  assert.equal(resumed.remaining, CLIMBER_MS - 10000);
  resetTimer();
});

test('the timer stops at zero', () => {
  resetTimer();
  const start = 5_000_000;
  startTimer(start);
  const done = timerSnapshot(start + CLIMBER_MS + 50);
  assert.equal(done.running, false);
  assert.equal(done.remaining, 0);
  resetTimer();
});

test('a streak counts finished days through today or yesterday', () => {
  assert.equal(currentStreak(['2026-09-27', '2026-09-28', '2026-09-29'], '2026-09-29'), 3);
  assert.equal(currentStreak(['2026-09-27', '2026-09-28'], '2026-09-29'), 2);
  assert.equal(currentStreak(['2026-09-26', '2026-09-27'], '2026-09-29'), 0);
  assert.equal(currentStreak(['2026-09-29'], '2026-09-29'), 1);
});

test('one saved workout per day counts once', () => {
  const dates = finishedDates([
    { date: '2026-09-01' },
    { date: '2026-09-01' },
    { date: '2026-09-02' },
    { date: 'bad' },
  ]);
  assert.deepEqual(dates, ['2026-09-01', '2026-09-02']);
});

test('rounds are required and leftover reps are optional', () => {
  assert.equal(normalizeWorkoutLog({ rounds: '', pushups: '', squats: '', pullups: '' }).error, 'Enter how many full rounds you finished.');
  const ok = normalizeWorkoutLog({ rounds: '4', pushups: '', squats: '2', pullups: '0' });
  assert.deepEqual(ok.values, { rounds: 4, pushups: 0, squats: 2, pullups: 0 });
  assert.ok(normalizeWorkoutLog({ rounds: '1.5' }).error);
});

test('workout badges unlock at 7 and 30 different days', () => {
  const meals = [meal('2026-09-01')];
  const six = evaluateBadges(meals, days('2026-09-01', 6));
  const week = six.badges.find((badge) => badge.id === 'yard');
  const month = six.badges.find((badge) => badge.id === 'heights');
  assert.equal(week.earned, false);
  assert.equal(week.progress, '6 of 7 days');
  assert.equal(month.earned, false);

  const seven = evaluateBadges(meals, days('2026-09-01', 7));
  assert.equal(seven.badges.find((badge) => badge.id === 'yard').earned, true);
  assert.equal(seven.badges.find((badge) => badge.id === 'yard').earnedOn, '2026-09-07');
  assert.equal(seven.badges.find((badge) => badge.id === 'heights').earned, false);
  assert.equal(seven.badges.find((badge) => badge.id === 'kindling').earned, true);

  const thirty = evaluateBadges([], days('2026-01-01', 30));
  assert.equal(thirty.badges.find((badge) => badge.id === 'heights').earned, true);
  assert.equal(thirty.badges.find((badge) => badge.id === 'heights').earnedOn, '2026-01-30');
  assert.equal(thirty.badges.find((badge) => badge.id === 'kindling').earned, false);
});

test('the card painting follows the highest unlocked workout count', () => {
  assert.equal(resolveBackgroundId('auto', 0), 'ridge');
  assert.equal(resolveBackgroundId('auto', 6), 'ridge');
  assert.equal(resolveBackgroundId('auto', 7), 'week');
  assert.equal(resolveBackgroundId('auto', 14), 'beast');
  assert.equal(resolveBackgroundId('auto', 21), 'arch');
  assert.equal(resolveBackgroundId('auto', 30), 'month');
  assert.equal(resolveBackgroundId('ridge', 30), 'ridge');
  assert.equal(resolveBackgroundId('week', 0), 'ridge');
  assert.equal(resolveBackgroundId('month', 7), 'week');
  assert.equal(resolveBackgroundId('beast', 7), 'week');
  assert.equal(resolveBackgroundId('arch', 14), 'beast');
  assert.equal(resolveBackgroundId('nope', 30), 'month');
});

test('nutrition paintings unlock on their own and stay below a higher Climber painting', () => {
  assert.equal(resolveBackgroundId('auto', { calorieDays: 3 }), 'road');
  assert.equal(resolveBackgroundId('auto', { calorieDays: 2, proteinDays: 3 }), 'lanterns');
  assert.equal(resolveBackgroundId('auto', { calorieDays: 7, bothDays: 7 }), 'wheel');
  assert.equal(resolveBackgroundId('auto', { calorieDays: 30, workoutDays: 7 }), 'chain');
  assert.equal(resolveBackgroundId('auto', { calorieDays: 30, proteinDays: 30, bothDays: 7, workoutDays: 30 }), 'month');
  assert.equal(resolveBackgroundId('cove', { calorieDays: 7, workoutDays: 30 }), 'cove');
  assert.equal(resolveBackgroundId('road', { calorieDays: 0 }), 'ridge');
  assert.equal(resolveBackgroundId('falls', { calorieDays: 14, proteinDays: 14 }), 'falls');
});
