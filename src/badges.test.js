import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateBadges, inCalorieWindow } from './badges.js';

const goals = { calorieGoal: 2000, proteinGoal: 120, carbGoal: 225, fatGoal: 65 };

function meal(date, kcal, protein = 20) {
  return { date, kcal, protein, carbs: 10, fat: 5, name: 'Meal' };
}

function byId(result) {
  return Object.fromEntries(result.badges.map((badge) => [badge.id, badge]));
}

test('an empty log leaves every badge locked', () => {
  const result = evaluateBadges([], goals);
  assert.equal(result.loggedDays, 0);
  assert.equal(result.longestStreak, 0);
  assert.ok(result.badges.every((badge) => badge.earned === false));
});

test('the first logged meal earns First Ember only', () => {
  const badges = byId(evaluateBadges([meal('2026-09-02', 400, 30)], goals));
  assert.equal(badges['first-meal'].earned, true);
  assert.equal(badges['first-meal'].earnedOn, '2026-09-02');
  assert.equal(badges['streak-3'].earned, false);
  assert.equal(badges['streak-7'].earned, false);
  assert.equal(badges['streak-14'].earned, false);
});

test('three calendar days in a row earn Three Dawns, and a gap does not', () => {
  const consecutive = byId(
    evaluateBadges(
      [meal('2026-09-01', 400), meal('2026-09-02', 400), meal('2026-09-03', 500, 40)],
      goals,
    ),
  );
  assert.equal(consecutive['streak-3'].earned, true);
  assert.equal(consecutive['streak-3'].earnedOn, '2026-09-03');
  assert.equal(consecutive['streak-7'].earned, false);

  const gapped = byId(
    evaluateBadges(
      [meal('2026-09-01', 400), meal('2026-09-02', 400), meal('2026-09-04', 400)],
      goals,
    ),
  );
  assert.equal(gapped['streak-3'].earned, false);
  assert.equal(gapped['streak-3'].longest, 2);
});

test('past days count even when today is empty', () => {
  const dates = [];
  for (let day = 1; day <= 7; day += 1) {
    dates.push(meal(`2026-08-${String(day).padStart(2, '0')}`, 1500, 40));
  }
  const badges = byId(evaluateBadges(dates, goals));
  assert.equal(badges['streak-7'].earned, true);
  assert.equal(badges['streak-7'].earnedOn, '2026-08-07');
  assert.equal(badges['streak-14'].earned, false);
  assert.equal(badges['first-meal'].earnedOn, '2026-08-01');
});

test('fourteen days in a row earn the long streak', () => {
  const entries = [];
  for (let day = 1; day <= 14; day += 1) {
    entries.push(meal(`2026-09-${String(day).padStart(2, '0')}`, 400, 10));
  }
  const result = evaluateBadges(entries, goals);
  assert.equal(result.longestStreak, 14);
  const badges = byId(result);
  assert.equal(badges['streak-3'].earned, true);
  assert.equal(badges['streak-7'].earned, true);
  assert.equal(badges['streak-14'].earned, true);
  assert.equal(badges['streak-14'].earnedOn, '2026-09-14');
});

test('several meals on one day still count as a single streak day', () => {
  const result = evaluateBadges(
    [meal('2026-09-01', 200), meal('2026-09-01', 300), meal('2026-09-02', 400)],
    goals,
  );
  assert.equal(result.loggedDays, 2);
  assert.equal(result.longestStreak, 2);
});

test('calorie window is 70% through 105% of the current target', () => {
  assert.equal(inCalorieWindow(1400, 2000), true);
  assert.equal(inCalorieWindow(1399, 2000), false);
  assert.equal(inCalorieWindow(2100, 2000), true);
  assert.equal(inCalorieWindow(2101, 2000), false);
  assert.equal(inCalorieWindow(1600, 0), false);

  const low = byId(evaluateBadges([meal('2026-09-01', 1399, 10)], goals));
  assert.equal(low['calorie-window'].earned, false);
  const hit = byId(evaluateBadges([meal('2026-09-04', 1400, 10), meal('2026-09-08', 900, 10)], goals));
  assert.equal(hit['calorie-window'].earned, true);
  assert.equal(hit['calorie-window'].earnedOn, '2026-09-04');
  const high = byId(evaluateBadges([meal('2026-09-02', 2101, 10)], goals));
  assert.equal(high['calorie-window'].earned, false);
});

test('protein badge uses the current target and ignores a zero target', () => {
  const short = byId(evaluateBadges([meal('2026-09-01', 800, 119.9)], goals));
  assert.equal(short.protein.earned, false);
  const hit = byId(
    evaluateBadges([meal('2026-09-01', 400, 40), meal('2026-09-03', 700, 80), meal('2026-09-03', 200, 40)], goals),
  );
  assert.equal(hit.protein.earned, true);
  assert.equal(hit.protein.earnedOn, '2026-09-03');

  const zeroGoal = byId(evaluateBadges([meal('2026-09-01', 500, 80)], { calorieGoal: 2000, proteinGoal: 0 }));
  assert.equal(zeroGoal.protein.earned, false);
});
