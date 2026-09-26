export function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

export function macrosForGrams(food, grams) {
  const factor = (Number(grams) || 0) / 100;
  return {
    kcal: Math.round((Number(food.kcalPer100g) || 0) * factor),
    protein: round1((Number(food.proteinPer100g) || 0) * factor),
    carbs: round1((Number(food.carbsPer100g) || 0) * factor),
    fat: round1((Number(food.fatPer100g) || 0) * factor),
  };
}

export function per100FromPortion(grams, kcal, protein, carbs, fat) {
  const factor = 100 / grams;
  return {
    kcalPer100g: kcal * factor,
    proteinPer100g: protein * factor,
    carbsPer100g: carbs * factor,
    fatPer100g: fat * factor,
  };
}

export function sumEntries(entries) {
  return entries.reduce(
    (total, entry) => ({
      kcal: total.kcal + (Number(entry.kcal) || 0),
      protein: total.protein + (Number(entry.protein) || 0),
      carbs: total.carbs + (Number(entry.carbs) || 0),
      fat: total.fat + (Number(entry.fat) || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
