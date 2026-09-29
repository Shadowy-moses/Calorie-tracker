import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateBadges } from './badges.js';

function meal(date) {
  return { date, kcal: 400, protein: 20, carbs: 10, fat: 5, name: 'Meal' };
}

function days(start, count, step = 1) {
  const [y, m, d] = start.split('-').map(Number);
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(y, m - 1, d + i * step));
    const iso = date.toISOString().slice(0, 10);
    entries.push(meal(iso));
  }
  return entries;
}

function byId(result) {
  return Object.fromEntries(result.badges.map((badge) => [badge.id, badge]));
}

test('an empty log leaves every badge locked', () => {
  const result = evaluateBadges([]);
  assert.equal(result.loggedDays, 0);
  assert.equal(result.longestStreak, 0);
  assert.deepEqual(
    result.badges.map((badge) => badge.id),
    ['kindling', 'watch', 'lake', 'ridge', 'first-week', 'first-month'],
  );
  assert.ok(result.badges.every((badge) => badge.earned === false));
});

test('one logged day earns Kindling only', () => {
  const badges = byId(evaluateBadges([meal('2026-09-02'), meal('2026-09-02')]));
  assert.equal(badges.kindling.earned, true);
  assert.equal(badges.kindling.earnedOn, '2026-09-02');
  assert.equal(badges.watch.earned, false);
  assert.equal(badges.lake.earned, false);
  assert.equal(badges.ridge.earned, false);
  assert.equal(badges.watch.progress, '1 of 7 days in a row');
});

test('seven days in a row earn The Watch, and a gap does not', () => {
  const run = byId(evaluateBadges(days('2026-08-01', 7)));
  assert.equal(run.kindling.earned, true);
  assert.equal(run.watch.earned, true);
  assert.equal(run.watch.earnedOn, '2026-08-07');
  assert.equal(run.lake.earned, false);
  assert.equal(run.ridge.earned, false);

  const gapped = evaluateBadges([...days('2026-08-01', 6), meal('2026-08-08')]);
  assert.equal(gapped.longestStreak, 6);
  assert.equal(byId(gapped).watch.earned, false);
});

test('past days count when today is empty', () => {
  const badges = byId(evaluateBadges(days('2026-07-01', 7)));
  assert.equal(badges.watch.earned, true);
  assert.equal(badges.kindling.earnedOn, '2026-07-01');
});

test('fourteen days in a row earn The Lake before 21 logged days', () => {
  const result = evaluateBadges(days('2026-09-01', 14));
  const badges = byId(result);
  assert.equal(result.loggedDays, 14);
  assert.equal(result.longestStreak, 14);
  assert.equal(badges.lake.earned, true);
  assert.equal(badges.lake.earnedOn, '2026-09-14');
  assert.equal(badges.ridge.earned, false);
  assert.equal(badges.watch.earned, true);
});

test('21 separate days earn The Lake without a long streak', () => {
  const result = evaluateBadges(days('2026-01-01', 21, 2));
  const badges = byId(result);
  assert.equal(result.loggedDays, 21);
  assert.equal(result.longestStreak, 1);
  assert.equal(badges.watch.earned, false);
  assert.equal(badges.lake.earned, true);
  assert.equal(badges.lake.earnedOn, '2026-02-10');
  assert.equal(badges.ridge.earned, false);
});

test('thirty days in a row earn The Ridge', () => {
  const badges = byId(evaluateBadges(days('2026-03-01', 30)));
  assert.equal(badges.ridge.earned, true);
  assert.equal(badges.ridge.earnedOn, '2026-03-30');
  assert.equal(badges.lake.earned, true);
});

test('42 logged days earn The Ridge without a 30-day streak', () => {
  const result = evaluateBadges(days('2026-01-01', 42, 2));
  const badges = byId(result);
  assert.equal(result.loggedDays, 42);
  assert.equal(result.longestStreak, 1);
  assert.equal(badges.ridge.earned, true);
  assert.equal(badges.lake.earned, true);
  assert.equal(badges.watch.earned, false);
});
