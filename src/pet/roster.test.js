import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ROSTER,
  acceptChoice,
  availableSpecies,
  createOffer,
  hashSeed,
  mulberry32,
  normalizePet,
  speciesById,
  withOffers,
} from './roster.js';

test('a full offer mixes cute and cool', () => {
  for (let seed = 1; seed <= 12; seed += 1) {
    const ids = createOffer(ROSTER, 3, mulberry32(seed));
    assert.equal(ids.length, 3);
    assert.equal(new Set(ids).size, 3);
    const styles = ids.map((id) => speciesById(id).style);
    assert.ok(styles.includes('cute'), `seed ${seed} ${ids}`);
    assert.ok(styles.includes('cool'), `seed ${seed} ${ids}`);
  }
});

test('fewer than three remaining creatures are all offered', () => {
  const few = ROSTER.slice(0, 2);
  assert.deepEqual(createOffer(few, 3, () => 0.2), ['puff', 'dozie']);
  assert.deepEqual(createOffer([], 3, Math.random), []);
});

test('a single style still fills an offer', () => {
  const cute = ROSTER.filter((species) => species.style === 'cute');
  const ids = createOffer(cute, 3, mulberry32(4));
  assert.equal(ids.length, 3);
  assert.ok(ids.every((id) => speciesById(id).style === 'cute'));
});

test('the same seed offers the same creatures', () => {
  const seed = hashSeed('david:starter');
  assert.deepEqual(createOffer(ROSTER, 3, mulberry32(seed)), createOffer(ROSTER, 3, mulberry32(seed)));
});

test('a random value at the top of the range stays in bounds', () => {
  const ids = createOffer(ROSTER, 3, () => 0.999999);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
});

test('an older pet record keeps its name for the first choice', () => {
  const pet = normalizePet(
    { profileId: 'david', name: 'Mochi', celebratedStage: 'baby', createdAt: 5, updatedAt: 6 },
    'david',
  );
  assert.equal(pet.rosterVersion, 1);
  assert.equal(pet.legacyName, 'Mochi');
  assert.equal(pet.current, null);
  assert.equal(pet.migratedCelebratedStage, 'baby');
  assert.equal(pet.raised.length, 0);
  const offered = withOffers(pet, { stageId: 'egg', rngFor: () => mulberry32(3) }).pet;
  const accepted = acceptChoice(offered, offered.starterOffer[1], { now: 999 }).pet;
  assert.equal(accepted.current.name, 'Mochi');
  assert.equal(accepted.current.chosenAt, 0);
  assert.equal(accepted.current.celebratedStage, 'baby');
  assert.equal(accepted.migratedCelebratedStage, undefined);
});

test('the starter offer is stored and not reshuffled', () => {
  const first = withOffers(normalizePet(null, 'david'), {
    stageId: 'egg',
    rngFor: (key) => mulberry32(hashSeed(`david:${key}`)),
  });
  assert.equal(first.changed, true);
  assert.equal(first.pet.starterOffer.length, 3);
  const second = withOffers(first.pet, {
    stageId: 'egg',
    rngFor: () => {
      throw new Error('reshuffle');
    },
  });
  assert.equal(second.changed, false);
  assert.deepEqual(second.pet.starterOffer, first.pet.starterOffer);
});

test('growing up offers creatures that are not raised yet', () => {
  let pet = withOffers(normalizePet({ name: 'Mochi', celebratedStage: 'kid' }, 'david'), {
    stageId: 'egg',
    rngFor: () => mulberry32(8),
  }).pet;
  pet = acceptChoice(pet, pet.starterOffer[0], { now: 1000 }).pet;
  const currentId = pet.current.speciesId;
  pet.raised = ROSTER.filter((species) => species.id !== currentId)
    .slice(0, 6)
    .map((species) => ({ speciesId: species.id, name: species.name, completedAt: 1, chosenAt: 1 }));
  const grown = withOffers(pet, { stageId: 'adult', now: 5000, rngFor: () => mulberry32(2) });
  assert.equal(grown.pet.current.adultAt, 5000);
  assert.ok(grown.pet.nextOffer.length >= 1);
  assert.ok(grown.pet.nextOffer.length <= 3);
  const blocked = new Set([currentId, ...pet.raised.map((row) => row.speciesId)]);
  for (const id of grown.pet.nextOffer) assert.equal(blocked.has(id), false);
  const styles = grown.pet.nextOffer.map((id) => speciesById(id).style);
  if (grown.pet.nextOffer.length >= 2 && styles.includes('cute') && availableSpecies(grown.pet).some((s) => s.style === 'cool')) {
    assert.ok(styles.includes('cool') || styles.includes('cute'));
  }
  const again = withOffers(grown.pet, {
    stageId: 'adult',
    now: 9000,
    rngFor: () => {
      throw new Error('reshuffle');
    },
  });
  assert.equal(again.changed, false);
  assert.equal(again.pet.current.adultAt, 5000);
});

test('falling short of adult clears the next offer', () => {
  let pet = withOffers(normalizePet(null, 'david'), { stageId: 'egg', rngFor: () => mulberry32(1) }).pet;
  pet = acceptChoice(pet, pet.starterOffer[0]).pet;
  pet = withOffers(pet, { stageId: 'adult', now: 50, rngFor: () => mulberry32(2) }).pet;
  assert.ok(pet.nextOffer);
  const dropped = withOffers(pet, { stageId: 'teen', now: 80, rngFor: () => mulberry32(3) });
  assert.equal(dropped.changed, true);
  assert.equal(dropped.pet.nextOffer, null);
  assert.equal(dropped.pet.current.adultAt, undefined);
});

test('the next choice archives the adult and starts a new creature', () => {
  let pet = withOffers(normalizePet({ name: 'Mochi' }, 'david'), {
    stageId: 'egg',
    rngFor: () => mulberry32(5),
  }).pet;
  pet = acceptChoice(pet, pet.starterOffer[0], { now: 10 }).pet;
  pet = withOffers(pet, { stageId: 'adult', now: 80, rngFor: () => mulberry32(6) }).pet;
  const nextId = pet.nextOffer[0];
  const accepted = acceptChoice(pet, nextId, { now: 42 });
  assert.equal(accepted.pet.raised.length, 1);
  assert.equal(accepted.pet.raised[0].speciesId, pet.current.speciesId);
  assert.equal(accepted.pet.raised[0].name, 'Mochi');
  assert.equal(accepted.pet.raised[0].completedAt, 80);
  assert.equal(accepted.pet.current.speciesId, nextId);
  assert.equal(accepted.pet.current.name, '');
  assert.equal(accepted.pet.current.chosenAt, 42);
  assert.equal(accepted.pet.current.celebratedStage, 'egg');
  assert.equal(accepted.pet.nextOffer, null);
});

test('a creature outside the offer is refused', () => {
  const pet = withOffers(normalizePet(null, 'david'), { stageId: 'egg', rngFor: () => mulberry32(1) }).pet;
  const outsider = ROSTER.find((species) => !pet.starterOffer.includes(species.id));
  const refused = acceptChoice(pet, outsider.id, { now: 1 });
  assert.equal(refused.pet, undefined);
  assert.match(refused.error, /not one of the choices/);
});

test('the last few creatures can be fewer than three', () => {
  const pet = withOffers(normalizePet(null, 'david'), { stageId: 'egg', rngFor: () => mulberry32(1) }).pet;
  pet.current = { speciesId: 'puff', name: 'Mochi', chosenAt: 0, celebratedStage: 'egg' };
  pet.raised = ROSTER.slice(1, 8).map((species) => ({
    speciesId: species.id,
    name: species.name,
    completedAt: 1,
    chosenAt: 1,
  }));
  const grown = withOffers(pet, { stageId: 'adult', now: 9, rngFor: () => mulberry32(4) }).pet;
  assert.deepEqual(grown.nextOffer, ['reef', 'knox']);
});
