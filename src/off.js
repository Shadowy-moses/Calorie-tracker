const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'nutriments',
  'serving_size',
  'serving_quantity',
  'image_front_small_url',
  'image_front_url',
].join(',');

const SEARCH_FIELDS = [
  'code',
  'product_name',
  'brands',
  'nutriments',
  'serving_size',
  'serving_quantity',
  'image_url',
  'image_front_small_url',
].join(',');

function num(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function brandOf(brands) {
  if (!brands) return '';
  if (Array.isArray(brands)) return brands.filter(Boolean).join(', ');
  return String(brands);
}

function safeImage(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return `https://${url.slice('http://'.length)}`;
  return null;
}

function servingGramsOf(product) {
  const quantity = num(product.serving_quantity);
  if (quantity && quantity > 0 && quantity < 5000) return Math.round(quantity * 10) / 10;
  const text = String(product.serving_size || '');
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  if (!match) return null;
  const grams = parseFloat(match[1].replace(',', '.'));
  return grams > 0 && grams < 5000 ? Math.round(grams * 10) / 10 : null;
}

export function normalizeProduct(product) {
  if (!product) return null;
  const name = [product.product_name, product.product_name_en, product.generic_name]
    .map((part) => (part || '').trim())
    .find(Boolean);
  if (!name) return null;
  const nutriments = product.nutriments || {};
  let kcal = num(nutriments['energy-kcal_100g']);
  if (kcal == null) {
    const kj = num(nutriments['energy-kj_100g']) ?? num(nutriments.energy_100g);
    if (kj != null) kcal = kj / 4.184;
  }
  const protein = num(nutriments.proteins_100g);
  const carbs = num(nutriments.carbohydrates_100g);
  const fat = num(nutriments.fat_100g);
  if (kcal == null && (protein != null || carbs != null || fat != null)) {
    kcal = 4 * (protein || 0) + 4 * (carbs || 0) + 9 * (fat || 0);
  }
  return {
    barcode: product.code ? String(product.code) : null,
    name,
    brand: brandOf(product.brands),
    image: safeImage(product.image_front_small_url || product.image_front_url || product.image_url),
    kcalPer100g: kcal,
    proteinPer100g: protein ?? 0,
    carbsPer100g: carbs ?? 0,
    fatPer100g: fat ?? 0,
    servingGrams: servingGramsOf(product),
    servingLabel: product.serving_size || null,
    source: 'off',
    hasNutrition: kcal != null,
  };
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const error = new Error(`Open Food Facts returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const error = new Error('Open Food Facts returned an unexpected response');
    error.status = response.status;
    throw error;
  }
}

export async function lookupBarcode(code, signal) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${PRODUCT_FIELDS}`;
  const data = await fetchJson(url, signal);
  if (!data || data.status !== 1 || !data.product) return null;
  return normalizeProduct(data.product);
}

function matchesQuery(food, query) {
  const haystack = `${food.name} ${food.brand}`.toLowerCase();
  const tokens = query.toLowerCase().split(/\s+/).filter((token) => token.length >= 3);
  if (!tokens.length) return true;
  return tokens.some((token) => haystack.includes(token));
}

function searchUrls(query) {
  const cgi = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields: 'code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity,image_front_small_url',
  });
  const v2 = new URLSearchParams({
    search_terms: query,
    page_size: '20',
    fields: SEARCH_FIELDS,
    json: '1',
  });
  // world.openfoodfacts.org sends Access-Control-Allow-Origin. The newer
  // search host often does not, so the phone browser cannot read it.
  return [
    `https://world.openfoodfacts.org/cgi/search.pl?${cgi}`,
    `https://world.openfoodfacts.org/api/v2/search?${v2}`,
  ];
}

export async function searchFoods(query, signal) {
  let lastError = new Error('Search failed');
  let unmatched = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const url of searchUrls(query)) {
      try {
        const data = await fetchJson(url, signal);
        const foods = (data.products || data.hits || [])
          .map(normalizeProduct)
          .filter((food) => food && food.hasNutrition);
        const matched = foods.filter((food) => matchesQuery(food, query));
        // A flaky response sometimes ignores the search text. Skip it and try again.
        if (matched.length) return matched.slice(0, 15);
        if (foods.length) unmatched = foods;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    if (signal?.aborted) throw lastError;
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  if (unmatched.length) return unmatched.slice(0, 15);
  throw lastError;
}
