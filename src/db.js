/**
 * On-device store. Every food and meal row carries profileId so another
 * person can be added later without reshaping the data. v1 only writes David.
 *
 * v2 adds a pets store. Meal logs and saved foods stay in their existing
 * stores and are not rewritten. A later roster lives in that same pet record:
 * older rows (a name and a celebrated stage) are rewritten on read into the
 * first creature choice. The database version stays at 2.
 */

import { normalizePet, petRecord, withOffers } from './pet/roster.js';

export const ACTIVE_PROFILE_ID = 'david';

export const DEFAULT_GOALS = {
  calorieGoal: 2000,
  proteinGoal: 120,
  carbGoal: 225,
  fatGoal: 65,
};

const DB_NAME = 'calorie-tracker';
const DB_VERSION = 2;

let dbPromise;

function database() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
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
        if (!db.objectStoreNames.contains('pets')) {
          db.createObjectStore('pets', { keyPath: 'profileId' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onblocked = () => reject(new Error('Close other tabs of the tracker, then open it again.'));
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

export async function getProfile(id = ACTIVE_PROFILE_ID) {
  const { objectStore } = await store('profiles', 'readonly');
  return requestResult(objectStore.get(id));
}

export async function putProfile(profile) {
  const { tx, objectStore } = await store('profiles', 'readwrite');
  objectStore.put(profile);
  await txDone(tx);
  return profile;
}

export async function getPet(profileId = ACTIVE_PROFILE_ID) {
  const { objectStore } = await store('pets', 'readonly');
  return requestResult(objectStore.get(profileId));
}

export async function putPet(pet) {
  const { tx, objectStore } = await store('pets', 'readwrite');
  objectStore.put(pet);
  await txDone(tx);
  return pet;
}

export async function ensurePet(profileId = ACTIVE_PROFILE_ID) {
  const existing = await getPet(profileId);
  if (existing?.rosterVersion === 1 && !('name' in existing) && !('celebratedStage' in existing)) {
    return existing;
  }
  const normalized = normalizePet(existing, profileId);
  const { pet } = withOffers(normalized, { stageId: 'egg' });
  return putPet(petRecord({ ...pet, updatedAt: Date.now() }));
}

export async function savePet(patch, profileId = ACTIVE_PROFILE_ID) {
  const pet = normalizePet(await ensurePet(profileId), profileId);
  return putPet(
    petRecord({
      ...pet,
      ...patch,
      profileId: pet.profileId,
      rosterVersion: 1,
      updatedAt: Date.now(),
    }),
  );
}

export async function ensureProfile() {
  const existing = await getProfile();
  if (existing) return existing;
  return putProfile({
    id: ACTIVE_PROFILE_ID,
    name: 'David',
    ...DEFAULT_GOALS,
    createdAt: Date.now(),
  });
}

export async function saveGoals(goals) {
  const profile = await ensureProfile();
  return putProfile({ ...profile, ...goals, updatedAt: Date.now() });
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

export async function foodsForProfile(profileId = ACTIVE_PROFILE_ID) {
  const { objectStore } = await store('foods', 'readonly');
  const rows = await requestResult(objectStore.index('byProfile').getAll(profileId));
  return rows || [];
}

export async function findFoodByBarcode(barcode, profileId = ACTIVE_PROFILE_ID) {
  if (!barcode) return null;
  const { objectStore } = await store('foods', 'readonly');
  const row = await requestResult(objectStore.index('byBarcode').get([profileId, barcode]));
  return row || null;
}

export async function findManualByName(name, profileId = ACTIVE_PROFILE_ID) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const foods = await foodsForProfile(profileId);
  return foods.find((food) => food.source === 'manual' && food.name.trim().toLowerCase() === key) || null;
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

export async function entriesForDate(date, profileId = ACTIVE_PROFILE_ID) {
  const { objectStore } = await store('entries', 'readonly');
  const rows = await requestResult(objectStore.index('byProfileDate').getAll([profileId, date]));
  return rows || [];
}

export async function allEntries(profileId = ACTIVE_PROFILE_ID) {
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

export async function clearProfile(profileId = ACTIVE_PROFILE_ID) {
  const db = await database();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['foods', 'entries'], 'readwrite');
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
