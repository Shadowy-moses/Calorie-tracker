/**
 * Turn a recipe link or pasted recipe into per-serving calories and macros.
 * Published schema.org nutrition is used as given. Ingredients are added up
 * only when the page does not list a full nutrition block. Nothing here writes
 * to the log.
 */

import { macrosForGrams, round1 } from './nutrition.js';
import { gramsForIngredient, isWater, matchStaple, tokenHit, words } from './staples.js';

const PREP = new Set([
  'boneless', 'skinless', 'fresh', 'raw', 'cooked', 'chopped', 'diced', 'minced', 'sliced',
  'shredded', 'grated', 'large', 'medium', 'small', 'extra', 'virgin', 'unsalted', 'salted',
  'organic', 'plain', 'dry', 'dried', 'lean', 'cubed', 'optional', 'divided', 'softened',
  'melted', 'packed', 'ripe', 'frozen', 'thawed', 'drained', 'rinsed', 'peeled', 'crushed',
  'trimmed', 'halved', 'quartered', 'beaten', 'finely', 'roughly', 'thinly', 'freshly',
  'lightly', 'room', 'temperature', 'taste', 'garnish', 'plus', 'more', 'about', 'heaping',
  'scant', 'soft',
]);

const UNICODE_FRACTIONS = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
};

const UNITS = [
  ['tablespoons', 'tbsp'], ['tablespoon', 'tbsp'], ['teaspoons', 'tsp'], ['teaspoon', 'tsp'],
  ['kilograms', 'kg'], ['kilogram', 'kg'], ['milliliters', 'ml'], ['millilitres', 'ml'],
  ['milliliter', 'ml'], ['millilitre', 'ml'], ['ounces', 'oz'], ['ounce', 'oz'],
  ['pounds', 'lb'], ['pound', 'lb'], ['grams', 'g'], ['gram', 'g'],
  ['cups', 'cup'], ['cup', 'cup'], ['tbsps', 'tbsp'], ['tbsp', 'tbsp'], ['tbs', 'tbsp'],
  ['tsps', 'tsp'], ['tsp', 'tsp'], ['lbs', 'lb'], ['lb', 'lb'], ['kgs', 'kg'], ['kg', 'kg'],
  ['ounces', 'oz'], ['oz', 'oz'], ['mls', 'ml'], ['ml', 'ml'],
  ['cloves', 'clove'], ['clove', 'clove'], ['slices', 'slice'], ['slice', 'slice'],
  ['pieces', 'piece'], ['piece', 'piece'], ['cans', 'can'], ['can', 'can'],
  ['packages', 'package'], ['package', 'package'], ['g', 'g'], ['l', 'l'],
];

export const RECIPE_MESSAGES = {
  empty: 'Paste a recipe link or the recipe text.',
  unread: 'Paste the recipe text instead. This phone can’t open that page.',
  offline: 'You are offline, so that page can’t be read. Paste the recipe text if you already have it.',
  notRecipe: 'That page doesn’t list a recipe with nutrition or ingredients, so nothing was added.',
  notText: 'That doesn’t list a recipe with nutrition or ingredients, so nothing was added.',
  noMatch: 'Those ingredients couldn’t be measured or looked up, so no calories were added.',
  incomplete: 'That recipe lists only part of its nutrition and no ingredients that can be added up, so nothing was added.',
};

export function recipeUrlFromInput(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || /[\n\r]/.test(trimmed)) return null;
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^www\./i.test(candidate)) candidate = `https://${candidate}`;
    else return null;
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

export function divideTotals(totals, servings) {
  const n = Number(servings);
  if (!totals || !Number.isFinite(n) || n <= 0 || n > 100) return null;
  return {
    kcal: Math.round((Number(totals.kcal) || 0) / n),
    protein: round1((Number(totals.protein) || 0) / n),
    carbs: round1((Number(totals.carbs) || 0) / n),
    fat: round1((Number(totals.fat) || 0) / n),
  };
}

export function perServingMacros(recipe, servings = recipe?.servings) {
  const n = Number(servings);
  if (!recipe || !Number.isFinite(n) || n <= 0 || n > 100) return null;
  if (recipe.published && Math.abs(n - Number(recipe.baseServings)) < 1e-9) {
    return {
      kcal: Math.round(recipe.published.kcal),
      protein: round1(recipe.published.protein),
      carbs: round1(recipe.published.carbs),
      fat: round1(recipe.published.fat),
    };
  }
  return divideTotals(recipe.totals, n);
}

export function recipeFoodDraft({ name, servings, perServing, estimate, recipeUrl }) {
  return {
    name: String(name || '').trim().slice(0, 80),
    servingQty: 1,
    servingUnit: 'serving',
    kcal: perServing.kcal,
    protein: perServing.protein,
    carbs: perServing.carbs,
    fat: perServing.fat,
    source: 'recipe',
    estimate: Boolean(estimate),
    recipeUrl: recipeUrl || null,
    recipeServings: Number(servings) || 1,
  };
}

export function parseIngredientLine(line) {
  const original = String(line || '').replace(/^[-*•–]\s*/, '').trim();
  if (!original) return null;
  const normalized = normalizeFractions(original);
  const weighed = parentheticalWeight(normalized);
  if (weighed) {
    return {
      qty: weighed.qty,
      unit: weighed.unit,
      name: cleanupName(weighed.name),
      raw: original,
    };
  }
  const leading = readQuantity(normalized);
  if (!leading) {
    return { qty: null, unit: null, name: cleanupName(normalized), raw: original };
  }
  const unitRead = readUnit(leading.rest);
  return {
    qty: leading.qty,
    unit: unitRead.unit,
    name: cleanupName(unitRead.rest),
    raw: original,
  };
}

export function parseRecipeText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let name = '';
  let servings = null;
  let section = 'top';
  let nutritionIsTotal = false;
  const nutrition = {};
  const ingredients = [];

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/^#+\s*/, '');
    if (/^ingredients?\b/.test(lower)) {
      section = 'ingredients';
      continue;
    }
    if (/^(instructions|directions|method|steps|preparation)\b/.test(lower)) {
      section = 'instructions';
      continue;
    }
    if (/^nutrition\b/.test(lower)) {
      section = 'nutrition';
      if (/per recipe|whole recipe|entire recipe|for the batch|total\b/.test(lower)) nutritionIsTotal = true;
      continue;
    }
    if (/per recipe|whole recipe|entire recipe/.test(lower) && section !== 'instructions') {
      nutritionIsTotal = true;
    }

    const yieldLine = line.match(/^(?:servings?|serves|yield|makes)\s*:?\s*(.+)$/i);
    if (yieldLine && section !== 'instructions') {
      const parsed = parseYield(yieldLine[1]);
      if (parsed) {
        servings = parsed;
        continue;
      }
    }
    const bareServings = lower.match(/^(\d+(?:[.,]\d+)?)\s+servings?$/);
    if (bareServings && section !== 'instructions') {
      servings = Number(bareServings[1].replace(',', '.'));
      continue;
    }

    const macro = parseMacroLine(line);
    if (macro && section !== 'instructions' && section !== 'ingredients') {
      Object.assign(nutrition, macro);
      if (section === 'top') section = 'nutrition';
      continue;
    }

    if (section === 'instructions' || section === 'nutrition') continue;

    const ingredient = parseIngredientLine(line);
    if (ingredient && ingredient.qty != null && ingredient.name) {
      ingredients.push(ingredient);
      if (section === 'top') section = 'ingredients';
      continue;
    }
    if (section === 'ingredients' && ingredient && line.length <= 80) {
      ingredients.push(ingredient);
      continue;
    }
    if (!name && section === 'top') name = line.replace(/^#+\s*/, '').trim();
  }

  const full = fullNutrition(nutrition);
  return {
    name,
    servings,
    ingredients: ingredients.filter((item) => item.name),
    nutrition: full,
    nutritionPartial: !full && ['kcal', 'protein', 'carbs', 'fat'].some((key) => nutrition[key] != null),
    nutritionIsTotal,
  };
}

export function parseRecipeHtml(html) {
  const recipes = [];
  for (const block of extractJsonLd(html)) walkLd(block, recipes, 0);
  if (!recipes.length) return null;
  const parsed = recipes.map(recipeFromLd).filter(Boolean);
  return (
    parsed.find((recipe) => recipe.nutrition) ||
    parsed.find((recipe) => recipe.ingredients.length) ||
    parsed.find((recipe) => recipe.nutritionPartial) ||
    null
  );
}

export function pickIngredientFood(query, foods) {
  const tokens = words(query).filter((token) => !PREP.has(token));
  if (!tokens.length || !Array.isArray(foods)) return null;
  let best = null;
  let bestScore = 0;
  for (const food of foods) {
    if (food?.kcalPer100g == null || !Number.isFinite(Number(food.kcalPer100g))) continue;
    const nameTokens = words(food.name);
    if (!tokens.every((token) => tokenHit(nameTokens, token))) continue;
    const stray = nameTokens.some((token) => !tokenHit(tokens, token) && !PREP.has(token) && !MODIFIERS.has(token));
    if (stray) continue;
    const extra = nameTokens.filter((token) => !tokenHit(tokens, token)).length;
    const score = 100 - extra * 8;
    if (score > bestScore) {
      best = food;
      bestScore = score;
    }
  }
  return bestScore >= 40 ? best : null;
}

export function searchQueryForIngredient(name) {
  return words(name).filter((token) => !PREP.has(token)).join(' ');
}

export async function lookupIngredientNutrition(name, deps) {
  const staple = matchStaple(name);
  if (staple?.barcode && deps.lookupBarcode) {
    try {
      const product = await deps.lookupBarcode(staple.barcode, deps.signal);
      if (product?.hasNutrition && product.kcalPer100g != null) return product;
    } catch {
      /* The text search below is the fallback. */
    }
  }
  const query = searchQueryForIngredient(name);
  if (!query || !deps.searchCandidates) return null;
  try {
    const foods = await deps.searchCandidates(query, deps.signal);
    return pickIngredientFood(query, foods || []);
  } catch {
    return null;
  }
}

export async function fetchRecipePage(url, signal) {
  // A hand-set Accept header is not a simple request on iPhone Safari: WebKit
  // preflights values it does not treat as standard, and recipe sites answer
  // the page itself with Access-Control-Allow-Origin but do not allow that
  // header. The phone then fails before any HTML can be read. A plain GET is
  // the request a phone can finish when the site allows the browser to read it.
  const response = await fetch(url, {
    signal,
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    redirect: 'follow',
  });
  if (!response.ok) {
    const error = new Error('unread');
    error.code = 'unread';
    throw error;
  }
  return response.text();
}

export async function importRecipe(raw, deps = {}) {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, message: RECIPE_MESSAGES.empty };

  const url = recipeUrlFromInput(text);
  let parsed = null;
  if (url) {
    if (deps.isOnline && deps.isOnline() === false) return { ok: false, message: RECIPE_MESSAGES.offline };
    let html = '';
    try {
      html = await deps.fetchPage(url, deps.signal);
    } catch {
      return { ok: false, message: RECIPE_MESSAGES.unread };
    }
    parsed = parseRecipeHtml(html);
    if (!parsed || (!parsed.nutrition && !parsed.ingredients.length)) {
      return { ok: false, message: parsed?.nutritionPartial ? RECIPE_MESSAGES.incomplete : RECIPE_MESSAGES.notRecipe };
    }
  } else {
    parsed = parseRecipeText(text);
    if (!parsed.nutrition && !parsed.ingredients.length) {
      return { ok: false, message: parsed.nutritionPartial ? RECIPE_MESSAGES.incomplete : RECIPE_MESSAGES.notText };
    }
  }

  const name = cleanName(parsed.name);
  const recipeUrl = url;

  if (parsed.nutrition) {
    const servings = parsed.servings || 1;
    const per = parsed.nutritionIsTotal && servings
      ? {
          kcal: parsed.nutrition.kcal / servings,
          protein: parsed.nutrition.protein / servings,
          carbs: parsed.nutrition.carbs / servings,
          fat: parsed.nutrition.fat / servings,
        }
      : parsed.nutrition;
    return {
      ok: true,
      recipe: {
        name,
        servings,
        baseServings: servings,
        estimate: false,
        published: per,
        totals: {
          kcal: per.kcal * servings,
          protein: per.protein * servings,
          carbs: per.carbs * servings,
          fat: per.fat * servings,
        },
        lines: [],
        leftOut: [],
        notes: [],
        recipeUrl,
      },
    };
  }

  if (!parsed.ingredients.length) return { ok: false, message: RECIPE_MESSAGES.incomplete };

  const lookup = deps.lookup || ((ingredientName) => lookupIngredientNutrition(ingredientName, deps));
  const lines = [];
  const leftOut = [];
  const notes = [];

  for (const ingredient of parsed.ingredients) {
    if (!ingredient.name) continue;
    if (isWater(ingredient.name)) {
      notes.push('Water isn’t in the total. It doesn’t add calories.');
      continue;
    }
    if (ingredient.qty == null) {
      leftOut.push({ label: ingredient.raw || ingredient.name, reason: 'measure' });
      continue;
    }
    const grams = gramsForIngredient(ingredient);
    if (grams == null || grams <= 0) {
      leftOut.push({ label: ingredient.raw || ingredient.name, reason: 'measure' });
      continue;
    }
    let food = null;
    try {
      food = await lookup(ingredient.name);
    } catch {
      food = null;
    }
    if (food?.kcalPer100g == null) {
      leftOut.push({ label: ingredient.raw || ingredient.name, reason: 'lookup' });
      continue;
    }
    const macros = macrosForGrams(food, grams);
    lines.push({
      label: ingredient.raw || ingredient.name,
      grams,
      ...macros,
    });
  }

  if (!lines.length) return { ok: false, message: RECIPE_MESSAGES.noMatch };

  const servings = parsed.servings || 1;
  const totals = lines.reduce(
    (sum, line) => ({
      kcal: sum.kcal + line.kcal,
      protein: sum.protein + line.protein,
      carbs: sum.carbs + line.carbs,
      fat: sum.fat + line.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    ok: true,
    recipe: {
      name,
      servings,
      baseServings: servings,
      estimate: true,
      published: null,
      totals,
      lines,
      leftOut,
      notes: [...new Set(notes)],
      recipeUrl,
    },
  };
}

const MODIFIERS = new Set(['whole', 'old', 'fashioned', 'rolled', 'all', 'purpose', 'granulated', 'pure', 'white', 'yellow', 'red', 'green', 'canned', 'solid', 'long', 'grain', 'jasmine', 'fillet', 'fillets']);

function cleanName(name) {
  const text = String(name || '').replace(/\s+/g, ' ').trim();
  return (text || 'Imported recipe').slice(0, 80);
}

function fullNutrition(nutrition) {
  if (!nutrition) return null;
  const keys = ['kcal', 'protein', 'carbs', 'fat'];
  if (keys.some((key) => nutrition[key] == null)) return null;
  if (keys.some((key) => nutrition[key] < 0 || nutrition[key] > (key === 'kcal' ? 8000 : 800))) return null;
  return {
    kcal: nutrition.kcal,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
  };
}

function parseMacroLine(line) {
  const match = String(line).match(/^(calories|kcal|protein|carbs|carbohydrates|fat)\s*[:\-]?\s*(\d.*)$/i);
  if (!match) return null;
  const label = match[1].toLowerCase();
  if (label === 'calories' || label === 'kcal') {
    const kcal = parseCalories(match[2]);
    return kcal == null ? null : { kcal };
  }
  const amount = parseAmount(match[2]);
  if (amount == null) return null;
  if (label === 'protein') return { protein: amount };
  if (label === 'fat') return { fat: amount };
  return { carbs: amount };
}

function parseCalories(value) {
  if (typeof value === 'number') return value >= 0 ? value : null;
  const text = String(value).toLowerCase();
  const amount = parseAmount(text);
  if (amount == null) return null;
  if (/\bkj\b|kilojoule/.test(text) && !/kcal|calorie/.test(text)) return amount / 4.184;
  return amount;
}

function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const match = String(value).match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const n = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseYield(value) {
  if (typeof value === 'number' && value > 0 && value <= 500) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseYield(item);
      if (parsed) return parsed;
    }
    return null;
  }
  const match = String(value ?? '').match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const n = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 500) return null;
  return n;
}

function recipeFromLd(node) {
  const name = typeof node.name === 'string' ? node.name : '';
  const ingredients = asList(node.recipeIngredient).map(parseIngredientLine).filter((item) => item && item.name);
  const nutritionNode = node.nutrition && typeof node.nutrition === 'object' ? node.nutrition : null;
  let nutrition = null;
  if (nutritionNode) {
    nutrition = fullNutrition({
      kcal: parseCalories(nutritionNode.calories),
      protein: parseAmount(nutritionNode.proteinContent),
      carbs: parseAmount(nutritionNode.carbohydrateContent),
      fat: parseAmount(nutritionNode.fatContent),
    });
  }
  const servings = parseYield(node.recipeYield);
  const partial = Boolean(nutritionNode) && !nutrition && ['calories', 'proteinContent', 'carbohydrateContent', 'fatContent'].some((key) => nutritionNode[key] != null && nutritionNode[key] !== '');
  if (!name && !ingredients.length && !nutrition) return null;
  return { name, servings, ingredients, nutrition, nutritionPartial: partial, nutritionIsTotal: false };
}

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const source = String(html || '');
  let match = re.exec(source);
  while (match) {
    if (!isJsonLdScript(match[1])) {
      match = re.exec(source);
      continue;
    }
    const cleaned = match[2]
      .replace(/^\s*<!--/, '')
      .replace(/-->\s*$/, '')
      .replace(/^\s*<!\[CDATA\[/, '')
      .replace(/\]\]>\s*$/, '')
      .trim();
    try {
      blocks.push(JSON.parse(cleaned));
    } catch {
      try {
        blocks.push(JSON.parse(cleaned.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")));
      } catch {
        /* skip malformed blocks */
      }
    }
    match = re.exec(source);
  }
  return blocks;
}

function isJsonLdScript(attrs) {
  return /\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)(?=[\s>]|$)/i.test(attrs);
}

function walkLd(node, out, depth) {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) {
    node.forEach((item) => walkLd(item, out, depth + 1));
    return;
  }
  if (typeof node !== 'object') return;
  const types = asList(node['@type']).map((type) => type.toLowerCase());
  if (types.some((type) => type === 'recipe' || type.endsWith('/recipe'))) out.push(node);
  if (node['@graph']) walkLd(node['@graph'], out, depth + 1);
  if (node.mainEntity) walkLd(node.mainEntity, out, depth + 1);
}

function normalizeFractions(text) {
  return String(text)
    .replace(/[½⅓⅔¼¾⅛⅜⅝⅞⅕⅖⅗⅘]/g, (ch) => ` ${UNICODE_FRACTIONS[ch]} `)
    .replace(/\s+/g, ' ')
    .trim();
}

function readQuantity(text) {
  const range = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:-|–|to)\s*\d+(?:[.,]\d+)?\b/i);
  if (range) {
    return { qty: Number(range[1].replace(',', '.')), rest: text.slice(range[0].length).trim() };
  }
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\b/);
  if (mixed) {
    const den = Number(mixed[3]);
    if (!den) return null;
    return { qty: Number(mixed[1]) + Number(mixed[2]) / den, rest: text.slice(mixed[0].length).trim() };
  }
  const frac = text.match(/^(\d+)\s*\/\s*(\d+)\b/);
  if (frac) {
    const den = Number(frac[2]);
    if (!den) return null;
    return { qty: Number(frac[1]) / den, rest: text.slice(frac[0].length).trim() };
  }
  const dec = text.match(/^(\d+(?:[.,]\d+)?)\b/);
  if (!dec) return null;
  return { qty: Number(dec[1].replace(',', '.')), rest: text.slice(dec[0].length).trim() };
}

function readUnit(rest) {
  const source = String(rest || '');
  for (const [word, unit] of UNITS) {
    const pattern = word.length === 1
      ? new RegExp(`^${word}(?![a-z])\\.?\\s*`, 'i')
      : new RegExp(`^${word}\\.?\\b\\s*`, 'i');
    const match = pattern.exec(source);
    if (match) return { unit, rest: source.slice(match[0].length).trim() };
  }
  return { unit: null, rest: source.trim() };
}

function parentheticalWeight(line) {
  const match = line.match(/\(\s*(?:about\s+)?(\d+(?:[.,]\d+)?)\s*-?\s*(oz|ounces?|g|grams?|ml|milliliters?|lbs?|pounds?)\b[^)]*\)/i);
  if (!match) return null;
  const qty = Number(match[1].replace(',', '.'));
  const unitWord = match[2].toLowerCase();
  let unit = 'g';
  if (unitWord.startsWith('oz') || unitWord.startsWith('ounce')) unit = 'oz';
  else if (unitWord.startsWith('lb') || unitWord.startsWith('pound')) unit = 'lb';
  else if (unitWord.startsWith('ml') || unitWord.startsWith('milliliter')) unit = 'ml';
  let name = line.replace(match[0], ' ');
  name = name.replace(/^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s+/, '');
  name = name.replace(/^(cans?|packages?|jars?|bottles?|tins?)\s+(?:of\s+)?/i, '');
  return { qty, unit, name };
}

function cleanupName(name) {
  return String(name || '')
    .replace(/\(.*?\)/g, ' ')
    .split(',')[0]
    .replace(/^(of)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
