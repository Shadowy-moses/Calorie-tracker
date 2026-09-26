import { esc, fmtKcal, pct } from './format.js';

const ICONS = {
  today:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v1.8M12 19.4v1.8M4.6 4.6l1.3 1.3M18.1 18.1l1.3 1.3M2.8 12h1.8M19.4 12h1.8M4.6 19.4l1.3-1.3M18.1 5.9l1.3-1.3"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  history: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3M4 10h16"/>',
  settings: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
  trash: '<path d="M5 7h14"/><path d="M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7"/><path d="M7.5 7l.8 12.1a1 1 0 0 0 1 .9h5.4a1 1 0 0 0 1-.9L16.5 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  tune: '<path d="M9 6l6 6-6 6"/>',
};

export function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export function progressRing(value, goal) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const ratio = goal > 0 ? value / goal : 0;
  const shown = Math.max(0, Math.min(ratio, 1));
  const offset = circ - shown * circ;
  const over = ratio > 1.001;
  return `
    <svg class="ring" viewBox="0 0 140 140" aria-hidden="true">
      <circle class="ring-track" cx="70" cy="70" r="${radius}"></circle>
      <circle class="ring-value${over ? ' over' : ''}" cx="70" cy="70" r="${radius}"
        stroke-dasharray="${circ.toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}"
        style="--ring-circ:${circ.toFixed(2)}"></circle>
    </svg>`;
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

export function heroCard(totals, goals) {
  const remaining = goals.calorieGoal - totals.kcal;
  const over = remaining < 0;
  const status = over
    ? `${fmtKcal(Math.abs(remaining))} kcal over`
    : `${fmtKcal(remaining)} kcal left`;
  return `
    <section class="hero" aria-label="${esc(`${fmtKcal(totals.kcal)} of ${fmtKcal(goals.calorieGoal)} calories, ${status}`)}">
      <div class="ring-wrap">
        ${progressRing(totals.kcal, goals.calorieGoal)}
        <div class="ring-label">
          <span class="ring-kcal">${esc(fmtKcal(totals.kcal))}</span>
          <span class="ring-sub">of ${esc(fmtKcal(goals.calorieGoal))} kcal</span>
        </div>
      </div>
      <p class="remain${over ? ' over' : ''}">${esc(status)}</p>
      <div class="macros">${macroRows(totals, goals)}</div>
    </section>`;
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
