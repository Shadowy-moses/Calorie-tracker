import { sumEntries } from './nutrition.js';

/** Inclusive calorie band for the "day on target" badge. */
export const CALORIE_WINDOW = { low: 0.7, high: 1.05 };

export const BADGE_LIST = [
  {
    id: 'first-meal',
    name: 'First Ember',
    hint: 'Log your first meal.',
    kind: 'first',
  },
  {
    id: 'streak-3',
    name: 'Three Dawns',
    hint: 'Log meals on 3 days in a row.',
    kind: 'streak',
    need: 3,
  },
  {
    id: 'streak-7',
    name: 'Seven Nights',
    hint: 'Log meals on 7 days in a row.',
    kind: 'streak',
    need: 7,
  },
  {
    id: 'streak-14',
    name: 'Fourteen Fires',
    hint: 'Log meals on 14 days in a row.',
    kind: 'streak',
    need: 14,
  },
  {
    id: 'calorie-window',
    name: 'True Measure',
    hint: 'Finish a day between 70% and 105% of your calorie target.',
    kind: 'window',
  },
  {
    id: 'protein',
    name: 'Full Plate',
    hint: 'Hit your protein target on a logged day.',
    kind: 'protein',
  },
];

export function dayNumber(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function inCalorieWindow(kcal, goal) {
  const target = Number(goal);
  if (!(target > 0)) return false;
  const ratio = (Number(kcal) || 0) / target;
  return ratio >= CALORIE_WINDOW.low - 1e-9 && ratio <= CALORIE_WINDOW.high + 1e-9;
}

/**
 * Badges are derived from the log every time, so past days count and a
 * deleted meal can lock a badge again. Streaks are calendar days with at
 * least one entry. Calorie and protein checks use the current targets.
 */
export function evaluateBadges(entries, goals = {}) {
  const byDate = new Map();
  for (const entry of entries || []) {
    if (!entry || typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
    const list = byDate.get(entry.date) || [];
    list.push(entry);
    byDate.set(entry.date, list);
  }
  const dates = [...byDate.keys()].sort();
  const totals = new Map(dates.map((date) => [date, sumEntries(byDate.get(date))]));
  const longestStreak = streakLength(dates);
  const calorieGoal = Number(goals.calorieGoal) || 0;
  const proteinGoal = Number(goals.proteinGoal) || 0;
  const windowDate = dates.find((date) => inCalorieWindow(totals.get(date).kcal, calorieGoal)) || null;
  const proteinDate =
    proteinGoal > 0
      ? dates.find((date) => totals.get(date).protein + 1e-9 >= proteinGoal) || null
      : null;

  const badges = BADGE_LIST.map((def) => {
    let earnedOn = null;
    if (def.kind === 'first') earnedOn = dates[0] || null;
    else if (def.kind === 'streak') earnedOn = firstStreakEnd(dates, def.need);
    else if (def.kind === 'window') earnedOn = windowDate;
    else if (def.kind === 'protein') earnedOn = proteinDate;
    return {
      ...def,
      earned: Boolean(earnedOn),
      earnedOn,
      longest: longestStreak,
    };
  });

  return {
    badges,
    longestStreak,
    loggedDays: dates.length,
  };
}

function streakLength(dates) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const date of dates) {
    const n = dayNumber(date);
    if (n == null) continue;
    if (prev != null && n - prev === 1) run += 1;
    else run = 1;
    prev = n;
    if (run > best) best = run;
  }
  return best;
}

function firstStreakEnd(dates, need) {
  if (!need || need < 1) return null;
  let run = 0;
  let prev = null;
  for (const date of dates) {
    const n = dayNumber(date);
    if (n == null) continue;
    if (prev != null && n - prev === 1) run += 1;
    else run = 1;
    prev = n;
    if (run >= need) return date;
  }
  return null;
}
