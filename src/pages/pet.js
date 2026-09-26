import { requestRender } from '../bus.js';
import { allEntries, ensurePet, ensureProfile, savePet } from '../db.js';
import { esc, fmtKcal, fmtNum, todayKey } from '../format.js';
import {
  cleanPetName,
  evaluatePet,
  PET_RULES,
  PET_STAGES,
  rulesCopy,
  stageIndex,
} from '../pet/rules.js';
import { spriteMarkup } from '../pet/sprite.js';
import { icon, toast } from '../ui.js';

const MOOD_LABEL = {
  hungry: 'Hungry',
  content: 'Content',
  happy: 'Happy',
};

export async function loadPetState() {
  const today = todayKey();
  const [profile, entries, pet] = await Promise.all([ensureProfile(), allEntries(), ensurePet()]);
  const progress = evaluatePet(entries, profile, today);
  const synced = await syncCelebrated(pet, progress.stage.id);
  const celebrate =
    Boolean(synced.name) && stageIndex(progress.stage.id) > stageIndex(synced.celebratedStage || 'egg');
  return { profile, pet: synced, progress, celebrate };
}

async function syncCelebrated(pet, stageId) {
  if (stageIndex(stageId) < stageIndex(pet.celebratedStage || 'egg')) {
    return savePet({ celebratedStage: stageId });
  }
  return pet;
}

function celebrateAttrs(state) {
  if (!state.celebrate || state.progress.stage.id === 'egg') return '';
  return ` data-celebrate-stage="${esc(state.progress.stage.id)}" data-celebrate-name="${esc(state.pet.name)}"`;
}

export async function petTodaySection() {
  const state = await loadPetState();
  return { attrs: celebrateAttrs(state), html: state.pet.name ? petChip(state) : namingCard(state) };
}

export function petChip(state) {
  const { pet, progress } = state;
  const { stage, next, ratio, remaining } = progress.progress;
  const mood = progress.mood;
  const nextLabel = next ? `${fmtKcal(remaining)} food to ${next.label}` : 'All grown up';
  const label = `${pet.name}, ${MOOD_LABEL[mood]}, ${stage.label}. ${fmtKcal(progress.totalPoints)} food. ${nextLabel}.`;
  return `
    <a class="pet-chip mood-${mood}" href="#/pet" aria-label="${esc(label)}">
      ${spriteMarkup(stage.id, mood, 3)}
      <span class="pet-chip-copy">
        <span class="pet-chip-name">${esc(pet.name)}</span>
        <span class="entry-meta">${MOOD_LABEL[mood]} · ${esc(stage.label)}</span>
        <span class="mini-track" aria-hidden="true"><span class="mini-fill" style="width:${(ratio * 100).toFixed(1)}%"></span></span>
        <span class="entry-meta">${esc(fmtKcal(progress.totalPoints))} food · ${esc(nextLabel)}</span>
      </span>
    </a>`;
}

function namingCard() {
  return `
    <section class="pet-name-card">
      <p class="eyebrow">A new egg</p>
      ${spriteMarkup('egg', 'hungry', 7)}
      <h2 class="pet-title">What should we call it?</h2>
      <p>Log meals and it will hatch, then grow. A tough day will not hurt it.</p>
      <form id="pet-name-form" class="stack-form">
        <label>
          <span>Name</span>
          <input name="name" maxlength="24" enterkeyhint="done" autocomplete="off" autocapitalize="words" placeholder="Mochi" />
        </label>
        <p id="pet-name-error" class="form-error" role="alert"></p>
        <button class="btn" type="submit">Name it</button>
      </form>
    </section>`;
}

export async function petHtml() {
  const state = await loadPetState();
  return `<div class="screen"${celebrateAttrs(state)}>${state.pet.name ? petDetail(state) : unnamedPet()}</div>`;
}

function unnamedPet() {
  return `
    <header class="top">
      <a class="back" href="#/today" aria-label="Back to today">${icon('back')}</a>
      <div>
        <p class="eyebrow">Pet</p>
        <h1>Name it</h1>
      </div>
    </header>
    ${namingCard()}`;
}

function petDetail(state) {
  const { pet, progress, profile } = state;
  const { stage, next, ratio, gained, span, remaining } = progress.progress;
  const mood = progress.mood;
  return `
    <header class="top">
      <a class="back" href="#/today" aria-label="Back to today">${icon('back')}</a>
      <div>
        <p class="eyebrow">${esc(stage.label)}</p>
        <h1>${esc(pet.name)}</h1>
      </div>
    </header>
    <section class="pet-hero mood-${mood}">
      ${spriteMarkup(stage.id, mood, 6)}
      <p class="pet-mood">${esc(moodLine(mood))}</p>
    </section>
    <section class="pet-panel">
      <div class="pet-progress-head">
        <h2>Growth</h2>
        <span>${esc(fmtKcal(progress.totalPoints))} food</span>
      </div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${next ? span : 1}" aria-valuenow="${next ? gained : 1}" aria-label="${esc(next ? `Progress to ${next.label}` : 'Fully grown')}">
        <div class="bar-fill pet" style="width:${(ratio * 100).toFixed(1)}%"></div>
      </div>
      <p class="pet-progress-note">${esc(next ? `${fmtKcal(remaining)} food to ${next.label}` : 'All grown up. It stays with you.')}</p>
      ${streakBlock(progress)}
    </section>
    <section class="pet-panel">
      <h2>Today</h2>
      <p class="pet-progress-note">${esc(todaySummary(progress))}</p>
      <ul class="pet-stats">
        ${statRow('Meals logged', `${progress.today.meals} food`, `${progress.today.slots} of 4 meals`)}
        ${statRow('Calorie window', calorieTitle(progress), calorieDetail(progress, profile))}
        ${statRow('Protein', proteinTitle(progress), proteinDetail(progress, profile))}
        ${statRow('Streak bonus', streakTitle(progress), streakDetail(progress))}
      </ul>
    </section>
    <form id="pet-name-form" class="stack-form pet-rename">
      <label>
        <span>Name</span>
        <input name="name" maxlength="24" enterkeyhint="done" autocomplete="off" autocapitalize="words" value="${esc(pet.name)}" />
      </label>
      <p id="pet-name-error" class="form-error" role="alert"></p>
      <button class="btn secondary" type="submit">Save name</button>
    </form>
    ${rulesBlock()}`;
}

function streakBlock(progress) {
  const pips = Array.from({ length: PET_RULES.streakCapDays }, (_, index) => {
    const on = index < Math.min(progress.streak, PET_RULES.streakCapDays);
    return `<span class="${on ? 'on' : ''}"></span>`;
  }).join('');
  let note = 'Log two days in a row to start the extra food.';
  if (progress.streakAtRisk) note = 'Nothing logged yet today. Log a meal to keep the streak.';
  else if (progress.streak >= 2) note = 'Each logged day adds a little extra, up to a week.';
  else if (progress.streak === 1) note = 'One day in. Log again tomorrow for streak food.';
  return `
    <div class="pet-streak">
      <div class="pet-progress-head">
        <h2>Streak</h2>
        <span>${progress.streak} ${progress.streak === 1 ? 'day' : 'days'}</span>
      </div>
      <div class="streak-pips" aria-hidden="true">${pips}</div>
      <p class="pet-progress-note">${esc(note)}</p>
    </div>`;
}

function todaySummary(progress) {
  const awarded = progress.today.awarded;
  const pending = progress.today.pendingOnTrack;
  if (!awarded && !pending) return 'Nothing counted yet today. Logging still earns food, even on a rough day.';
  if (pending) return `${fmtKcal(awarded)} food counted today. ${fmtKcal(pending)} more is on track when the day ends.`;
  return `${fmtKcal(awarded)} food counted today. Bonuses stay pending until the day ends.`;
}

function calorieTitle(progress) {
  const points = PET_RULES.calorieBonus;
  if (progress.today.calorie === 'in') return `${points} food on track`;
  return `${points} food pending`;
}

function calorieDetail(progress, profile) {
  const { low, high } = progress.today.window;
  const kcal = Math.round(progress.today.totals.kcal || 0);
  if (!high) return 'Set a calorie target in Settings to earn this.';
  const range = `${fmtKcal(low)}–${fmtKcal(high)} kcal`;
  if (progress.today.calorie === 'empty') return `End the day between ${range} for this bonus.`;
  if (progress.today.calorie === 'in') return `On track at ${fmtKcal(kcal)} kcal. It counts if you finish between ${range}.`;
  if (progress.today.calorie === 'over') return `${fmtKcal(kcal)} kcal is above the window. Meal points still count. Finish between ${range} for the bonus.`;
  return `${fmtKcal(kcal)} kcal so far. Finish between ${range} for the bonus.`;
}

function proteinTitle(progress) {
  const points = PET_RULES.proteinBonus;
  if (progress.today.protein === 'met') return `${points} food on track`;
  return `${points} food pending`;
}

function proteinDetail(progress, profile) {
  const goal = profile.proteinGoal;
  const protein = progress.today.totals.protein || 0;
  if (!progress.today.slots && progress.today.protein === 'empty') {
    return `Reach ${fmtNum(goal)} g for this bonus when the day ends.`;
  }
  if (progress.today.protein === 'met') return `${fmtNum(protein)} g is enough. It counts when the day ends.`;
  return `${fmtNum(protein)} of ${fmtNum(goal)} g. Reach the target by the end of the day.`;
}

function streakTitle(progress) {
  if (progress.today.streak > 0) return `${progress.today.streak} food pending`;
  if (progress.holdoverStreakBonus > 0) return `${progress.holdoverStreakBonus} food if you log`;
  return 'Not yet';
}

function streakDetail(progress) {
  if (progress.today.streak > 0) return 'This extra counts when the day ends, as long as today stays logged.';
  if (progress.holdoverStreakBonus > 0) return 'Log a meal today to keep the streak and earn this when the day ends.';
  if (progress.streak === 1) return 'The extra food starts on the second logged day in a row.';
  return 'Log something today. The extra starts when you do it again tomorrow.';
}

function statRow(label, strong, detail) {
  return `<li><span>${esc(label)}</span><strong>${esc(strong)}</strong><small>${esc(detail)}</small></li>`;
}

function moodLine(mood) {
  if (mood === 'hungry') return 'Hungry. Nothing is logged yet today.';
  if (mood === 'happy') return 'Happy. Today is in a good spot.';
  return 'Content. Meals are in, and the day is still open.';
}

function rulesBlock() {
  const copy = rulesCopy();
  const points = Object.fromEntries(PET_STAGES.map((stage) => [stage.id, fmtKcal(stage.minPoints)]));
  return `
    <section class="pet-panel">
      <h2>How to earn food</h2>
      <ul class="pet-rules">
        ${copy.bullets.map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
      ${copy.notes.map((line) => `<p>${esc(line)}</p>`).join('')}
      <p>It starts as an egg. Baby at ${esc(points.baby)} food, kid at ${esc(points.kid)}, teen at ${esc(points.teen)}, and adult at ${esc(points.adult)}.</p>
    </section>`;
}

export function petPreviewHtml() {
  return `
    <div class="screen">
      <header class="top">
        <a class="back" href="#/today" aria-label="Back to today">${icon('back')}</a>
        <div>
          <p class="eyebrow">Pet</p>
          <h1>Stages</h1>
        </div>
      </header>
      <p class="lede">One creature, five stages. Each one is bigger than the last.</p>
      <div class="stage-line">
        ${PET_STAGES.map(
          (stage) => `
          <figure class="stage-figure">
            ${spriteMarkup(stage.id, 'content', 3)}
            <figcaption>${esc(stage.label)}</figcaption>
          </figure>`,
        ).join('')}
      </div>
    </div>`;
}

const CELEBRATE = {
  baby: {
    title: (name) => `${name} hatched!`,
    text: 'The shell cracked. Keep logging meals and it will grow.',
  },
  kid: {
    title: (name) => `${name} is a kid now!`,
    text: 'A little bigger, and still happy to see an honest log.',
  },
  teen: {
    title: (name) => `${name} is a teen now!`,
    text: 'The last stage takes a few more weeks of steady days.',
  },
  adult: {
    title: (name) => `${name} is all grown up!`,
    text: 'Fully grown. It stays with you, and it still likes to see meals logged.',
  },
};

let celebrateToken = 0;

export function mountPetInteractions(root) {
  const cleanups = [];
  const form = root.querySelector('#pet-name-form');
  if (form) {
    const onSubmit = async (event) => {
      event.preventDefault();
      const error = form.querySelector('#pet-name-error');
      const button = form.querySelector('button[type="submit"]');
      const parsed = cleanPetName(new FormData(form).get('name'));
      if (parsed.error) {
        error.textContent = parsed.error;
        return;
      }
      error.textContent = '';
      button.disabled = true;
      try {
        await savePet({ name: parsed.name });
        toast('Name saved');
        requestRender();
      } catch (err) {
        button.disabled = false;
        error.textContent = err?.message || 'Could not save the name.';
      }
    };
    form.addEventListener('submit', onSubmit);
    cleanups.push(() => form.removeEventListener('submit', onSubmit));
  }
  cleanups.push(mountCelebration(root));
  return () => {
    for (const fn of cleanups) fn();
  };
}

function mountCelebration(root) {
  const screen = root.querySelector('.screen');
  const stage = screen?.dataset.celebrateStage;
  const name = screen?.dataset.celebrateName;
  const copy = CELEBRATE[stage];
  if (!copy || !name) return () => {};
  const modal = document.getElementById('modal');
  if (!modal) return () => {};
  const token = ++celebrateToken;
  modal.hidden = false;
  modal.dataset.petCelebrate = String(token);
  const bits = Array.from({ length: 10 }, (_, index) => `<i style="--i:${index}"></i>`).join('');
  modal.innerHTML = `
    <div class="backdrop">
      <div class="sheet celebrate" role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
        <div class="confetti" aria-hidden="true">${bits}</div>
        ${spriteMarkup(stage, 'happy', 5)}
        <h2 id="celebrate-title">${esc(copy.title(name))}</h2>
        <p>${esc(copy.text)}</p>
        <button type="button" class="btn" data-celebrate-ok>Nice</button>
      </div>
    </div>`;
  const button = modal.querySelector('[data-celebrate-ok]');
  button.focus();
  const close = () => {
    if (modal.dataset.petCelebrate !== String(token)) return;
    modal.hidden = true;
    modal.innerHTML = '';
    delete modal.dataset.petCelebrate;
  };
  const onOk = async () => {
    button.disabled = true;
    try {
      await savePet({ celebratedStage: stage });
    } catch {
      button.disabled = false;
      return;
    }
    close();
    requestRender();
  };
  button.addEventListener('click', onOk);
  return () => {
    button.removeEventListener('click', onOk);
    if (token === celebrateToken) close();
  };
}
