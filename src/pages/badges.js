import kindling from '../assets/badge-kindling.webp';
import lake from '../assets/badge-lake.webp';
import ridge from '../assets/badge-ridge.webp';
import watch from '../assets/badge-watch.webp';
import monthStandIn from '../assets/temp-climber-month.jpg';
import weekStandIn from '../assets/temp-climber-week.jpg';
import { evaluateBadges } from '../badges.js';
import { allEntries, ensureProfile, workoutsForProfile } from '../db.js';
import { dayTitle, esc, todayKey } from '../format.js';
import { relicScreen } from '../ui.js';

const ART = {
  kindling,
  watch,
  lake,
  ridge,
  'first-week': weekStandIn,
  'first-month': monthStandIn,
};

export async function badgesHtml() {
  const [profile, entries, workouts] = await Promise.all([ensureProfile(), allEntries(), workoutsForProfile()]);
  const result = evaluateBadges(entries, workouts);
  const earned = result.badges.filter((badge) => badge.earned).length;
  return relicScreen({
    kicker: profile.name,
    title: 'Badges',
    body: `
      <p class="lede">Earned from your log, including past days. First week and First month come from The Climber.</p>
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
      <span class="medal-faces" aria-hidden="true">
        ${result.badges
          .map(
            (badge) =>
              `<img src="${ART[badge.id]}" alt="" width="36" height="36" class="${badge.earned ? 'on' : 'off'}" />`,
          )
          .join('')}
      </span>
      <span class="medal-teaser-copy">
        <strong>Badges</strong>
        <span>${earned} of ${result.badges.length} earned</span>
      </span>
    </a>`;
}

function medalCard(badge) {
  const state = badge.earned ? `Earned ${dayTitle(badge.earnedOn, todayKey())}` : 'Locked';
  return `
    <li class="medal${badge.earned ? ' earned' : ' locked'}">
      <img class="medal-art" src="${ART[badge.id]}" alt="" width="80" height="80"${badge.temporary ? ' data-temp-art="true"' : ''} />
      <span class="medal-name">${esc(badge.name)}</span>
      <span class="medal-state">${esc(state)}</span>
      <span class="medal-hint">${esc(badge.hint)}</span>
      ${badge.progress ? `<span class="medal-progress">${esc(badge.progress)}</span>` : ''}
    </li>`;
}
