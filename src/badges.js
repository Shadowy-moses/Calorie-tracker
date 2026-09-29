import { DEFAULT_GOALS } from './db.js';

export const BADGE_LIST = [
  {
    id: 'kindling',
    name: 'Kindling',
    hint: 'Log a meal on any day.',
    kind: 'days',
    needDays: 1,
  },
  {
    id: 'watch',
    name: 'The Watch',
    hint: 'Log meals on 7 days in a row.',
    kind: 'streak',
    need: 7,
  },
  {
    id: 'lake',
    name: 'The Lake',
    hint: 'Log 14 days in a row, or 21 different days.',
    kind: 'either',
    needStreak: 14,
    needDays: 21,
  },
  {
    id: 'ridge',
    name: 'The Ridge',
    hint: 'Log 30 days in a row, or 42 different days.',
    kind: 'either',
    needStreak: 30,
    needDays: 42,
  },
  {
    id: 'yard',
    name: 'The Yard',
    hint: 'Finish The Climber on 7 different days.',
    kind: 'workout-days',
    needDays: 7,
  },
  {
    id: 'heights',
    name: 'The Heights',
    hint: 'Finish The Climber on 30 different days.',
    kind: 'workout-days',
    needDays: 30,
  },
  {
    id: 'road',
    name: 'The Road',
    hint: '3 days at 90–110% of the calorie goal.',
    kind: 'calorie-days',
    needDays: 3,
  },
  {
    id: 'cove',
    name: 'The Cove',
    hint: '7 days at 90–110% of the calorie goal.',
    kind: 'calorie-days',
    needDays: 7,
  },
  {
    id: 'falls',
    name: 'The Falls',
    hint: '14 days at 90–110% of the calorie goal.',
    kind: 'calorie-days',
    needDays: 14,
  },
  {
    id: 'chain',
    name: 'The Chain',
    hint: '30 days at 90–110% of the calorie goal.',
    kind: 'calorie-days',
    needDays: 30,
  },
  {
    id: 'lanterns',
    name: 'The Lanterns',
    hint: 'Meet the protein goal on 3 days.',
    kind: 'protein-days',
    needDays: 3,
  },
  {
    id: 'gate',
    name: 'The Gate',
    hint: 'Meet the protein goal on 7 days.',
    kind: 'protein-days',
    needDays: 7,
  },
  {
    id: 'duel',
    name: 'The Duel',
    hint: 'Meet the protein goal on 14 days.',
    kind: 'protein-days',
    needDays: 14,
  },
  {
    id: 'blessing',
    name: 'The Blessing',
    hint: 'Meet the protein goal on 30 days.',
    kind: 'protein-days',
    needDays: 30,
  },
  {
    id: 'beast',
    name: 'The Beast',
    hint: 'Finish The Climber on 14 different days.',
    kind: 'workout-days',
    needDays: 14,
  },
  {
    id: 'arch',
    name: 'The Arch',
    hint: 'Finish The Climber on 21 different days.',
    kind: 'workout-days',
    needDays: 21,
  },
  {
    id: 'wheel',
    name: 'The Wheel',
    hint: 'Hit the calorie range and the protein goal on 7 days.',
    kind: 'both-days',
    needDays: 7,
  },
];

export function dayNumber(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Inclusive 90–110% of the calorie goal. */
export function inCalorieRange(kcal, calorieGoal) {
  const target = Number(calorieGoal);
  if (!Number.isFinite(target) || target <= 0) return false;
  const value = Number(kcal);
  if (!Number.isFinite(value)) return false;
  const low = Math.round(target * 0.9 * 100);
  const high = Math.round(target * 1.1 * 100);
  const scaled = Math.round(value * 100);
  return scaled >= low && scaled <= high;
}

/** Protein for the day meets or beats the protein goal. */
export function meetsProteinGoal(protein, proteinGoal) {
  const target = Number(proteinGoal);
  if (!Number.isFinite(target) || target < 0) return false;
  const value = Number(protein);
  if (!Number.isFinite(value)) return false;
  return value >= target;
}

/**
 * Badges come from the log each time, so past days count and deleting a meal
 * can lock one again. A logged day is a calendar day with at least one meal.
 * Calorie, protein, and both-goal days do not have to be in a row, and each
 * calendar day counts once.
 */
export function evaluateBadges(entries, workouts = [], goals = DEFAULT_GOALS) {
  const dates = loggedDates(entries);
  const workoutDates = loggedDates(workouts);
  const goalDays = classifyGoalDays(entries, goals);
  const longestStreak = streakLength(dates);
  const loggedDays = dates.length;
  const ctx = {
    logged: dates,
    workout: workoutDates,
    calorie: goalDays.calorie,
    protein: goalDays.protein,
    both: goalDays.both,
  };

  const badges = BADGE_LIST.map((def) => {
    const earnedOn = earnedDate(def, ctx);
    const earned = Boolean(earnedOn);
    const count = countFor(def, ctx);
    return {
      ...def,
      earned,
      earnedOn,
      longest: def.kind === 'workout-days' ? 0 : longestStreak,
      loggedDays: count,
      progress: earned ? '' : progressText(def, longestStreak, count),
    };
  });

  return {
    badges,
    longestStreak,
    loggedDays,
    workoutDays: workoutDates.length,
    calorieDays: goalDays.calorie.length,
    proteinDays: goalDays.protein.length,
    bothDays: goalDays.both.length,
  };
}

/** Counts the background tracks use. A finished workout day matches The Yard. */
export function backgroundProgress(entries, workouts = [], goals = DEFAULT_GOALS) {
  const goalDays = classifyGoalDays(entries, goals);
  return {
    workoutDays: loggedDates(workouts).length,
    calorieDays: goalDays.calorie.length,
    proteinDays: goalDays.protein.length,
    bothDays: goalDays.both.length,
  };
}

function classifyGoalDays(entries, goals) {
  const targets = goalTargets(goals);
  const calorie = [];
  const protein = [];
  const both = [];
  for (const day of totalsByDate(entries)) {
    const inRange = inCalorieRange(day.kcal, targets.calorieGoal);
    const proteinHit = meetsProteinGoal(day.protein, targets.proteinGoal);
    if (inRange) calorie.push(day.date);
    if (proteinHit) protein.push(day.date);
    if (inRange && proteinHit) both.push(day.date);
  }
  return { calorie, protein, both };
}

function goalTargets(goals) {
  const source = goals || DEFAULT_GOALS;
  return {
    calorieGoal: Number(source.calorieGoal ?? DEFAULT_GOALS.calorieGoal),
    proteinGoal: Number(source.proteinGoal ?? DEFAULT_GOALS.proteinGoal),
  };
}

function totalsByDate(entries) {
  const map = new Map();
  for (const entry of entries || []) {
    if (!entry || typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
    const prev = map.get(entry.date) || { kcal: 0, protein: 0 };
    prev.kcal += Number(entry.kcal) || 0;
    prev.protein += Number(entry.protein) || 0;
    map.set(entry.date, prev);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, totals]) => ({ date, kcal: totals.kcal, protein: totals.protein }));
}

function loggedDates(entries) {
  const seen = new Set();
  for (const entry of entries || []) {
    if (!entry || typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
    seen.add(entry.date);
  }
  return [...seen].sort();
}

function countFor(def, ctx) {
  if (def.kind === 'workout-days') return ctx.workout.length;
  if (def.kind === 'calorie-days') return ctx.calorie.length;
  if (def.kind === 'protein-days') return ctx.protein.length;
  if (def.kind === 'both-days') return ctx.both.length;
  return ctx.logged.length;
}

function earnedDate(def, ctx) {
  if (def.kind === 'workout-days') return ctx.workout[def.needDays - 1] || null;
  if (def.kind === 'calorie-days') return ctx.calorie[def.needDays - 1] || null;
  if (def.kind === 'protein-days') return ctx.protein[def.needDays - 1] || null;
  if (def.kind === 'both-days') return ctx.both[def.needDays - 1] || null;
  if (def.kind === 'days') return ctx.logged[def.needDays - 1] || null;
  if (def.kind === 'streak') return firstStreakEnd(ctx.logged, def.need);
  return earlier(firstStreakEnd(ctx.logged, def.needStreak), ctx.logged[def.needDays - 1] || null);
}

function progressText(def, longest, loggedDays) {
  if (
    def.kind === 'workout-days' ||
    def.kind === 'days' ||
    def.kind === 'calorie-days' ||
    def.kind === 'protein-days' ||
    def.kind === 'both-days'
  ) {
    return `${loggedDays} of ${def.needDays} days`;
  }
  if (def.kind === 'streak') return `${longest} of ${def.need} days in a row`;
  return `${longest} of ${def.needStreak} in a row · ${loggedDays} of ${def.needDays} days`;
}

function earlier(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a < b ? a : b;
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
