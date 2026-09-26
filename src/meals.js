export const MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snacks', label: 'Snacks' },
];

export function mealLabel(id) {
  return MEALS.find((meal) => meal.id === id)?.label || 'Snacks';
}

export function mealForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snacks';
}

export function groupByMeal(entries) {
  const groups = { breakfast: [], lunch: [], dinner: [], snacks: [] };
  for (const entry of entries) {
    const key = groups[entry.meal] ? entry.meal : 'snacks';
    groups[key].push(entry);
  }
  for (const list of Object.values(groups)) {
    list.sort((a, b) => a.createdAt - b.createdAt);
  }
  return groups;
}
