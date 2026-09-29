import beast from './assets/bg-beast-ridge.webp';
import chain from './assets/bg-float-chain.webp';
import falls from './assets/bg-float-falls.webp';
import heights from './assets/bg-heights.webp';
import blessing from './assets/bg-knight-blessing.webp';
import road from './assets/bg-knight-road.webp';
import gate from './assets/bg-ninja-gate.webp';
import cove from './assets/bg-pirate-cove.webp';
import wheel from './assets/bg-pirate-sail.webp';
import ridge from './assets/bg-ridge.webp';
import duel from './assets/bg-samurai-duel.webp';
import arch from './assets/bg-sky-gate.webp';
import lanterns from './assets/bg-swamp-lanterns.webp';
import yard from './assets/bg-yard.webp';
import { backgroundProgress } from './badges.js';
import { resolveBackgroundId } from './backgrounds.js';
import { allEntries, ensureProfile, workoutsForProfile } from './db.js';

const SRC = {
  ridge,
  week: yard,
  month: heights,
  road,
  cove,
  falls,
  chain,
  lanterns,
  gate,
  duel,
  blessing,
  beast,
  arch,
  wheel,
};

export async function applyCardArt() {
  const [profile, entries, workouts] = await Promise.all([ensureProfile(), allEntries(), workoutsForProfile()]);
  const id = resolveBackgroundId(profile.artChoice || 'auto', backgroundProgress(entries, workouts, profile));
  const active = SRC[id] || ridge;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.scene = id;
    document.documentElement.style.setProperty('--scene', `url("${active}")`);
  }
}
