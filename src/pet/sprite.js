import { creatureSvg } from './creatures.js';

export function spriteMarkup(speciesId, stage, mood = 'content', size = 120) {
  const height = Math.round(size * 0.9);
  const sparkles =
    mood === 'happy' ? '<span class="pet-spark"></span><span class="pet-spark two"></span>' : '';
  return `<div class="pet-anchor stage-${stage} mood-${mood}">${sparkles}<div class="pet-bob"><svg class="pet-svg" width="${size}" height="${height}" viewBox="0 0 200 180" aria-hidden="true">${creatureSvg(speciesId, stage, mood)}</svg></div></div>`;
}
