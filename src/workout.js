import { ACTIVE_PROFILE_ID, ensureProfile, getWorkout, putWorkout } from './db.js';

export const CLIMBER_MS = 20 * 60 * 1000;
const STORAGE_KEY = 'climber-timer';

let timer = loadTimer();
let logOpen = false;

function loadTimer() {
  if (typeof sessionStorage === 'undefined') return freshTimer();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return freshTimer();
    const data = JSON.parse(raw);
    return {
      running: Boolean(data.running),
      accumulated: clampMs(data.accumulated),
      runStarted: Number(data.runStarted) || 0,
    };
  } catch {
    return freshTimer();
  }
}

function freshTimer() {
  return { running: false, accumulated: 0, runStarted: 0 };
}

function clampMs(value) {
  const n = Number(value) || 0;
  return Math.max(0, Math.min(CLIMBER_MS, n));
}

function persistTimer() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
}

export function timerSnapshot(now = Date.now()) {
  let elapsed = timer.accumulated;
  if (timer.running && timer.runStarted) elapsed += Math.max(0, now - timer.runStarted);
  if (elapsed >= CLIMBER_MS) {
    if (timer.running || timer.accumulated !== CLIMBER_MS) {
      timer = { running: false, accumulated: CLIMBER_MS, runStarted: 0 };
      persistTimer();
    }
    elapsed = CLIMBER_MS;
  }
  return {
    running: timer.running,
    remaining: CLIMBER_MS - elapsed,
    elapsed,
    duration: CLIMBER_MS,
  };
}

export function startTimer(now = Date.now()) {
  const snap = timerSnapshot(now);
  if (snap.remaining <= 0) return snap;
  if (!timer.running) {
    timer.running = true;
    timer.runStarted = now;
    persistTimer();
  }
  return timerSnapshot(now);
}

export function pauseTimer(now = Date.now()) {
  if (timer.running) {
    timer.accumulated = Math.min(CLIMBER_MS, timer.accumulated + Math.max(0, now - timer.runStarted));
    timer.running = false;
    timer.runStarted = 0;
    persistTimer();
  }
  return timerSnapshot(now);
}

export function resetTimer() {
  timer = freshTimer();
  logOpen = false;
  persistTimer();
  return timerSnapshot();
}

export function openWorkoutLog(now = Date.now()) {
  pauseTimer(now);
  logOpen = true;
  return timerSnapshot(now);
}

export function isWorkoutLogOpen() {
  return logOpen;
}

export function formatClock(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const total = safe === 0 ? 0 : Math.ceil(safe / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function finishedDates(workouts) {
  const seen = new Set();
  for (const row of workouts || []) {
    if (row && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) seen.add(row.date);
  }
  return [...seen].sort();
}

export function shiftDay(iso, delta) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Consecutive finished days ending today, or yesterday if today is still open. */
export function currentStreak(dates, today) {
  const set = new Set(dates);
  let cursor = today;
  if (!set.has(cursor)) cursor = shiftDay(cursor, -1);
  if (!set.has(cursor)) return 0;
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function normalizeWorkoutLog(input) {
  const rounds = readCount(input.rounds, true);
  const pushups = readCount(input.pushups, false);
  const squats = readCount(input.squats, false);
  const pullups = readCount(input.pullups, false);
  if (rounds.error) return { error: 'Enter how many full rounds you finished.' };
  for (const [field, label] of [
    [pushups, 'push-ups'],
    [squats, 'squats'],
    [pullups, 'pull-ups'],
  ]) {
    if (field.error) return { error: `Enter leftover ${label} as a whole number, or leave it blank.` };
  }
  if (rounds.value > 500) return { error: 'Enter 500 rounds or fewer.' };
  for (const field of [pushups, squats, pullups]) {
    if (field.value > 99) return { error: 'Leftover reps should be 99 or fewer.' };
  }
  return {
    values: {
      rounds: rounds.value,
      pushups: pushups.value,
      squats: squats.value,
      pullups: pullups.value,
    },
  };
}

function readCount(value, required) {
  const text = String(value ?? '').trim();
  if (!text) return required ? { error: true } : { value: 0 };
  if (!/^\d+$/.test(text)) return { error: true };
  return { value: Number(text) };
}

export async function saveWorkoutSession({ date, rounds, pushups, squats, pullups, seconds }) {
  const profile = await ensureProfile();
  const id = `workout:${profile.id || ACTIVE_PROFILE_ID}:${date}`;
  const existing = await getWorkout(id);
  const now = Date.now();
  return putWorkout({
    id,
    profileId: profile.id || ACTIVE_PROFILE_ID,
    date,
    rounds,
    pushups,
    squats,
    pullups,
    seconds: Math.max(0, Math.round(Number(seconds) || 0)),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });
}
