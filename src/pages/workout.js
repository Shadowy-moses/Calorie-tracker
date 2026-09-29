import { esc, todayKey } from '../format.js';
import { requestRender } from '../bus.js';
import { workoutsForProfile } from '../db.js';
import { relicScreen, toast } from '../ui.js';
import {
  currentStreak,
  finishedDates,
  formatClock,
  isWorkoutLogOpen,
  normalizeWorkoutLog,
  openWorkoutLog,
  resetTimer,
  saveWorkoutSession,
  startTimer,
  pauseTimer,
  timerSnapshot,
} from '../workout.js';

export async function workoutHtml() {
  const today = todayKey();
  const workouts = await workoutsForProfile();
  const dates = finishedDates(workouts);
  const streak = currentStreak(dates, today);
  const todayLog = workouts.find((row) => row.date === today) || null;
  const snap = timerSnapshot();
  const showForm = isWorkoutLogOpen() || (snap.elapsed > 0 && snap.remaining === 0);
  return relicScreen({
    kicker: '20 minutes',
    title: 'The Climber',
    compact: true,
    artExtra: clockSeal(snap),
    body: `
      <p class="lede">As many rounds as you can of 5 push-ups, 5 squats, and 5 pull-ups.</p>
      <ul class="climber-moves">
        <li>5 push-ups</li>
        <li>5 squats</li>
        <li>5 pull-ups</li>
      </ul>
      <div class="climber-actions">
        <button type="button" class="btn cta" id="climber-toggle">${toggleLabel(snap)}</button>
        <button type="button" class="btn secondary" id="climber-finish" ${snap.elapsed > 0 ? '' : 'hidden'}>Finish</button>
      </div>
      <p class="medal-summary" id="climber-streak">Streak: ${streak} ${streak === 1 ? 'day' : 'days'} · ${dates.length} finished ${dates.length === 1 ? 'day' : 'days'}</p>
      ${todayLog ? savedLine(todayLog) : ''}
      <form id="climber-log" class="stack-form" ${showForm ? '' : 'hidden'}>
        <label>
          <span>Full rounds</span>
          <input name="rounds" inputmode="numeric" value="${todayLog ? esc(String(todayLog.rounds)) : ''}" />
        </label>
        <p class="lede">Optional: reps left in a round you did not finish.</p>
        <div class="climber-leftovers">
          <label><span>Push-ups</span><input name="pushups" inputmode="numeric" value="${leftoverValue(todayLog?.pushups)}" /></label>
          <label><span>Squats</span><input name="squats" inputmode="numeric" value="${leftoverValue(todayLog?.squats)}" /></label>
          <label><span>Pull-ups</span><input name="pullups" inputmode="numeric" value="${leftoverValue(todayLog?.pullups)}" /></label>
        </div>
        <p id="climber-error" class="form-error" role="alert"></p>
        <button class="btn" type="submit">Save workout</button>
      </form>`,
  });
}

function leftoverValue(value) {
  return value ? esc(String(value)) : '';
}

function toggleLabel(snap) {
  if (snap.running) return 'Pause';
  if (snap.elapsed > 0 && snap.remaining > 0) return 'Resume';
  return 'Start';
}

function clockSeal(snap) {
  return `
    <section class="seal" aria-label="The Climber timer">
      <p class="seal-kicker">Time left</p>
      <p class="seal-num" id="climber-clock">${formatClock(snap.remaining)}</p>
      <p class="seal-sub" id="climber-status">${statusText(snap)}</p>
    </section>`;
}

function statusText(snap) {
  if (snap.running) return 'Going';
  if (snap.elapsed > 0 && snap.remaining === 0) return 'Time';
  if (snap.elapsed > 0) return 'Paused';
  return 'Ready';
}

function savedLine(log) {
  const leftovers = [];
  if (log.pushups) leftovers.push(`${log.pushups} push-ups`);
  if (log.squats) leftovers.push(`${log.squats} squats`);
  if (log.pullups) leftovers.push(`${log.pullups} pull-ups`);
  const extra = leftovers.length ? ` · leftover ${leftovers.join(', ')}` : '';
  return `<p class="preview-note">Saved today: ${esc(String(log.rounds))} full ${log.rounds === 1 ? 'round' : 'rounds'}${esc(extra)}</p>`;
}

export function mountWorkout(root) {
  const form = root.querySelector('#climber-log');
  const error = root.querySelector('#climber-error');
  let lastClock = '';

  const paint = () => {
    const snap = timerSnapshot();
    const clock = root.querySelector('#climber-clock');
    const text = formatClock(snap.remaining);
    if (clock && text !== lastClock) {
      clock.textContent = text;
      lastClock = text;
    }
    const status = root.querySelector('#climber-status');
    if (status) status.textContent = statusText(snap);
    const toggle = root.querySelector('#climber-toggle');
    if (toggle) toggle.textContent = toggleLabel(snap);
    const finish = root.querySelector('#climber-finish');
    if (finish) finish.hidden = snap.elapsed <= 0;
    if (snap.elapsed > 0 && snap.remaining === 0 && form) form.hidden = false;
  };

  const onToggle = () => {
    const snap = timerSnapshot();
    if (snap.running) pauseTimer();
    else startTimer();
    paint();
  };
  root.querySelector('#climber-toggle').addEventListener('click', onToggle);

  const onFinish = () => {
    openWorkoutLog();
    if (form) form.hidden = false;
    paint();
    form?.querySelector('input[name="rounds"]')?.focus();
  };
  root.querySelector('#climber-finish').addEventListener('click', onFinish);

  const onSubmit = async (event) => {
    event.preventDefault();
    const parsed = normalizeWorkoutLog({
      rounds: form.rounds.value,
      pushups: form.pushups.value,
      squats: form.squats.value,
      pullups: form.pullups.value,
    });
    if (parsed.error) {
      error.textContent = parsed.error;
      return;
    }
    error.textContent = '';
    const snap = timerSnapshot();
    await saveWorkoutSession({
      date: todayKey(),
      ...parsed.values,
      seconds: snap.elapsed / 1000,
    });
    resetTimer();
    toast(parsed.values.rounds === 1 ? 'Saved 1 round' : `Saved ${parsed.values.rounds} rounds`);
    requestRender();
  };
  form.addEventListener('submit', onSubmit);

  const timerId = window.setInterval(paint, 250);
  return () => {
    window.clearInterval(timerId);
    root.querySelector('#climber-toggle')?.removeEventListener('click', onToggle);
    root.querySelector('#climber-finish')?.removeEventListener('click', onFinish);
    form.removeEventListener('submit', onSubmit);
  };
}
