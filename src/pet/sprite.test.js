import assert from 'node:assert/strict';
import test from 'node:test';
import { creatureSvg } from './creatures.js';
import { PET_STAGES } from './rules.js';
import { ROSTER } from './roster.js';

test('each creature has five different forms and its own egg', () => {
  const eggs = new Set();
  for (const species of ROSTER) {
    const forms = PET_STAGES.map((stage) => creatureSvg(species.id, stage.id, 'content'));
    assert.equal(new Set(forms).size, 5, species.id);
    for (const form of forms) {
      assert.match(form, /<(path|ellipse|polygon)/);
      assert.match(form, /stroke="#2a241c"/);
    }
    eggs.add(forms[0]);
    for (const stage of PET_STAGES) {
      assert.notEqual(
        creatureSvg(species.id, stage.id, 'hungry'),
        creatureSvg(species.id, stage.id, 'content'),
        `${species.id} ${stage.id}`,
      );
    }
  }
  assert.equal(eggs.size, ROSTER.length);
});
