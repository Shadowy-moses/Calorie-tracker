import { requestRender } from './bus.js';
import { buildCustomEntry, normalizeUnit } from './custom-food.js';
import {
  activeProfileId,
  adjustUseCount,
  deleteEntry,
  findCustomByName,
  findFoodByBarcode,
  findManualByName,
  getCustomFood,
  getEntry,
  getFood,
  putCustomFood,
  putEntry,
  putFood,
} from './db.js';
import { draftFromFood } from './food.js';
import { mealForNow } from './meals.js';
import { macrosForGrams, per100FromPortion, round1 } from './nutrition.js';
import { recipeFoodDraft } from './recipe.js';
import { lookupBarcode } from './off.js';
import { activeDate, session } from './session.js';
import { extractBarcode, todayKey } from './format.js';

export async function rememberFood(food, { grams, meal, countUse }) {
  let existing = null;
  if (food.id || food.foodId) existing = await getFood(food.id || food.foodId);
  if (!existing && food.barcode) existing = await findFoodByBarcode(food.barcode);
  if (!existing && food.source === 'manual' && food.name) existing = await findManualByName(food.name);

  const now = Date.now();
  const record = {
    id: existing?.id || crypto.randomUUID(),
    profileId: activeProfileId(),
    name: food.name,
    brand: food.brand || '',
    barcode: food.barcode || existing?.barcode || null,
    source: food.source === 'entry' ? existing?.source || 'manual' : food.source || 'manual',
    image: food.image || existing?.image || null,
    kcalPer100g: Number(food.kcalPer100g) || 0,
    proteinPer100g: Number(food.proteinPer100g) || 0,
    carbsPer100g: Number(food.carbsPer100g) || 0,
    fatPer100g: Number(food.fatPer100g) || 0,
    servingGrams: food.servingGrams || existing?.servingGrams || null,
    servingLabel: food.servingLabel || existing?.servingLabel || null,
    useCount: (existing?.useCount || 0) + (countUse ? 1 : 0),
    lastUsedAt: countUse ? now : existing?.lastUsedAt || now,
    lastGrams: grams ?? existing?.lastGrams ?? null,
    lastMeal: meal ?? existing?.lastMeal ?? null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await putFood(record);
  return record;
}

export async function logFood({ food, grams, meal, date, countUse = true, totals, entryId }) {
  const computed = totals || macrosForGrams(food, grams);
  const saved = await rememberFood(food, { grams, meal, countUse });
  const now = Date.now();
  if (entryId) {
    const existing = await getEntry(entryId);
    const next = {
      id: entryId,
      profileId: activeProfileId(),
      foodId: saved.id,
      date: existing?.date || date,
      meal,
      name: food.name,
      brand: food.brand || existing?.brand || '',
      grams,
      servingGrams: food.servingGrams || existing?.servingGrams || null,
      kcalPer100g: food.kcalPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      kcal: computed.kcal,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await putEntry(next);
    return next;
  }
  const entry = {
    id: crypto.randomUUID(),
    profileId: activeProfileId(),
    foodId: saved.id,
    date,
    meal,
    name: food.name,
    brand: food.brand || '',
    grams,
    servingGrams: food.servingGrams || null,
    kcalPer100g: food.kcalPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    kcal: computed.kcal,
    protein: computed.protein,
    carbs: computed.carbs,
    fat: computed.fat,
    createdAt: now,
    updatedAt: now,
  };
  await putEntry(entry);
  return entry;
}

export async function saveCustomFood(input) {
  const now = Date.now();
  const existing = input.id ? await getCustomFood(input.id) : null;
  const record = {
    id: existing?.id || crypto.randomUUID(),
    profileId: activeProfileId(),
    name: input.name.trim(),
    servingQty: round1(input.servingQty),
    servingUnit: normalizeUnit(input.servingUnit),
    kcal: Math.round(Number(input.kcal) || 0),
    protein: round1(input.protein),
    carbs: round1(input.carbs),
    fat: round1(input.fat),
    useCount: existing?.useCount || 0,
    lastUsedAt: existing?.lastUsedAt || null,
    lastAmount: existing?.lastAmount ?? null,
    lastUnit: existing?.lastUnit || null,
    lastMeal: existing?.lastMeal || null,
    source: input.source ?? existing?.source ?? null,
    estimate: input.estimate != null ? Boolean(input.estimate) : Boolean(existing?.estimate),
    recipeUrl: input.recipeUrl !== undefined ? input.recipeUrl : existing?.recipeUrl || null,
    recipeServings: input.recipeServings != null ? input.recipeServings : existing?.recipeServings ?? null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await putCustomFood(record);
  return record;
}

/** Save a reviewed recipe into My foods. Does not write a meal. */
export async function saveRecipeFood(input) {
  const draft = recipeFoodDraft(input);
  if (!draft.name) throw new Error('Give the recipe a name.');
  return saveCustomFood(draft);
}

export async function saveManualAsCustomFood({ name, grams, kcal, protein, carbs, fat }) {
  const existing = await findCustomByName(name);
  return saveCustomFood({
    id: existing?.id,
    name,
    servingQty: grams,
    servingUnit: 'g',
    kcal,
    protein,
    carbs,
    fat,
  });
}

export async function logCustomFood({ food, amount, unit, meal, date, entryId }) {
  const existing = entryId ? await getEntry(entryId) : null;
  const entry = buildCustomEntry({
    food,
    amount,
    unit,
    meal,
    date,
    entryId,
    existing,
    profileId: activeProfileId(),
  });
  if (!entry) throw new Error('Enter an amount.');
  await putEntry(entry);
  if (!entryId && food.id) {
    const saved = await getCustomFood(food.id);
    if (saved) {
      saved.useCount = (saved.useCount || 0) + 1;
      saved.lastUsedAt = Date.now();
      saved.lastAmount = Number(amount);
      saved.lastUnit = unit;
      saved.lastMeal = meal;
      saved.updatedAt = Date.now();
      await putCustomFood(saved);
    }
  }
  return entry;
}

export async function quickAddFood(food) {
  const grams = food.lastGrams || food.servingGrams || 100;
  const meal = food.lastMeal || mealForNow();
  const date = activeDate(todayKey());
  const entry = await logFood({ food, grams, meal, date, countUse: true });
  return { entry, grams, meal, date };
}

export async function removeEntry(id) {
  await deleteEntry(id);
}

export async function undoQuickAdd(entry) {
  await deleteEntry(entry.id);
  if (entry.foodId) await adjustUseCount(entry.foodId, -1);
  requestRender();
}

export function openDraft(food, extra) {
  session.draft = draftFromFood(food, extra);
  if (location.hash === '#/portion') requestRender();
  else location.hash = '#/portion';
}

export async function resolveBarcode(raw) {
  const code = extractBarcode(raw);
  if (!code) return { status: 'invalid' };
  const local = await findFoodByBarcode(code);
  try {
    const product = await lookupBarcode(code);
    if (product?.hasNutrition) {
      openDraft(
        { ...product, id: local?.id },
        {
          grams: local?.lastGrams || product.servingGrams || 100,
          meal: local?.lastMeal || mealForNow(),
        },
      );
      return { status: 'found', code, name: product.name };
    }
    if (local) {
      openDraft(local, { grams: local.lastGrams || local.servingGrams || 100, meal: local.lastMeal || mealForNow() });
      return { status: 'local', code, name: local.name };
    }
    if (!product) return { status: 'missing', code };
    session.manual = {
      name: product.name,
      barcode: code,
      brand: product.brand,
      note: `${product.name} is in Open Food Facts, but it has no calorie data. Enter the numbers from the package.`,
    };
    session.addTab = 'manual';
    session.scanMessage = null;
    return { status: 'incomplete', code, name: product.name };
  } catch (error) {
    if (local) {
      openDraft(local, { grams: local.lastGrams || local.servingGrams || 100, meal: local.lastMeal || mealForNow() });
      return { status: 'offline-local', code, name: local.name };
    }
    return { status: 'error', code, error };
  }
}

export async function saveManualPortion({ name, grams, kcal, protein, carbs, fat, meal, barcode, brand }) {
  const per = per100FromPortion(grams, kcal, protein, carbs, fat);
  const food = {
    name: name.trim(),
    brand: brand || '',
    barcode: barcode || null,
    source: 'manual',
    ...per,
    servingGrams: grams,
    image: null,
  };
  const date = activeDate(todayKey());
  return logFood({
    food,
    grams,
    meal,
    date,
    countUse: true,
    totals: {
      kcal: Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    },
  });
}
