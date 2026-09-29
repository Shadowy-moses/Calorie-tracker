import { evaluateBadges } from '../badges.js';
import { allEntries, ensureProfile } from '../db.js';
import { dayTitle, esc, todayKey } from '../format.js';
import { relicScreen } from '../ui.js';

export async function badgesHtml() {
  const [profile, entries] = await Promise.all([ensureProfile(), allEntries()]);
  const result = evaluateBadges(entries, profile);
  const earned = result.badges.filter((badge) => badge.earned).length;
  return relicScreen({
    art: 'cliff',
    kicker: profile.name,
    title: 'Badges',
    body: `
      <p class="lede">Earned from meals on this phone, including past days. Uses your current targets.</p>
      <p class="medal-summary">${earned} of ${result.badges.length} earned · longest run ${result.longestStreak} ${result.longestStreak === 1 ? 'day' : 'days'}</p>
      <ul class="medal-grid">
        ${result.badges.map((badge) => medalCard(badge)).join('')}
      </ul>`,
  });
}

export function badgeTeaser(result) {
  const earned = result.badges.filter((badge) => badge.earned).length;
  return `
    <a class="medal-teaser" href="#/badges">
      <span class="medal-pips" aria-hidden="true">
        ${result.badges.map((badge) => `<i class="${badge.earned ? 'on' : ''}"></i>`).join('')}
      </span>
      <span class="medal-teaser-copy">
        <strong>Badges</strong>
        <span>${earned} of ${result.badges.length} earned</span>
      </span>
    </a>`;
}

function medalCard(badge) {
  const state = badge.earned ? `Earned ${dayTitle(badge.earnedOn, todayKey())}` : 'Locked';
  const progress = progressLine(badge);
  return `
    <li class="medal${badge.earned ? ' earned' : ' locked'}">
      <span class="medal-mark" aria-hidden="true">${emblem(badge.id)}${badge.earned ? '' : lockMark()}</span>
      <span class="medal-name">${esc(badge.name)}</span>
      <span class="medal-state">${esc(state)}</span>
      <span class="medal-hint">${esc(badge.hint)}</span>
      ${progress ? `<span class="medal-progress">${esc(progress)}</span>` : ''}
    </li>`;
}

function progressLine(badge) {
  if (badge.kind !== 'streak' || badge.earned) return '';
  return `${badge.longest} of ${badge.need} days`;
}

function lockMark() {
  return `<svg class="medal-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="11" width="12" height="9" rx="1.5" fill="currentColor"/><path d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
}

function emblem(id) {
  const glyph = {
    'first-meal': '<path d="M32 16c2.2 6 9 9 9 16a9 9 0 1 1-18 0c0-7 6.8-10 9-16z"/><path d="M32 28c1.1 3 4 4 4 7.2a4 4 0 1 1-8 0c0-3.2 2.9-4.2 4-7.2z" fill="currentColor" stroke="none"/>',
    'streak-3': '<circle cx="22" cy="38" r="4.2"/><circle cx="32" cy="26" r="4.2"/><circle cx="42" cy="38" r="4.2"/>',
    'streak-7': '<path d="M38 18a14 14 0 1 0 0 28 10.5 10.5 0 1 1 0-28z"/>',
    'streak-14': '<path d="M16 40c6-14 10-14 16 0s10 14 16 0"/><circle cx="16" cy="40" r="2.2" fill="currentColor" stroke="none"/><circle cx="48" cy="40" r="2.2" fill="currentColor" stroke="none"/>',
    'calorie-window': '<path d="M18 22h28M18 42h28"/><rect x="27" y="27" width="10" height="10" rx="1.5"/>',
    protein: '<path d="M22 24h20l-2.2 12a8 8 0 0 1-15.6 0z"/><path d="M32 38v6M26 44h12"/>',
  }[id] || '';
  return `<svg class="emblem" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="28"/><circle cx="32" cy="32" r="23" stroke-width="1" opacity="0.55"/>${glyph}</svg>`;
}
