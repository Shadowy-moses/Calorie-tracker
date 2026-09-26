const listeners = new Set();

export function setRenderer(fn) {
  listeners.clear();
  listeners.add(fn);
}

export function requestRender() {
  for (const fn of listeners) fn();
}
