import { allEntries, ensureProfile, entriesForDate } from '../db.js';
import { dayHeading, dayTitle, esc, fmtKcal, fmtNum, todayKey } from '../format.js';
import { groupByMeal, MEALS } from '../meals.js';
import { sumEntries } from '../nutrition.js';
import { calorieSeal, macroBlock, relicScreen } from '../ui.js';
import { entryRow } from './today.js';

export async function historyHtml() {
  const today = todayKey();
  const [profile, entries] = await Promise.all([ensureProfile(), allEntries()]);
  const byDate = new Map();
  for (const entry of entries) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date).push(entry);
  }
  const days = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  return relicScreen({
    art: 'cliff',
    kicker: profile.name,
    title: 'History',
    body: `
      <label class="jump">
        <span>Jump to a day</span>
        <input id="jump-date" type="date" max="${today}" value="${today}" />
      </label>
      ${
        days.length
          ? `<div class="day-list">${days.map((date) => dayRow(date, byDate.get(date), profile, today)).join('')}</div>`
          : `<section class="empty"><h2>No days yet</h2><p>Meals you log will show up here with their totals.</p></section>`
      }`,
  });
}

function dayRow(date, entries, profile, today) {
  const totals = sumEntries(entries);
  const title = dayTitle(date, today);
  const ratio = profile.calorieGoal > 0 ? Math.min(totals.kcal / profile.calorieGoal, 1) : 0;
  const over = totals.kcal > profile.calorieGoal;
  return `
    <a class="day-row" href="#/day/${date}">
      <div class="day-copy">
        <span class="entry-name">${esc(title)}</span>
        <span class="entry-meta">${entries.length} ${entries.length === 1 ? 'item' : 'items'} · P ${esc(fmtNum(totals.protein))} · C ${esc(fmtNum(totals.carbs))} · F ${esc(fmtNum(totals.fat))}</span>
        <span class="mini-track" aria-hidden="true"><span class="mini-fill${over ? ' over' : ''}" style="width:${(ratio * 100).toFixed(1)}%"></span></span>
      </div>
      <span class="day-kcal"><strong>${esc(fmtKcal(totals.kcal))}</strong><span>of ${esc(fmtKcal(profile.calorieGoal))}</span></span>
    </a>`;
}

export async function dayHtml(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return relicScreen({
      kicker: 'History',
      title: 'Unknown day',
      art: 'cliff',
      body: `<a class="btn" href="#/history">Back to history</a>`,
    });
  }
  const today = todayKey();
  const [profile, entries] = await Promise.all([ensureProfile(), entriesForDate(date)]);
  const totals = sumEntries(entries);
  const groups = groupByMeal(entries);
  const heading = dayHeading(date, today);
  const logDate = date === today ? '' : date;

  return relicScreen({
    art: 'fen',
    kicker: heading.eyebrow,
    title: heading.title,
    backHref: '#/history',
    backLabel: 'Back to history',
    artExtra: calorieSeal(totals, profile),
    body: `
      ${macroBlock(totals, profile)}
      <a class="btn cta add-dock" href="#/add" data-date="${esc(logDate || today)}">Log food on this day</a>
      ${
        entries.length
          ? `<section class="meals">${MEALS.map((meal) => {
              const list = groups[meal.id];
              if (!list.length) return '';
              const kcal = list.reduce((sum, entry) => sum + (entry.kcal || 0), 0);
              return `<section class="meal" data-meal="${meal.id}"><div class="meal-head"><h2>${meal.label}</h2><span>${fmtKcal(kcal)} kcal</span></div><div class="entry-list">${list.map(entryRow).join('')}</div></section>`;
            }).join('')}</section>`
          : `<section class="empty compact"><p>Nothing logged on this day.</p></section>`
      }`,
  });
}
