import { logFood } from '../actions.js';
import { deleteEntry } from '../db.js';
import { dayTitle, esc, fmtKcal, fmtNum, parseNum, todayKey } from '../format.js';
import { MEALS, mealLabel } from '../meals.js';
import { macrosForGrams } from '../nutrition.js';
import { activeDate } from '../session.js';
import { confirmSheet, relicScreen, toast } from '../ui.js';

const GRAM_CHIPS = [25, 50, 100, 150, 200];
const SERVING_CHIPS = [0.5, 1, 1.5, 2, 3];

export function portionHtml(draft) {
  const back = draft.entryId
    ? draft.date === todayKey()
      ? '#/today'
      : `#/day/${draft.date}`
    : '#/add';
  return relicScreen({
    art: 'cliff',
    kicker: draft.brand || 'Portion',
    title: draft.name,
    backHref: back,
    backLabel: 'Back',
    body: `
      ${draft.entryId ? '' : logDateNote()}
      <p class="per100">${esc(fmtKcal(draft.kcalPer100g))} kcal / 100 g · P ${esc(fmtNum(draft.proteinPer100g))} · C ${esc(fmtNum(draft.carbsPer100g))} · F ${esc(fmtNum(draft.fatPer100g))}</p>
      <form id="portion-form" class="stack-form">
        <fieldset class="meal-picker">
          <legend>Meal</legend>
          <div class="meal-options" id="meal-options">
            ${MEALS.map((meal) => `<label class="meal-chip"><input type="radio" name="meal" value="${meal.id}" ${meal.id === draft.meal ? 'checked' : ''} /><span>${meal.label}</span></label>`).join('')}
          </div>
        </fieldset>
        <div class="seg" role="group" aria-label="Amount unit">
          <button type="button" class="seg-btn on" data-unit="grams">Grams</button>
          <button type="button" class="seg-btn" data-unit="servings">Servings</button>
        </div>
        <label>
          <span id="amount-label">Amount in grams</span>
          <input id="amount" inputmode="decimal" value="${esc(fmtNum(draft.grams))}" />
        </label>
        <label id="serving-row" hidden>
          <span>1 serving equals (g)</span>
          <input id="serving-grams" inputmode="decimal" value="${esc(fmtNum(draft.servingGrams || 100))}" />
        </label>
        <div class="chips" id="chips"></div>
        <div class="preview" id="preview"></div>
        <p id="portion-error" class="form-error" role="alert"></p>
        <button class="btn" type="submit" id="portion-save">${draft.entryId ? 'Save changes' : 'Add'}</button>
        ${draft.entryId ? '<button class="btn danger" type="button" id="portion-delete">Delete entry</button>' : ''}
      </form>
    `,
  });
}

function logDateNote() {
  const date = activeDate(todayKey());
  if (date === todayKey()) return '';
  return `<p class="banner static">Adding to ${esc(dayTitle(date))}</p>`;
}

export function mountPortion(root, draft, onDone) {
  const form = root.querySelector('#portion-form');
  const amount = root.querySelector('#amount');
  const servingInput = root.querySelector('#serving-grams');
  const servingRow = root.querySelector('#serving-row');
  const chips = root.querySelector('#chips');
  const preview = root.querySelector('#preview');
  const error = root.querySelector('#portion-error');
  const save = root.querySelector('#portion-save');
  const label = root.querySelector('#amount-label');
  let mode = 'grams';
  let saving = false;

  function servingGrams() {
    const n = parseNum(servingInput.value);
    return n && n > 0 ? n : null;
  }

  function gramsFromInput() {
    const n = parseNum(amount.value);
    if (n == null || n <= 0) return null;
    if (mode === 'grams') return n;
    const serving = servingGrams();
    if (!serving) return null;
    return n * serving;
  }

  function paintChips() {
    const values = mode === 'grams' ? GRAM_CHIPS : SERVING_CHIPS;
    chips.innerHTML = values
      .map((value) => `<button type="button" class="chip" data-chip="${value}">${value}${mode === 'grams' ? ' g' : ''}</button>`)
      .join('');
  }

  function sync() {
    const grams = gramsFromInput();
    label.textContent = mode === 'grams' ? 'Amount in grams' : 'Number of servings';
    servingRow.hidden = mode !== 'servings';
    const meal = form.meal.value;
    if (grams == null || grams > 5000) {
      preview.innerHTML = `<p class="muted">Enter an amount to see calories.</p>`;
      save.disabled = true;
      save.textContent = draft.entryId ? 'Save changes' : 'Add';
      return;
    }
    const same =
      draft.originalTotals && Math.abs(grams - draft.originalGrams) < 0.05;
    const totals = same ? draft.originalTotals : macrosForGrams(draft, grams);
    preview.innerHTML = `
      <div class="preview-kcal"><strong>${esc(fmtKcal(totals.kcal))}</strong><span>kcal</span></div>
      <ul>
        <li><span>Protein</span><b>${esc(fmtNum(totals.protein))} g</b></li>
        <li><span>Carbs</span><b>${esc(fmtNum(totals.carbs))} g</b></li>
        <li><span>Fat</span><b>${esc(fmtNum(totals.fat))} g</b></li>
      </ul>
      <p class="preview-note">${esc(fmtNum(grams))} g${mode === 'servings' ? ` · ${esc(fmtNum(parseNum(amount.value) || 0))} serving${(parseNum(amount.value) || 0) === 1 ? '' : 's'}` : ''}</p>`;
    save.disabled = false;
    save.textContent = draft.entryId ? 'Save changes' : `Add to ${mealLabel(meal)}`;
  }

  function setMode(next) {
    if (next === mode) return;
    const grams = gramsFromInput();
    mode = next;
    root.querySelectorAll('.seg-btn').forEach((button) => {
      button.classList.toggle('on', button.dataset.unit === mode);
    });
    if (grams) {
      if (mode === 'grams') amount.value = fmtNum(grams);
      else {
        const serving = servingGrams() || 100;
        servingInput.value = fmtNum(serving);
        amount.value = fmtNum(grams / serving);
      }
    }
    paintChips();
    sync();
  }

  paintChips();
  sync();

  root.querySelectorAll('.seg-btn').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.unit));
  });
  amount.addEventListener('input', sync);
  servingInput.addEventListener('input', sync);
  form.addEventListener('change', sync);
  chips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-chip]');
    if (!button) return;
    amount.value = button.dataset.chip;
    sync();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    const grams = gramsFromInput();
    error.textContent = '';
    if (grams == null || grams <= 0 || grams > 5000) {
      error.textContent = 'Enter an amount between 0 and 5,000 grams.';
      return;
    }
    const serving = servingGrams();
    const meal = form.meal.value;
    const same = draft.originalTotals && Math.abs(grams - draft.originalGrams) < 0.05;
    const totals = same ? draft.originalTotals : macrosForGrams(draft, grams);
    saving = true;
    save.disabled = true;
    try {
      const date = draft.date || activeDate(todayKey());
      await logFood({
        food: {
          ...draft,
          id: draft.foodId,
          servingGrams: serving,
          source: draft.source === 'entry' ? 'entry' : draft.source,
        },
        grams,
        meal,
        date,
        countUse: !draft.entryId,
        totals,
        entryId: draft.entryId,
      });
      toast(draft.entryId ? 'Entry updated' : `Added ${draft.name}`);
      onDone(date);
    } catch (err) {
      error.textContent = 'Could not save that entry.';
      save.disabled = false;
      console.error(err);
    } finally {
      saving = false;
    }
  });

  root.querySelector('#portion-delete')?.addEventListener('click', async () => {
    const ok = await confirmSheet({
      title: 'Delete this entry?',
      text: `${draft.name} will be removed from ${mealLabel(draft.meal).toLowerCase()}.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await deleteEntry(draft.entryId);
    toast('Entry deleted');
    onDone(draft.date || todayKey());
  });

  return () => {};
}
