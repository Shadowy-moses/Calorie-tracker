import assert from 'node:assert/strict';
import test from 'node:test';
import { upgradeDatabase } from './db.js';
import {
  GRAMS_PER_OZ,
  buildCustomEntry,
  formatPortion,
  fromGrams,
  macrosForServing,
  matchCustomFoods,
  normalizeUnit,
  toGrams,
} from './custom-food.js';

const chicken = {
  id: 'chicken',
  name: 'Chicken',
  servingQty: 1,
  servingUnit: 'oz',
  kcal: 46,
  protein: 8.6,
  carbs: 0,
  fat: 1,
};

test('6 oz of chicken scales a 1 oz serving', () => {
  const totals = macrosForServing(chicken, 6, 'oz');
  assert.deepEqual(totals, { kcal: 276, protein: 51.6, carbs: 0, fat: 6 });
});

test('logging grams against an ounce serving uses the ounce conversion', () => {
  const grams = 6 * GRAMS_PER_OZ;
  const totals = macrosForServing(chicken, grams, 'g');
  assert.equal(totals.kcal, 276);
  assert.equal(totals.protein, 51.6);
  assert.equal(totals.carbs, 0);
  assert.equal(totals.fat, 6);
});

test('a gram serving can be logged in ounces', () => {
  const food = { servingQty: 100, servingUnit: 'g', kcal: 165, protein: 31, carbs: 0, fat: 3.6 };
  const ounces = 6;
  const grams = ounces * GRAMS_PER_OZ;
  const expectedKcal = Math.round(165 * (grams / 100));
  const totals = macrosForServing(food, ounces, 'oz');
  assert.equal(totals.kcal, expectedKcal);
  assert.equal(totals.kcal, 281);
  assert.equal(totals.protein, Math.round(31 * (grams / 100) * 10) / 10);
});

test('a serving size other than 1 scales down to a smaller amount', () => {
  const food = { servingQty: 4, servingUnit: 'oz', kcal: 184, protein: 34.4, carbs: 0, fat: 4 };
  const totals = macrosForServing(food, 1, 'oz');
  assert.equal(totals.kcal, 46);
  assert.equal(totals.protein, 8.6);
  assert.equal(totals.carbs, 0);
  assert.equal(totals.fat, 1);
});

test('half a piece uses the saved piece, not grams', () => {
  const food = { servingQty: 1, servingUnit: 'piece', kcal: 90, protein: 2, carbs: 15, fat: 2 };
  const totals = macrosForServing(food, 0.5, 'piece');
  assert.deepEqual(totals, { kcal: 45, protein: 1, carbs: 7.5, fat: 1 });
  assert.equal(formatPortion(0.5, 'piece'), '0.5 pieces');
  assert.equal(formatPortion(1, 'cup'), '1 cup');
  assert.equal(formatPortion(2, 'cup'), '2 cups');
});

test('cups cannot be converted to grams', () => {
  const food = { servingQty: 1, servingUnit: 'cup', kcal: 200, protein: 5, carbs: 30, fat: 8 };
  assert.equal(macrosForServing(food, 100, 'g'), null);
  assert.equal(toGrams(1, 'cup'), null);
  assert.equal(fromGrams(28.349523125, 'oz'), 1);
});

test('zero or negative amounts are not a serving', () => {
  assert.equal(macrosForServing(chicken, 0, 'oz'), null);
  assert.equal(macrosForServing(chicken, -2, 'oz'), null);
});

test('unit names collapse to oz, g, cup, or piece', () => {
  assert.equal(normalizeUnit(' Ounces '), 'oz');
  assert.equal(normalizeUnit('grams'), 'g');
  assert.equal(normalizeUnit('Cups'), 'cup');
  assert.equal(normalizeUnit('slice'), 'slice');
});

test('search puts a name match from My foods first', () => {
  const foods = [
    { name: 'Oatmeal', id: '1' },
    { name: 'Grilled chicken', id: '2' },
    { name: 'Chicken', id: '3' },
  ];
  const matched = matchCustomFoods(foods, 'chi');
  assert.deepEqual(
    matched.map((food) => food.name),
    ['Chicken', 'Grilled chicken'],
  );
  assert.deepEqual(matchCustomFoods(foods, 'z'), []);
});

test('a logged entry keeps the nutrition from when it was logged', () => {
  const food = { ...chicken };
  const entry = buildCustomEntry({
    food,
    amount: 6,
    unit: 'oz',
    meal: 'lunch',
    date: '2026-09-26',
    now: 10,
    profileId: 'david',
  });
  food.kcal = 100;
  food.protein = 20;
  assert.equal(entry.kcal, 276);
  assert.equal(entry.protein, 51.6);
  assert.equal(entry.kcalPerServing, 46);
  assert.equal(entry.portionLabel, '6 oz');
  assert.ok(Math.abs(entry.grams - 6 * GRAMS_PER_OZ) < 1e-6);

  const later = buildCustomEntry({
    food,
    amount: 6,
    unit: 'oz',
    meal: 'lunch',
    date: '2026-09-26',
    now: 20,
    profileId: 'david',
  });
  assert.equal(later.kcal, 600);
  assert.equal(entry.kcal, 276);
});

test('upgrading the database adds My foods and leaves existing logs in place', () => {
  const created = [];
  const existing = new Set(['profiles', 'foods', 'entries']);
  const db = {
    objectStoreNames: { contains: (name) => existing.has(name) },
    createObjectStore(name) {
      created.push(name);
      existing.add(name);
      return { createIndex() {} };
    },
  };
  upgradeDatabase(db);
  assert.deepEqual(created, ['customFoods']);
  assert.equal(existing.has('profiles'), true);
  assert.equal(existing.has('foods'), true);
  assert.equal(existing.has('entries'), true);
  assert.equal(existing.has('customFoods'), true);
});

test('a brand new database creates every store once', () => {
  const created = [];
  const existing = new Set();
  const db = {
    objectStoreNames: { contains: (name) => existing.has(name) },
    createObjectStore(name) {
      created.push(name);
      existing.add(name);
      return { createIndex() {} };
    },
  };
  upgradeDatabase(db);
  upgradeDatabase(db);
  assert.deepEqual(created, ['profiles', 'foods', 'entries', 'customFoods']);
});
