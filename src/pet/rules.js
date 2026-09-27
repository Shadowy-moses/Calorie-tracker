/**
 * Food points are derived from the meal log every time they are shown.
 * Nothing here is a running total: editing or deleting an entry changes
 * the score for the creature you are raising.
 * The first creature counts the whole log. Each later creature counts
 * entries logged from the moment it was chosen.
 *
 * A finished day can earn:
 * - 10 food for each meal slot with at least one entry (breakfast, lunch,
 *   dinner, snacks), so at most 40
 * - 30 food when calories land from 70% through 105% of the calorie target
 * - 20 food when protein reaches the protein target
 * - a streak bonus after the second logging day in a row: 2 food per streak
 *   day, capped at 7 days (14 food)
 *
 * Meal points count as soon as the food is logged, including today.
 * The calorie bonus, protein bonus, and streak bonus wait until the day is
 * over. Today shows those as pending.
 *
 * 70% skips a mostly empty day. 105% leaves a little room over the target
 * (100 kcal on a 2,000 kcal day) so a normal portion still counts.
 * Missing either bonus does not remove meal points. The pet never dies,
 * and a rough day is never a reason to skip the log.
 *
 * Stages, by lifetime food points:
 * - egg 0, baby 20, kid 400, teen 1,400, adult 3,600
 * Baby is two meal slots (often the first day) or two separate logging days.
 * A day with breakfast, lunch, dinner, both bonuses, and a week-long streak
 * is 94 food, so adult is about 5 to 6 weeks of those days. Hitting only one
 * bonus most days stretches that toward 8 weeks. Logging every slot as well
 * is a little faster, about 5 weeks.
 */

import { shiftISODate } from '../format.js';
import { sumEntries } from '../nutrition.js';

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'];

export const PET_RULES = {
  pointsPerMealSlot: 10,
  calorieBonus: 30,
  calorieMinRatio: 0.7,
  calorieMaxRatio: 1.05,
  proteinBonus: 20,
  streakPointsPerDay: 2,
  streakCapDays: 7,
  minStreakDays: 2,
};

export const PET_STAGES = [
  { id: 'egg', label: 'Egg', minPoints: 0 },
  { id: 'baby', label: 'Baby', minPoints: 20 },
  { id: 'kid', label: 'Kid', minPoints: 400 },
  { id: 'teen', label: 'Teen', minPoints: 1400 },
  { id: 'adult', label: 'Adult', minPoints: 3600 },
];

export function stageIndex(id) {
  const index = PET_STAGES.findIndex((stage) => stage.id === id);
  return index < 0 ? 0 : index;
}

export function stageForPoints(points) {
  let current = PET_STAGES[0];
  for (const stage of PET_STAGES) {
    if (points >= stage.minPoints) current = stage;
  }
  return current;
}

export function progressWithinStage(points) {
  const safe = Math.max(0, Math.floor(Number(points) || 0));
  const stage = stageForPoints(safe);
  const next = PET_STAGES[stageIndex(stage.id) + 1] || null;
  if (!next) {
    return {
      stage,
      next: null,
      gained: safe - stage.minPoints,
      span: 0,
      ratio: 1,
      remaining: 0,
    };
  }
  const gained = safe - stage.minPoints;
  const span = next.minPoints - stage.minPoints;
  return {
    stage,
    next,
    gained,
    span,
    ratio: span === 0 ? 1 : gained / span,
    remaining: Math.max(0, span - gained),
  };
}

export function calorieWindow(goal) {
  const target = Number(goal) || 0;
  if (target <= 0) return { low: 0, high: 0 };
  return {
    low: Math.ceil(target * PET_RULES.calorieMinRatio - 1e-9),
    high: Math.floor(target * PET_RULES.calorieMaxRatio + 1e-9),
  };
}

export function inCalorieWindow(kcal, goal) {
  const { low, high } = calorieWindow(goal);
  if (high <= 0) return false;
  const calories = Number(kcal) || 0;
  return calories >= low && calories <= high;
}

export function proteinMet(protein, goal) {
  const target = Number(goal) || 0;
  if (target <= 0) return true;
  return (Number(protein) || 0) + 1e-9 >= target;
}

export function slotsLogged(entries) {
  const slots = new Set();
  for (const entry of entries || []) {
    const meal = MEAL_SLOTS.includes(entry?.meal) ? entry.meal : 'snacks';
    slots.add(meal);
  }
  return slots.size;
}

export function streakBonus(streak) {
  const days = Math.max(0, Math.floor(Number(streak) || 0));
  if (days < PET_RULES.minStreakDays) return 0;
  return Math.min(days, PET_RULES.streakCapDays) * PET_RULES.streakPointsPerDay;
}

export function streakLength(loggedDates, date) {
  if (!date || !loggedDates.has(date)) return 0;
  let count = 0;
  let cursor = date;
  while (loggedDates.has(cursor)) {
    count += 1;
    cursor = shiftISODate(cursor, -1);
  }
  return count;
}

function loggingPoints(entries) {
  return slotsLogged(entries) * PET_RULES.pointsPerMealSlot;
}

export function scoreCompletedDay(entries, goals, streak) {
  const totals = sumEntries(entries || []);
  const meals = loggingPoints(entries);
  const calorie = inCalorieWindow(totals.kcal, goals.calorieGoal) ? PET_RULES.calorieBonus : 0;
  const protein = proteinMet(totals.protein, goals.proteinGoal) ? PET_RULES.proteinBonus : 0;
  const streakPoints = streakBonus(streak);
  return {
    slots: slotsLogged(entries),
    meals,
    calorie,
    protein,
    streak: streakPoints,
    total: meals + calorie + protein + streakPoints,
    totals,
  };
}

function calorieState(entries, totals, goals) {
  if (!entries.length) return 'empty';
  const { low, high } = calorieWindow(goals.calorieGoal);
  if (high <= 0) return 'empty';
  if (totals.kcal < low) return 'under';
  if (totals.kcal > high) return 'over';
  return 'in';
}

function proteinState(entries, totals, goals) {
  if (!entries.length) return 'empty';
  return proteinMet(totals.protein, goals.proteinGoal) ? 'met' : 'under';
}

export function scoreToday(entries, goals, streakIfLogged) {
  const list = entries || [];
  const totals = sumEntries(list);
  const meals = loggingPoints(list);
  const logged = list.length > 0;
  const streakPoints = logged ? streakBonus(streakIfLogged) : 0;
  const calorie = calorieState(list, totals, goals);
  const protein = proteinState(list, totals, goals);
  const pendingParts = [];
  if (calorie === 'in') pendingParts.push(PET_RULES.calorieBonus);
  if (protein === 'met') pendingParts.push(PET_RULES.proteinBonus);
  if (streakPoints > 0) pendingParts.push(streakPoints);
  return {
    slots: slotsLogged(list),
    meals,
    awarded: meals,
    calorie,
    protein,
    streak: streakPoints,
    pendingOnTrack: pendingParts.reduce((sum, value) => sum + value, 0),
    totals,
    window: calorieWindow(goals.calorieGoal),
  };
}

function groupByDate(entries, today, since = 0) {
  const byDate = new Map();
  for (const entry of entries || []) {
    if (!countsForCreature(entry, since)) continue;
    const date = entry?.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) continue;
    if (date > today) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(entry);
  }
  return byDate;
}

export function moodForToday(entries, goals) {
  const list = entries || [];
  if (!list.length) return 'hungry';
  const totals = sumEntries(list);
  if (inCalorieWindow(totals.kcal, goals.calorieGoal) || proteinMet(totals.protein, goals.proteinGoal)) {
    return 'happy';
  }
  return 'content';
}

export function countsForCreature(entry, since = 0) {
  const start = Number(since) || 0;
  if (start <= 0) return true;
  if (Number.isFinite(Number(entry?.createdAt))) return Number(entry.createdAt) >= start;
  return false;
}

export function evaluatePet(entries, goals, today, options = {}) {
  const since = Number(options.since) || 0;
  const byDate = groupByDate(entries, today, since);
  const logged = new Set(byDate.keys());
  let totalPoints = 0;

  for (const date of logged) {
    if (date === today) continue;
    const streak = streakLength(logged, date);
    totalPoints += scoreCompletedDay(byDate.get(date), goals, streak).total;
  }

  const todayEntries = byDate.get(today) || [];
  const loggedToday = todayEntries.length > 0;
  const streakToday = loggedToday ? streakLength(logged, today) : 0;
  const todayScore = scoreToday(todayEntries, goals, streakToday);
  totalPoints += todayScore.awarded;

  const yesterday = shiftISODate(today, -1);
  const streak = loggedToday ? streakToday : streakLength(logged, yesterday);
  const progress = progressWithinStage(totalPoints);

  return {
    totalPoints,
    progress,
    stage: progress.stage,
    mood: moodForToday(todayEntries, goals),
    streak,
    streakAtRisk: !loggedToday && streak > 0,
    holdoverStreakBonus: loggedToday ? 0 : streakBonus(streakLength(logged, yesterday) + 1),
    today: todayScore,
  };
}

export function cleanPetName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!name) return { error: 'Give your pet a name.' };
  if ([...name].length > 24) return { error: 'Use 24 characters or fewer.' };
  return { name };
}

export function rulesCopy() {
  const min = Math.round(PET_RULES.calorieMinRatio * 100);
  const max = Math.round(PET_RULES.calorieMaxRatio * 100);
  const streakMax = PET_RULES.streakPointsPerDay * PET_RULES.streakCapDays;
  return {
    bullets: [
      `${PET_RULES.pointsPerMealSlot} food for each meal you log: breakfast, lunch, dinner, or snacks. That is at most ${PET_RULES.pointsPerMealSlot * MEAL_SLOTS.length} a day. Logging the same meal twice still counts once.`,
      `${PET_RULES.calorieBonus} food if a finished day lands between ${min}% and ${max}% of your calorie target. Under ${min}% is too far below the goal. ${max}% leaves a little room over it, about 100 kcal on a 2,000 kcal day.`,
      `${PET_RULES.proteinBonus} food if a finished day reaches your protein target. Extra protein still counts.`,
      `${PET_RULES.streakPointsPerDay} extra food for each day in a row you log at least one thing, up to ${PET_RULES.streakCapDays} days (${streakMax} food). The bonus starts on the second day. Miss a day and the streak starts over. Food you already earned stays.`,
    ],
    notes: [
      'Meal points count right away, including today. The calorie, protein, and streak bonuses wait until the day is over, so today shows them as pending.',
      'A rough day still feeds your pet if you log it. Skipping the log is the only way that day adds nothing. Your pet never dies, and a finished adult stays in your collection.',
      'The first creature counts every meal already saved on this phone. Each one after that counts meals from the moment you choose it. Change or delete an entry and that creature’s food is worked out again.',
    ],
    stages: PET_STAGES.map((stage) => ({ ...stage })),
  };
}
