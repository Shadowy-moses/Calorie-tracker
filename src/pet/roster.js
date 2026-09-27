/**
 * Ten original creatures. Offers are stored on the pet record so a refresh
 * does not shuffle the choices. Points for a creature start at chosenAt;
 * the first one uses 0 so the existing meal log still counts.
 */

export const ROSTER = [
  { id: 'puff', name: 'Puff', style: 'cute', flavor: 'A shy puff of weather that hops when it’s happy.' },
  { id: 'dozie', name: 'Dozie', style: 'cute', flavor: 'Naps on its tail and wakes up for snacks.' },
  { id: 'pebble', name: 'Pebble', style: 'cute', flavor: 'A smooth little seal who claps when you log lunch.' },
  { id: 'mallow', name: 'Mallow', style: 'cute', flavor: 'Soft, round, and always ready for a hug.' },
  { id: 'pip', name: 'Pip', style: 'cute', flavor: 'A tiny owl that blinks slowly and hoots at breakfast.' },
  { id: 'ember', name: 'Ember', style: 'cool', flavor: 'A small lizard with a campfire on its tail.' },
  { id: 'volt', name: 'Volt', style: 'cool', flavor: 'Fur that crackles, and a grin like a storm.' },
  { id: 'prism', name: 'Prism', style: 'cool', flavor: 'Hatches from a gem and grows glass wings.' },
  { id: 'reef', name: 'Reef', style: 'cool', flavor: 'Glides in, quiet and bright.' },
  { id: 'knox', name: 'Knox', style: 'cool', flavor: 'A little tank that shines when it grows.' },
];

export function speciesById(id) {
  return ROSTER.find((species) => species.id === id) || null;
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function rng() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text) {
  let hash = 2166136261;
  const value = String(text);
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickIndex(rng, length) {
  if (length <= 1) return 0;
  return Math.min(length - 1, Math.floor(rng() * length));
}

export function createOffer(available, count = 3, rng = Math.random) {
  const pool = (available || []).filter((species) => species?.id);
  if (pool.length <= count) return pool.map((species) => species.id);
  const picked = [];
  const used = new Set();
  const cute = pool.filter((species) => species.style === 'cute');
  const cool = pool.filter((species) => species.style === 'cool');
  const take = (group) => {
    const open = group.filter((species) => !used.has(species.id));
    if (!open.length) return;
    const species = open[pickIndex(rng, open.length)];
    used.add(species.id);
    picked.push(species);
  };
  if (count >= 2 && cute.length && cool.length) {
    take(cute);
    take(cool);
  }
  while (picked.length < count) {
    const rest = pool.filter((species) => !used.has(species.id));
    if (!rest.length) break;
    take(rest);
  }
  for (let i = picked.length - 1; i > 0; i -= 1) {
    const j = pickIndex(rng, i + 1);
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked.map((species) => species.id);
}

export function normalizePet(record, profileId = 'david') {
  const now = Date.now();
  if (record?.rosterVersion === 1) {
    const current = record.current
      ? {
          speciesId: record.current.speciesId,
          name: record.current.name || '',
          chosenAt: Number(record.current.chosenAt) || 0,
          celebratedStage: record.current.celebratedStage || 'egg',
          ...(record.current.adultAt ? { adultAt: record.current.adultAt } : {}),
        }
      : null;
    return {
      profileId: record.profileId || profileId,
      rosterVersion: 1,
      legacyName: record.legacyName || '',
      starterOffer: Array.isArray(record.starterOffer) ? [...record.starterOffer] : null,
      nextOffer: record.nextOffer == null ? null : [...record.nextOffer],
      current,
      raised: Array.isArray(record.raised)
        ? record.raised.map((row) => ({
            speciesId: row.speciesId,
            name: row.name || '',
            completedAt: row.completedAt || now,
            chosenAt: Number(row.chosenAt) || 0,
          }))
        : [],
      createdAt: record.createdAt || now,
      updatedAt: record.updatedAt || now,
      ...(record.migratedCelebratedStage ? { migratedCelebratedStage: record.migratedCelebratedStage } : {}),
    };
  }
  const legacyName = typeof record?.name === 'string' ? record.name : '';
  const migrated = record?.celebratedStage && record.celebratedStage !== 'egg' ? record.celebratedStage : '';
  return {
    profileId: record?.profileId || profileId,
    rosterVersion: 1,
    legacyName,
    starterOffer: null,
    nextOffer: null,
    current: null,
    raised: [],
    createdAt: record?.createdAt || now,
    updatedAt: record?.updatedAt || now,
    ...(migrated ? { migratedCelebratedStage: migrated } : {}),
  };
}

export function petRecord(pet) {
  const clean = stripUndefined(pet);
  delete clean.name;
  delete clean.celebratedStage;
  return clean;
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      out[key] = stripUndefined(item);
    }
    return out;
  }
  return value;
}

export function raisedIds(pet) {
  return new Set((pet.raised || []).map((row) => row.speciesId));
}

export function availableSpecies(pet) {
  const taken = raisedIds(pet);
  if (pet.current?.speciesId) taken.add(pet.current.speciesId);
  return ROSTER.filter((species) => !taken.has(species.id));
}

function rngForPet(pet, key, rngFor) {
  if (rngFor) return rngFor(key);
  return mulberry32(hashSeed(`${pet.profileId || 'david'}:${key}`));
}

export function withOffers(pet, { stageId = 'egg', now = Date.now(), rngFor } = {}) {
  let next = {
    ...pet,
    current: pet.current ? { ...pet.current } : null,
    raised: [...(pet.raised || [])],
  };
  let changed = false;
  if (!next.current && !Array.isArray(next.starterOffer)) {
    next.starterOffer = createOffer(ROSTER, 3, rngForPet(next, 'starter', rngFor));
    changed = true;
  }
  if (!next.current) return { pet: next, changed };

  const adult = stageId === 'adult';
  if (adult && !next.current.adultAt) {
    next.current.adultAt = now;
    changed = true;
  }
  if (adult && next.nextOffer == null) {
    next.nextOffer = createOffer(availableSpecies(next), 3, rngForPet(next, `next:${next.current.speciesId}`, rngFor));
    changed = true;
  }
  if (!adult && (next.nextOffer != null || next.current.adultAt)) {
    delete next.current.adultAt;
    next.nextOffer = null;
    changed = true;
  }
  return { pet: next, changed };
}

export function acceptChoice(pet, speciesId, { now = Date.now() } = {}) {
  if (!speciesById(speciesId)) return { error: 'That creature is not one of the choices.' };
  const first = !pet.current;
  const offer = first ? pet.starterOffer : pet.nextOffer;
  if (!Array.isArray(offer) || !offer.includes(speciesId)) {
    return { error: 'That creature is not one of the choices.' };
  }
  if (!first && !pet.current.adultAt) {
    return { error: 'This creature is still growing.' };
  }
  if (first) {
    const name = pet.legacyName || '';
    const next = {
      ...pet,
      current: {
        speciesId,
        name,
        chosenAt: 0,
        celebratedStage: name ? pet.migratedCelebratedStage || 'egg' : 'egg',
      },
      nextOffer: null,
    };
    delete next.migratedCelebratedStage;
    return { pet: next };
  }
  return {
    pet: {
      ...pet,
      raised: [
        ...pet.raised,
        {
          speciesId: pet.current.speciesId,
          name: pet.current.name || '',
          completedAt: pet.current.adultAt || now,
          chosenAt: pet.current.chosenAt || 0,
        },
      ],
      current: {
        speciesId,
        name: '',
        chosenAt: now,
        celebratedStage: 'egg',
      },
      nextOffer: null,
    },
  };
}

export function collectionRows(pet) {
  const rows = (pet.raised || []).map((row) => ({ ...row, current: false }));
  if (pet.current?.adultAt) {
    rows.push({
      speciesId: pet.current.speciesId,
      name: pet.current.name || '',
      completedAt: pet.current.adultAt,
      chosenAt: pet.current.chosenAt || 0,
      current: true,
    });
  }
  return rows;
}
