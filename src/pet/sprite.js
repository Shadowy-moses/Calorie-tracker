import { GRIDS, PALETTE } from './art.js';

export function gridFor(stage, mood = 'content') {
  const group = GRIDS[stage];
  if (!group) throw new Error(`Unknown pet stage ${stage}`);
  return group[mood] || group.content;
}

export function spriteMarkup(stage, mood = 'content', pixel = 4) {
  const rows = gridFor(stage, mood);
  const width = rows[0].length * pixel;
  const height = rows.length * pixel;
  const buckets = new Map();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || !PALETTE[ch]) return;
      if (!buckets.has(ch)) buckets.set(ch, []);
      const px = x * pixel;
      const py = y * pixel;
      buckets.get(ch).push(`M${px} ${py}h${pixel}v${pixel}H${px}Z`);
    });
  });
  const paths = [...buckets]
    .map(([ch, commands]) => `<path fill="${PALETTE[ch]}" d="${commands.join('')}"></path>`)
    .join('');
  const sparkles =
    mood === 'happy'
      ? '<span class="pet-spark"></span><span class="pet-spark two"></span>'
      : '';
  return `<div class="pet-anchor stage-${stage} mood-${mood}">${sparkles}<div class="pet-bob"><svg class="pet-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges" aria-hidden="true">${paths}</svg></div></div>`;
}
