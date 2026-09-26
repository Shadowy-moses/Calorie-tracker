import { matchCustomFoods } from '../custom-food.js';
import { customFoodsForProfile, foodsForProfile } from '../db.js';
import { dayTitle, esc, fmtKcal, fmtNum, todayKey } from '../format.js';
import { sortFrequent } from '../food.js';
import { mealLabel, MEALS, mealForNow } from '../meals.js';
import { macrosForGrams } from '../nutrition.js';
import { searchFoods } from '../off.js';
import { activeDate, session } from '../session.js';
import { cameraErrorMessage, startScanner } from '../scanner.js';
import { icon } from '../ui.js';
import { customResultCards, myFoodsPanel } from './my-food.js';

export async function addHtml() {
  const [logged, saved] = await Promise.all([foodsForProfile(), customFoodsForProfile()]);
  const foods = sortFrequent(logged).slice(0, 12);
  const tab = session.addTab || 'search';
  return `
    <div class="screen">
      <header class="top">
        <div>
          <p class="eyebrow">Open Food Facts</p>
          <h1>Add food</h1>
        </div>
      </header>
      ${logBanner()}
      <div class="tabs" role="tablist" aria-label="How to add food">
        ${tabButton('search', 'Search', tab)}
        ${tabButton('scan', 'Scan', tab)}
        ${tabButton('mine', 'My foods', tab)}
        ${tabButton('manual', 'Manual', tab)}
      </div>
      ${tab === 'search' ? searchPanel(foods) : ''}
      ${tab === 'scan' ? scanPanel() : ''}
      ${tab === 'mine' ? myFoodsPanel(saved) : ''}
      ${tab === 'manual' ? manualPanel() : ''}
    </div>`;
}

function tabButton(id, label, current) {
  const on = id === current;
  return `<button type="button" class="tab-btn${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-action="switch-tab" data-tab="${id}">${label}</button>`;
}

function logBanner() {
  const date = activeDate(todayKey());
  if (date === todayKey()) return '';
  return `<div class="banner"><span>Logging for ${esc(dayTitle(date))}</span><button type="button" data-action="use-today">Use today</button></div>`;
}

function searchPanel(foods) {
  return `
    <form id="search-form" class="search-form" role="search">
      <label class="search-label" for="food-search">Search foods</label>
      <input id="food-search" name="q" type="search" enterkeyhint="search" placeholder="Oats, yogurt, nutella…" value="${esc(session.searchQuery)}" autocomplete="off" />
    </form>
    <div id="results" aria-live="polite">
      ${session.searchQuery.trim().length >= 2 ? '<p class="muted pad">Searching…</p>' : recentBlock(foods)}
    </div>`;
}

function recentBlock(foods) {
  if (!foods.length) {
    return `<section class="empty compact"><h2>Recent foods</h2><p>Foods you add will wait here for one-tap logging. To reuse your own numbers, save them under My foods.</p></section>`;
  }
  return `
    <section class="recent">
      <h2>Recent</h2>
      <div class="entry-list">
        ${foods.map(recentRow).join('')}
      </div>
    </section>`;
}

function recentRow(food) {
  const grams = food.lastGrams || food.servingGrams || 100;
  const kcal = macrosForGrams(food, grams).kcal;
  const meal = mealLabel(food.lastMeal || mealForNow());
  return `
    <article class="entry">
      <button type="button" class="entry-main" data-action="quick-add" data-id="${esc(food.id)}">
        <span class="entry-name">${esc(food.name)}</span>
        <span class="entry-meta">${food.brand ? `${esc(food.brand)} · ` : ''}Tap to add ${esc(fmtNum(grams))} g · ${esc(fmtKcal(kcal))} kcal · ${esc(meal)}</span>
      </button>
      <a class="icon-btn" href="#/food/${esc(food.id)}" aria-label="Choose amount for ${esc(food.name)}">${icon('tune')}</a>
    </article>`;
}

function scanPanel() {
  return `
    <section class="scan">
      <p class="lede">Point the camera at a barcode. On iPhone, scanning uses a fallback reader when the browser has no built-in detector. The picture stays on your phone — only the number is looked up.</p>
      <div class="finder" id="finder" hidden>
        <video id="scan-video" playsinline muted autoplay></video>
        <div class="finder-frame" aria-hidden="true"></div>
      </div>
      <div class="scan-actions">
        <button type="button" class="btn" id="start-scan">Start camera</button>
        <button type="button" class="btn secondary" id="stop-scan" hidden>Stop camera</button>
      </div>
      <p id="scan-status" class="scan-status" role="status">${esc(session.scanMessage || '')}</p>
      <form id="barcode-form" class="stack-form tight">
        <label>
          <span>Or type a barcode</span>
          <input id="barcode-input" name="barcode" inputmode="numeric" autocomplete="off" placeholder="3017620422003" />
        </label>
        <button class="btn secondary" type="submit">Look up barcode</button>
      </form>
      <div id="scan-extra"></div>
    </section>`;
}

function manualPanel() {
  const manual = session.manual || {};
  const meal = mealForNow();
  return `
    <form id="manual-form" class="stack-form">
      ${manual.note ? `<p class="notice">${esc(manual.note)}</p>` : '<p class="lede">Enter the numbers for the amount you ate. To use it again later, save it to My foods.</p>'}
      <label>
        <span>Name</span>
        <input name="name" required maxlength="80" value="${esc(manual.name || '')}" placeholder="Chicken and rice" />
      </label>
      <label>
        <span>Amount (grams)</span>
        <input name="grams" inputmode="decimal" value="${esc(manual.grams || '100')}" />
      </label>
      <div class="grid-2">
        <label><span>Calories</span><input name="kcal" inputmode="decimal" value="${esc(manual.kcal || '')}" placeholder="0" /></label>
        <label><span>Protein (g)</span><input name="protein" inputmode="decimal" value="${esc(manual.protein || '')}" placeholder="0" /></label>
        <label><span>Carbs (g)</span><input name="carbs" inputmode="decimal" value="${esc(manual.carbs || '')}" placeholder="0" /></label>
        <label><span>Fat (g)</span><input name="fat" inputmode="decimal" value="${esc(manual.fat || '')}" placeholder="0" /></label>
      </div>
      <fieldset class="meal-picker">
        <legend>Meal</legend>
        <div class="meal-options">
          ${MEALS.map((item) => `<label class="meal-chip"><input type="radio" name="meal" value="${item.id}" ${item.id === meal ? 'checked' : ''} /><span>${item.label}</span></label>`).join('')}
        </div>
      </fieldset>
      <label class="save-toggle">
        <input type="checkbox" name="saveFood" />
        <span>Save to My foods so I can use it again</span>
      </label>
      <p id="manual-error" class="form-error" role="alert"></p>
      <button class="btn" type="submit">Add to log</button>
    </form>`;
}

export function searchResultsHtml(customFoods, offFoods, { searching = false, error = null } = {}) {
  const mine = customResultCards(customFoods);
  const query = session.searchQuery.trim();
  if (searching) {
    return `${mine}<p class="muted pad">Searching…</p>`;
  }
  if (error) {
    const offline = !navigator.onLine;
    return `${mine}<section class="empty compact"><h2>${offline ? 'You are offline' : 'Search didn’t go through'}</h2><p>${offline ? 'My foods, recent foods, and manual entry still work.' : 'Open Food Facts didn’t respond. Try again, or enter the food yourself.'}</p><button type="button" class="btn" data-action="go-manual">Enter it manually</button></section>`;
  }
  if (!offFoods.length && !customFoods.length) {
    return `<section class="empty compact"><h2>No foods found</h2><p>Nothing in My foods or Open Food Facts matched “${esc(query)}”.</p><button type="button" class="btn" data-action="go-manual">Enter it manually</button></section>`;
  }
  if (!offFoods.length) {
    return `${mine}<p class="muted pad">Nothing else in Open Food Facts matched “${esc(query)}”.</p>`;
  }
  return `${mine}${resultCards(offFoods)}`;
}

export function resultCards(foods) {
  return `
    <div class="entry-list results">
      ${foods
        .map(
          (food, index) => `
          <button type="button" class="result" data-action="pick-result" data-index="${index}">
            ${food.image ? `<img src="${esc(food.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />` : '<span class="thumb" aria-hidden="true"></span>'}
            <span class="result-copy">
              <span class="entry-name">${esc(food.name)}</span>
              <span class="entry-meta">${food.brand ? `${esc(food.brand)} · ` : ''}${esc(fmtKcal(food.kcalPer100g))} kcal / 100 g · P ${esc(fmtNum(food.proteinPer100g))} · C ${esc(fmtNum(food.carbsPer100g))} · F ${esc(fmtNum(food.fatPer100g))}</span>
            </span>
          </button>`,
        )
        .join('')}
    </div>`;
}

export function mountAdd(root, handlers) {
  let stopScan = () => {};
  let timer = 0;
  let seq = 0;
  const cleanups = [];

  const input = root.querySelector('#food-search');
  const searchForm = root.querySelector('#search-form');
  if (input) {
    const run = async () => {
      const query = input.value.trim();
      session.searchQuery = input.value;
      const my = ++seq;
      const results = root.querySelector('#results');
      window.clearTimeout(timer);
      if (query.length < 2) {
        session.results = [];
        session.customMatches = [];
        const foods = sortFrequent(await foodsForProfile()).slice(0, 12);
        if (my !== seq) return;
        results.innerHTML = recentBlock(foods);
        return;
      }
      session.results = [];
      timer = window.setTimeout(async () => {
        if (my !== seq) return;
        const saved = await customFoodsForProfile();
        if (my !== seq) return;
        const matched = matchCustomFoods(saved, query);
        session.customMatches = matched;
        results.innerHTML = searchResultsHtml(matched, [], { searching: true });
        try {
          const foods = await searchFoods(query);
          if (my !== seq) return;
          session.results = foods;
          results.innerHTML = searchResultsHtml(matched, foods);
        } catch (error) {
          if (my !== seq) return;
          session.results = [];
          results.innerHTML = searchResultsHtml(matched, [], { error });
          console.error(error);
        }
      }, 320);
    };
    input.addEventListener('input', run);
    cleanups.push(() => input.removeEventListener('input', run));
    if (session.searchQuery.trim().length >= 2) void run();
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const saved = session.customMatches?.[0];
      if (saved) {
        location.hash = `#/log-food/${saved.id}`;
        return;
      }
      if (session.results?.[0]) handlers.pickResult(0);
    });
  }

  const startBtn = root.querySelector('#start-scan');
  const stopBtn = root.querySelector('#stop-scan');
  const finder = root.querySelector('#finder');
  const video = root.querySelector('#scan-video');
  const status = root.querySelector('#scan-status');
  if (startBtn && video) {
    const setStatus = (message) => {
      session.scanMessage = message || '';
      if (status) status.textContent = message || '';
    };
    const halt = () => {
      stopScan();
      stopScan = () => {};
      finder.hidden = true;
      stopBtn.hidden = true;
      startBtn.hidden = false;
    };
    startBtn.addEventListener('click', async () => {
      setStatus('');
      root.querySelector('#scan-extra').innerHTML = '';
      startBtn.disabled = true;
      finder.hidden = false;
      try {
        const handle = await startScanner(video, (raw) => {
          halt();
          void handlers.onBarcode(raw, setStatus, root.querySelector('#scan-extra'));
        });
        stopScan = () => handle.stop();
        stopBtn.hidden = false;
        startBtn.hidden = true;
        setStatus(handle.backend === 'native' ? 'Looking for a barcode…' : 'Looking for a barcode…');
      } catch (error) {
        finder.hidden = true;
        setStatus(cameraErrorMessage(error));
      } finally {
        startBtn.disabled = false;
      }
    });
    stopBtn.addEventListener('click', () => {
      halt();
      setStatus('');
    });
    const onHide = () => {
      if (document.hidden) halt();
    };
    document.addEventListener('visibilitychange', onHide);
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', onHide);
      halt();
    });
  }

  const barcodeForm = root.querySelector('#barcode-form');
  barcodeForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const raw = root.querySelector('#barcode-input').value;
    const statusEl = root.querySelector('#scan-status');
    void handlers.onBarcode(raw, (message) => {
      session.scanMessage = message || '';
      statusEl.textContent = message || '';
    }, root.querySelector('#scan-extra'));
  });

  const manualForm = root.querySelector('#manual-form');
  manualForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    handlers.onManual(manualForm);
  });

  return () => {
    window.clearTimeout(timer);
    seq += 1;
    cleanups.forEach((fn) => fn());
  };
}

export function missingBarcodeHtml(code) {
  return `<section class="notice-card"><h2>No product for ${esc(code)}</h2><p>Open Food Facts doesn’t have this barcode. You can type the nutrition from the package.</p><button type="button" class="btn" data-action="go-manual" data-barcode="${esc(code)}">Enter it manually</button></section>`;
}
