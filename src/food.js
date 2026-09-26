import { mealForNow } from './meals.js';

export function draftFromFood(food, extra = {}) {
  const servingGrams = food.servingGrams || null;
  return {
    foodId: food.id || null,
    name: food.name,
    brand: food.brand || '',
    barcode: food.barcode || null,
    source: food.source || 'off',
    image: food.image || null,
    kcalPer100g: Number(food.kcalPer100g) || 0,
    proteinPer100g: Number(food.proteinPer100g) || 0,
    carbsPer100g: Number(food.carbsPer100g) || 0,
    fatPer100g: Number(food.fatPer100g) || 0,
    servingGrams,
    servingLabel: food.servingLabel || null,
    grams: extra.grams ?? servingGrams ?? 100,
    meal: extra.meal || mealForNow(),
    mode: 'grams',
  };
}

export function draftFromEntry(entry) {
  return {
    entryId: entry.id,
    foodId: entry.foodId || null,
    name: entry.name,
    brand: entry.brand || '',
    barcode: null,
    source: 'entry',
    image: null,
    kcalPer100g: Number(entry.kcalPer100g) || 0,
    proteinPer100g: Number(entry.proteinPer100g) || 0,
    carbsPer100g: Number(entry.carbsPer100g) || 0,
    fatPer100g: Number(entry.fatPer100g) || 0,
    servingGrams: entry.servingGrams || null,
    servingLabel: null,
    grams: Number(entry.grams) || 100,
    meal: entry.meal,
    mode: 'grams',
    date: entry.date,
    originalGrams: Number(entry.grams) || 100,
    originalTotals: {
      kcal: entry.kcal,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
    },
  };
}

export function sortFrequent(foods) {
  return [...foods].sort((a, b) => (b.useCount || 0) - (a.useCount || 0) || (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
}
