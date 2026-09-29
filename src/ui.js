import { esc, fmtKcal, pct } from './format.js';

const ICONS = {
  today:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v1.8M12 19.4v1.8M4.6 4.6l1.3 1.3M18.1 18.1l1.3 1.3M2.8 12h1.8M19.4 12h1.8M4.6 19.4l1.3-1.3M18.1 5.9l1.3-1.3"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  workout: '<path d="M4 19h3.2V15.8H10.4V12.6h3.2V9.4H16.8V6.2H20"/>',
  badges: '<circle cx="12" cy="9" r="4.2"/><path d="M9.2 12.6 8 20l4-2.2L16 20l-1.2-7.4"/>',
  history: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3M4 10h16"/>',
  settings: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
  trash: '<path d="M5 7h14"/><path d="M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7"/><path d="M7.5 7l.8 12.1a1 1 0 0 0 1 .9h5.4a1 1 0 0 0 1-.9L16.5 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  tune: '<path d="M9 6l6 6-6 6"/>',
  pencil: '<path d="M4 20h4l10.4-10.4a1.6 1.6 0 0 0 0-2.3l-1.7-1.7a1.6 1.6 0 0 0-2.3 0L4 16v4z"/><path d="M12.5 6.5l5 5"/>',
};

export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export function relicScreen({
  kicker = '',
  title,
  backHref = '',
  backLabel = 'Back',
  keepDate = false,
  artExtra = '',
  compact = false,
  body = '',
}) {
  const back = backHref
    ? `<a class="back" href="${esc(backHref)}"${keepDate ? ' data-keep-date' : ''} aria-label="${esc(backLabel)}">${icon('back')}</a>`
    : '';
  return `
    <div class="screen">
      <article class="relic">
        <div class="relic-rim">
          <div class="relic-art${artExtra ? ' has-seal' : ''}${compact ? ' is-compact' : ''}">
            <header class="plate${back ? ' with-back' : ''}">
              ${back}
              <div class="plate-copy">
                ${kicker ? `<p class="plate-kicker">${esc(kicker)}</p>` : ''}
                <h1>${esc(title)}</h1>
              </div>
            </header>
            ${artExtra}
          </div>
          <div class="relic-sheet">
            ${body}
          </div>
        </div>
      </article>
    </div>`;
}

export function calorieSeal(totals, goals) {
  const remaining = goals.calorieGoal - totals.kcal;
  const over = remaining < -0.5;
  const status = over ? `${fmtKcal(Math.abs(remaining))} kcal over` : `${fmtKcal(Math.max(0, remaining))} kcal left`;
  const label = `${fmtKcal(totals.kcal)} of ${fmtKcal(goals.calorieGoal)} calories, ${status}`;
  return `
    <section class="seal${over ? ' over' : ''}" aria-label="${esc(label)}">
      <p class="seal-kicker">Calories</p>
      <p class="seal-num">${esc(fmtKcal(totals.kcal))}</p>
      <p class="seal-sub">of ${esc(fmtKcal(goals.calorieGoal))} · ${esc(status)}</p>
    </section>`;
}

export function macroBlock(totals, goals) {
  return `<div class="macros">${macroRows(totals, goals)}</div>`;
}

export function macroRows(totals, goals) {
  const rows = [
    ['protein', 'Protein', totals.protein, goals.proteinGoal],
    ['carbs', 'Carbs', totals.carbs, goals.carbGoal],
    ['fat', 'Fat', totals.fat, goals.fatGoal],
  ];
  return rows
    .map(([key, label, value, goal]) => {
      const over = goal > 0 && value > goal + 0.05;
      return `
        <div class="macro">
          <div class="macro-top">
            <span>${label}</span>
            <span>${esc(formatMacro(value))} / ${esc(formatMacro(goal))} g</span>
          </div>
          <div class="bar" aria-hidden="true">
            <div class="bar-fill ${key}${over ? ' over' : ''}" style="width:${pct(value, goal).toFixed(1)}%"></div>
          </div>
        </div>`;
    })
    .join('');
}

function formatMacro(n) {
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

let toastTimer = 0;

export function toast(message, action) {
  const el = document.getElementById('toast');
  if (!el) return;
  window.clearTimeout(toastTimer);
  el.hidden = false;
  el.innerHTML = `<span>${esc(message)}</span>${
    action ? `<button type="button" class="toast-btn">${esc(action.label)}</button>` : ''
  }`;
  const button = el.querySelector('button');
  if (button && action) {
    button.addEventListener('click', () => {
      hideToast();
      action.onClick();
    });
  }
  toastTimer = window.setTimeout(hideToast, action ? 5200 : 2800);
}

export function hideToast() {
  const el = document.getElementById('toast');
  if (!el) return;
  el.hidden = true;
  el.innerHTML = '';
}

export function confirmSheet({ title, text, confirmLabel, danger = false }) {
  const modal = document.getElementById('modal');
  modal.hidden = false;
  modal.innerHTML = `
    <div class="backdrop">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <h2 id="sheet-title">${esc(title)}</h2>
        <p>${esc(text)}</p>
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-sheet="cancel">Cancel</button>
          <button type="button" class="btn ${danger ? 'danger' : ''}" data-sheet="ok">${esc(confirmLabel)}</button>
        </div>
      </div>
    </div>`;
  const ok = modal.querySelector('[data-sheet="ok"]');
  const cancel = modal.querySelector('[data-sheet="cancel"]');
  cancel.focus();
  return new Promise((resolve) => {
    const finish = (value) => {
      modal.hidden = true;
      modal.innerHTML = '';
      resolve(value);
    };
    ok.addEventListener('click', () => finish(true));
    cancel.addEventListener('click', () => finish(false));
    modal.querySelector('.backdrop').addEventListener('click', (event) => {
      if (event.target === event.currentTarget) finish(false);
    });
  });
}

export function tabs(active) {
  const items = [
    ['today', '#/today', 'Today'],
    ['add', '#/add', 'Add'],
    ['workout', '#/workout', 'Workout'],
    ['badges', '#/badges', 'Badges'],
    ['history', '#/history', 'History'],
    ['settings', '#/settings', 'Settings'],
  ];
  return items
    .map(([id, href, label]) => {
      const on = id === active;
      return `<a class="tab${on ? ' on' : ''}" href="${href}" ${on ? 'aria-current="page"' : ''}>${icon(id)}<span>${label}</span></a>`;
    })
    .join('');
}
