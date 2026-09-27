import assert from 'node:assert/strict';
import test from 'node:test';
import { shiftISODate } from '../format.js';
import {
  calorieWindow,
  cleanPetName,
  evaluatePet,
  inCalorieWindow,
  PET_RULES,
  PET_STAGES,
  scoreCompletedDay,
  slotsLogged,
  stageForPoints,
  streakBonus,
  streakLength,
} from './rules.js';

const GOALS = { calorieGoal: 2000, proteinGoal: 120 };

function entry(date, meal, kcal, protein = 0) {
  return { date, meal, kcal, protein, carbs: 0, fat: 0 };
}

function daysUntil(stageId, goals, makeEntries) {
  let cursor = '2024-01-01';
  const entries = [];
  const target = PET_STAGES.find((stage) => stage.id === stageId);
  for (let n = 1; n <= 120; n += 1) {
    entries.push(...makeEntries(cursor));
    const today = shiftISODate(cursor, 1);
    const result = evaluatePet(entries, goals, today);
    if (result.totalPoints >= target.minPoints) return n;
    cursor = today;
  }
  throw new Error(`never reached ${stageId}`);
}

test('shiftISODate crosses month and leap day boundaries', () => {
  assert.equal(shiftISODate('2026-01-31', 1), '2026-02-01');
  assert.equal(shiftISODate('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftISODate('2024-02-28', 1), '2024-02-29');
  assert.equal(shiftISODate('2024-03-01', -1), '2024-02-29');
});

test('meal slots pay once each and cap at four', () => {
  assert.equal(slotsLogged([entry('2026-01-01', 'breakfast', 100), entry('2026-01-01', 'breakfast', 50)]), 1);
  assert.equal(
    slotsLogged([
      entry('2026-01-01', 'breakfast', 1),
      entry('2026-01-01', 'lunch', 1),
      entry('2026-01-01', 'dinner', 1),
      entry('2026-01-01', 'snacks', 1),
      entry('2026-01-01', 'brunch', 1),
    ]),
    4,
  );
  const day = scoreCompletedDay(
    [
      entry('2026-01-01', 'breakfast', 100, 0),
      entry('2026-01-01', 'breakfast', 100, 0),
    ],
    GOALS,
    1,
  );
  assert.equal(day.meals, 10);
  assert.equal(day.calorie, 0);
  assert.equal(day.total, 10);
});

test('calorie window is 70% through 105%, inclusive', () => {
  const { low, high } = calorieWindow(2000);
  assert.equal(low, 1400);
  assert.equal(high, 2100);
  assert.equal(inCalorieWindow(1399, 2000), false);
  assert.equal(inCalorieWindow(1400, 2000), true);
  assert.equal(inCalorieWindow(2100, 2000), true);
  assert.equal(inCalorieWindow(2101, 2000), false);
  assert.equal(inCalorieWindow(0, 2000), false);
  const hit = scoreCompletedDay([entry('2026-01-01', 'lunch', 1800, 50)], GOALS, 1);
  assert.equal(hit.calorie, 30);
  assert.equal(hit.protein, 0);
  const over = scoreCompletedDay([entry('2026-01-01', 'lunch', 2500, 200)], GOALS, 1);
  assert.equal(over.calorie, 0);
  assert.equal(over.protein, 20);
  assert.equal(over.meals, 10);
  assert.equal(over.total, 30);
});

test('streak bonus starts on day 2 and caps at a week', () => {
  assert.equal(streakBonus(0), 0);
  assert.equal(streakBonus(1), 0);
  assert.equal(streakBonus(2), 4);
  assert.equal(streakBonus(7), 14);
  assert.equal(streakBonus(21), 14);
  const dates = new Set(['2026-01-01', '2026-01-02', '2026-01-04']);
  assert.equal(streakLength(dates, '2026-01-02'), 2);
  assert.equal(streakLength(dates, '2026-01-04'), 1);
  assert.equal(streakLength(dates, '2026-01-03'), 0);
});

test('today awards meal points only and keeps goal bonuses pending', () => {
  const today = '2026-04-02';
  const result = evaluatePet(
    [
      entry('2026-04-01', 'breakfast', 600, 40),
      entry('2026-04-01', 'lunch', 600, 40),
      entry('2026-04-01', 'dinner', 600, 40),
      entry(today, 'breakfast', 700, 40),
      entry(today, 'lunch', 700, 40),
    ],
    GOALS,
    today,
  );
  const yesterday = scoreCompletedDay(
    [entry('2026-04-01', 'breakfast', 600, 40), entry('2026-04-01', 'lunch', 600, 40), entry('2026-04-01', 'dinner', 600, 40)],
    GOALS,
    1,
  );
  assert.equal(yesterday.total, 30 + 30 + 20);
  assert.equal(result.today.awarded, 20);
  assert.equal(result.today.calorie, 'in');
  assert.equal(result.today.protein, 'under');
  assert.equal(result.today.pendingOnTrack, PET_RULES.calorieBonus + 4);
  assert.equal(result.totalPoints, yesterday.total + 20);
  assert.equal(result.stage.id, 'baby');
  assert.equal(result.mood, 'happy');
});

test('hatch happens on the first day with two meals, or the second logging day', () => {
  const one = evaluatePet([entry('2026-05-01', 'breakfast', 400, 20)], GOALS, '2026-05-01');
  assert.equal(one.stage.id, 'egg');
  assert.equal(one.totalPoints, 10);
  assert.equal(one.mood, 'content');

  const two = evaluatePet(
    [entry('2026-05-01', 'breakfast', 400, 20), entry('2026-05-01', 'lunch', 400, 20)],
    GOALS,
    '2026-05-01',
  );
  assert.equal(two.stage.id, 'baby');
  assert.equal(two.totalPoints, 20);
  assert.equal(two.today.calorie, 'under');
  assert.equal(two.today.pendingOnTrack, 0);

  const secondDay = evaluatePet(
    [entry('2026-05-01', 'dinner', 500, 20), entry('2026-05-02', 'breakfast', 500, 20)],
    GOALS,
    '2026-05-02',
  );
  assert.equal(secondDay.stage.id, 'baby');
  assert.ok(secondDay.totalPoints >= 20);
});

test('an empty today looks hungry and does not wipe earlier points', () => {
  const logged = evaluatePet(
    [entry('2026-06-01', 'breakfast', 400, 10), entry('2026-06-01', 'lunch', 400, 10)],
    GOALS,
    '2026-06-01',
  );
  const next = evaluatePet(
    [entry('2026-06-01', 'breakfast', 400, 10), entry('2026-06-01', 'lunch', 400, 10)],
    GOALS,
    '2026-06-02',
  );
  assert.equal(next.mood, 'hungry');
  assert.equal(next.totalPoints, logged.totalPoints);
  assert.equal(next.stage.id, 'baby');
  assert.equal(next.streak, 1);
  assert.equal(next.streakAtRisk, true);
  assert.equal(next.holdoverStreakBonus, 4);
});

test('deleting an entry recalculates points and can move the stage back', () => {
  const date = '2026-07-01';
  const both = [entry(date, 'breakfast', 100, 0), entry(date, 'dinner', 100, 0)];
  const before = evaluatePet(both, GOALS, date);
  const after = evaluatePet([both[0]], GOALS, date);
  assert.equal(before.stage.id, 'baby');
  assert.equal(after.stage.id, 'egg');
  assert.equal(after.totalPoints, 10);
});

test('future dates are ignored', () => {
  const result = evaluatePet(
    [entry('2026-08-02', 'breakfast', 500, 30), entry('2026-08-02', 'lunch', 500, 30)],
    GOALS,
    '2026-08-01',
  );
  assert.equal(result.totalPoints, 0);
  assert.equal(result.stage.id, 'egg');
});

test('stage thresholds', () => {
  assert.equal(stageForPoints(0).id, 'egg');
  assert.equal(stageForPoints(19).id, 'egg');
  assert.equal(stageForPoints(20).id, 'baby');
  assert.equal(stageForPoints(399).id, 'baby');
  assert.equal(stageForPoints(400).id, 'kid');
  assert.equal(stageForPoints(1399).id, 'kid');
  assert.equal(stageForPoints(1400).id, 'teen');
  assert.equal(stageForPoints(3599).id, 'teen');
  assert.equal(stageForPoints(3600).id, 'adult');
  assert.equal(stageForPoints(99999).id, 'adult');
});

test('solid days reach adult in roughly 4 to 8 weeks', () => {
  const threeMeals = (date) => [
    entry(date, 'breakfast', 600, 40),
    entry(date, 'lunch', 600, 40),
    entry(date, 'dinner', 600, 40),
  ];
  const fourMeals = (date) => [
    entry(date, 'breakfast', 450, 30),
    entry(date, 'lunch', 450, 30),
    entry(date, 'dinner', 450, 30),
    entry(date, 'snacks', 450, 30),
  ];
  const calorieOnly = (date) => [
    entry(date, 'breakfast', 600, 10),
    entry(date, 'lunch', 600, 10),
    entry(date, 'dinner', 600, 10),
  ];
  const four = daysUntil('adult', GOALS, fourMeals);
  const three = daysUntil('adult', GOALS, threeMeals);
  const partial = daysUntil('adult', GOALS, calorieOnly);
  assert.ok(four >= 28 && four <= 56, `all four meals took ${four} days`);
  assert.ok(three >= 28 && three <= 56, `three meals took ${three} days`);
  assert.ok(partial >= 42 && partial <= 70, `calorie bonus only took ${partial} days`);
  assert.ok(four <= three);
  assert.ok(three < partial);
});

test('the creature you are raising only counts meals from when it was chosen', () => {
  const chosenAt = Date.parse('2026-05-02T15:00:00Z');
  const entries = [
    entry('2026-05-01', 'breakfast', 500, 20),
    entry('2026-05-02', 'breakfast', 500, 20),
    entry('2026-05-02', 'lunch', 500, 20),
    entry('2026-05-03', 'dinner', 500, 20),
  ];
  entries[0].createdAt = chosenAt - 86400000;
  entries[1].createdAt = chosenAt - 5000;
  entries[2].createdAt = chosenAt + 5000;
  entries[3].createdAt = chosenAt + 86400000;
  const wholeLog = evaluatePet(entries, GOALS, '2026-05-03');
  const firstCreature = evaluatePet(entries, GOALS, '2026-05-03', { since: 0 });
  const nextCreature = evaluatePet(entries, GOALS, '2026-05-03', { since: chosenAt });
  assert.equal(firstCreature.totalPoints, wholeLog.totalPoints);
  assert.ok(wholeLog.totalPoints > nextCreature.totalPoints);
  assert.equal(nextCreature.totalPoints, 20);
  assert.equal(nextCreature.today.slots, 1);
});

test('pet names are short and required', () => {
  assert.equal(cleanPetName('  Mochi  ').name, 'Mochi');
  assert.equal(cleanPetName('   ').error, 'Give your pet a name.');
  assert.equal(cleanPetName('a'.repeat(25)).error, 'Use 24 characters or fewer.');
});

test('a missed goal still keeps the meal points from that day', () => {
  const blowout = evaluatePet(
    [
      entry('2026-09-01', 'breakfast', 900, 10),
      entry('2026-09-01', 'lunch', 900, 10),
      entry('2026-09-01', 'dinner', 900, 10),
      entry('2026-09-01', 'snacks', 900, 10),
    ],
    GOALS,
    '2026-09-02',
  );
  assert.equal(blowout.totalPoints, 40);
  assert.equal(blowout.stage.id, 'baby');
});
