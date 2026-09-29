import beast from '../assets/badge-beast.webp';
import blessing from '../assets/badge-blessing.webp';
import cove from '../assets/badge-cove.webp';
import duel from '../assets/badge-duel.webp';
import falls from '../assets/badge-falls.webp';
import heights from '../assets/badge-heights.webp';
import islands from '../assets/badge-islands.webp';
import kindling from '../assets/badge-kindling.webp';
import lake from '../assets/badge-lake.webp';
import lanterns from '../assets/badge-lanterns.webp';
import ninja from '../assets/badge-ninja.webp';
import ridge from '../assets/badge-ridge.webp';
import road from '../assets/badge-road.webp';
import skygate from '../assets/badge-skygate.webp';
import watch from '../assets/badge-watch.webp';
import wheel from '../assets/badge-wheel.webp';
import yard from '../assets/badge-yard.webp';
import { evaluateBadges } from '../badges.js';
import { allEntries, ensureProfile, workoutsForProfile } from '../db.js';
import { dayTitle, esc, todayKey } from '../format.js';
import { relicScreen } from '../ui.js';

const ART = {
  kindling,
  watch,
  lake,
  ridge,
  yard,
  heights,
  road,
  cove,
  falls,
  chain: islands,
  lanterns,
  gate: ninja,
  duel,
  blessing,
  beast,
  arch: skygate,
  wheel,
};

export async function badgesHtml() {
  const [profile, entries, workouts] = await Promise.all([ensureProfile(), allEntries(), workoutsForProfile()]);
  const result = evaluateBadges(entries, workouts, profile);
  const earned = result.badges.filter((badge) => badge.earned).length;
  return relicScreen({
    kicker: profile.name,
    title: 'Badges',
    body: `
      <p class="lede">Counted from meals and The Climber already on this phone. Days do not have to be in a row.</p>
      <p class="medal-summary">${earned} of ${result.badges.length} earned · ${result.loggedDays} ${result.loggedDays === 1 ? 'day' : 'days'} logged</p>
      <ul class="medal-grid">
        ${result.badges.map((badge) => medalCard(badge)).join('')}
      </ul>`,
  });
}

export function badgeTeaser(result) {
  const earned = result.badges.filter((badge) => badge.earned).length;
  return `
    <a class="medal-teaser" href="#/badges">
      <span class="medal-teaser-copy">
        <strong>Badges</strong>
        <span>${earned} of ${result.badges.length} earned</span>
      </span>
      <span class="medal-faces" aria-hidden="true">
        ${result.badges
          .map(
            (badge) =>
              `<img src="${ART[badge.id]}" alt="" width="36" height="36" class="${badge.earned ? 'on' : 'off'}" />`,
          )
          .join('')}
      </span>
    </a>`;
}

function medalCard(badge) {
  const state = badge.earned ? `Earned ${dayTitle(badge.earnedOn, todayKey())}` : 'Locked';
  return `
    <li class="medal${badge.earned ? ' earned' : ' locked'}">
      <img class="medal-art" src="${ART[badge.id]}" alt="" width="80" height="80" />
      <span class="medal-name">${esc(badge.name)}</span>
      <span class="medal-state">${esc(state)}</span>
      <span class="medal-hint">${esc(badge.hint)}</span>
      ${badge.progress ? `<span class="medal-progress">${esc(badge.progress)}</span>` : ''}
    </li>`;
}
