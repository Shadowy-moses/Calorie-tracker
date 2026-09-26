/** In-memory UI state. Meals themselves live in IndexedDB. */
export const session = {
  logDate: null,
  draft: null,
  manual: null,
  addTab: 'search',
  searchQuery: '',
  results: [],
  scanMessage: null,
};

export function activeDate(today) {
  if (session.logDate && /^\d{4}-\d{2}-\d{2}$/.test(session.logDate)) return session.logDate;
  return today;
}
