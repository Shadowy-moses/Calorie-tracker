/** Painting ids. Week and month files are temporary stand-ins. */
export const BACKGROUND_IDS = [
  { id: 'ridge', label: 'Ridge', needDays: 0, temporary: false },
  { id: 'week', label: 'Week painting', needDays: 7, temporary: true },
  { id: 'month', label: 'Month painting', needDays: 30, temporary: true },
];

/**
 * Auto picks the highest painting the finished-workout count has unlocked.
 * A manual choice is used only when that painting is already unlocked.
 */
export function resolveBackgroundId(choice, finishedDays) {
  const days = Math.max(0, Number(finishedDays) || 0);
  const unlocked = BACKGROUND_IDS.filter((art) => days >= art.needDays);
  if (choice && choice !== 'auto') {
    const picked = BACKGROUND_IDS.find((art) => art.id === choice);
    if (picked && days >= picked.needDays) return picked.id;
  }
  return unlocked[unlocked.length - 1].id;
}
