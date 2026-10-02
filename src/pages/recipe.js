import { saveRecipeFood } from '../actions.js';
import { requestRender } from '../bus.js';
import { esc, fmtKcal, fmtNum, parseNum } from '../format.js';
import { lookupBarcode, searchIngredientCandidates } from '../off.js';
import { fetchRecipePage, importRecipe, perServingMacros } from '../recipe.js';
import { session } from '../session.js';
import { toast } from '../ui.js';

export function recipePanel() {
  const view = session.recipeView;
  return `
    <div class="recipe">
      <form id="recipe-form" class="stack-form">
        <p class="lede">Paste a recipe link or the recipe itself. If the page lists calories and macros, those are used. If it only lists ingredients, they are looked up and added up, and the total is marked as an estimate. Saving puts it in My foods. It is not added to today.</p>
        <label>
          <span>Recipe link or text</span>
          <textarea id="recipe-input" name="recipe" rows="8" enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://… or the ingredients">${esc(session.recipeInput || '')}</textarea>
        </label>
        <button class="btn" type="submit">Read recipe</button>
      </form>
      <div id="recipe-out" aria-live="polite">${view?.recipe ? previewHtml(view.recipe) : view?.error ? errorHtml(view.error) : ''}</div>
    </div>`;
}

function errorHtml(message) {
  return `<p class="notice" role="alert">${esc(message)}</p>`;
}

function previewHtml(recipe) {
  const per = perServingMacros(recipe, recipe.servings);
  const leftMeasure = recipe.leftOut.filter((item) => item.reason === 'measure').map((item) => item.label);
  const leftLookup = recipe.leftOut.filter((item) => item.reason === 'lookup').map((item) => item.label);
  return `
    <section class="recipe-preview">
      <h2 class="recipe-name">${esc(recipe.name)}</h2>
      ${recipe.estimate ? `<p class="notice">Estimate. ${recipe.recipeUrl ? 'This page doesn’t list nutrition' : 'This recipe doesn’t list nutrition'}, so these numbers are added up from the ingredients.</p>` : '<p class="lede">These are the calories and macros published for this recipe.</p>'}
      <label>
        <span>Servings this recipe makes</span>
        <input id="recipe-servings" inputmode="decimal" value="${esc(fmtNum(recipe.servings))}" />
      </label>
      <p class="lede">Numbers below are for one serving. Change the count if the recipe makes a different number.</p>
      <div class="preview" id="recipe-preview">
        <p class="preview-note" id="recipe-kind">${recipe.estimate ? 'Estimate · per serving' : 'Per serving'}</p>
        <div class="preview-kcal"><strong id="recipe-kcal">${esc(fmtKcal(per.kcal))}</strong><span>kcal</span></div>
        <ul>
          <li><span>Protein</span><b id="recipe-protein">${esc(fmtNum(per.protein))} g</b></li>
          <li><span>Carbs</span><b id="recipe-carbs">${esc(fmtNum(per.carbs))} g</b></li>
          <li><span>Fat</span><b id="recipe-fat">${esc(fmtNum(per.fat))} g</b></li>
        </ul>
      </div>
      ${recipe.lines.length ? lineList(recipe.lines) : ''}
      ${leftMeasure.length ? `<p class="muted">Couldn’t measure: ${esc(leftMeasure.join(', '))}. ${leftMeasure.length > 1 ? 'They aren’t' : 'It isn’t'} in the total.</p>` : ''}
      ${leftLookup.length ? `<p class="muted">Couldn’t look up: ${esc(leftLookup.join(', '))}. ${leftLookup.length > 1 ? 'They aren’t' : 'It isn’t'} in the total.</p>` : ''}
      ${recipe.notes.map((note) => `<p class="muted">${esc(note)}</p>`).join('')}
      <p id="recipe-save-error" class="form-error" role="alert"></p>
      <button class="btn" type="button" id="recipe-save">Save to My foods</button>
    </section>`;
}

function lineList(lines) {
  return `
    <ul class="recipe-lines">
      ${lines
        .map(
          (line) => `
          <li>
            <span class="recipe-line-name">${esc(line.label)}</span>
            <span class="recipe-line-meta">${esc(fmtNum(line.grams))} g · ${esc(fmtKcal(line.kcal))} kcal</span>
          </li>`,
        )
        .join('')}
    </ul>`;
}

export function mountRecipe(root) {
  const form = root.querySelector('#recipe-form');
  if (!form) return () => {};
  const input = root.querySelector('#recipe-input');
  const out = root.querySelector('#recipe-out');
  let seq = 0;
  let controller = null;

  const onInput = () => {
    session.recipeInput = input.value;
  };
  input.addEventListener('input', onInput);

  const paint = (recipe) => {
    const servingsInput = root.querySelector('#recipe-servings');
    const error = root.querySelector('#recipe-save-error');
    const per = perServingMacros(recipe, parseNum(servingsInput.value));
    if (!per) {
      error.textContent = 'Enter how many servings the recipe makes.';
      root.querySelector('#recipe-save').disabled = true;
      return;
    }
    error.textContent = '';
    root.querySelector('#recipe-save').disabled = false;
    root.querySelector('#recipe-kcal').textContent = fmtKcal(per.kcal);
    root.querySelector('#recipe-protein').textContent = `${fmtNum(per.protein)} g`;
    root.querySelector('#recipe-carbs').textContent = `${fmtNum(per.carbs)} g`;
    root.querySelector('#recipe-fat').textContent = `${fmtNum(per.fat)} g`;
    recipe.servings = parseNum(servingsInput.value);
  };

  const bindPreview = (recipe) => {
    const servingsInput = root.querySelector('#recipe-servings');
    const save = root.querySelector('#recipe-save');
    if (!servingsInput || !save) return;
    servingsInput.addEventListener('input', () => paint(recipe));
    save.addEventListener('click', async () => {
      const error = root.querySelector('#recipe-save-error');
      const servings = parseNum(servingsInput.value);
      const per = perServingMacros(recipe, servings);
      if (!per) {
        error.textContent = 'Enter how many servings the recipe makes.';
        return;
      }
      save.disabled = true;
      try {
        await saveRecipeFood({
          name: recipe.name,
          servings,
          perServing: per,
          estimate: recipe.estimate,
          recipeUrl: recipe.recipeUrl,
        });
        session.addTab = 'mine';
        toast(`Saved ${recipe.name} to My foods`);
        requestRender();
      } catch (err) {
        error.textContent = 'Could not save that recipe.';
        save.disabled = false;
        console.error(err);
      }
    });
  };

  if (session.recipeView?.recipe) bindPreview(session.recipeView.recipe);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const my = ++seq;
    controller?.abort();
    controller = new AbortController();
    session.recipeInput = input.value;
    session.recipeView = null;
    out.innerHTML = '<p class="muted">Reading that recipe…</p>';
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const result = await importRecipe(input.value, {
        fetchPage: fetchRecipePage,
        lookupBarcode,
        searchCandidates: searchIngredientCandidates,
        isOnline: () => navigator.onLine,
        signal: controller.signal,
      });
      if (my !== seq) return;
      if (!result.ok) {
        session.recipeView = { error: result.message };
        out.innerHTML = errorHtml(result.message);
        out.querySelector('.notice')?.scrollIntoView({ block: 'nearest' });
        return;
      }
      session.recipeView = { recipe: result.recipe };
      out.innerHTML = previewHtml(result.recipe);
      bindPreview(result.recipe);
      out.querySelector('.recipe-preview')?.scrollIntoView({ block: 'nearest' });
    } finally {
      if (my === seq) button.disabled = false;
    }
  });

  return () => {
    seq += 1;
    controller?.abort();
    input.removeEventListener('input', onInput);
  };
}
