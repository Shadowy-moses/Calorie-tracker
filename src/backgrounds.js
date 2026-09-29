/**
 * Full-screen paintings, lowest rank first.
 * Auto uses the last unlocked painting in this list.
 * Ridge is always available. Yard and Heights stay on finished Climber days.
 */
export const BACKGROUND_IDS = [
  { id: 'ridge', label: 'Ridge', track: 'start', need: 0 },
  { id: 'road', label: 'The Road', track: 'calorie', need: 3 },
  { id: 'lanterns', label: 'The Lanterns', track: 'protein', need: 3 },
  { id: 'cove', label: 'The Cove', track: 'calorie', need: 7 },
  { id: 'gate', label: 'The Gate', track: 'protein', need: 7 },
  { id: 'wheel', label: 'The Wheel', track: 'both', need: 7 },
  { id: 'week', label: 'The Yard', track: 'workout', need: 7 },
  { id: 'falls', label: 'The Falls', track: 'calorie', need: 14 },
  { id: 'duel', label: 'The Duel', track: 'protein', need: 14 },
  { id: 'beast', label: 'The Beast', track: 'workout', need: 14 },
  { id: 'arch', label: 'The Arch', track: 'workout', need: 21 },
  { id: 'chain', label: 'The Chain', track: 'calorie', need: 30 },
  { id: 'blessing', label: 'The Blessing', track: 'protein', need: 30 },
  { id: 'month', label: 'The Heights', track: 'workout', need: 30 },
];

const TRACK_KEY = {
  calorie: 'calorieDays',
  protein: 'proteinDays',
  both: 'bothDays',
  workout: 'workoutDays',
};

export function normalizeBackgroundProgress(progress) {
  if (typeof progress === 'number') {
    return { workoutDays: Math.max(0, progress || 0), calorieDays: 0, proteinDays: 0, bothDays: 0 };
  }
  const src = progress || {};
  return {
    workoutDays: Math.max(0, Number(src.workoutDays) || 0),
    calorieDays: Math.max(0, Number(src.calorieDays) || 0),
    proteinDays: Math.max(0, Number(src.proteinDays) || 0),
    bothDays: Math.max(0, Number(src.bothDays) || 0),
  };
}

export function backgroundIsUnlocked(art, progress) {
  if (!art || art.track === 'start') return true;
  const stats = normalizeBackgroundProgress(progress);
  return stats[TRACK_KEY[art.track]] >= art.need;
}

export function backgroundUnlockNote(art) {
  if (!art || art.track === 'start' || !art.need) return '';
  const unit = {
    calorie: 'calorie-range days',
    protein: 'protein days',
    both: 'days on both goals',
    workout: 'Climber days',
  }[art.track];
  return `${art.need} ${unit}`;
}

/**
 * Auto picks the highest painting already unlocked.
 * A manual choice is used only when that painting is already unlocked.
 * A plain number is a finished-workout count, for the Yard and Heights ladder.
 */
export function resolveBackgroundId(choice, progress) {
  const stats = normalizeBackgroundProgress(progress);
  const unlocked = BACKGROUND_IDS.filter((art) => backgroundIsUnlocked(art, stats));
  if (choice && choice !== 'auto') {
    const picked = BACKGROUND_IDS.find((art) => art.id === choice);
    if (picked && backgroundIsUnlocked(picked, stats)) return picked.id;
  }
  return unlocked[unlocked.length - 1].id;
}
