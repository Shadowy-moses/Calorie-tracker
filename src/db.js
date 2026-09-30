/**
 * On-device store. Meals, My foods, workouts, and targets are tagged with
 * profileId. David and Brittney each have a profile. There is no account.
 *
 * Version 2 adds customFoods ("My foods"). Version 3 adds workouts
 * (The Climber). Upgrades only create stores that are missing, so meals
 * already on the phone stay put. Rows with no profileId are claimed for
 * David and are not rewritten otherwise.
 *
 * A recipe saved from a link is a My foods row with optional source,
 * estimate, and recipeUrl fields. That does not add a store or rewrite meals.
 */

export const PEOPLE = [
  { id: 'david', name: 'David' },
  { id: 'brittney', name: 'Brittney' },
];

export const DAVID_ID = 'david';

const PROFILE_KEY = 'calorie-tracker-active-profile';

let activeId = DAVID_ID;

export function activeProfileId() {
  return activeId;
}

export function setActiveProfileId(id) {
  if (!PEOPLE.some((person) => person.id === id)) return activeId;
  activeId = id;
  try {
    localStorage.setItem(PROFILE_KEY, id);
  } catch {
    /* Storage can be blocked. The choice still lasts for this visit. */
  }
  return activeId;
}

export function loadStoredProfileId() {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (PEOPLE.some((person) => person.id === saved)) activeId = saved;
  } catch {
    /* Keep David when storage cannot be read. */
  }
  return activeId;
}

/** Meals saved before a profile id existed stay with David. */
export function ownerId(record) {
  return record?.profileId || DAVID_ID;
}

export function ownsRecord(record, profileId = activeProfileId()) {
  return Boolean(record) && ownerId(record) === profileId;
}

export const DEFAULT_GOALS = {
  calorieGoal: 2000,
  proteinGoal: 120,
  carbGoal: 225,
  fatGoal: 65,
};

const DB_NAME = 'calorie-tracker';
const DB_VERSION = 3;

let dbPromise;

export function upgradeDatabase(db) {
  if (!db.objectStoreNames.contains('profiles')) {
    db.createObjectStore('profiles', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('foods')) {
    const foods = db.createObjectStore('foods', { keyPath: 'id' });
    foods.createIndex('byProfile', 'profileId');
    foods.createIndex('byBarcode', ['profileId', 'barcode']);
  }
  if (!db.objectStoreNames.contains('entries')) {
    const entries = db.createObjectStore('entries', { keyPath: 'id' });
    entries.createIndex('byProfile', 'profileId');
    entries.createIndex('byProfileDate', ['profileId', 'date']);
  }
  if (!db.objectStoreNames.contains('customFoods')) {
    const customFoods = db.createObjectStore('customFoods', { keyPath: 'id' });
    customFoods.createIndex('byProfile', 'profileId');
  }
  if (!db.objectStoreNames.contains('workouts')) {
    const workouts = db.createObjectStore('workouts', { keyPath: 'id' });
    workouts.createIndex('byProfile', 'profileId');
    workouts.createIndex('byProfileDate', ['profileId', 'date']);
  }
}

function database() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        upgradeDatabase(request.result);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open the log'));
    });
  }
  return dbPromise;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store(name, mode) {
  const db = await database();
  const tx = db.transaction(name, mode);
  return { tx, objectStore: tx.objectStore(name) };
}

export async function getProfile(id = activeProfileId()) {
  const { objectStore } = await store('profiles', 'readonly');
  return requestResult(objectStore.get(id));
}

export async function putProfile(profile) {
  const { tx, objectStore } = await store('profiles', 'readwrite');
  objectStore.put(profile);
  await txDone(tx);
  return profile;
}

let profilesReady;

export function ensureProfiles() {
  if (!profilesReady) {
    profilesReady = seedProfiles().catch((error) => {
      profilesReady = null;
      throw error;
    });
  }
  return profilesReady;
}

async function seedProfiles() {
  await claimLegacyRows();
  const profiles = [];
  for (const person of PEOPLE) {
    const existing = await getProfile(person.id);
    if (existing) {
      profiles.push(existing);
      continue;
    }
    profiles.push(
      await putProfile({
        id: person.id,
        name: person.name,
        ...DEFAULT_GOALS,
        createdAt: Date.now(),
      }),
    );
  }
  return profiles;
}

/**
 * Rows that predate profile ids have no profileId, so the byProfile index
 * would hide them. Stamp those as David. Rows that already have an id,
 * including David's meals, are left as they are.
 */
async function claimLegacyRows() {
  const db = await database();
  const names = ['foods', 'entries', 'customFoods', 'workouts'].filter((name) => db.objectStoreNames.contains(name));
  if (!names.length) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(names, 'readwrite');
    for (const name of names) {
      const objectStore = tx.objectStore(name);
      objectStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (!cursor.value.profileId) cursor.update({ ...cursor.value, profileId: DAVID_ID });
        cursor.continue();
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Could not keep existing meals'));
  });
}

export async function ensureProfile(id = activeProfileId()) {
  await ensureProfiles();
  const existing = await getProfile(id);
  if (existing) return existing;
  const person = PEOPLE.find((item) => item.id === id);
  return putProfile({
    id,
    name: person?.name || 'David',
    ...DEFAULT_GOALS,
    createdAt: Date.now(),
  });
}

export async function saveGoals(goals) {
  const profile = await ensureProfile();
  return putProfile({ ...profile, ...goals, updatedAt: Date.now() });
}

export async function saveArtChoice(artChoice) {
  const profile = await ensureProfile();
  return putProfile({ ...profile, artChoice, updatedAt: Date.now() });
}

export async function getFood(id) {
  const { objectStore } = await store('foods', 'readonly');
  return requestResult(objectStore.get(id));
}

export async function putFood(food) {
  const { tx, objectStore } = await store('foods', 'readwrite');
  objectStore.put(food);
  await txDone(tx);
  return food;
}

export async function foodsForProfile(profileId = activeProfileId()) {
  const { objectStore } = await store('foods', 'readonly');
  const rows = await requestResult(objectStore.index('byProfile').getAll(profileId));
  return rows || [];
}

export async function findFoodByBarcode(barcode, profileId = activeProfileId()) {
  if (!barcode) return null;
  const { objectStore } = await store('foods', 'readonly');
  const row = await requestResult(objectStore.index('byBarcode').get([profileId, barcode]));
  return row || null;
}

export async function findManualByName(name, profileId = activeProfileId()) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const foods = await foodsForProfile(profileId);
  return foods.find((food) => food.source === 'manual' && food.name.trim().toLowerCase() === key) || null;
}

export async function getCustomFood(id) {
  const { objectStore } = await store('customFoods', 'readonly');
  return requestResult(objectStore.get(id));
}

export async function putCustomFood(food) {
  const { tx, objectStore } = await store('customFoods', 'readwrite');
  objectStore.put(food);
  await txDone(tx);
  return food;
}

export async function deleteCustomFood(id) {
  const { tx, objectStore } = await store('customFoods', 'readwrite');
  objectStore.delete(id);
  await txDone(tx);
}

export async function customFoodsForProfile(profileId = activeProfileId()) {
  const { objectStore } = await store('customFoods', 'readonly');
  const rows = await requestResult(objectStore.index('byProfile').getAll(profileId));
  return rows || [];
}

export async function findCustomByName(name, profileId = activeProfileId()) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const foods = await customFoodsForProfile(profileId);
  return foods.find((food) => food.name.trim().toLowerCase() === key) || null;
}

export async function getEntry(id) {
  const { objectStore } = await store('entries', 'readonly');
  return requestResult(objectStore.get(id));
}

export async function putEntry(entry) {
  const { tx, objectStore } = await store('entries', 'readwrite');
  objectStore.put(entry);
  await txDone(tx);
  return entry;
}

export async function deleteEntry(id) {
  const { tx, objectStore } = await store('entries', 'readwrite');
  objectStore.delete(id);
  await txDone(tx);
}

export async function entriesForDate(date, profileId = activeProfileId()) {
  const { objectStore } = await store('entries', 'readonly');
  const rows = await requestResult(objectStore.index('byProfileDate').getAll([profileId, date]));
  return rows || [];
}

export async function getWorkout(id) {
  const { objectStore } = await store('workouts', 'readonly');
  return requestResult(objectStore.get(id));
}

export async function putWorkout(workout) {
  const { tx, objectStore } = await store('workouts', 'readwrite');
  objectStore.put(workout);
  await txDone(tx);
  return workout;
}

export async function workoutsForProfile(profileId = activeProfileId()) {
  const { objectStore } = await store('workouts', 'readonly');
  const rows = await requestResult(objectStore.index('byProfile').getAll(profileId));
  return rows || [];
}

export async function allEntries(profileId = activeProfileId()) {
  const { objectStore } = await store('entries', 'readonly');
  const rows = await requestResult(objectStore.index('byProfile').getAll(profileId));
  return rows || [];
}

export async function adjustUseCount(foodId, delta) {
  const food = await getFood(foodId);
  if (!food) return;
  food.useCount = Math.max(0, (food.useCount || 0) + delta);
  food.updatedAt = Date.now();
  await putFood(food);
}

export async function clearProfile(profileId = activeProfileId()) {
  const db = await database();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['foods', 'entries', 'customFoods', 'workouts'], 'readwrite');
    const wipe = (storeName) => {
      const index = tx.objectStore(storeName).index('byProfile');
      index.openCursor(IDBKeyRange.only(profileId)).onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
    };
    wipe('foods');
    wipe('entries');
    wipe('customFoods');
    wipe('workouts');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Could not erase the log'));
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('The log update was aborted'));
  });
}
