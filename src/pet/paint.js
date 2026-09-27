/** Small helpers for hand-drawn creature art. Strokes scale with the viewBox. */

export const INK = '#2a241c';

function num(value) {
  return Math.round(value * 10) / 10;
}

export function oval(cx, cy, rx, ry, fill, opt = {}) {
  const stroke = opt.stroke === undefined ? INK : opt.stroke;
  const sw = opt.sw === undefined ? (stroke ? 5 : 0) : opt.sw;
  const extra = [
    opt.opacity != null ? ` opacity="${opt.opacity}"` : '',
    opt.transform ? ` transform="${opt.transform}"` : '',
  ].join('');
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ' stroke="none"';
  return `<ellipse cx="${num(cx)}" cy="${num(cy)}" rx="${num(rx)}" ry="${num(ry)}" fill="${fill}"${strokeAttr}${extra}/>`;
}

export function shape(d, fill, opt = {}) {
  const stroke = opt.stroke === undefined ? INK : opt.stroke;
  const sw = opt.sw === undefined ? 5 : opt.sw;
  const extra = [
    opt.opacity != null ? ` opacity="${opt.opacity}"` : '',
    opt.transform ? ` transform="${opt.transform}"` : '',
  ].join('');
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ' stroke="none"';
  return `<path d="${d}" fill="${fill || 'none'}"${strokeAttr}${extra}/>`;
}

export function poly(points, fill, opt) {
  const d = points.map((point, index) => `${index ? 'L' : 'M'}${num(point[0])} ${num(point[1])}`).join('') + 'Z';
  return shape(d, fill, opt);
}

export function roundRect(x, y, w, h, rad, fill, opt) {
  const radius = Math.min(rad, w / 2, h / 2);
  const d = `M${num(x + radius)} ${num(y)} H${num(x + w - radius)} Q${num(x + w)} ${num(y)} ${num(x + w)} ${num(y + radius)} V${num(y + h - radius)} Q${num(x + w)} ${num(y + h)} ${num(x + w - radius)} ${num(y + h)} H${num(x + radius)} Q${num(x)} ${num(y + h)} ${num(x)} ${num(y + h - radius)} V${num(y + radius)} Q${num(x)} ${num(y)} ${num(x + radius)} ${num(y)} Z`;
  return shape(d, fill, opt);
}

export function line(x1, y1, x2, y2, opt = {}) {
  return `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${opt.stroke || INK}" stroke-width="${opt.sw || 3}" stroke-linecap="round"/>`;
}

export function gloss(cx, cy, rx, ry, opacity = 0.7) {
  return oval(cx, cy, rx, ry, '#fff', { stroke: 'none', opacity });
}

export function shade(cx, cy, rx, ry, fill, opacity = 1) {
  return oval(cx, cy, rx, ry, fill, { stroke: 'none', opacity });
}

function eye(cx, cy, mood, s, sharp) {
  const rx = 11.5 * s;
  const open = mood === 'hungry' ? 0.58 : mood === 'sleepy' ? 0.7 : mood === 'happy' ? 1.08 : 1;
  const ry = rx * open * (sharp ? 0.86 : 1);
  const pupil = (mood === 'happy' ? 5.6 : 5) * s;
  const py = cy + (mood === 'hungry' ? 2.4 * s : 1 * s);
  const parts = [
    oval(cx, cy, rx, ry, '#fffef8'),
    oval(cx + 0.6 * s, py, pupil, pupil, '#241c18', { stroke: 'none' }),
    oval(cx - 3.1 * s, cy - ry * 0.32, 2.8 * s, 2.8 * s, '#fff', { stroke: 'none' }),
  ];
  if (mood === 'happy') {
    parts.push(oval(cx + 3.2 * s, cy + ry * 0.22, 1.5 * s, 1.5 * s, '#fff', { stroke: 'none' }));
  }
  if (mood === 'hungry') {
    parts.push(shape(`M${num(cx - rx)} ${num(cy - ry - 1)} Q${num(cx)} ${num(cy - ry + 3 * s)} ${num(cx + rx)} ${num(cy - ry)}`, 'none', { sw: 3.2 }));
  }
  return parts.join('');
}

function mouth(cx, cy, mood, s) {
  if (mood === 'hungry') {
    return shape(`M${num(cx - 7 * s)} ${num(cy + 4 * s)} Q${num(cx)} ${num(cy - 3 * s)} ${num(cx + 7 * s)} ${num(cy + 4 * s)}`, 'none', { sw: 3.2 });
  }
  if (mood === 'happy') {
    return shape(
      `M${num(cx - 9 * s)} ${num(cy)} Q${num(cx)} ${num(cy + 12 * s)} ${num(cx + 9 * s)} ${num(cy)} Q${num(cx)} ${num(cy + 5 * s)} ${num(cx - 9 * s)} ${num(cy)} Z`,
      '#e07a86',
      { sw: 3.2 },
    );
  }
  return shape(`M${num(cx - 6 * s)} ${num(cy)} Q${num(cx)} ${num(cy + 6 * s)} ${num(cx + 6 * s)} ${num(cy)}`, 'none', { sw: 3.2 });
}

export function face(cx, cy, mood, s = 1, opt = {}) {
  const gap = (opt.gap ?? 15) * s;
  const blush = opt.blush || '#f3a8b6';
  const sharp = Boolean(opt.sharp);
  const eyeMood = opt.sleepy && mood === 'content' ? 'sleepy' : mood;
  const parts = [];
  if (mood !== 'hungry') {
    parts.push(oval(cx - gap - 2 * s, cy + 9 * s, 6 * s, 3.4 * s, blush, { stroke: 'none', opacity: 0.8 }));
    parts.push(oval(cx + gap + 2 * s, cy + 9 * s, 6 * s, 3.4 * s, blush, { stroke: 'none', opacity: 0.8 }));
  }
  parts.push(eye(cx - gap, cy, eyeMood, s, sharp));
  parts.push(eye(cx + gap, cy, eyeMood, s, sharp));
  if (opt.nose) parts.push(oval(cx, cy + 7 * s, 3.3 * s, 2.5 * s, opt.nose));
  parts.push(mouth(cx, cy + (opt.mouth ?? 16) * s, mood, s));
  return parts.join('');
}

export function ear(cx, cy, rx, ry, fill, inner, rot) {
  const transform = rot ? `rotate(${rot} ${num(cx)} ${num(cy)})` : undefined;
  return (
    oval(cx, cy, rx, ry, fill, { transform }) +
    oval(cx, cy + ry * 0.18, rx * 0.48, ry * 0.5, inner, { stroke: 'none', transform })
  );
}

export function flame(cx, cy, scale, colors) {
  const s = scale;
  const outer = `M${num(cx)} ${num(cy + 18 * s)} C${num(cx - 16 * s)} ${num(cy + 4 * s)} ${num(cx - 10 * s)} ${num(cy - 16 * s)} ${num(cx)} ${num(cy - 28 * s)} C${num(cx + 12 * s)} ${num(cy - 12 * s)} ${num(cx + 18 * s)} ${num(cy + 2 * s)} ${num(cx)} ${num(cy + 18 * s)} Z`;
  const inner = `M${num(cx)} ${num(cy + 12 * s)} C${num(cx - 7 * s)} ${num(cy + 2 * s)} ${num(cx - 3 * s)} ${num(cy - 8 * s)} ${num(cx)} ${num(cy - 16 * s)} C${num(cx + 5 * s)} ${num(cy - 6 * s)} ${num(cx + 8 * s)} ${num(cy + 2 * s)} ${num(cx)} ${num(cy + 12 * s)} Z`;
  return shape(outer, colors[0], { sw: 4 }) + shape(inner, colors[1], { stroke: 'none' });
}
