import assert from 'node:assert/strict';
import test from 'node:test';
import { GRIDS, PALETTE } from './art.js';
import { PET_STAGES } from './rules.js';

test('each stage is a bigger sprite than the one before it', () => {
  let previousArea = 0;
  let previousOpaque = 0;
  for (const stage of PET_STAGES) {
    const rows = GRIDS[stage.id].content;
    const area = rows.length * rows[0].length;
    const opaque = [...rows.join('')].filter((cell) => cell !== '.').length;
    assert.ok(area > previousArea, `${stage.id} area ${area} should exceed ${previousArea}`);
    assert.ok(opaque > previousOpaque, `${stage.id} pixels ${opaque} should exceed ${previousOpaque}`);
    previousArea = area;
    previousOpaque = opaque;
  }
});

test('moods stay the same size, use the palette, and change the face', () => {
  for (const stage of PET_STAGES) {
    const content = GRIDS[stage.id].content;
    const width = content[0].length;
    for (const mood of ['content', 'happy', 'hungry']) {
      const rows = GRIDS[stage.id][mood];
      assert.equal(rows.length, content.length, `${stage.id} ${mood} height`);
      assert.ok(rows.every((row) => row.length === width), `${stage.id} ${mood} width`);
      for (const cell of rows.join('')) {
        assert.ok(cell === '.' || PALETTE[cell], `${stage.id} ${mood} has ${cell}`);
      }
    }
    assert.notEqual(GRIDS[stage.id].hungry.join('\n'), content.join('\n'));
    assert.notEqual(GRIDS[stage.id].happy.join('\n'), content.join('\n'));
  }
});
