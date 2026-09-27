/**
 * Original creatures. Each stage changes the silhouette: ears, tails, limbs,
 * frills, wings, and shells appear or rearrange. Nothing here is a scaled copy.
 */

import { ear, face, flame, gloss, line, oval, poly, roundRect, shade, shape } from './paint.js';

const FLAME = ['#ff7a2f', '#ffe08a'];

function puff(stage, mood) {
  const cloud = '#f5f8ff';
  const shadow = '#c5d6ee';
  const feet = '#f6c6d4';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#f7b7c9', nose: '#f08aa3', gap: 13, mouth: 15 });
  if (stage === 'egg') {
    return [
      oval(98, 112, 34, 30, cloud),
      oval(64, 124, 22, 18, cloud),
      oval(134, 122, 24, 18, cloud),
      shade(112, 128, 16, 8, shadow),
      gloss(82, 98, 10, 7),
      look(98, 112, 0.68),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      oval(100, 116, 40, 36, cloud),
      ear(76, 78, 10, 14, cloud, '#f7b7c9'),
      ear(124, 78, 10, 14, cloud, '#f7b7c9'),
      oval(82, 150, 10, 6, feet),
      oval(118, 150, 10, 6, feet),
      shade(112, 132, 18, 10, shadow),
      gloss(82, 100, 12, 8),
      look(100, 112, 0.86),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      oval(146, 126, 16, 13, cloud),
      oval(94, 118, 38, 34, cloud),
      ear(70, 64, 11, 26, cloud, '#f7b7c9'),
      ear(122, 70, 11, 22, cloud, '#f7b7c9', 16),
      oval(76, 152, 11, 7, feet),
      oval(112, 152, 11, 7, feet),
      shade(104, 134, 16, 9, shadow),
      gloss(76, 100, 12, 8),
      look(94, 112, 0.9),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      oval(154, 118, 18, 15, cloud),
      oval(168, 98, 12, 11, cloud),
      oval(96, 112, 34, 44, cloud),
      oval(92, 70, 28, 26, cloud),
      ear(66, 36, 11, 28, cloud, '#f7b7c9'),
      ear(120, 58, 12, 24, cloud, '#f7b7c9', 68),
      oval(74, 158, 12, 7, feet),
      oval(114, 158, 12, 7, feet),
      shade(104, 128, 14, 16, shadow),
      gloss(78, 58, 10, 7),
      look(90, 68, 0.92),
    ].join('');
  }
  return [
    oval(156, 108, 22, 18, cloud),
    oval(176, 86, 14, 13, cloud),
    oval(168, 132, 18, 14, cloud),
    oval(86, 114, 32, 46, cloud),
    oval(78, 62, 30, 28, cloud),
    ear(52, 24, 12, 30, cloud, '#f7b7c9'),
    ear(114, 66, 13, 28, cloud, '#f7b7c9', 76),
    oval(58, 86, 8, 12, cloud),
    oval(70, 160, 12, 7, feet),
    oval(108, 160, 12, 7, feet),
    shade(96, 130, 14, 18, shadow),
    gloss(64, 50, 11, 7),
    look(76, 60, 1),
  ].join('');
}

function dozie(stage, mood) {
  const fur = '#f08a3c';
  const shadow = '#d26522';
  const belly = '#fff3e2';
  const tip = '#6b3a22';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#f3b089', nose: '#5c3318', gap: 12, mouth: 15, sleepy: true });
  if (stage === 'egg') {
    return [
      oval(100, 118, 32, 38, fur),
      shade(112, 132, 14, 16, shadow),
      shape('M78 86 Q100 48 122 86 Q108 78 100 92 Q92 78 78 86 Z', '#f7f3ea'),
      oval(100, 52, 8, 8, '#f7f3ea'),
      gloss(84, 104, 8, 10),
      look(100, 118, 0.7),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      oval(108, 124, 14, 10, fur),
      oval(100, 114, 40, 36, fur),
      ear(74, 78, 12, 16, fur, tip),
      ear(126, 78, 12, 16, fur, tip),
      shade(100, 128, 22, 14, belly),
      gloss(80, 98, 10, 8),
      look(100, 108, 0.82),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      oval(148, 132, 18, 12, fur),
      oval(164, 126, 8, 8, tip, { stroke: 'none' }),
      oval(96, 118, 36, 40, fur),
      shade(96, 132, 20, 16, belly),
      ear(68, 70, 13, 22, fur, tip),
      ear(124, 74, 12, 18, fur, tip, 12),
      oval(78, 156, 11, 7, shadow),
      oval(114, 156, 11, 7, shadow),
      gloss(78, 100, 10, 8),
      look(96, 110, 0.9),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      oval(150, 128, 34, 22, fur),
      oval(176, 112, 12, 12, tip, { stroke: 'none' }),
      oval(92, 120, 34, 42, fur),
      shade(90, 136, 18, 16, belly),
      oval(88, 74, 26, 24, fur),
      ear(64, 46, 12, 26, fur, tip),
      ear(114, 52, 12, 22, fur, tip),
      oval(74, 160, 11, 7, shadow),
      oval(108, 160, 11, 7, shadow),
      gloss(74, 64, 9, 7),
      look(88, 72, 0.92),
    ].join('');
  }
  return [
    oval(118, 124, 52, 28, fur),
    shade(124, 134, 28, 12, belly),
    oval(148, 108, 30, 16, fur),
    oval(168, 96, 12, 10, tip, { stroke: 'none' }),
    oval(62, 112, 28, 26, fur),
    ear(42, 84, 12, 22, fur, tip),
    ear(80, 82, 11, 18, fur, tip, 18),
    oval(108, 150, 16, 8, shadow),
    gloss(50, 100, 8, 6),
    look(60, 110, 0.88),
  ].join('');
}

function pebble(stage, mood) {
  const body = '#7eb0c6';
  const shadow = '#4f7890';
  const belly = '#f7f1e4';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#f0b0b4', nose: '#e07a8c', gap: 14, mouth: 16 });
  const whisk = (cx, cy) =>
    [line(cx - 18, cy, cx - 34, cy - 4, { sw: 2.4 }), line(cx + 18, cy, cx + 34, cy - 4, { sw: 2.4 }), line(cx - 16, cy + 6, cx - 30, cy + 8, { sw: 2.4 }), line(cx + 16, cy + 6, cx + 30, cy + 8, { sw: 2.4 })].join('');
  if (stage === 'egg') {
    return [
      oval(100, 108, 34, 42, body),
      shade(112, 124, 14, 20, shadow),
      gloss(82, 86, 10, 16, 0.8),
      shape('M86 70 Q100 78 92 108', 'none', { stroke: '#fff', sw: 4 }),
      look(100, 112, 0.62),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      oval(100, 120, 52, 32, body),
      shade(100, 132, 28, 12, belly),
      gloss(72, 108, 14, 8),
      look(100, 114, 0.8),
      whisk(100, 124),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      oval(46, 132, 16, 10, body, { transform: 'rotate(-24 46 132)' }),
      oval(154, 132, 16, 10, body, { transform: 'rotate(24 154 132)' }),
      oval(100, 118, 46, 34, body),
      shade(100, 130, 26, 14, belly),
      gloss(74, 104, 12, 8),
      look(100, 110, 0.86),
      whisk(100, 122),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      oval(156, 132, 18, 12, body),
      oval(40, 124, 18, 11, body, { transform: 'rotate(-30 40 124)' }),
      oval(150, 112, 16, 10, body, { transform: 'rotate(18 150 112)' }),
      oval(96, 120, 48, 30, body),
      shade(96, 132, 24, 12, belly),
      oval(70, 96, 22, 18, body),
      gloss(58, 88, 8, 6),
      look(70, 94, 0.78),
      whisk(70, 104),
    ].join('');
  }
  return [
    oval(118, 118, 40, 46, body),
    shade(118, 132, 22, 24, belly),
    oval(108, 128, 4, 4, shadow, { stroke: 'none' }),
    oval(122, 140, 4, 4, shadow, { stroke: 'none' }),
    oval(112, 116, 3.5, 3.5, shadow, { stroke: 'none' }),
    oval(78, 96, 14, 18, body, { transform: 'rotate(-40 78 96)' }),
    oval(150, 96, 14, 18, body, { transform: 'rotate(40 150 96)' }),
    oval(128, 162, 16, 8, shadow),
    gloss(96, 90, 10, 8),
    look(112, 96, 0.9),
    whisk(112, 108),
  ].join('');
}

function mallow(stage, mood) {
  const puff = '#fff6f2';
  const shadow = '#f0cfc4';
  const cocoa = '#c48468';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#f3b0b0', nose: '#e08978', gap: 13, mouth: 15 });
  if (stage === 'egg') {
    return [
      roundRect(68, 58, 64, 92, 28, puff),
      shade(100, 112, 16, 28, shadow),
      shape('M100 64 V144', 'none', { stroke: '#e7c2b6', sw: 3 }),
      gloss(82, 78, 8, 12),
      look(100, 108, 0.66),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      roundRect(58, 78, 84, 72, 26, puff),
      oval(78, 70, 12, 10, cocoa),
      oval(122, 70, 12, 10, cocoa),
      shade(100, 118, 22, 16, shadow),
      gloss(78, 96, 10, 8),
      look(100, 112, 0.84),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      roundRect(62, 86, 76, 64, 26, puff),
      oval(100, 96, 16, 12, puff),
      oval(74, 64, 14, 14, cocoa),
      oval(128, 66, 14, 14, cocoa),
      roundRect(42, 108, 22, 16, 8, puff),
      roundRect(136, 108, 22, 16, 8, puff),
      shade(100, 124, 18, 12, shadow),
      gloss(80, 100, 8, 6),
      look(100, 108, 0.86),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      oval(78, 150, 16, 12, puff),
      oval(124, 150, 16, 12, puff),
      oval(100, 116, 40, 36, puff),
      oval(100, 74, 30, 28, puff),
      ear(74, 48, 14, 16, cocoa, '#e7b39a'),
      ear(126, 48, 14, 16, cocoa, '#e7b39a'),
      oval(62, 112, 12, 10, puff),
      oval(138, 112, 12, 10, puff),
      shade(100, 128, 18, 14, shadow),
      gloss(84, 62, 9, 7),
      look(100, 74, 0.92),
    ].join('');
  }
  return [
    roundRect(70, 118, 22, 40, 12, puff),
    roundRect(112, 118, 22, 40, 12, puff),
    oval(102, 104, 36, 32, puff),
    oval(100, 62, 32, 30, puff),
    ear(70, 34, 16, 16, cocoa, '#e7b39a'),
    ear(130, 34, 16, 16, cocoa, '#e7b39a'),
    oval(46, 96, 16, 14, puff),
    oval(158, 96, 16, 14, puff),
    shade(102, 116, 16, 12, shadow),
    gloss(84, 50, 10, 7),
    look(100, 62, 1),
  ].join('');
}

function pip(stage, mood) {
  const cream = '#f6ead2';
  const shadow = '#d7bc96';
  const wing = '#d0894a';
  const tuft = '#8d5a32';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#f0c0a0', nose: '#c9844a', gap: 16, mouth: 18 });
  const speck = (x, y) => oval(x, y, 3, 3, '#e2b43a', { stroke: 'none' });
  if (stage === 'egg') {
    return [
      shape('M76 124 H124 L116 156 Q100 166 84 156 Z', '#efe4d0'),
      shape('M124 130 Q142 134 136 148 Q122 144 120 136', 'none', { sw: 4.5 }),
      oval(100, 96, 28, 34, cream),
      shade(112, 108, 10, 16, shadow),
      speck(86, 88),
      speck(112, 80),
      speck(108, 108),
      gloss(84, 80, 8, 10),
      look(100, 98, 0.62),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      oval(100, 108, 42, 38, cream),
      oval(62, 112, 14, 10, wing),
      oval(138, 112, 14, 10, wing),
      shade(100, 124, 20, 12, shadow),
      gloss(78, 88, 12, 8),
      look(100, 104, 0.95),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      oval(100, 118, 34, 32, cream),
      oval(58, 112, 20, 14, wing, { transform: 'rotate(-18 58 112)' }),
      oval(142, 112, 20, 14, wing, { transform: 'rotate(18 142 112)' }),
      poly([[86, 62], [78, 36], [98, 58]], tuft),
      poly([[114, 62], [122, 36], [102, 58]], tuft),
      shade(100, 132, 16, 10, shadow),
      gloss(82, 96, 8, 6),
      look(100, 108, 0.9),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      oval(100, 124, 30, 28, cream),
      oval(100, 84, 32, 28, cream),
      oval(52, 108, 26, 16, wing, { transform: 'rotate(-24 52 108)' }),
      oval(148, 108, 26, 16, wing, { transform: 'rotate(24 148 108)' }),
      poly([[84, 52], [74, 22], [98, 50]], tuft),
      poly([[116, 52], [126, 22], [102, 50]], tuft),
      shape('M86 150 L78 164 M100 154 L100 166 M114 150 L122 164', 'none', { sw: 4 }),
      gloss(84, 72, 8, 6),
      look(100, 82, 0.95),
    ].join('');
  }
  return [
    oval(100, 112, 28, 32, cream),
    oval(100, 74, 30, 26, cream),
    shape('M78 100 C40 70 28 118 70 132 C60 112 70 104 78 100 Z', wing),
    shape('M122 100 C160 70 172 118 130 132 C140 112 130 104 122 100 Z', wing),
    poly([[86, 46], [70, 12], [100, 44]], tuft),
    poly([[114, 46], [130, 12], [100, 44]], tuft),
    shape('M88 146 L76 164 M100 150 L100 168 M112 146 L124 164', 'none', { sw: 4.5 }),
    gloss(84, 64, 8, 6),
    look(100, 72, 1),
  ].join('');
}

function ember(stage, mood) {
  const hide = '#3e3b46';
  const belly = '#f0a05a';
  const frill = '#e25b3a';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#e08a62', nose: '#2a241c', gap: 11, mouth: 13, sharp: true });
  const legs = (spots) => spots.map(([x, y]) => roundRect(x, y, 14, 18, 6, hide)).join('');
  if (stage === 'egg') {
    return [
      oval(100, 108, 34, 42, hide),
      shade(112, 122, 12, 18, '#2a2730'),
      shape('M78 86 L96 112 L84 140', 'none', { stroke: '#ffb15a', sw: 4 }),
      shape('M118 74 L108 108 L128 138', 'none', { stroke: '#ff7a2f', sw: 3.5 }),
      gloss(80, 84, 8, 10),
      look(100, 108, 0.6),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      legs([[58, 132], [86, 136], [112, 136], [138, 130]]),
      oval(100, 116, 42, 30, hide),
      shade(100, 124, 22, 12, belly),
      flame(100, 78, 0.55, FLAME),
      oval(132, 124, 12, 8, hide),
      gloss(78, 104, 10, 6),
      look(92, 108, 0.72),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      legs([[48, 134], [78, 140], [112, 140], [146, 132]]),
      oval(96, 116, 50, 26, hide),
      shade(96, 124, 24, 10, belly),
      oval(48, 104, 18, 14, hide),
      flame(156, 116, 0.7, FLAME),
      oval(40, 98, 6, 5, frill, { stroke: 'none' }),
      gloss(70, 104, 10, 6),
      look(46, 100, 0.62),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      legs([[40, 136], [72, 142], [108, 142], [148, 134]]),
      oval(96, 118, 54, 24, hide),
      shade(100, 126, 22, 9, belly),
      oval(40, 100, 20, 14, hide),
      poly([[70, 86], [62, 68], [82, 90]], frill),
      poly([[96, 84], [90, 62], [110, 90]], frill),
      poly([[122, 90], [118, 70], [136, 98]], frill),
      flame(168, 112, 0.85, FLAME),
      gloss(28, 92, 6, 4),
      look(36, 96, 0.66),
    ].join('');
  }
  return [
    legs([[36, 138], [70, 146], [112, 146], [156, 136]]),
    oval(100, 120, 58, 26, hide),
    shade(108, 128, 24, 10, belly),
    oval(36, 96, 22, 16, hide),
    poly([[62, 82], [50, 52], [78, 92]], frill),
    poly([[90, 76], [82, 44], [108, 90]], frill),
    poly([[118, 80], [114, 48], [136, 96]], frill),
    poly([[144, 92], [150, 64], [160, 104]], frill),
    flame(176, 108, 1.05, FLAME),
    gloss(24, 86, 6, 4),
    look(32, 92, 0.7),
  ].join('');
}

function volt(stage, mood) {
  const fur = '#313a5e';
  const shadow = '#1c2340';
  const mane = '#ffe14a';
  const belly = '#f4efe4';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#f0c07a', nose: '#1c2340', gap: 12, mouth: 14, sharp: true });
  const bolt = (x, y, s) => poly([[x, y], [x - 10 * s, y + 16 * s], [x - 2 * s, y + 16 * s], [x - 12 * s, y + 34 * s], [x + 8 * s, y + 14 * s], [x, y + 14 * s]], mane, { sw: 3.5 });
  if (stage === 'egg') {
    return [
      oval(100, 110, 34, 42, fur),
      shade(114, 124, 12, 16, shadow),
      bolt(112, 72, 0.9),
      gloss(80, 88, 8, 10),
      look(96, 112, 0.58),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      oval(100, 118, 40, 34, fur),
      shade(100, 130, 20, 12, belly),
      ear(72, 86, 14, 20, fur, mane, 28),
      ear(128, 86, 14, 20, fur, mane, -28),
      oval(132, 136, 12, 8, fur),
      gloss(80, 104, 10, 7),
      look(100, 112, 0.82),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      oval(104, 120, 46, 30, fur),
      shade(104, 130, 20, 12, belly),
      shape('M70 112 H130', 'none', { stroke: mane, sw: 8 }),
      ear(62, 78, 12, 26, fur, mane),
      ear(112, 70, 12, 28, fur, mane),
      oval(150, 132, 16, 10, fur),
      roundRect(70, 142, 14, 16, 6, fur),
      roundRect(120, 142, 14, 16, 6, fur),
      gloss(78, 100, 8, 6),
      look(86, 104, 0.8),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      oval(108, 122, 48, 28, fur),
      shade(112, 132, 18, 10, belly),
      poly([[70, 100], [58, 70], [84, 96]], mane),
      poly([[96, 92], [90, 58], [112, 94]], mane),
      poly([[120, 96], [124, 64], [136, 102]], mane),
      ear(48, 86, 11, 24, fur, mane),
      oval(40, 104, 18, 14, fur),
      bolt(160, 108, 0.7),
      roundRect(78, 144, 14, 16, 6, fur),
      roundRect(124, 144, 14, 16, 6, fur),
      look(40, 100, 0.66),
    ].join('');
  }
  return [
    roundRect(78, 132, 16, 28, 7, fur),
    roundRect(118, 128, 16, 30, 7, fur),
    roundRect(48, 118, 14, 22, 6, fur),
    oval(112, 108, 46, 32, fur),
    shade(118, 120, 18, 12, belly),
    oval(52, 96, 24, 20, fur),
    poly([[40, 92], [22, 52], [58, 84]], mane),
    poly([[62, 78], [58, 36], [86, 74]], mane),
    poly([[86, 86], [100, 40], [108, 90]], mane),
    poly([[108, 96], [130, 58], [124, 108]], mane),
    ear(30, 78, 10, 22, fur, mane),
    bolt(162, 100, 0.85),
    gloss(40, 86, 6, 4),
    look(46, 94, 0.72),
  ].join('');
}

function prism(stage, mood) {
  const gem = '#7ee0d0';
  const deep = '#3aa89c';
  const wing = '#d4c4ff';
  const horn = '#6a5aaa';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#b7ece4', nose: '#2a241c', gap: 12, mouth: 14, sharp: true });
  if (stage === 'egg') {
    return [
      poly([[100, 46], [146, 74], [146, 122], [100, 150], [54, 122], [54, 74]], gem),
      poly([[100, 62], [128, 80], [120, 118], [100, 104]], '#d9fff8', { stroke: 'none' }),
      poly([[100, 104], [120, 118], [100, 136], [80, 118]], deep, { stroke: 'none' }),
      look(100, 104, 0.62),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      poly([[100, 58], [148, 92], [136, 142], [64, 142], [52, 92]], gem),
      poly([[46, 104], [28, 96], [46, 124]], wing),
      poly([[154, 104], [172, 96], [154, 124]], wing),
      gloss(84, 86, 10, 8, 0.65),
      look(100, 108, 0.8),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      poly([[108, 78], [150, 108], [138, 146], [70, 146], [64, 108]], gem),
      poly([[64, 108], [28, 100], [58, 92]], gem),
      poly([[40, 96], [18, 78], [36, 114]], wing),
      poly([[150, 100], [176, 84], [158, 122]], wing),
      poly([[96, 64], [108, 40], [118, 70]], horn),
      look(78, 104, 0.66),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      poly([[120, 118], [156, 132], [140, 156], [84, 156], [78, 128]], gem),
      poly([[78, 120], [96, 70], [118, 108]], gem),
      poly([[96, 78], [70, 48], [92, 96]], wing),
      poly([[112, 74], [132, 40], [128, 92]], wing),
      poly([[150, 140], [176, 132], [158, 156]], horn),
      poly([[100, 52], [112, 28], [122, 58]], horn),
      look(92, 86, 0.6),
    ].join('');
  }
  return [
    poly([[118, 112], [162, 126], [150, 158], [78, 158], [70, 124]], gem),
    poly([[78, 116], [104, 58], [124, 104]], gem),
    poly([[86, 78], [18, 46], [24, 96], [70, 108]], wing),
    poly([[112, 70], [168, 28], [176, 78], [130, 100]], wing),
    poly([[150, 146], [188, 138], [162, 164]], horn),
    poly([[96, 48], [108, 18], [122, 52]], horn),
    poly([[118, 46], [132, 22], [136, 56]], horn),
    poly([[96, 70], [112, 86], [100, 78]], '#d9fff8', { stroke: 'none' }),
    look(96, 78, 0.64),
  ].join('');
}

function reef(stage, mood) {
  const body = '#2aa7b0';
  const shadow = '#146e7a';
  const belly = '#f4f7ea';
  const spot = '#f2c14e';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#f0c48a', gap: 12, mouth: 12 });
  const dot = (x, y, r = 5) => oval(x, y, r, r * 0.8, spot, { stroke: 'none' });
  if (stage === 'egg') {
    return [
      oval(100, 112, 36, 32, '#f3e6c8'),
      shape('M100 78 C132 80 138 112 114 120 C96 126 84 112 90 100 C96 90 112 92 108 104', 'none', { stroke: '#e2c98a', sw: 7 }),
      shade(118, 124, 10, 12, '#e4d2a4'),
      look(100, 112, 0.55),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      oval(100, 112, 34, 28, body),
      shade(100, 122, 16, 8, belly),
      gloss(82, 100, 8, 5),
      look(100, 108, 0.7),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      oval(100, 114, 48, 26, body),
      shade(100, 122, 22, 10, belly),
      shape('M140 114 C156 104 160 128 146 126', 'none', { stroke: shadow, sw: 6 }),
      dot(78, 108),
      dot(120, 100, 4),
      gloss(72, 104, 10, 5),
      look(96, 110, 0.72),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      shape('M100 96 C52 78 24 118 70 132 C86 118 90 112 100 116 C110 112 114 118 130 132 C176 118 148 78 100 96 Z', body),
      shade(100, 118, 22, 8, belly),
      poly([[78, 96], [70, 78], [90, 98]], body),
      poly([[122, 96], [130, 78], [110, 98]], body),
      shape('M128 120 C150 112 156 140 140 136', 'none', { stroke: shadow, sw: 5 }),
      dot(70, 112),
      dot(112, 108, 4),
      dot(96, 124, 3.5),
      look(100, 108, 0.62),
    ].join('');
  }
  return [
    shape('M100 92 C40 60 8 120 62 140 C84 118 90 110 100 116 C110 110 116 118 138 140 C192 120 160 60 100 92 Z', body),
    shade(100, 116, 26, 8, belly),
    poly([[74, 90], [62, 66], [90, 96]], body),
    poly([[126, 90], [138, 66], [110, 96]], body),
    shape('M136 118 C168 108 172 150 148 142', 'none', { stroke: shadow, sw: 6 }),
    dot(58, 112),
    dot(86, 104),
    dot(118, 100, 4),
    dot(104, 124, 3.5),
    dot(140, 112, 4),
    look(100, 106, 0.66),
  ].join('');
}

function knox(stage, mood) {
  const iron = '#8d97a3';
  const shadow = '#5c6670';
  const copper = '#d4894a';
  const belly = '#f3e6d2';
  const look = (cx, cy, s) => face(cx, cy, mood, s, { blush: '#e7b8a4', nose: '#5c6670', gap: 12, mouth: 14 });
  const rivet = (x, y) => oval(x, y, 3.2, 3.2, copper, { sw: 2 });
  if (stage === 'egg') {
    return [
      roundRect(64, 62, 72, 84, 36, iron),
      shade(112, 104, 16, 28, shadow),
      rivet(78, 84),
      rivet(122, 84),
      rivet(78, 124),
      rivet(122, 124),
      gloss(80, 80, 8, 10),
      look(100, 108, 0.62),
    ].join('');
  }
  if (stage === 'baby') {
    return [
      oval(100, 116, 42, 34, iron),
      shade(100, 128, 20, 12, belly),
      roundRect(62, 140, 16, 14, 6, shadow),
      roundRect(122, 140, 16, 14, 6, shadow),
      rivet(70, 100),
      rivet(130, 104),
      gloss(78, 100, 10, 6),
      look(100, 110, 0.82),
    ].join('');
  }
  if (stage === 'kid') {
    return [
      oval(104, 118, 46, 32, iron),
      shade(108, 128, 18, 12, belly),
      poly([[70, 96], [78, 74], [92, 98]], copper),
      shape('M70 100 H138', 'none', { stroke: shadow, sw: 3 }),
      roundRect(58, 142, 16, 14, 6, shadow),
      roundRect(128, 142, 16, 14, 6, shadow),
      rivet(124, 104),
      gloss(80, 104, 8, 6),
      look(96, 112, 0.78),
    ].join('');
  }
  if (stage === 'teen') {
    return [
      oval(108, 118, 48, 32, iron),
      shade(116, 128, 16, 12, belly),
      shape('M78 108 C70 70 108 64 96 108', 'none', { stroke: copper, sw: 8 }),
      poly([[150, 100], [168, 112], [150, 124]], iron),
      shape('M78 112 H150', 'none', { stroke: shadow, sw: 3 }),
      roundRect(64, 144, 18, 16, 6, shadow),
      roundRect(132, 144, 18, 16, 6, shadow),
      rivet(120, 100),
      rivet(136, 118),
      look(92, 112, 0.74),
    ].join('');
  }
  return [
    roundRect(70, 136, 18, 24, 8, shadow),
    roundRect(108, 140, 18, 22, 8, shadow),
    roundRect(142, 132, 16, 20, 7, shadow),
    oval(112, 112, 50, 34, iron),
    shade(124, 124, 18, 14, belly),
    shape('M70 104 C58 48 118 52 100 108', 'none', { stroke: copper, sw: 10 }),
    poly([[156, 96], [184, 112], [156, 128]], iron),
    shape('M72 108 H156', 'none', { stroke: shadow, sw: 3.5 }),
    rivet(128, 92),
    rivet(146, 108),
    rivet(132, 124),
    gloss(88, 92, 8, 6),
    look(96, 106, 0.8),
  ].join('');
}

const DRAW = { puff, dozie, pebble, mallow, pip, ember, volt, prism, reef, knox };

export function creatureSvg(speciesId, stage, mood = 'content') {
  const draw = DRAW[speciesId] || DRAW.puff;
  const safeMood = mood === 'hungry' || mood === 'happy' ? mood : 'content';
  const safeStage = ['egg', 'baby', 'kid', 'teen', 'adult'].includes(stage) ? stage : 'egg';
  return draw(safeStage, safeMood);
}
