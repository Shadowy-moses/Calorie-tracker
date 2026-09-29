import ridge from './assets/bg-ridge.webp';
import month from './assets/temp-climber-month.jpg';
import week from './assets/temp-climber-week.jpg';
import { resolveBackgroundId } from './backgrounds.js';
import { ensureProfile, workoutsForProfile } from './db.js';
import { finishedDates } from './workout.js';

/**
 * TEMP ART. Replace these two files when final paintings arrive:
 *   src/assets/temp-climber-week.jpg   (unlocks after 7 finished workout days)
 *   src/assets/temp-climber-month.jpg  (unlocks after 30 finished workout days)
 * src/assets/bg-ridge.webp is the artist's finished painting.
 */
const SRC = { ridge, week, month };

let active = ridge;

export function activeCardArt() {
  return active;
}

export async function applyCardArt() {
  const [profile, workouts] = await Promise.all([ensureProfile(), workoutsForProfile()]);
  const id = resolveBackgroundId(profile.artChoice || 'auto', finishedDates(workouts).length);
  active = SRC[id] || ridge;
}
