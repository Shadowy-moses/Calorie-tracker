import { activeProfileId } from './db.js';
import { fmtKcal, fmtNum } from './format.js';
import { round1 } from './nutrition.js';

/** Avoirdupois ounce. Used so an oz serving can be logged in grams, and the reverse. */
export const GRAMS_PER_OZ = 28.349523125;

export const PRESET_UNITS = [
  { id: 'oz', label: 'oz' },
  { id: 'g', label: 'g' },
  { id: 'cup', label: 'cup' },
  { id: 'piece', label: 'piece' },
];

const UNIT_ALIASES = {
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  g: 'g',
  gram: 'g',
  grams: 'g',
  cup: 'cup',
  cups: 'cup',
  piece: 'piece',
  pieces: 'piece',
};

export function normalizeUnit(unit) {
  const text = String(unit ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  const alias = UNIT_ALIASES[text.toLowerCase()];
  if (alias) return alias;
  return text.slice(0, 24);
}

export function isPresetUnit(unit) {
  return PRESET_UNITS.some((item) => item.id === unit);
}

export function isWeightUnit(unit) {
  return unit === 'oz' || unit === 'g';
}

export function toGrams(amount, unit) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  if (unit === 'g') return n;
  if (unit === 'oz') return n * GRAMS_PER_OZ;
  return null;
}

export function fromGrams(grams, unit) {
  const n = Number(grams);
  if (!Number.isFinite(n)) return null;
  if (unit === 'g') return n;
  if (unit === 'oz') return n / GRAMS_PER_OZ;
  return null;
}

/** How many of the saved servings this amount represents. Null when the units can't be compared. */
export function servingFactor(food, amount, unit) {
  const qty = Number(food?.servingQty);
  const logged = Number(amount);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(logged) || logged <= 0) return null;
  if (unit === food.servingUnit) return logged / qty;
  const servingGrams = toGrams(qty, food.servingUnit);
  const loggedGrams = toGrams(logged, unit);
  if (servingGrams == null || loggedGrams == null || servingGrams <= 0) return null;
  return loggedGrams / servingGrams;
}

export function macrosForServing(food, amount, unit) {
  const factor = servingFactor(food, amount, unit);
  if (factor == null) return null;
  return {
    kcal: Math.round((Number(food.kcal) || 0) * factor),
    protein: round1((Number(food.protein) || 0) * factor),
    carbs: round1((Number(food.carbs) || 0) * factor),
    fat: round1((Number(food.fat) || 0) * factor),
  };
}

export function unitWord(unit, amount) {
  const n = Math.abs(Number(amount) || 0);
  const plural = Math.abs(n - 1) >= 0.05;
  if (unit === 'cup') return plural ? 'cups' : 'cup';
  if (unit === 'piece') return plural ? 'pieces' : 'piece';
  if (unit === 'serving') return plural ? 'servings' : 'serving';
  return unit || '';
}

export function formatPortion(amount, unit) {
  return `${fmtNum(Number(amount) || 0)} ${unitWord(unit, amount)}`.trim();
}

export function perServingLabel(food) {
  return `${formatPortion(food.servingQty, food.servingUnit)} · ${fmtKcal(food.kcal)} kcal · P ${fmtNum(food.protein)} · C ${fmtNum(food.carbs)} · F ${fmtNum(food.fat)}`;
}

export function servingSentence(food) {
  const amount = formatPortion(food.servingQty, food.servingUnit);
  return `${amount} is ${fmtKcal(food.kcal)} kcal, ${fmtNum(food.protein)} g protein, ${fmtNum(food.carbs)} g carbs, ${fmtNum(food.fat)} g fat`;
}

export function sortCustomFoods(foods) {
  return [...foods].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function matchCustomFoods(foods, query) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  return sortCustomFoods(foods.filter((food) => food.name.toLowerCase().includes(q))).sort((a, b) => {
    const rank = (food) => (food.name.toLowerCase().startsWith(q) ? 0 : 1);
    return rank(a) - rank(b);
  });
}

/**
 * Snapshot a log row from a saved food. Later edits to the saved food must not
 * flow into this object — callers pass the nutrition that should be frozen.
 */
export function buildCustomEntry({
  food,
  amount,
  unit,
  meal,
  date,
  entryId,
  existing,
  profileId = activeProfileId(),
  now = Date.now(),
}) {
  const totals = macrosForServing(food, amount, unit);
  if (!totals) return null;
  const grams = toGrams(amount, unit);
  const servingGrams = toGrams(food.servingQty, food.servingUnit);
  const per = servingGrams
    ? {
        kcalPer100g: ((Number(food.kcal) || 0) * 100) / servingGrams,
        proteinPer100g: ((Number(food.protein) || 0) * 100) / servingGrams,
        carbsPer100g: ((Number(food.carbs) || 0) * 100) / servingGrams,
        fatPer100g: ((Number(food.fat) || 0) * 100) / servingGrams,
      }
    : { kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 };

  return {
    id: entryId || existing?.id || crypto.randomUUID(),
    profileId,
    foodId: existing?.foodId || null,
    customFoodId: food.id || existing?.customFoodId || null,
    date: existing?.date || date,
    meal,
    name: food.name,
    brand: existing?.brand || '',
    grams: grams == null ? Number(amount) : grams,
    portionLabel: formatPortion(amount, unit),
    logAmount: Number(amount),
    logUnit: unit,
    servingQty: Number(food.servingQty),
    servingUnit: food.servingUnit,
    kcalPerServing: Number(food.kcal) || 0,
    proteinPerServing: Number(food.protein) || 0,
    carbsPerServing: Number(food.carbs) || 0,
    fatPerServing: Number(food.fat) || 0,
    ...per,
    kcal: totals.kcal,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export function draftFromCustomFood(food, extra = {}) {
  const weight = isWeightUnit(food.servingUnit);
  const lastUnit = food.lastUnit || null;
  const lastOk =
    food.lastAmount > 0 &&
    lastUnit &&
    (lastUnit === food.servingUnit || (weight && isWeightUnit(lastUnit)));
  return {
    entryId: null,
    date: extra.date || null,
    meal: extra.meal || food.lastMeal || null,
    amount: lastOk ? food.lastAmount : food.servingQty,
    unit: lastOk ? lastUnit : food.servingUnit,
    food: {
      id: food.id,
      name: food.name,
      servingQty: food.servingQty,
      servingUnit: food.servingUnit,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      estimate: Boolean(food.estimate),
    },
  };
}

export function draftFromCustomEntry(entry) {
  return {
    entryId: entry.id,
    date: entry.date,
    meal: entry.meal,
    amount: entry.logAmount,
    unit: entry.logUnit,
    food: {
      id: entry.customFoodId || null,
      name: entry.name,
      servingQty: entry.servingQty,
      servingUnit: entry.servingUnit,
      kcal: entry.kcalPerServing,
      protein: entry.proteinPerServing,
      carbs: entry.carbsPerServing,
      fat: entry.fatPerServing,
    },
  };
}
