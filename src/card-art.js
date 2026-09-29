import heights from './assets/bg-heights.webp';
import ridge from './assets/bg-ridge.webp';
import yard from './assets/bg-yard.webp';
import { resolveBackgroundId } from './backgrounds.js';
import { ensureProfile, workoutsForProfile } from './db.js';
import { finishedDates } from './workout.js';

const SRC = { ridge, week: yard, month: heights };

let active = ridge;

export function activeCardArt() {
  return active;
}

export async function applyCardArt() {
  const [profile, workouts] = await Promise.all([ensureProfile(), workoutsForProfile()]);
  const id = resolveBackgroundId(profile.artChoice || 'auto', finishedDates(workouts).length);
  active = SRC[id] || ridge;
}
