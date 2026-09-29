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
    [
      'kindling',
      'watch',
      'lake',
      'ridge',
      'yard',
      'heights',
      'road',
      'cove',
      'falls',
      'chain',
      'lanterns',
      'gate',
      'duel',
      'blessing',
      'beast',
      'arch',
      'wheel',
    ],
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

const GOALS = { calorieGoal: 2000, proteinGoal: 120 };

function plate(date, kcal, protein) {
  return { date, kcal, protein, carbs: 0, fat: 0, name: 'Meal' };
}

function goalDays(start, count, kcal, protein, step = 1) {
  const [y, m, d] = start.split('-').map(Number);
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(y, m - 1, d + i * step));
    entries.push(plate(date.toISOString().slice(0, 10), kcal, protein));
  }
  return entries;
}

test('42 logged days earn The Ridge without a 30-day streak', () => {
  const result = evaluateBadges(days('2026-01-01', 42, 2));
  const badges = byId(result);
  assert.equal(result.loggedDays, 42);
  assert.equal(result.longestStreak, 1);
  assert.equal(badges.ridge.earned, true);
  assert.equal(badges.lake.earned, true);
  assert.equal(badges.watch.earned, false);
});

test('calorie-range days are inclusive of 90 and 110 percent and count once', () => {
  const edges = byId(
    evaluateBadges(
      [
        plate('2026-04-01', 1800, 10),
        plate('2026-04-03', 1000, 5),
        plate('2026-04-03', 1000, 5),
        plate('2026-04-05', 2200, 10),
      ],
      [],
      GOALS,
    ),
  );
  assert.equal(edges.road.earned, true);
  assert.equal(edges.road.earnedOn, '2026-04-05');
  assert.equal(edges.cove.earned, false);
  assert.equal(edges.cove.progress, '3 of 7 days');
  assert.equal(edges.lanterns.earned, false);

  const pushedOut = byId(
    evaluateBadges([plate('2026-04-01', 1800, 10), plate('2026-04-03', 2000, 5), plate('2026-04-03', 201, 5)], [], GOALS),
  );
  assert.equal(pushedOut.road.progress, '1 of 3 days');

  const outside = byId(
    evaluateBadges([plate('2026-04-01', 1799, 10), plate('2026-04-02', 2201, 10)], [], GOALS),
  );
  assert.equal(outside.road.earned, false);
  assert.equal(outside.road.progress, '0 of 3 days');
});

test('protein days and both-goal days use the same calendar day', () => {
  const almost = byId(evaluateBadges(goalDays('2026-06-01', 7, 2000, 119, 2), [], GOALS));
  assert.equal(almost.cove.earned, true);
  assert.equal(almost.lanterns.earned, false);
  assert.equal(almost.wheel.earned, false);
  assert.equal(almost.wheel.progress, '0 of 7 days');

  const proteinOnly = byId(evaluateBadges(goalDays('2026-06-01', 3, 2600, 120, 3), [], GOALS));
  assert.equal(proteinOnly.lanterns.earned, true);
  assert.equal(proteinOnly.lanterns.earnedOn, '2026-06-07');
  assert.equal(proteinOnly.road.earned, false);
  assert.equal(proteinOnly.wheel.progress, '0 of 7 days');

  const both = byId(evaluateBadges(goalDays('2026-01-02', 7, 1800, 120, 2), [], GOALS));
  assert.equal(both.wheel.earned, true);
  assert.equal(both.wheel.earnedOn, '2026-01-14');
  assert.equal(both.cove.earned, true);
  assert.equal(both.gate.earned, true);
  assert.equal(both.falls.earned, false);
  assert.equal(both.duel.earned, false);
});

test('protein and calorie badges add meals on one day and keep past days', () => {
  const split = [
    plate('2026-02-01', 900, 40),
    plate('2026-02-01', 900, 80),
    plate('2025-12-01', 2200, 120),
    plate('2025-11-01', 3000, 150),
  ];
  const badges = byId(evaluateBadges(split, [], GOALS));
  assert.equal(badges.road.progress, '2 of 3 days');
  assert.equal(badges.lanterns.earned, true);
  assert.equal(badges.lanterns.earnedOn, '2026-02-01');
  assert.equal(badges.wheel.progress, '2 of 7 days');
  assert.equal(badges.kindling.earned, true);
});

test('longer calorie and protein streaks unlock the higher badges', () => {
  const month = byId(evaluateBadges(goalDays('2026-01-01', 30, 2100, 130), [], GOALS));
  assert.equal(month.chain.earned, true);
  assert.equal(month.chain.earnedOn, '2026-01-30');
  assert.equal(month.falls.earned, true);
  assert.equal(month.blessing.earned, true);
  assert.equal(month.blessing.earnedOn, '2026-01-30');
  assert.equal(month.duel.earned, true);
  assert.equal(month.wheel.earned, true);
});

test('Climber badges unlock at 14 and 21 days without logging food', () => {
  const fourteen = byId(evaluateBadges([], goalDays('2026-03-01', 14, 0, 0)));
  assert.equal(fourteen.yard.earned, true);
  assert.equal(fourteen.beast.earned, true);
  assert.equal(fourteen.beast.earnedOn, '2026-03-14');
  assert.equal(fourteen.arch.earned, false);
  assert.equal(fourteen.arch.progress, '14 of 21 days');
  assert.equal(fourteen.heights.earned, false);
  assert.equal(fourteen.kindling.earned, false);

  const twentyOne = byId(evaluateBadges([], goalDays('2026-03-01', 21, 0, 0, 2)));
  assert.equal(twentyOne.arch.earned, true);
  assert.equal(twentyOne.arch.earnedOn, '2026-04-10');
  assert.equal(twentyOne.heights.earned, false);
  assert.equal(twentyOne.beast.earned, true);
});
