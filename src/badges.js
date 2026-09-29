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
];

export function dayNumber(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/**
 * Badges come from the log each time, so past days count and deleting a meal
 * can lock one again. A logged day is a calendar day with at least one meal.
 */
export function evaluateBadges(entries, workouts = []) {
  const dates = loggedDates(entries);
  const workoutDates = loggedDates(workouts);
  const longestStreak = streakLength(dates);
  const loggedDays = dates.length;

  const badges = BADGE_LIST.map((def) => {
    const earnedOn = earnedDate(def, dates, workoutDates);
    const earned = Boolean(earnedOn);
    const count = def.kind === 'workout-days' ? workoutDates.length : loggedDays;
    return {
      ...def,
      earned,
      earnedOn,
      longest: def.kind === 'workout-days' ? 0 : longestStreak,
      loggedDays: count,
      progress: earned ? '' : progressText(def, longestStreak, count),
    };
  });

  return { badges, longestStreak, loggedDays, workoutDays: workoutDates.length };
}

function loggedDates(entries) {
  const seen = new Set();
  for (const entry of entries || []) {
    if (!entry || typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
    seen.add(entry.date);
  }
  return [...seen].sort();
}

function earnedDate(def, dates, workoutDates) {
  if (def.kind === 'workout-days') return workoutDates[def.needDays - 1] || null;
  if (def.kind === 'days') return dates[def.needDays - 1] || null;
  if (def.kind === 'streak') return firstStreakEnd(dates, def.need);
  return earlier(firstStreakEnd(dates, def.needStreak), dates[def.needDays - 1] || null);
}

function progressText(def, longest, loggedDays) {
  if (def.kind === 'workout-days' || def.kind === 'days') return `${loggedDays} of ${def.needDays} days`;
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
