import assert from 'node:assert/strict';
import test from 'node:test';
import { GRAMS_PER_OZ } from './custom-food.js';
import {
  RECIPE_MESSAGES,
  divideTotals,
  fetchRecipePage,
  importRecipe,
  parseIngredientLine,
  perServingMacros,
  pickIngredientFood,
  recipeFoodDraft,
  recipeUrlFromInput,
} from './recipe.js';
import { gramsForIngredient, matchStaple } from './staples.js';

const chicken = {
  name: 'Chicken breast',
  kcalPer100g: 100,
  proteinPer100g: 20,
  carbsPer100g: 0,
  fatPer100g: 1,
  hasNutrition: true,
};

function lookupChicken(name) {
  if (String(name).toLowerCase().includes('chicken')) return chicken;
  return null;
}

test('a recipe link is only a single http address', () => {
  assert.equal(recipeUrlFromInput('  https://example.com/lemon  '), 'https://example.com/lemon');
  assert.equal(recipeUrlFromInput('www.example.com/lemon'), 'https://www.example.com/lemon');
  assert.equal(recipeUrlFromInput('1 cup rice\n2 eggs'), null);
  assert.equal(recipeUrlFromInput('javascript:alert(1)'), null);
});

test('ingredient lines keep fractions, weight, and a parenthetical can size', () => {
  const flour = parseIngredientLine('1 1/2 cups all-purpose flour');
  assert.equal(flour.qty, 1.5);
  assert.equal(flour.unit, 'cup');
  assert.equal(gramsForIngredient(flour), 187.5);

  const oil = parseIngredientLine('½ tbsp olive oil');
  assert.equal(oil.qty, 0.5);
  assert.equal(oil.unit, 'tbsp');
  assert.equal(gramsForIngredient(oil), 6.75);

  const garlic = parseIngredientLine('2 cloves garlic');
  assert.equal(garlic.unit, 'clove');
  assert.equal(gramsForIngredient(garlic), 6);

  const beans = parseIngredientLine('1 (15 ounce) can black beans');
  assert.equal(beans.unit, 'oz');
  assert.equal(beans.qty, 15);
  assert.equal(beans.name, 'black beans');
  assert.ok(Math.abs(gramsForIngredient(beans) - 15 * GRAMS_PER_OZ) < 1e-6);

  const pound = parseIngredientLine('1 pound boneless skinless chicken breast');
  assert.equal(pound.unit, 'lb');
  assert.ok(Math.abs(gramsForIngredient(pound) - 16 * GRAMS_PER_OZ) < 1e-6);
});

test('eggplant is not an egg, and broth is not a chicken breast', () => {
  assert.equal(matchStaple('2 eggplants'), null);
  assert.equal(matchStaple('chicken broth'), null);
  assert.equal(matchStaple('olive oil').id, 'olive-oil');
  assert.equal(gramsForIngredient(parseIngredientLine('2 eggplants')), null);
});

test('published schema.org nutrition is used per serving and ingredients are not looked up', async () => {
  let lookups = 0;
  const html = `<!doctype html><script type="application/ld+json">
    { "@context": "https://schema.org", "@type": "Recipe", "name": "Lemon herb chicken",
      "recipeYield": "4 servings",
      "recipeIngredient": ["1 pound chicken breast"],
      "nutrition": { "@type": "NutritionInformation", "calories": "280 calories", "proteinContent": "35 g", "carbohydrateContent": "6 g", "fatContent": "12 g" } }
  </script>`;
  const result = await importRecipe('https://recipes.example/lemon', {
    fetchPage: async () => html,
    lookup: async () => {
      lookups += 1;
      return chicken;
    },
  });
  assert.equal(lookups, 0);
  assert.equal(result.ok, true);
  assert.equal(result.recipe.estimate, false);
  assert.equal(result.recipe.name, 'Lemon herb chicken');
  assert.equal(result.recipe.servings, 4);
  assert.deepEqual(perServingMacros(result.recipe), { kcal: 280, protein: 35, carbs: 6, fat: 12 });
  assert.deepEqual(perServingMacros(result.recipe, 2), { kcal: 560, protein: 70, carbs: 12, fat: 24 });
});

test('schema.org nutrition can sit in an @graph and kilojoules convert', async () => {
  const html = `<script type="application/ld+json">
    { "@graph": [ { "@type": "WebPage", "name": "Home" },
      { "@type": "Recipe", "name": "Oat bowl", "recipeYield": "1",
        "nutrition": { "calories": "1172 kJ", "proteinContent": "10 g", "carbohydrateContent": "40 g", "fatContent": "8 g" } } ] }
  </script>`;
  const result = await importRecipe('https://recipes.example/oats', { fetchPage: async () => html });
  assert.equal(result.ok, true);
  assert.equal(result.recipe.estimate, false);
  assert.equal(perServingMacros(result.recipe).kcal, 280);
  assert.equal(perServingMacros(result.recipe).protein, 10);
});

test('a page with ingredients and no nutrition is added up and marked as an estimate', async () => {
  const html = `<script type="application/ld+json">
    { "@type": "Recipe", "name": "Chicken broccoli rice", "recipeYield": "4",
      "recipeIngredient": ["100 g chicken breast", "1 cup water"] }
  </script>`;
  const seen = [];
  const result = await importRecipe('https://recipes.example/bowl', {
    fetchPage: async () => html,
    lookup: async (name) => {
      seen.push(name);
      return lookupChicken(name);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.recipe.estimate, true);
  assert.deepEqual(seen, ['chicken breast']);
  assert.equal(result.recipe.totals.kcal, 100);
  assert.equal(perServingMacros(result.recipe).kcal, 25);
  assert.equal(result.recipe.notes.some((note) => /water/i.test(note)), true);
  assert.equal(divideTotals(result.recipe.totals, 4).protein, 5);
});

test('partial nutrition does not invent the missing macros', async () => {
  const html = `<script type="application/ld+json">
    { "@type": "Recipe", "name": "Partial", "recipeYield": "1",
      "recipeIngredient": ["100 g chicken breast"],
      "nutrition": { "calories": "999 calories" } }
  </script>`;
  const result = await importRecipe('https://recipes.example/partial', {
    fetchPage: async () => html,
    lookup: async () => chicken,
  });
  assert.equal(result.ok, true);
  assert.equal(result.recipe.estimate, true);
  assert.equal(result.recipe.totals.kcal, 100);
});

test('pasted recipe text with nutrition is kept as published numbers', async () => {
  const text = `Lemon herb chicken
Servings: 4

Calories: 280
Protein: 35 g
Carbs: 6 g
Fat: 12 g`;
  const result = await importRecipe(text, {
    lookup: async () => {
      throw new Error('should not look up');
    },
  });
  assert.equal(result.recipe.estimate, false);
  assert.deepEqual(perServingMacros(result.recipe), { kcal: 280, protein: 35, carbs: 6, fat: 12 });
});

test('a recipe link is a plain GET the phone browser can finish', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response('<html></html>', { status: 200 });
  };
  try {
    const html = await fetchRecipePage('https://recipes.example/lemon');
    assert.equal(html, '<html></html>');
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://recipes.example/lemon');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.mode, 'cors');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.headers, undefined);
  assert.match(RECIPE_MESSAGES.unread, /paste the recipe text/i);
});

test('schema.org in an unquoted script tag is still the published nutrition', async () => {
  const html = `<script type=application/ld+json class=yoast-schema-graph>{"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"Home"},{"@type":"Recipe","name":"Lentil soup","recipeYield":"4 servings","nutrition":{"@type":"NutritionInformation","calories":"210 calories","proteinContent":"14 g","carbohydrateContent":"30 g","fatContent":"5 g"}}]}</script>`;
  let lookups = 0;
  const result = await importRecipe('https://recipes.example/lentil', {
    fetchPage: async () => html,
    lookup: async () => {
      lookups += 1;
      return chicken;
    },
  });
  assert.equal(lookups, 0);
  assert.equal(result.ok, true);
  assert.equal(result.recipe.estimate, false);
  assert.equal(result.recipe.name, 'Lentil soup');
  assert.deepEqual(perServingMacros(result.recipe), { kcal: 210, protein: 14, carbs: 30, fat: 5 });
});

test('a page that cannot be read adds nothing', async () => {
  let lookups = 0;
  const result = await importRecipe('https://recipes.example/missing', {
    fetchPage: async () => {
      throw new Error('cors');
    },
    lookup: async () => {
      lookups += 1;
      return chicken;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.recipe, undefined);
  assert.equal(result.message, RECIPE_MESSAGES.unread);
  assert.equal(lookups, 0);

  const empty = await importRecipe('https://recipes.example/empty', {
    fetchPage: async () => '<html><p>No recipe here</p></html>',
  });
  assert.equal(empty.ok, false);
  assert.equal(empty.message, RECIPE_MESSAGES.notRecipe);
  assert.equal('kcal' in empty, false);
});

test('ingredients that cannot be looked up do not invent calories', async () => {
  const result = await importRecipe('Mystery stew\n\n1 cup quinoa\n2 cups water', {
    lookup: async () => null,
  });
  assert.equal(result.ok, false);
  assert.equal(result.message, RECIPE_MESSAGES.noMatch);
  assert.equal(result.recipe, undefined);

  const blank = await importRecipe('   ', {});
  assert.equal(blank.message, RECIPE_MESSAGES.empty);
});

test('a saved recipe is a My foods serving, not a meal', () => {
  const draft = recipeFoodDraft({
    name: 'Lemon herb chicken',
    servings: 4,
    perServing: { kcal: 280, protein: 35, carbs: 6, fat: 12 },
    estimate: false,
    recipeUrl: 'https://recipes.example/lemon',
  });
  assert.equal(draft.servingQty, 1);
  assert.equal(draft.servingUnit, 'serving');
  assert.equal(draft.source, 'recipe');
  assert.equal(draft.estimate, false);
  assert.equal(draft.date, undefined);
  assert.equal(draft.meal, undefined);
  assert.equal(draft.kcal, 280);
});

test('ingredient search rejects a different dish that merely shares a word', () => {
  const foods = [
    { name: 'Broccoli cheddar soup', kcalPer100g: 60 },
    { name: 'Frozen broccoli', kcalPer100g: 34 },
    { name: 'Egg noodles', kcalPer100g: 300 },
  ];
  assert.equal(pickIngredientFood('broccoli', foods).name, 'Frozen broccoli');
  assert.equal(pickIngredientFood('egg', foods), null);
});
