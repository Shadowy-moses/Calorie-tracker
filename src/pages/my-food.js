import { logCustomFood, saveCustomFood } from '../actions.js';
import {
  PRESET_UNITS,
  formatPortion,
  fromGrams,
  isPresetUnit,
  isWeightUnit,
  macrosForServing,
  perServingLabel,
  servingSentence,
  sortCustomFoods,
  toGrams,
} from '../custom-food.js';
import { deleteCustomFood, deleteEntry } from '../db.js';
import { dayTitle, esc, fmtKcal, fmtNum, parseNum, todayKey } from '../format.js';
import { MEALS, mealForNow, mealLabel } from '../meals.js';
import { activeDate, session } from '../session.js';
import { confirmSheet, icon, relicScreen, toast } from '../ui.js';

const OZ_CHIPS = [1, 2, 3, 4, 6, 8];
const GRAM_CHIPS = [25, 50, 100, 150, 200];
const COUNT_CHIPS = [0.5, 1, 1.5, 2, 3];

export function myFoodsPanel(foods) {
  const list = sortCustomFoods(foods);
  return `
    <div class="mine">
      <a class="btn" href="#/my-food/new">Add a food</a>
      <p class="lede">Save something you eat often, like chicken. Put in the calories for one serving, then log any amount later.</p>
      ${
        list.length
          ? `<div class="entry-list">${list.map(myFoodRow).join('')}</div>`
          : `<section class="empty compact"><h2>No saved foods yet</h2><p>Chicken, rice, a protein bar — once it’s here, you only type how much you ate.</p></section>`
      }
    </div>`;
}

function myFoodRow(food) {
  return `
    <article class="entry">
      <a class="entry-main" href="#/log-food/${esc(food.id)}">
        <span class="entry-name">${esc(food.name)}</span>
        <span class="entry-meta can-wrap">${food.estimate ? '<span class="tag">Estimate</span> ' : ''}${esc(perServingLabel(food))}</span>
      </a>
      <a class="icon-btn" href="#/my-food/${esc(food.id)}" aria-label="Edit ${esc(food.name)}">${icon('pencil')}</a>
    </article>`;
}

export function customResultCards(foods) {
  if (!foods.length) return '';
  return `
    <div class="entry-list results mine-results">
      ${foods
        .map(
          (food) => `
          <a class="result" href="#/log-food/${esc(food.id)}">
            <span class="thumb mine-thumb" aria-hidden="true"></span>
            <span class="result-copy">
              <span class="entry-name">${esc(food.name)}</span>
              <span class="entry-meta can-wrap">${food.estimate ? '<span class="tag">Estimate</span> ' : ''}<span class="tag">My food</span> ${esc(perServingLabel(food))}</span>
            </span>
          </a>`,
        )
        .join('')}
    </div>`;
}

export function myFoodFormHtml(food) {
  const editing = Boolean(food);
  const unit = food?.servingUnit || 'oz';
  const preset = !food || isPresetUnit(unit);
  const chosen = preset ? unit : 'other';
  return relicScreen({
    art: 'fen',
    kicker: 'My foods',
    title: editing ? 'Edit food' : 'New food',
    backHref: '#/add',
    backLabel: 'Back',
    keepDate: true,
    body: `
      <form id="my-food-form" class="stack-form">
        <p class="lede">${editing ? 'Changing these numbers won’t change meals you already logged.' : 'Enter the calories and macros for one serving. You can use a different amount when you log it.'}</p>
        <label>
          <span>Name</span>
          <input name="name" required maxlength="80" value="${esc(food?.name || '')}" placeholder="Chicken" autocomplete="off" />
        </label>
        <label>
          <span>Serving size</span>
          <input name="servingQty" inputmode="decimal" value="${esc(food ? fmtNum(food.servingQty) : '1')}" />
        </label>
        <fieldset class="unit-picker">
          <legend>Serving unit</legend>
          <div class="unit-options">
            ${PRESET_UNITS.map(
              (item) => `<label class="unit-chip"><input type="radio" name="unit" value="${item.id}" ${item.id === chosen ? 'checked' : ''} /><span>${item.label}</span></label>`,
            ).join('')}
            <label class="unit-chip"><input type="radio" name="unit" value="other" ${chosen === 'other' ? 'checked' : ''} /><span>Other</span></label>
          </div>
        </fieldset>
        <label id="custom-unit-row" ${chosen === 'other' ? '' : 'hidden'}>
          <span>Unit name</span>
          <input name="customUnit" maxlength="24" value="${esc(preset ? '' : unit)}" placeholder="slice, tbsp…" autocomplete="off" />
        </label>
        <p class="lede">Nutrition for that serving</p>
        <div class="grid-2">
          <label><span>Calories</span><input name="kcal" inputmode="decimal" value="${esc(food ? String(Math.round(food.kcal || 0)) : '')}" placeholder="46" /></label>
          <label><span>Protein (g)</span><input name="protein" inputmode="decimal" value="${esc(food ? fmtNum(food.protein) : '')}" placeholder="8.6" /></label>
          <label><span>Carbs (g)</span><input name="carbs" inputmode="decimal" value="${esc(food ? fmtNum(food.carbs) : '')}" placeholder="0" /></label>
          <label><span>Fat (g)</span><input name="fat" inputmode="decimal" value="${esc(food ? fmtNum(food.fat) : '')}" placeholder="1" /></label>
        </div>
        <p id="my-food-error" class="form-error" role="alert"></p>
        <button class="btn" type="submit">${editing ? 'Save changes' : 'Save food'}</button>
        ${editing ? '<button class="btn danger" type="button" id="delete-food">Delete food</button>' : ''}
      </form>
    `,
  });
}

export function mountMyFoodForm(root, food) {
  const form = root.querySelector('#my-food-form');
  const error = root.querySelector('#my-food-error');
  const customRow = root.querySelector('#custom-unit-row');
  let saving = false;

  const syncUnit = () => {
    const choice = form.unit.value;
    customRow.hidden = choice !== 'other';
  };
  form.addEventListener('change', syncUnit);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    const parsed = readFoodForm(form);
    if (parsed.error) {
      error.textContent = parsed.error;
      return;
    }
    error.textContent = '';
    saving = true;
    form.querySelector('[type="submit"]').disabled = true;
    try {
      await saveCustomFood({ id: food?.id, ...parsed.values });
      session.addTab = 'mine';
      toast(food ? 'Food updated' : `Saved ${parsed.values.name}`);
      location.hash = '#/add';
    } catch (err) {
      error.textContent = 'Could not save that food.';
      form.querySelector('[type="submit"]').disabled = false;
      saving = false;
      console.error(err);
    }
  });

  root.querySelector('#delete-food')?.addEventListener('click', async () => {
    const ok = await confirmSheet({
      title: `Delete ${food.name}?`,
      text: 'It will come off My foods. Meals you already logged stay as they are.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await deleteCustomFood(food.id);
    session.addTab = 'mine';
    toast('Food deleted');
    location.hash = '#/add';
  });

  return () => {};
}

function readMacro(value) {
  if (String(value ?? '').trim() === '') return 0;
  return parseNum(value);
}

export function readFoodForm(form) {
  const name = form.name.value.trim();
  const servingQty = parseNum(form.servingQty.value);
  const choice = form.unit.value;
  const servingUnit = choice === 'other' ? form.customUnit.value : choice;
  const kcal = readMacro(form.kcal.value);
  const protein = readMacro(form.protein.value);
  const carbs = readMacro(form.carbs.value);
  const fat = readMacro(form.fat.value);
  if (!name) return { error: 'Give the food a name.' };
  if (servingQty == null || servingQty <= 0 || servingQty > 10000) {
    return { error: 'Enter a serving size bigger than 0.' };
  }
  if (!String(servingUnit || '').trim()) return { error: 'Pick a unit, like oz or g.' };
  for (const [value, label] of [
    [kcal, 'calories'],
    [protein, 'protein'],
    [carbs, 'carbs'],
    [fat, 'fat'],
  ]) {
    if (value == null || value < 0 || value > 20000) {
      return { error: `Enter ${label} as 0 or more.` };
    }
  }
  return { values: { name, servingQty, servingUnit, kcal, protein, carbs, fat } };
}

export function customLogHtml(draft) {
  const food = draft.food;
  const back = draft.entryId
    ? draft.date === todayKey()
      ? '#/today'
      : `#/day/${draft.date}`
    : '#/add';
  const weight = isWeightUnit(food.servingUnit);
  return relicScreen({
    art: 'cliff',
    kicker: 'My foods',
    title: food.name,
    backHref: back,
    backLabel: 'Back',
    keepDate: back === '#/add',
    body: `
      ${draft.entryId ? '' : logDateNote()}
      <p class="per100">${esc(servingSentence(food))}</p>
      ${food.estimate ? '<p class="notice">These numbers are an estimate from the recipe’s ingredients.</p>' : ''}
      <form id="custom-log-form" class="stack-form">
        <fieldset class="meal-picker">
          <legend>Meal</legend>
          <div class="meal-options">
            ${MEALS.map((meal) => `<label class="meal-chip"><input type="radio" name="meal" value="${meal.id}" ${meal.id === (draft.meal || mealForNow()) ? 'checked' : ''} /><span>${meal.label}</span></label>`).join('')}
          </div>
        </fieldset>
        ${
          weight
            ? `<div class="seg" role="group" aria-label="Amount unit">
                <button type="button" class="seg-btn${draft.unit === 'oz' ? ' on' : ''}" data-unit="oz">Ounces</button>
                <button type="button" class="seg-btn${draft.unit === 'g' ? ' on' : ''}" data-unit="g">Grams</button>
              </div>`
            : ''
        }
        <label>
          <span id="amount-label">Amount</span>
          <input id="amount" inputmode="decimal" value="${esc(fmtNum(draft.amount))}" />
        </label>
        <div class="chips" id="chips"></div>
        <div class="preview" id="preview"></div>
        <p id="custom-error" class="form-error" role="alert"></p>
        <button class="btn" type="submit" id="custom-save">${draft.entryId ? 'Save changes' : 'Add'}</button>
        ${draft.entryId ? '<button class="btn danger" type="button" id="custom-delete">Delete entry</button>' : ''}
      </form>
    `,
  });
}

function logDateNote() {
  const date = activeDate(todayKey());
  if (date === todayKey()) return '';
  return `<p class="banner static">Adding to ${esc(dayTitle(date))}</p>`;
}

export function mountCustomLog(root, draft, onDone) {
  const form = root.querySelector('#custom-log-form');
  const amountInput = root.querySelector('#amount');
  const chips = root.querySelector('#chips');
  const preview = root.querySelector('#preview');
  const error = root.querySelector('#custom-error');
  const save = root.querySelector('#custom-save');
  const label = root.querySelector('#amount-label');
  const food = draft.food;
  let unit = draft.unit || food.servingUnit;
  let saving = false;

  function paintChips() {
    const values = unit === 'oz' ? OZ_CHIPS : unit === 'g' ? GRAM_CHIPS : COUNT_CHIPS;
    chips.innerHTML = values
      .map((value) => `<button type="button" class="chip" data-chip="${value}">${value}${unit === 'g' ? ' g' : unit === 'oz' ? ' oz' : ''}</button>`)
      .join('');
  }

  function sync() {
    const amount = parseNum(amountInput.value);
    const meal = form.meal.value;
    label.textContent = amountLabel(unit, food);
    root.querySelectorAll('.seg-btn').forEach((button) => {
      button.classList.toggle('on', button.dataset.unit === unit);
    });
    const totals = amount != null && amount > 0 ? macrosForServing(food, amount, unit) : null;
    const tooMuch = totals && isWeightUnit(unit) && toGrams(amount, unit) > 5000;
    const tooMany = totals && !isWeightUnit(unit) && amount > 100;
    if (!totals || tooMuch || tooMany) {
      preview.innerHTML = `<p class="muted">${tooMuch ? 'That’s more than 5,000 grams.' : tooMany ? 'Enter an amount up to 100.' : 'Enter an amount to see calories.'}</p>`;
      save.disabled = true;
      save.textContent = draft.entryId ? 'Save changes' : 'Add';
      return;
    }
    preview.innerHTML = `
      <div class="preview-kcal"><strong>${esc(fmtKcal(totals.kcal))}</strong><span>kcal</span></div>
      <ul>
        <li><span>Protein</span><b>${esc(fmtNum(totals.protein))} g</b></li>
        <li><span>Carbs</span><b>${esc(fmtNum(totals.carbs))} g</b></li>
        <li><span>Fat</span><b>${esc(fmtNum(totals.fat))} g</b></li>
      </ul>
      <p class="preview-note">${esc(previewNote(food, amount, unit))}</p>`;
    save.disabled = false;
    save.textContent = draft.entryId ? 'Save changes' : `Add to ${mealLabel(meal)}`;
  }

  function setUnit(next) {
    if (next === unit) return;
    const amount = parseNum(amountInput.value);
    if (amount != null && isWeightUnit(unit) && isWeightUnit(next)) {
      const grams = toGrams(amount, unit);
      amountInput.value = fmtNum(fromGrams(grams, next));
    }
    unit = next;
    paintChips();
    sync();
  }

  paintChips();
  sync();

  root.querySelectorAll('.seg-btn').forEach((button) => {
    button.addEventListener('click', () => setUnit(button.dataset.unit));
  });
  amountInput.addEventListener('input', sync);
  form.addEventListener('change', sync);
  chips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-chip]');
    if (!button) return;
    amountInput.value = button.dataset.chip;
    sync();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    error.textContent = '';
    const amount = parseNum(amountInput.value);
    const totals = amount != null ? macrosForServing(food, amount, unit) : null;
    if (!totals || (isWeightUnit(unit) && toGrams(amount, unit) > 5000) || (!isWeightUnit(unit) && amount > 100)) {
      error.textContent = 'Enter how much you ate.';
      return;
    }
    const meal = form.meal.value || mealForNow();
    saving = true;
    save.disabled = true;
    try {
      const date = draft.date || activeDate(todayKey());
      await logCustomFood({
        food,
        amount,
        unit,
        meal,
        date,
        entryId: draft.entryId,
      });
      toast(draft.entryId ? 'Entry updated' : `Added ${food.name}`);
      onDone(date);
    } catch (err) {
      error.textContent = 'Could not save that entry.';
      save.disabled = false;
      console.error(err);
    } finally {
      saving = false;
    }
  });

  root.querySelector('#custom-delete')?.addEventListener('click', async () => {
    const ok = await confirmSheet({
      title: 'Delete this entry?',
      text: `${food.name} will be removed from ${mealLabel(draft.meal).toLowerCase()}.`,
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

function amountLabel(unit, food) {
  if (unit === 'oz') return 'Amount in ounces';
  if (unit === 'g') return 'Amount in grams';
  return `Amount in ${unitWordSafe(unit, food)}`;
}

function unitWordSafe(unit, food) {
  if (unit === 'cup') return 'cups';
  if (unit === 'piece') return 'pieces';
  if (unit === 'serving') return 'servings';
  return unit || food.servingUnit;
}

function previewNote(food, amount, unit) {
  const parts = [formatPortion(amount, unit)];
  if (unit === 'oz') parts.push(`${fmtNum(toGrams(amount, 'oz'))} g`);
  if (unit === 'g' && isWeightUnit(food.servingUnit)) {
    const oz = fromGrams(amount, 'oz');
    if (oz != null) parts.push(`${fmtNum(oz)} oz`);
  }
  parts.push(`from ${formatPortion(food.servingQty, food.servingUnit)}`);
  return parts.join(' · ');
}
