const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftISODate(iso, delta) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + delta);
  return todayKey(date);
}

export function prettyDate(iso) {
  const date = parseISODate(iso);
  return {
    weekday: WEEKDAYS[date.getDay()],
    month: MONTHS[date.getMonth()],
    day: date.getDate(),
  };
}

export function dayTitle(iso, today = todayKey()) {
  if (iso === today) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === todayKey(yesterday)) return 'Yesterday';
  const p = prettyDate(iso);
  return `${p.weekday}, ${p.month} ${p.day}`;
}

export function dayHeading(iso, today = todayKey()) {
  const p = prettyDate(iso);
  const title = dayTitle(iso, today);
  if (title === 'Today' || title === 'Yesterday') {
    return { eyebrow: `${p.weekday}`, title, badgeMonth: p.month, badgeDay: p.day };
  }
  return { eyebrow: p.weekday, title: `${p.month} ${p.day}`, badgeMonth: p.month, badgeDay: p.day };
}

export function fmtNum(n) {
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function fmtKcal(n) {
  return Math.round(n || 0).toLocaleString('en-US');
}

export function parseNum(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

export function extractBarcode(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const compact = text.replace(/[\s-]/g, '');
  if (/^\d{8,14}$/.test(compact)) return compact;
  const runs = text.match(/\d{8,14}/g);
  if (!runs?.length) return null;
  return [...runs].sort((a, b) => b.length - a.length)[0];
}

export function pct(value, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.max(0, Math.min(100, (value / goal) * 100));
}
