/**
 * Pixel creatures drawn in code. Each stage is an ellipse body with a face,
 * then ears, arms, a tail, or a nest so the silhouette changes as it grows.
 */

export const PALETTE = {
  k: '#2a241c',
  s: '#f3d7a4',
  S: '#e2bc78',
  h: '#fff6e4',
  d: '#c9923e',
  c: '#f6c043',
  C: '#e0962a',
  a: '#ffe3a1',
  Y: '#fffdf8',
  w: '#ffffff',
  Z: '#2a241c',
  b: '#f29a90',
  m: '#7a463c',
  o: '#f6b7a8',
  g: '#3c9d5f',
  G: '#1d6b40',
  n: '#e0b15a',
  N: '#b5813a',
  r: '#d4654a',
};

const INSIDE = new Set(['s', 'S', 'h', 'c', 'C', 'a', 'd']);

const SPECS = {
  egg: {
    w: 16,
    h: 18,
    cx: 8,
    cy: 8.2,
    rx: 5.35,
    ry: 6.05,
    fill: 's',
    shade: 'S',
    leaves: 0,
    nest: true,
    eyes: 'small',
    speckles: true,
  },
  baby: {
    w: 18,
    h: 22,
    cx: 9,
    cy: 12.2,
    rx: 6.15,
    ry: 5.7,
    fill: 'c',
    shade: 'C',
    leaves: 1,
    feet: true,
    shellBits: true,
    eyes: 'medium',
    belly: { rx: 2.7, ry: 2.05, dy: 1.5 },
  },
  kid: {
    w: 22,
    h: 26,
    cx: 11,
    cy: 14.4,
    rx: 7.35,
    ry: 6.7,
    fill: 'c',
    shade: 'C',
    leaves: 1,
    feet: true,
    arms: true,
    eyes: 'medium',
    belly: { rx: 3.3, ry: 2.5, dy: 1.7 },
  },
  teen: {
    w: 26,
    h: 32,
    cx: 12.6,
    cy: 17.6,
    rx: 8.3,
    ry: 8.35,
    fill: 'c',
    shade: 'C',
    leaves: 2,
    feet: true,
    arms: true,
    tail: true,
    eyes: 'medium',
    belly: { rx: 3.8, ry: 2.9, dy: 2.1 },
  },
  adult: {
    w: 30,
    h: 36,
    cx: 14.6,
    cy: 19.8,
    rx: 10.3,
    ry: 9.7,
    fill: 'c',
    shade: 'C',
    leaves: 3,
    feet: true,
    arms: true,
    tail: true,
    eyes: 'large',
    belly: { rx: 4.8, ry: 3.5, dy: 2.4 },
  },
};

function blank(w, h) {
  return Array.from({ length: h }, () => Array(w).fill('.'));
}

function stamp(grid, x, y, rows) {
  rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch === '.') return;
      const yy = y + dy;
      const xx = x + dx;
      if (yy < 0 || xx < 0 || yy >= grid.length || xx >= grid[0].length) return;
      grid[yy][xx] = ch;
    });
  });
}

function stampInside(grid, x, y, rows) {
  rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch === '.') return;
      const yy = y + dy;
      const xx = x + dx;
      if (yy < 0 || xx < 0 || yy >= grid.length || xx >= grid[0].length) return;
      if (!INSIDE.has(grid[yy][xx])) return;
      grid[yy][xx] = ch;
    });
  });
}

function fillEllipse(grid, cx, cy, rx, ry, fill, shade, outline = 'k') {
  const edgeRx = Math.max(rx - 0.95, 1);
  const edgeRy = Math.max(ry - 0.95, 1);
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[0].length; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1) continue;
      const edge = (dx * dx) / (edgeRx * edgeRx) + (dy * dy) / (edgeRy * edgeRy) > 1;
      if (edge) grid[y][x] = outline;
      else grid[y][x] = shade && dx > rx * 0.12 && dy > ry * 0.02 ? shade : fill;
    }
  }
}

function fillBelly(grid, cx, cy, rx, ry) {
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[0].length; x += 1) {
      if (!INSIDE.has(grid[y][x])) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) grid[y][x] = 'a';
    }
  }
}

function paintInside(grid, x, y, ch) {
  const yy = Math.round(y);
  const xx = Math.round(x);
  if (grid[yy] && INSIDE.has(grid[yy][xx])) grid[yy][xx] = ch;
}

function bodyBounds(grid) {
  let minX = Infinity;
  let maxX = -1;
  let minY = Infinity;
  let maxY = -1;
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[0].length; x += 1) {
      if (grid[y][x] === '.') continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, maxX, minY, maxY };
}

function stampDecor(grid, x, y, rows) {
  rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch === '.') return;
      const yy = y + dy;
      const xx = x + dx;
      if (yy < 0 || xx < 0 || yy >= grid.length || xx >= grid[0].length) return;
      const current = grid[yy][xx];
      if (current !== '.' && current !== 'k') return;
      grid[yy][xx] = ch;
    });
  });
}

function stampCrown(grid, cx, minY, count) {
  const sprout = ['.G.', 'gGg', '.G.', '.g.'];
  if (count <= 1) {
    stampDecor(grid, Math.round(cx - 1), minY - sprout.length + 1, sprout);
    return;
  }
  const left = ['G.', 'Gg', 'g.'];
  const right = ['.G', 'gG', '.g'];
  if (count === 2) {
    stampDecor(grid, Math.round(cx - 6), minY - left.length + 1, left);
    stampDecor(grid, Math.round(cx + 3), minY - right.length + 1, right);
    return;
  }
  stampDecor(grid, Math.round(cx - 7), minY - left.length + 1, left);
  stampDecor(grid, Math.round(cx - 1), minY - sprout.length + 1, sprout);
  stampDecor(grid, Math.round(cx + 5), minY - right.length + 1, right);
}

function stampArms(grid, y) {
  if (!grid[y]) return;
  let min = -1;
  let max = -1;
  for (let x = 0; x < grid[y].length; x += 1) {
    if (grid[y][x] === '.') continue;
    if (min < 0) min = x;
    max = x;
  }
  if (min < 0) return;
  if (min >= 2) {
    grid[y][min - 2] = 'k';
    grid[y][min - 1] = 'c';
  }
  if (max + 2 < grid[y].length) {
    grid[y][max + 1] = 'c';
    grid[y][max + 2] = 'k';
  }
}

function stampTail(grid, y) {
  if (!grid[y]) return;
  let max = -1;
  for (let x = 0; x < grid[y].length; x += 1) {
    if (grid[y][x] !== '.') max = x;
  }
  if (max < 0 || max + 3 >= grid[y].length) return;
  grid[y][max + 1] = 'C';
  grid[y][max + 2] = 'C';
  grid[y][max + 3] = 'k';
}

function stampFeet(grid, cx, maxY) {
  const y = maxY + 1;
  if (!grid[y]) return;
  const spread = grid[0].length >= 26 ? 5 : 4;
  stamp(grid, Math.round(cx - spread), y, ['rr', 'kk']);
  stamp(grid, Math.round(cx + spread - 2), y, ['rr', 'kk']);
}

function stampNest(grid, maxY, cx) {
  const width = grid[0].length >= 16 ? 10 : 8;
  const row = 'n'.repeat(width);
  const shade = [...row].map((cell, index) => (index % 3 === 0 ? 'N' : cell)).join('');
  stamp(grid, Math.round(cx - width / 2), maxY + 1, [row, shade]);
}

function stampShellBits(grid, bounds) {
  const y = bounds.maxY + 1;
  if (!grid[y]) return;
  stamp(grid, bounds.minX - 1, y, ['sS']);
  stamp(grid, bounds.maxX - 1, y, ['Ss']);
}

function eyeRows(size, mood) {
  if (mood === 'hungry') {
    if (size === 'small') return ['kk'];
    if (size === 'large') return ['kkkk'];
    return ['kkk'];
  }
  if (size === 'small') return ['YY', 'YZ'];
  if (size === 'large') return ['YwwY', 'YZZY'];
  return ['YwY', 'YZY'];
}

function stampFace(grid, spec, mood) {
  const eye = eyeRows(spec.eyes, mood);
  const eyeW = eye[0].length;
  const spacing = spec.eyes === 'small' ? 5 : spec.eyes === 'large' ? 8 : 6;
  const eyeY = Math.round(spec.cy - (spec.eyes === 'small' ? 0.4 : 1));
  const left = Math.round(spec.cx - spacing / 2 - eyeW / 2);
  const right = Math.round(spec.cx + spacing / 2 - eyeW / 2);
  stampInside(grid, left, eyeY, eye);
  stampInside(grid, right, eyeY, eye);

  if (mood !== 'hungry') {
    const blush = mood === 'happy' ? ['bb'] : ['b'];
    const blushY = eyeY + eye.length;
    stampInside(grid, left + 1, blushY, blush);
    stampInside(grid, right + (mood === 'happy' ? 0 : 1), blushY, blush);
  }

  const mouthY = Math.round(spec.cy + spec.ry * 0.32);
  if (mood === 'hungry') {
    stampInside(grid, Math.round(spec.cx - 1), mouthY, ['mom']);
    return;
  }
  if (mood === 'happy') {
    stampInside(grid, Math.round(spec.cx - 2), mouthY, ['mmmm']);
    return;
  }
  stampInside(grid, Math.round(spec.cx - 1), mouthY, ['mm']);
}

function trimGrid(grid) {
  let top = 0;
  let bottom = grid.length - 1;
  const empty = (row) => row.every((cell) => cell === '.');
  while (top < bottom && empty(grid[top])) top += 1;
  while (bottom > top && empty(grid[bottom])) bottom -= 1;
  return grid.slice(top, bottom + 1).map((row) => row.join(''));
}

function draw(spec, mood) {
  const grid = blank(spec.w, spec.h);
  fillEllipse(grid, spec.cx, spec.cy, spec.rx, spec.ry, spec.fill, spec.shade);
  if (spec.belly) {
    fillBelly(grid, spec.cx, spec.cy + spec.belly.dy, spec.belly.rx, spec.belly.ry);
  }
  paintInside(grid, spec.cx - spec.rx * 0.38, spec.cy - spec.ry * 0.42, 'h');
  paintInside(grid, spec.cx - spec.rx * 0.38 + 1, spec.cy - spec.ry * 0.42, 'h');
  if (spec.speckles) {
    paintInside(grid, spec.cx + spec.rx * 0.42, spec.cy - spec.ry * 0.2, 'd');
    paintInside(grid, spec.cx - spec.rx * 0.48, spec.cy + spec.ry * 0.22, 'd');
  }
  const bounds = bodyBounds(grid);
  if (spec.leaves) stampCrown(grid, spec.cx, bounds.minY, spec.leaves);
  if (spec.arms) stampArms(grid, Math.round(spec.cy + spec.ry * 0.22));
  if (spec.tail) stampTail(grid, Math.round(spec.cy + spec.ry * 0.5));
  if (spec.feet) stampFeet(grid, spec.cx, bounds.maxY);
  if (spec.nest) stampNest(grid, bounds.maxY, spec.cx);
  if (spec.shellBits) stampShellBits(grid, bounds);
  stampFace(grid, spec, mood);
  return trimGrid(grid);
}

function build() {
  const grids = {};
  for (const [stage, spec] of Object.entries(SPECS)) {
    grids[stage] = {
      content: draw(spec, 'content'),
      happy: draw(spec, 'happy'),
      hungry: draw(spec, 'hungry'),
    };
  }
  return grids;
}

export const GRIDS = build();
