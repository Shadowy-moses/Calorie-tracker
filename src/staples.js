/**
 * Plain Open Food Facts products used when a recipe lists an ingredient
 * but not nutrition. The barcode is looked up live; these are not calorie
 * tables. Grams-per-cup figures are standard kitchen weights so a cup can
 * be turned into the grams that product is measured in.
 */

import { GRAMS_PER_OZ } from './custom-food.js';

const STOP = new Set(['and', 'or', 'the', 'with', 'of', 'for', 'to', 'into', 'plus', 'a', 'an']);

const IRREGULAR = {
  tomatoes: 'tomato',
  potatoes: 'potato',
  leaves: 'leaf',
  halves: 'half',
};

export const STAPLES = [
  { id: 'chicken-breast', barcode: '0283349011382', all: ['chicken', 'breast'], none: ['broth', 'stock', 'soup', 'nugget', 'breaded', 'wing'], cup: 140, each: 174 },
  { id: 'ground-beef', barcode: '0011110049360', all: ['ground', 'beef'], none: ['broth', 'stock', 'soup', 'jerky'] },
  { id: 'salmon', barcode: '5054269414462', all: ['salmon'], none: ['smoked', 'burger'] },
  { id: 'tuna', barcode: '0672881001041', all: ['tuna'], none: ['casserole', 'noodle', 'salad'], cup: 154 },
  { id: 'egg', barcode: '5292006000367', all: ['egg'], none: ['plant', 'noodle', 'roll', 'white', 'yolk', 'nog', 'wash', 'substitute'], each: 50 },
  { id: 'olive-oil', barcode: '8410179101118', all: ['olive', 'oil'], none: ['spray'], cup: 216 },
  { id: 'vegetable-oil', barcode: '0049705041833', all: ['vegetable', 'oil'], none: ['spray'], cup: 218 },
  { id: 'canola-oil', barcode: '0049705041833', all: ['canola'], none: ['spray'], cup: 218 },
  { id: 'oil', barcode: '0049705041833', all: ['oil'], none: ['olive', 'sesame', 'coconut', 'peanut', 'avocado', 'chili', 'chilli', 'truffle', 'spray', 'fish', 'sunflower', 'vegetable', 'canola'], cup: 218 },
  { id: 'butter', barcode: '0047200152504', all: ['butter'], none: ['peanut', 'almond', 'apple', 'milk', 'cocoa', 'coconut', 'margarine'], cup: 227 },
  { id: 'peanut-butter', barcode: '5020379162098', all: ['peanut', 'butter'], none: ['chip', 'cup', 'candy'], cup: 258 },
  { id: 'flour', barcode: '0016000106109', all: ['flour'], none: ['almond', 'coconut', 'rice', 'oat', 'chickpea', 'bread'], cup: 125 },
  { id: 'oats', barcode: '0039978033758', all: ['oat'], none: ['milk', 'cookie', 'flour'], cup: 80 },
  { id: 'rice', barcode: '6291023012970', all: ['rice'], none: ['vinegar', 'milk', 'cake', 'krispie', 'crispy', 'noodle', 'flour', 'paper', 'pudding', 'cereal', 'bran', 'wine', 'cracker', 'cauliflower', 'brown'], cup: 185 },
  { id: 'pasta', barcode: '3038350945006', all: ['spaghetti'], none: ['squash', 'sauce'], cup: 100 },
  { id: 'pasta-name', barcode: '3038350945006', all: ['pasta'], none: ['salad', 'sauce'], cup: 100 },
  { id: 'milk', barcode: '0041900076412', all: ['milk'], none: ['almond', 'soy', 'oat', 'coconut', 'chocolate', 'condensed', 'evaporated', 'powder', 'buttermilk', 'cream'], cup: 244 },
  { id: 'yogurt', barcode: '0842379163005', all: ['yogurt'], none: ['frozen', 'drink'], cup: 245 },
  { id: 'cheddar', barcode: '0071505019989', all: ['cheddar'], none: ['soup', 'cracker', 'puff'], cup: 113, slice: 28 },
  { id: 'sugar', barcode: '5010067301502', all: ['sugar'], none: ['brown', 'powder', 'powdered', 'icing', 'confection'], cup: 200 },
  { id: 'honey', barcode: '8901207035364', all: ['honey'], none: ['mustard', 'ham', 'cereal', 'graham'], cup: 340, tbsp: 21 },
  { id: 'broccoli', barcode: '01695977', all: ['broccoli'], none: ['soup', 'cheese', 'cheddar'], cup: 91 },
  { id: 'spinach', barcode: '01695878', all: ['spinach'], none: ['dip', 'artichoke'], cup: 30 },
  { id: 'carrot', barcode: '5054781580058', all: ['carrot'], none: ['cake', 'juice'], cup: 122, each: 61 },
  { id: 'potato', barcode: '20242244', all: ['potato'], none: ['chip', 'sweet', 'flour', 'starch', 'salad'], cup: 150, each: 213 },
  { id: 'tomato', barcode: '0814553001090', all: ['tomato'], none: ['paste', 'sauce', 'soup', 'ketchup', 'juice', 'puree'], cup: 180, each: 123 },
  { id: 'banana', barcode: '01129441', all: ['banana'], none: ['chip', 'bread', 'pudding', 'milk'], cup: 150, each: 118 },
  { id: 'garlic', barcode: '0023562010010', all: ['garlic'], none: ['powder', 'salt', 'sauce', 'bread'], clove: 3 },
  { id: 'black-beans', barcode: '0072036726049', all: ['black', 'bean'], none: ['sauce', 'soup', 'burger'], cup: 172 },
  { id: 'soy-sauce', barcode: '4901515118586', all: ['soy', 'sauce'], none: [], tbsp: 16, cup: 256 },
  { id: 'salt', barcode: '9415187009202', all: ['salt'], none: ['salted', 'garlic', 'celery', 'seasoning'], tsp: 6, tbsp: 18 },
];

export function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !STOP.has(token));
}

export function tokenHit(tokens, wanted) {
  const want = IRREGULAR[wanted] || wanted;
  return tokens.some((token) => {
    const base = IRREGULAR[token] || token;
    return base === want || token === `${want}s` || token === `${want}es`;
  });
}

export function matchStaple(name) {
  const tokens = words(name);
  if (!tokens.length) return null;
  let best = null;
  let bestScore = 0;
  for (const staple of STAPLES) {
    if (staple.none?.some((word) => tokenHit(tokens, word))) continue;
    if (!staple.all.every((word) => tokenHit(tokens, word))) continue;
    const score = staple.all.length;
    if (score > bestScore) {
      best = staple;
      bestScore = score;
    }
  }
  return best;
}

export function isWater(name) {
  const tokens = words(name);
  if (!tokens.length) return false;
  return tokens.every((token) => ['water', 'ice', 'warm', 'cold', 'hot', 'boiling', 'tap', 'filtered'].includes(token));
}

/** Grams for a parsed ingredient, or null when the amount can't be converted. */
export function gramsForIngredient(ingredient) {
  const qty = Number(ingredient?.qty);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const unit = ingredient.unit || null;
  if (unit === 'g') return qty;
  if (unit === 'kg') return qty * 1000;
  if (unit === 'oz') return qty * GRAMS_PER_OZ;
  if (unit === 'lb') return qty * GRAMS_PER_OZ * 16;

  const staple = matchStaple(ingredient.name);
  if (!staple) return null;
  if (unit === 'cup' && staple.cup) return qty * staple.cup;
  if (unit === 'tbsp') {
    const tbsp = staple.tbsp || (staple.cup ? staple.cup / 16 : null);
    if (tbsp) return qty * tbsp;
  }
  if (unit === 'tsp') {
    const tsp = staple.tsp || (staple.tbsp ? staple.tbsp / 3 : staple.cup ? staple.cup / 48 : null);
    if (tsp) return qty * tsp;
  }
  if (unit === 'ml' && staple.cup) return qty * (staple.cup / 240);
  if (unit === 'l' && staple.cup) return qty * (staple.cup / 240) * 1000;
  if (unit === 'clove' && staple.clove) return qty * staple.clove;
  if (unit === 'slice' && staple.slice) return qty * staple.slice;
  if ((unit == null || unit === 'piece') && staple.each) return qty * staple.each;
  return null;
}
