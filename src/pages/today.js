import { evaluateBadges } from '../badges.js';
import { allEntries, entriesForDate, ensureProfile, foodsForProfile } from '../db.js';
import { esc, fmtKcal, fmtNum, prettyDate, todayKey } from '../format.js';
import { sortFrequent } from '../food.js';
import { groupByMeal, MEALS, mealForNow, mealLabel } from '../meals.js';
import { macrosForGrams, sumEntries } from '../nutrition.js';
import { badgeTeaser } from './badges.js';
import { calorieSeal, icon, macroBlock, relicScreen } from '../ui.js';

export async function todayHtml() {
  const today = todayKey();
  const [profile, entries, foods, everyEntry] = await Promise.all([
    ensureProfile(),
    entriesForDate(today),
    foodsForProfile(),
    allEntries(),
  ]);
  const totals = sumEntries(entries);
  const groups = groupByMeal(entries);
  const frequent = sortFrequent(foods).slice(0, 8);
  const date = prettyDate(today);
  const badges = evaluateBadges(everyEntry, profile);

  return relicScreen({
    art: 'fen',
    kicker: `${date.weekday} · ${date.month} ${date.day}`,
    title: 'Today',
    artExtra: calorieSeal(totals, profile),
    body: `
      ${macroBlock(totals, profile)}
      <a class="btn cta add-dock" href="#/add">Add food</a>
      ${frequent.length ? frequentStrip(frequent) : ''}
      ${
        entries.length
          ? `<section class="meals">${MEALS.map((meal) => mealBlock(meal, groups[meal.id])).join('')}</section>`
          : emptyToday()
      }
      ${badgeTeaser(badges)}`,
  });
}

function mealBlock(meal, entries) {
  if (!entries.length) return '';
  const kcal = entries.reduce((sum, entry) => sum + (entry.kcal || 0), 0);
  return `
    <section class="meal" data-meal="${meal.id}">
      <div class="meal-head">
        <h2>${meal.label}</h2>
        <span>${fmtKcal(kcal)} kcal</span>
      </div>
      <div class="entry-list">
        ${entries.map(entryRow).join('')}
      </div>
    </section>`;
}

export function entryAmount(entry) {
  if (entry.portionLabel) return entry.portionLabel;
  return `${fmtNum(entry.grams)} g`;
}

export function entryRow(entry) {
  const brand = entry.brand ? `${esc(entry.brand)} · ` : '';
  return `
    <article class="entry">
      <a class="entry-main" href="#/entry/${esc(entry.id)}">
        <span class="entry-name">${esc(entry.name)}</span>
        <span class="entry-meta">${brand}${esc(entryAmount(entry))} · P ${esc(fmtNum(entry.protein))} · C ${esc(fmtNum(entry.carbs))} · F ${esc(fmtNum(entry.fat))}</span>
      </a>
      <span class="entry-kcal">${esc(fmtKcal(entry.kcal))}</span>
      <button type="button" class="icon-btn" data-action="delete-entry" data-id="${esc(entry.id)}" data-name="${esc(entry.name)}" aria-label="Delete ${esc(entry.name)}">${icon('trash')}</button>
    </article>`;
}

function frequentStrip(foods) {
  return `
    <section class="quick">
      <div class="section-head">
        <h2>Quick add</h2>
        <a href="#/add">All foods</a>
      </div>
      <div class="quick-row">
        ${foods
          .map((food) => {
            const grams = food.lastGrams || food.servingGrams || 100;
            const kcal = macrosForGrams(food, grams).kcal;
            const meal = mealLabel(food.lastMeal || mealForNow());
            return `
            <div class="quick-card">
              <button type="button" class="quick-main" data-action="quick-add" data-id="${esc(food.id)}">
                <span class="entry-name">${esc(food.name)}</span>
                <span class="entry-meta">${esc(fmtNum(grams))} g · ${esc(fmtKcal(kcal))} kcal · ${esc(meal)}</span>
              </button>
              <a class="icon-btn" href="#/food/${esc(food.id)}" aria-label="Choose amount for ${esc(food.name)}">${icon('tune')}</a>
            </div>`;
          })
          .join('')}
      </div>
    </section>`;
}

function emptyToday() {
  return `
    <section class="empty">
      <h2>Nothing logged yet</h2>
      <p>Search for a food, scan a barcode, or type a meal yourself.</p>
    </section>`;
}
