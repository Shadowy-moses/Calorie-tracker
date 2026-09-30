import assert from 'node:assert/strict';
import test from 'node:test';
import { DAVID_ID, PEOPLE, activeProfileId, ownerId, ownsRecord, setActiveProfileId } from './db.js';

test('David and Brittney are the two people on this phone', () => {
  assert.deepEqual(
    PEOPLE.map((person) => person.id),
    ['david', 'brittney'],
  );
  assert.equal(DAVID_ID, 'david');
});

test('a meal with no profile stays with David and does not show for Brittney', () => {
  assert.equal(ownerId({ name: 'Oats' }), 'david');
  assert.equal(ownerId({ name: 'Oats', profileId: 'david' }), 'david');
  assert.equal(ownsRecord({ name: 'Oats' }, 'david'), true);
  assert.equal(ownsRecord({ name: 'Oats', profileId: 'david' }, 'brittney'), false);
  assert.equal(ownsRecord({ name: 'Salad', profileId: 'brittney' }, 'brittney'), true);
  assert.equal(ownsRecord({ name: 'Salad', profileId: 'brittney' }, 'david'), false);
  assert.equal(ownsRecord(null, 'david'), false);
});

test('switching person rejects an unknown id and keeps the choice in memory', () => {
  const start = activeProfileId();
  assert.equal(setActiveProfileId('someone-else'), start);
  assert.equal(activeProfileId(), start);
  assert.equal(setActiveProfileId('brittney'), 'brittney');
  assert.equal(activeProfileId(), 'brittney');
  assert.equal(setActiveProfileId('david'), 'david');
  assert.equal(activeProfileId(), 'david');
});
