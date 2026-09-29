import { BACKGROUND_IDS } from '../backgrounds.js';
import { requestRender } from '../bus.js';
import { clearProfile, DEFAULT_GOALS, ensureProfile, saveArtChoice, saveGoals, workoutsForProfile } from '../db.js';
import { esc, fmtNum, parseNum } from '../format.js';
import { confirmSheet, relicScreen, toast } from '../ui.js';
import { finishedDates } from '../workout.js';

export async function settingsHtml() {
  const [profile, workouts] = await Promise.all([ensureProfile(), workoutsForProfile()]);
  const finishedDays = finishedDates(workouts).length;
  return relicScreen({
    art: 'cliff',
    kicker: profile.name,
    title: 'Settings',
    body: `
      <form id="settings-form" class="stack-form">
        <p class="lede">Daily targets for ${esc(profile.name)}. A starting point, not medical advice. Saved only on this phone.</p>
        <label>
          <span>Calories</span>
          <input name="calorieGoal" inputmode="numeric" enterkeyhint="done" value="${esc(String(profile.calorieGoal))}" />
        </label>
        <label>
          <span>Protein (g)</span>
          <input name="proteinGoal" inputmode="decimal" value="${esc(fmtNum(profile.proteinGoal))}" />
        </label>
        <label>
          <span>Carbs (g)</span>
          <input name="carbGoal" inputmode="decimal" value="${esc(fmtNum(profile.carbGoal))}" />
        </label>
        <label>
          <span>Fat (g)</span>
          <input name="fatGoal" inputmode="decimal" value="${esc(fmtNum(profile.fatGoal))}" />
        </label>
        <p id="settings-error" class="form-error" role="alert"></p>
        <button class="btn" type="submit">Save targets</button>
        <button class="btn ghost" type="button" id="reset-goals">Reset to defaults</button>
      </form>
      <fieldset class="art-choice">
        <legend>Card painting</legend>
        <p class="lede">Highest unlocked is used on its own. Week and month paintings are stand-in landscapes until finished art replaces them.</p>
        ${paintingOptions(profile.artChoice || 'auto', finishedDays)}
      </fieldset>
      <section class="about">
        <h2>On this phone</h2>
        <p>Meals, workouts, My foods, and targets stay in this browser. Food search and barcodes are looked up in <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a>. Their database is available under the Open Database License.</p>
        <button class="btn danger" type="button" id="clear-data">Erase everything on this phone</button>
      </section>`,
  });
}

export function mountSettings(root) {
  const form = root.querySelector('#settings-form');
  const error = root.querySelector('#settings-error');
  const onSubmit = async (event) => {
    event.preventDefault();
    const goals = readGoals(form);
    if (goals.error) {
      error.textContent = goals.error;
      return;
    }
    error.textContent = '';
    await saveGoals(goals.values);
    toast('Targets saved');
  };
  form.addEventListener('submit', onSubmit);

  const onReset = async () => {
    form.calorieGoal.value = String(DEFAULT_GOALS.calorieGoal);
    form.proteinGoal.value = String(DEFAULT_GOALS.proteinGoal);
    form.carbGoal.value = String(DEFAULT_GOALS.carbGoal);
    form.fatGoal.value = String(DEFAULT_GOALS.fatGoal);
    error.textContent = '';
    await saveGoals({ ...DEFAULT_GOALS });
    toast('Reset to the starting targets');
  };
  root.querySelector('#reset-goals').addEventListener('click', onReset);

  const onClear = async () => {
    const ok = await confirmSheet({
      title: 'Erase this phone’s log?',
      text: 'Meals, workouts, and My foods for David will be deleted. Targets and the card painting go back to the start. This cannot be undone.',
      confirmLabel: 'Erase',
      danger: true,
    });
    if (!ok) return;
    await clearProfile();
    await saveGoals({ ...DEFAULT_GOALS });
    await saveArtChoice('auto');
    toast('Log erased');
    requestRender();
  };
  root.querySelector('#clear-data').addEventListener('click', onClear);

  const onArt = async (event) => {
    const input = event.target.closest('input[name="artChoice"]');
    if (!input || input.disabled) return;
    await saveArtChoice(input.value);
    toast('Painting updated');
    requestRender();
  };
  const artField = root.querySelector('.art-choice');
  artField.addEventListener('change', onArt);

  return () => {
    form.removeEventListener('submit', onSubmit);
    root.querySelector('#reset-goals')?.removeEventListener('click', onReset);
    root.querySelector('#clear-data')?.removeEventListener('click', onClear);
    artField.removeEventListener('change', onArt);
  };
}

function paintingOptions(choice, finishedDays) {
  const options = [{ id: 'auto', label: 'Highest unlocked', needDays: 0 }, ...BACKGROUND_IDS];
  return options
    .map((art) => {
      const locked = finishedDays < art.needDays;
      const checked = choice === art.id ? ' checked' : '';
      const note = art.needDays ? ` · ${art.needDays} workout days` : '';
      return `
        <label class="art-option">
          <input type="radio" name="artChoice" value="${esc(art.id)}"${checked}${locked ? ' disabled' : ''} />
          <span>${esc(art.label)}${locked ? ' (locked)' : ''}${esc(note)}</span>
        </label>`;
    })
    .join('');
}

function readGoals(form) {
  const calorieGoal = parseNum(form.calorieGoal.value);
  const proteinGoal = parseNum(form.proteinGoal.value);
  const carbGoal = parseNum(form.carbGoal.value);
  const fatGoal = parseNum(form.fatGoal.value);
  if (calorieGoal == null || calorieGoal < 1 || calorieGoal > 20000) {
    return { error: 'Enter a calorie goal between 1 and 20,000.' };
  }
  const macros = [
    [proteinGoal, 'protein'],
    [carbGoal, 'carb'],
    [fatGoal, 'fat'],
  ];
  for (const [value, label] of macros) {
    if (value == null || value < 0 || value > 2000) {
      return { error: `Enter a ${label} target between 0 and 2,000 g.` };
    }
  }
  return {
    values: {
      calorieGoal: Math.round(calorieGoal),
      proteinGoal: Math.round(proteinGoal * 10) / 10,
      carbGoal: Math.round(carbGoal * 10) / 10,
      fatGoal: Math.round(fatGoal * 10) / 10,
    },
  };
}
