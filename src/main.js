import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/crimson-pro/400.css';
import '@fontsource/crimson-pro/500.css';
import '@fontsource/crimson-pro/600.css';
import { registerSW } from 'virtual:pwa-register';
import { quickAddFood, resolveBarcode, saveManualAsCustomFood, saveManualPortion, undoQuickAdd } from './actions.js';
import { setRenderer } from './bus.js';
import { draftFromCustomEntry, draftFromCustomFood } from './custom-food.js';
import { deleteEntry, ensureProfile, getCustomFood, getEntry, getFood } from './db.js';
import { draftFromEntry, draftFromFood } from './food.js';
import { dayTitle, esc, fmtNum, todayKey } from './format.js';
import { mealForNow, mealLabel } from './meals.js';
import { mountAdd, addHtml, missingBarcodeHtml } from './pages/add.js';
import { dayHtml, historyHtml } from './pages/history.js';
import { customLogHtml, mountCustomLog, mountMyFoodForm, myFoodFormHtml } from './pages/my-food.js';
import { mountPortion, portionHtml } from './pages/portion.js';
import { mountSettings, settingsHtml } from './pages/settings.js';
import { applyCardArt } from './card-art.js';
import { badgesHtml } from './pages/badges.js';
import { todayHtml } from './pages/today.js';
import { mountWorkout, workoutHtml } from './pages/workout.js';
import { session } from './session.js';
import { confirmSheet, relicScreen, tabs, toast } from './ui.js';
import './styles.css';

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let cleanup = () => {};
let renderToken = 0;

const TITLES = {
  today: 'Today',
  add: 'Add food',
  workout: 'The Climber',
  badges: 'Badges',
  history: 'History',
  settings: 'Settings',
  portion: 'Portion',
  day: 'Day',
  entry: 'Edit entry',
  'my-food': 'My food',
  'log-food': 'Log food',
};

function goToDate(date) {
  if (!date || date === todayKey()) location.hash = '#/today';
  else location.hash = `#/day/${date}`;
}

async function render() {
  const token = ++renderToken;
  try {
    cleanup();
  } catch {
    /* ignore cleanup errors */
  }
  cleanup = () => {};
  const route = parseRoute(location.hash);
  document.title = `${TITLES[route.name] || 'Calories'} · Calorie Tracker`;
  tabbar.innerHTML = tabs(route.tab);
  tabbar.hidden = false;
  await applyCardArt();
  const html = await route.html();
  if (token !== renderToken) return;
  view.innerHTML = html;
  if (route.mount) {
    const stop = await route.mount(view);
    if (token !== renderToken) {
      if (typeof stop === 'function') stop();
      return;
    }
    if (typeof stop === 'function') cleanup = stop;
  }
  view.scrollTo(0, 0);
  window.scrollTo(0, 0);
}

function parseRoute(hash) {
  const path = hash || '#/today';
  if (path === '#' || path === '#/' || path === '#/today') {
    session.logDate = null;
    return { name: 'today', tab: 'today', html: todayHtml };
  }
  if (path === '#/add') {
    return { name: 'add', tab: 'add', html: addHtml, mount: (root) => mountAdd(root, addHandlers) };
  }
  if (path === '#/portion') {
    return {
      name: 'portion',
      tab: 'add',
      html: async () => {
        if (!session.draft) {
          return relicScreen({
            kicker: 'Portion',
            title: 'Choose a food',
            body: `<p class="lede">Pick something to log first.</p><a class="btn" href="#/add">Add food</a>`,
          });
        }
        return portionHtml(session.draft);
      },
      mount: (root) => {
        if (!session.draft) return () => {};
        return mountPortion(root, session.draft, (date) => {
          session.draft = null;
          goToDate(date);
        });
      },
    };
  }
  if (path === '#/my-food/new') {
    return {
      name: 'my-food',
      tab: 'add',
      html: () => myFoodFormHtml(null),
      mount: (root) => mountMyFoodForm(root, null),
    };
  }
  const editFood = path.match(/^#\/my-food\/([^/]+)$/);
  if (editFood) {
    const id = decodeURIComponent(editFood[1]);
    return {
      name: 'my-food',
      tab: 'add',
      html: async () => {
        const food = await getCustomFood(id);
        if (!food) return missingFoodHtml();
        return myFoodFormHtml(food);
      },
      mount: async (root) => {
        const food = await getCustomFood(id);
        if (!food || !root.querySelector('#my-food-form')) return () => {};
        return mountMyFoodForm(root, food);
      },
    };
  }
  const logFood = path.match(/^#\/log-food\/([^/]+)$/);
  if (logFood) {
    const id = decodeURIComponent(logFood[1]);
    return {
      name: 'log-food',
      tab: 'add',
      html: async () => {
        const food = await getCustomFood(id);
        if (!food) return missingFoodHtml();
        return customLogHtml(draftFromCustomFood(food));
      },
      mount: async (root) => {
        const food = await getCustomFood(id);
        if (!food || !root.querySelector('#custom-log-form')) return () => {};
        return mountCustomLog(root, draftFromCustomFood(food), (date) => goToDate(date));
      },
    };
  }
  if (path === '#/history') {
    return { name: 'history', tab: 'history', html: historyHtml };
  }
  if (path === '#/badges') {
    return { name: 'badges', tab: 'badges', html: badgesHtml };
  }
  if (path === '#/workout') {
    return { name: 'workout', tab: 'workout', html: workoutHtml, mount: mountWorkout };
  }
  const day = path.match(/^#\/day\/(\d{4}-\d{2}-\d{2})$/);
  if (day) {
    const date = day[1];
    return { name: 'day', tab: 'history', html: () => dayHtml(date) };
  }
  const food = path.match(/^#\/food\/([^/]+)$/);
  if (food) {
    const id = decodeURIComponent(food[1]);
    return {
      name: 'portion',
      tab: 'add',
      html: async () => {
        const record = await getFood(id);
        if (!record) {
          return relicScreen({
            kicker: 'Food',
            title: 'Not found',
            art: 'cliff',
            body: `<p class="lede">That food isn’t on this phone anymore.</p><a class="btn" href="#/add">Back</a>`,
          });
        }
        session.draft = draftFromFood(record, {
          grams: record.lastGrams || record.servingGrams || 100,
          meal: record.lastMeal || mealForNow(),
        });
        return portionHtml(session.draft);
      },
      mount: (root) => {
        if (!root.querySelector('#portion-form') || !session.draft) return () => {};
        return mountPortion(root, session.draft, (date) => goToDate(date));
      },
    };
  }
  const entry = path.match(/^#\/entry\/([^/]+)$/);
  if (entry) {
    const id = decodeURIComponent(entry[1]);
    return {
      name: 'entry',
      tab: 'today',
      html: async () => {
        const record = await getEntry(id);
        if (!record) {
          return relicScreen({
            kicker: 'Log',
            title: 'Entry not found',
            body: `<a class="btn" href="#/today">Back to today</a>`,
          });
        }
        if (isCustomEntry(record)) return customLogHtml(draftFromCustomEntry(record));
        session.draft = draftFromEntry(record);
        return portionHtml(session.draft);
      },
      mount: async (root) => {
        const record = await getEntry(id);
        if (!record) return () => {};
        tabbar.innerHTML = tabs(record.date === todayKey() ? 'today' : 'history');
        if (isCustomEntry(record)) {
          return mountCustomLog(root, draftFromCustomEntry(record), (date) => goToDate(date));
        }
        const draft = draftFromEntry(record);
        session.draft = draft;
        return mountPortion(root, draft, (date) => {
          session.draft = null;
          goToDate(date);
        });
      },
    };
  }
  if (path === '#/settings') {
    return { name: 'settings', tab: 'settings', html: settingsHtml, mount: mountSettings };
  }
  return { name: 'today', tab: 'today', html: todayHtml };
}

const addHandlers = {
  pickResult(index) {
    const food = session.results[index];
    if (!food) return;
    if (food.kcalPer100g == null) {
      session.manual = {
        name: food.name,
        barcode: food.barcode,
        brand: food.brand,
        note: `${food.name} has no calorie data in Open Food Facts. Enter the numbers from the package.`,
      };
      session.addTab = 'manual';
      void render();
      return;
    }
    session.draft = draftFromFood(food);
    location.hash = '#/portion';
  },
  async onBarcode(raw, setStatus, extra) {
    setStatus('Looking up that barcode…');
    if (extra) extra.innerHTML = '';
    const result = await resolveBarcode(raw);
    if (result.status === 'found' || result.status === 'local' || result.status === 'offline-local') {
      setStatus('');
      return;
    }
    if (result.status === 'incomplete') {
      void render();
      return;
    }
    if (result.status === 'missing') {
      setStatus('');
      session.manual = { barcode: result.code, note: '' };
      if (extra) extra.innerHTML = missingBarcodeHtml(result.code);
      return;
    }
    if (result.status === 'invalid') {
      setStatus('Enter an 8 to 14 digit barcode.');
      return;
    }
    const offline = !navigator.onLine;
    setStatus(offline ? 'You are offline, so this barcode can’t be looked up. My foods, recent foods, and manual entry still work.' : 'Open Food Facts didn’t respond. Try again, or enter the food yourself.');
  },
  async onManual(form) {
    const error = form.querySelector('#manual-error');
    const name = form.name.value.trim();
    const grams = Number(String(form.grams.value).trim().replace(',', '.'));
    const kcal = Number(String(form.kcal.value).trim().replace(',', '.') || '0');
    const protein = Number(String(form.protein.value).trim().replace(',', '.') || '0');
    const carbs = Number(String(form.carbs.value).trim().replace(',', '.') || '0');
    const fat = Number(String(form.fat.value).trim().replace(',', '.') || '0');
    if (!name) {
      error.textContent = 'Give the food a name.';
      return;
    }
    if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) {
      error.textContent = 'Enter an amount between 0 and 5,000 grams.';
      return;
    }
    for (const [value, label] of [
      [kcal, 'calories'],
      [protein, 'protein'],
      [carbs, 'carbs'],
      [fat, 'fat'],
    ]) {
      if (!Number.isFinite(value) || value < 0 || value > 20000) {
        error.textContent = `Enter a ${label} value that is 0 or more.`;
        return;
      }
    }
    error.textContent = '';
    const meal = form.meal.value || mealForNow();
    const saveFood = Boolean(form.saveFood?.checked);
    try {
      if (saveFood) {
        await saveManualAsCustomFood({ name, grams, kcal, protein, carbs, fat });
      }
      const entry = await saveManualPortion({
        name,
        grams,
        kcal,
        protein,
        carbs,
        fat,
        meal,
        barcode: session.manual?.barcode || null,
        brand: session.manual?.brand || '',
      });
      session.manual = null;
      toast(saveFood ? `Added ${name} and saved it to My foods` : `Added ${name}`);
      goToDate(entry.date);
    } catch (err) {
      error.textContent = 'Could not save that. Try again.';
      console.error(err);
    }
  },
};

function missingFoodHtml() {
  return relicScreen({
    kicker: 'My foods',
    title: 'Food not found',
    art: 'cliff',
    body: `<p class="lede">It isn’t in My foods on this phone.</p><a class="btn" href="#/add">Back</a>`,
  });
}

function isCustomEntry(entry) {
  return Boolean(entry.logUnit && entry.servingUnit && entry.servingQty);
}

document.getElementById('app').addEventListener('change', (event) => {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.id === 'jump-date' && input.value) {
    location.hash = `#/day/${input.value}`;
  }
});

document.getElementById('app').addEventListener('click', (event) => {
  const link = event.target.closest('a[href="#/add"]');
  if (link) {
    if (link.dataset.date) {
      session.logDate = link.dataset.date === todayKey() ? null : link.dataset.date;
    } else if (!link.hasAttribute('data-keep-date')) {
      session.logDate = null;
    }
  }
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === 'switch-tab') {
    session.addTab = actionEl.dataset.tab;
    if (session.addTab !== 'manual') session.scanMessage = null;
    void render();
    return;
  }
  if (action === 'use-today') {
    session.logDate = null;
    void render();
    return;
  }
  if (action === 'go-manual') {
    const barcode = actionEl.dataset.barcode || session.manual?.barcode || null;
    const name = session.searchQuery.trim();
    session.manual = {
      ...(session.manual || {}),
      barcode,
      name: session.manual?.name || (barcode ? '' : name),
      note: barcode
        ? `Barcode ${barcode} wasn’t found. Enter the name and nutrition from the package.`
        : session.manual?.note || '',
    };
    session.addTab = 'manual';
    void render();
    return;
  }
  if (action === 'pick-result') {
    addHandlers.pickResult(Number(actionEl.dataset.index));
    return;
  }
  if (action === 'quick-add') {
    event.preventDefault();
    void onQuickAdd(actionEl.dataset.id);
    return;
  }
  if (action === 'delete-entry') {
    event.preventDefault();
    void onDelete(actionEl.dataset.id, actionEl.dataset.name);
  }
});

async function onQuickAdd(id) {
  const food = await getFood(id);
  if (!food) return;
  const { entry, grams, meal, date } = await quickAddFood(food);
  const when = date === todayKey() ? mealLabel(meal) : `${mealLabel(meal)} · ${dayTitle(date)}`;
  toast(`Added ${food.name} · ${fmtNum(grams)} g to ${when}`, {
    label: 'Undo',
    onClick: () => undoQuickAdd(entry),
  });
  void render();
}

async function onDelete(id, name) {
  const ok = await confirmSheet({
    title: 'Delete this entry?',
    text: name ? `${name} will be removed from the day.` : 'This entry will be removed.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  await deleteEntry(id);
  toast('Entry deleted');
  void render();
}

function syncOffline() {
  document.getElementById('offline').hidden = navigator.onLine;
}

window.addEventListener('hashchange', () => {
  void render();
});
window.addEventListener('online', syncOffline);
window.addEventListener('offline', syncOffline);

setRenderer(() => {
  void render();
});

ensureProfile()
  .then(() => {
    syncOffline();
    if (!location.hash) location.replace('#/today');
    else void render();
  })
  .catch((error) => {
    view.innerHTML = relicScreen({
      kicker: 'Log',
      title: 'Couldn’t open your log',
      body: `<p class="lede">${esc(error.message || 'Storage is unavailable in this browser.')}</p>`,
    });
    tabbar.hidden = true;
  });
