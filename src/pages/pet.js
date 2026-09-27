import { requestRender } from '../bus.js';
import { allEntries, ensurePet, ensureProfile, putPet, savePet } from '../db.js';
import { esc, fmtKcal, fmtNum, prettyDate, todayKey } from '../format.js';
import { creatureSvg } from '../pet/creatures.js';
import {
  acceptChoice,
  collectionRows,
  normalizePet,
  petRecord,
  ROSTER,
  speciesById,
  withOffers,
} from '../pet/roster.js';
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
  const [profile, entries, stored] = await Promise.all([ensureProfile(), allEntries(), ensurePet()]);
  let pet = normalizePet(stored, profile.id);
  let progress;
  let changed = false;
  if (pet.current) {
    progress = evaluatePet(entries, profile, today, { since: pet.current.chosenAt || 0 });
    const stageId = progress.stage.id;
    if (stageIndex(stageId) < stageIndex(pet.current.celebratedStage || 'egg')) {
      pet = { ...pet, current: { ...pet.current, celebratedStage: stageId } };
      changed = true;
    }
    const offered = withOffers(pet, { stageId });
    pet = offered.pet;
    changed = changed || offered.changed;
  } else {
    progress = evaluatePet([], profile, today);
    const offered = withOffers(pet, { stageId: 'egg' });
    pet = offered.pet;
    changed = offered.changed;
  }
  if (changed) await putPet(petRecord({ ...pet, updatedAt: Date.now() }));
  const celebrate =
    Boolean(pet.current?.name) &&
    stageIndex(progress.stage.id) > stageIndex(pet.current.celebratedStage || 'egg');
  return { profile, pet, progress, celebrate };
}

function celebrateAttrs(state) {
  if (!state.celebrate || !state.pet.current || state.progress.stage.id === 'egg') return '';
  const next = state.progress.stage.id === 'adult' && state.pet.nextOffer?.length ? '1' : '0';
  return ` data-celebrate-stage="${esc(state.progress.stage.id)}" data-celebrate-name="${esc(state.pet.current.name)}" data-celebrate-species="${esc(state.pet.current.speciesId)}" data-celebrate-next="${next}"`;
}

export async function petTodaySection() {
  const state = await loadPetState();
  if (!state.pet.current) return { attrs: '', html: choiceStack(state, { embedded: true }) };
  if (!state.pet.current.name) return { attrs: '', html: namingCard(state) };
  const banner = state.pet.current.adultAt && state.pet.nextOffer?.length ? nextBanner(state) : '';
  const collection = collectionRows(state.pet).length
    ? '<p class="collection-jump"><a href="#/pet/collection">Collection</a></p>'
    : '';
  return { attrs: celebrateAttrs(state), html: `${banner}${petChip(state)}${collection}` };
}

function nextBanner(state) {
  const count = state.pet.nextOffer.length;
  const word = count === 1 ? 'one new friend' : `${count} new friends`;
  return `<a class="next-banner" href="#/pet/choose">${esc(state.pet.current.name)} is all grown up. Meet ${esc(word)}.</a>`;
}

export function petChip(state) {
  const { pet, progress } = state;
  const species = speciesById(pet.current.speciesId);
  const { stage, next, ratio, remaining } = progress.progress;
  const mood = progress.mood;
  const nextLabel = next ? `${fmtKcal(remaining)} food to ${next.label}` : 'All grown up';
  const label = `${pet.current.name}, ${species?.name || ''}, ${MOOD_LABEL[mood]}, ${stage.label}. ${fmtKcal(progress.totalPoints)} food. ${nextLabel}.`;
  return `
    <a class="pet-chip mood-${mood}" href="#/pet" aria-label="${esc(label)}">
      ${spriteMarkup(pet.current.speciesId, stage.id, mood, 96)}
      <span class="pet-chip-copy">
        <span class="pet-chip-name">${esc(pet.current.name)}</span>
        <span class="entry-meta">${esc(species?.name || '')} · ${MOOD_LABEL[mood]} · ${esc(stage.label)}</span>
        <span class="mini-track" aria-hidden="true"><span class="mini-fill" style="width:${(ratio * 100).toFixed(1)}%"></span></span>
        <span class="entry-meta">${esc(fmtKcal(progress.totalPoints))} food · ${esc(nextLabel)}</span>
      </span>
    </a>`;
}

function namingCard(state) {
  const species = speciesById(state.pet.current.speciesId);
  return `
    <section class="pet-name-card">
      <p class="eyebrow">${esc(species?.name || 'A new friend')}</p>
      ${spriteMarkup(state.pet.current.speciesId, 'egg', 'content', 150)}
      <h2 class="pet-title">What should we call ${esc(species?.name || 'it')}?</h2>
      <p>${esc(species?.flavor || 'Log meals and it will hatch, then grow.')}</p>
      <form id="pet-name-form" class="stack-form">
        <label>
          <span>Name</span>
          <input name="name" maxlength="24" enterkeyhint="done" autocomplete="off" autocapitalize="words" placeholder="${esc(species?.name || 'Mochi')}" />
        </label>
        <p id="pet-name-error" class="form-error" role="alert"></p>
        <button class="btn" type="submit">Name it</button>
      </form>
    </section>`;
}

function choiceStack(state, { embedded = false } = {}) {
  const pet = state.pet;
  const growing = Boolean(pet.current);
  const offerIds = growing ? pet.nextOffer : pet.starterOffer;
  if (growing && offerIds == null) {
    return `
      <section class="pet-panel">
        <h2>Still growing</h2>
        <p>The next choice shows up when this one is all grown up.</p>
        <a class="btn secondary" href="#/pet">Back to your pet</a>
      </section>`;
  }
  const offer = (offerIds || []).map((id) => speciesById(id)).filter(Boolean);
  if (!offer.length) {
    return `
      <section class="pet-panel">
        <h2>That’s everyone</h2>
        <p>All ten creatures are raised. They stay in your collection.</p>
        <a class="btn" href="#/pet/collection">Open the collection</a>
      </section>`;
  }
  const title = growing ? 'Who’s next?' : 'Choose a starter';
  const lede = growing
    ? 'Pick the next creature to raise. The one you just finished stays in your collection.'
    : 'Pick one. Log meals and it will hatch, then grow. A tough day will not hurt it.';
  const legacy = !growing && pet.legacyName
    ? `<p class="choice-note">The name ${esc(pet.legacyName)} goes with the one you pick. Meals already on this phone count for them.</p>`
    : '';
  const cards = offer
    .map((species) => {
      const style = species.style === 'cool' ? 'Cool' : 'Cute';
      return `
        <button type="button" class="choice-card" data-choose="${esc(species.id)}">
          <span class="choice-art">
            ${spriteMarkup(species.id, 'egg', 'content', 62)}
            ${spriteMarkup(species.id, 'baby', 'content', 74)}
          </span>
          <span class="choice-copy">
            <span class="pill pill-${esc(species.style)}">${style}</span>
            <span class="choice-name">${esc(species.name)}</span>
            <span class="choice-flavor">${esc(species.flavor)}</span>
          </span>
        </button>`;
    })
    .join('');
  if (embedded) {
    return `
      <section class="choose-embed">
        <p class="eyebrow">${esc(title)}</p>
        <p class="choice-lede">${esc(lede)}</p>
        ${legacy}
        <div class="choice-list">${cards}</div>
      </section>`;
  }
  return `
    <header class="top">
      <a class="back" href="#/today" aria-label="Back to today">${icon('back')}</a>
      <div>
        <p class="eyebrow">Pet</p>
        <h1>${esc(title)}</h1>
      </div>
    </header>
    <p class="lede">${esc(lede)}</p>
    ${legacy}
    <div class="choice-list">${cards}</div>
    <p class="collection-jump"><a href="#/pet/collection">Collection</a></p>`;
}

export async function petHtml() {
  const state = await loadPetState();
  if (!state.pet.current) return `<div class="screen">${choiceStack(state)}</div>`;
  if (!state.pet.current.name) {
    return `
      <div class="screen">
        <header class="top">
          <a class="back" href="#/today" aria-label="Back to today">${icon('back')}</a>
          <div>
            <p class="eyebrow">Pet</p>
            <h1>Name it</h1>
          </div>
        </header>
        ${namingCard(state)}
      </div>`;
  }
  return `<div class="screen"${celebrateAttrs(state)}>${petDetail(state)}</div>`;
}

export async function petChooseHtml() {
  const state = await loadPetState();
  return `<div class="screen">${choiceStack(state)}</div>`;
}

export async function petCollectionHtml() {
  const state = await loadPetState();
  const rows = collectionRows(state.pet);
  const cards = rows.length
    ? rows
        .map((row) => {
          const species = speciesById(row.speciesId);
          const given = row.name || species?.name || 'Friend';
          return `
            <article class="collection-card">
              ${spriteMarkup(row.speciesId, 'adult', 'happy', 88)}
              <div>
                <h2>${esc(given)}</h2>
                <p>${esc(species?.name || '')}${row.current ? ' · still with you' : ''}</p>
                <p>Finished ${esc(finishedOn(row.completedAt))}</p>
              </div>
            </article>`;
        })
        .join('')
    : '<section class="pet-panel"><h2>None yet</h2><p>Grown-up creatures will wait here, with the name you gave them and the day they finished.</p></section>';
  return `
    <div class="screen">
      <header class="top">
        <a class="back" href="#/pet" aria-label="Back to your pet">${icon('back')}</a>
        <div>
          <p class="eyebrow">Pet</p>
          <h1>Collection</h1>
        </div>
      </header>
      <p class="lede">Every adult you have raised. They stay, even if a later day is rough.</p>
      <div class="collection-list">${cards}</div>
    </div>`;
}

export function petRosterHtml() {
  const head = PET_STAGES.map((stage) => `<span>${esc(stage.label)}</span>`).join('');
  const rows = ROSTER.map((species) => {
    const cells = PET_STAGES.map((stage) => spriteMarkup(species.id, stage.id, 'content', 46)).join('');
    return `<div class="roster-row"><span class="roster-name">${esc(species.name)}</span>${cells}</div>`;
  }).join('');
  return `
    <div class="screen roster-screen">
      <header class="top">
        <a class="back" href="#/today" aria-label="Back to today">${icon('back')}</a>
        <div>
          <p class="eyebrow">Pet</p>
          <h1>Roster</h1>
        </div>
      </header>
      <div class="roster-board">
        <div class="roster-row roster-head"><span></span>${head}</div>
        ${rows}
      </div>
    </div>`;
}

function finishedOn(ms) {
  const date = new Date(ms);
  const pretty = prettyDate(todayKey(date));
  return `${pretty.month} ${pretty.day}, ${date.getFullYear()}`;
}

function petDetail(state) {
  const { pet, progress, profile } = state;
  const species = speciesById(pet.current.speciesId);
  const { stage, next, ratio, gained, span, remaining } = progress.progress;
  const mood = progress.mood;
  const sinceLine = pet.current.chosenAt > 0 ? 'Food since you chose this one.' : 'Food from every meal saved on this phone.';
  const grownNote = next
    ? `${fmtKcal(remaining)} food to ${next.label}`
    : pet.nextOffer?.length
      ? 'All grown up. Pick the next friend when you are ready.'
      : 'All grown up. It stays in your collection.';
  const nextButton = pet.nextOffer?.length ? '<a class="btn" href="#/pet/choose">Choose the next one</a>' : '';
  return `
    <header class="top">
      <a class="back" href="#/today" aria-label="Back to today">${icon('back')}</a>
      <div>
        <p class="eyebrow">${esc(species?.name || '')} · ${esc(stage.label)}</p>
        <h1>${esc(pet.current.name)}</h1>
      </div>
    </header>
    <section class="pet-hero mood-${mood}">
      ${spriteMarkup(pet.current.speciesId, stage.id, mood, 220)}
      <p class="pet-mood">${esc(moodLine(mood))}</p>
      <p class="pet-flavor">${esc(species?.flavor || '')}</p>
    </section>
    <section class="pet-panel">
      <div class="pet-progress-head">
        <h2>Growth</h2>
        <span>${esc(fmtKcal(progress.totalPoints))} food</span>
      </div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${next ? span : 1}" aria-valuenow="${next ? gained : 1}" aria-label="${esc(next ? `Progress to ${next.label}` : 'Fully grown')}">
        <div class="bar-fill pet" style="width:${(ratio * 100).toFixed(1)}%"></div>
      </div>
      <p class="pet-progress-note">${esc(grownNote)}</p>
      <p class="pet-progress-note">${esc(sinceLine)}</p>
      ${streakBlock(progress)}
      ${nextButton}
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
    <p class="collection-jump"><a href="#/pet/collection">Collection</a></p>
    <form id="pet-name-form" class="stack-form pet-rename">
      <label>
        <span>Name</span>
        <input name="name" maxlength="24" enterkeyhint="done" autocomplete="off" autocapitalize="words" value="${esc(pet.current.name)}" />
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

function calorieDetail(progress) {
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
    text: 'Fully grown. Pick the next friend, or keep this one here a while longer.',
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
        const pet = normalizePet(await ensurePet());
        if (!pet.current) return;
        await savePet({ current: { ...pet.current, name: parsed.name } });
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

  const onChoose = async (event) => {
    const button = event.target.closest('[data-choose]');
    if (!button || !root.contains(button)) return;
    event.preventDefault();
    button.disabled = true;
    try {
      const state = await loadPetState();
      const result = acceptChoice(state.pet, button.dataset.choose, { now: Date.now() });
      if (result.error) {
        button.disabled = false;
        toast(result.error);
        return;
      }
      await putPet(petRecord({ ...result.pet, updatedAt: Date.now() }));
      if (location.hash === '#/pet') requestRender();
      else location.hash = '#/pet';
    } catch (err) {
      button.disabled = false;
      toast(err?.message || 'Could not choose that creature.');
    }
  };
  root.addEventListener('click', onChoose);
  cleanups.push(() => root.removeEventListener('click', onChoose));
  cleanups.push(mountCelebration(root));
  return () => {
    for (const fn of cleanups) fn();
  };
}

function mountCelebration(root) {
  const screen = root.querySelector('.screen');
  const stage = screen?.dataset.celebrateStage;
  const name = screen?.dataset.celebrateName;
  const speciesId = screen?.dataset.celebrateSpecies;
  const copy = CELEBRATE[stage];
  if (!copy || !name || !speciesId || !creatureSvg(speciesId, stage, 'happy')) return () => {};
  const modal = document.getElementById('modal');
  if (!modal) return () => {};
  const token = ++celebrateToken;
  modal.hidden = false;
  modal.dataset.petCelebrate = String(token);
  const bits = Array.from({ length: 10 }, (_, index) => `<i style="--i:${index}"></i>`).join('');
  const text = stage === 'adult' && screen.dataset.celebrateNext !== '1'
    ? 'Fully grown, and the last of the ten. They all stay in your collection.'
    : copy.text;
  modal.innerHTML = `
    <div class="backdrop">
      <div class="sheet celebrate" role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
        <div class="confetti" aria-hidden="true">${bits}</div>
        ${spriteMarkup(speciesId, stage, 'happy', 168)}
        <h2 id="celebrate-title">${esc(copy.title(name))}</h2>
        <p>${esc(text)}</p>
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
      const pet = normalizePet(await ensurePet());
      if (pet.current) await savePet({ current: { ...pet.current, celebratedStage: stage } });
    } catch {
      button.disabled = false;
      return;
    }
    close();
    if (stage === 'adult' && screen.dataset.celebrateNext === '1') {
      if (location.hash === '#/pet/choose') requestRender();
      else location.hash = '#/pet/choose';
      return;
    }
    requestRender();
  };
  button.addEventListener('click', onOk);
  return () => {
    button.removeEventListener('click', onOk);
    if (token === celebrateToken) close();
  };
}
