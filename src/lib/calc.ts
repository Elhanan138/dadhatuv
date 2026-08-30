import type {
  AdherenceScore,
  DayRecord,
  DayTotals,
  EngineConfig,
  FoodItem,
  LogEntry,
  Profile,
  Recipe,
  Targets,
} from "@/lib/types";

export function leanBodyMass(weightKg: number, bodyFatPct?: number): number | null {
  if (bodyFatPct == null || bodyFatPct <= 0 || bodyFatPct >= 70) return null;
  return round1(weightKg * (1 - bodyFatPct / 100));
}

export function bmr(profile: Profile, engine: EngineConfig): number {
  const { gender, age, heightCm, currentWeightKg, bodyFatPct } = profile;
  const lbm = leanBodyMass(currentWeightKg, bodyFatPct);

  if (engine.formula === "katch" && lbm) {
    return Math.round(370 + 21.6 * lbm);
  }
  if (engine.formula === "harris") {
    return Math.round(
      gender === "male"
        ? 88.362 + 13.397 * currentWeightKg + 4.799 * heightCm - 5.677 * age
        : 447.593 + 9.247 * currentWeightKg + 3.098 * heightCm - 4.33 * age,
    );
  }
  // Mifflin-St Jeor
  return Math.round(
    10 * currentWeightKg + 6.25 * heightCm - 5 * age + (gender === "male" ? 5 : -161),
  );
}

export function tdee(profile: Profile, engine: EngineConfig): number {
  const multiplier = engine.activityMultipliers[profile.activity] ?? 1.375;
  return Math.round(bmr(profile, engine) * multiplier);
}

export function computeTargets(profile: Profile, engine: EngineConfig): Targets {
  const maintenance = tdee(profile, engine);
  const kcal = Math.max(1000, Math.round(maintenance * (1 + engine.calorieAdjustPct / 100)));

  const lbm = leanBodyMass(profile.currentWeightKg, profile.bodyFatPct);
  const base = engine.useLeanMass && lbm ? lbm : profile.currentWeightKg;

  const protein = Math.round(base * engine.proteinPerKg);
  const fat = Math.round(base * engine.fatPerKg);
  const carbKcal = kcal - protein * 4 - fat * 9;
  const carbs = Math.max(0, Math.round(carbKcal / 4));

  return {
    kcal,
    protein,
    carbs,
    fat,
    fiber: Math.round((kcal / 1000) * engine.fiberPer1000Kcal),
    waterMl: Math.round((profile.currentWeightKg * engine.waterMlPerKg) / 50) * 50,
  };
}

export function macroKcal(t: { protein: number; carbs: number; fat: number }): number {
  return t.protein * 4 + t.carbs * 4 + t.fat * 9;
}

export function scaleFood(food: FoodItem, grams: number) {
  const k = grams / 100;
  return {
    kcal: round1(food.kcal * k),
    protein: round1(food.protein * k),
    carbs: round1(food.carbs * k),
    fat: round1(food.fat * k),
    fiber: round1(food.fiber * k),
  };
}

export function recipePer100g(recipe: Recipe, foods: FoodItem[]) {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const ing of recipe.ingredients) {
    const food = byId.get(ing.foodId);
    if (!food) continue;
    const s = scaleFood(food, ing.grams);
    sum.kcal += s.kcal;
    sum.protein += s.protein;
    sum.carbs += s.carbs;
    sum.fat += s.fat;
    sum.fiber += s.fiber;
  }
  const yieldG = recipe.yieldGrams > 0 ? recipe.yieldGrams : 1;
  const k = 100 / yieldG;
  return {
    kcal: round1(sum.kcal * k),
    protein: round1(sum.protein * k),
    carbs: round1(sum.carbs * k),
    fat: round1(sum.fat * k),
    fiber: round1(sum.fiber * k),
    totals: sum,
    portionGrams: Math.round(yieldG / Math.max(1, recipe.portions)),
  };
}

export function sumEntries(entries: LogEntry[]): DayTotals {
  return entries.reduce<DayTotals>(
    (acc, e) => ({
      kcal: round1(acc.kcal + e.kcal),
      protein: round1(acc.protein + e.protein),
      carbs: round1(acc.carbs + e.carbs),
      fat: round1(acc.fat + e.fat),
      fiber: round1(acc.fiber + e.fiber),
      redCount: acc.redCount + (e.light === "red" ? 1 : 0),
      greenCount: acc.greenCount + (e.light === "green" ? 1 : 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, redCount: 0, greenCount: 0 },
  );
}

/** minutes between two HH:mm strings, wrapping midnight */
export function minutesBetween(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let diff = th * 60 + tm - (fh * 60 + fm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function adherence(
  day: DayRecord | undefined,
  totals: DayTotals,
  targets: Targets,
  fastHours: number,
): AdherenceScore {
  const water = clamp01(day ? day.waterMl / Math.max(1, targets.waterMl) : 0);
  const protein = clamp01(totals.protein / Math.max(1, targets.protein));

  // calories: full score inside ±5%, decaying to 0 at ±30%
  const dev = Math.abs(totals.kcal - targets.kcal) / Math.max(1, targets.kcal);
  const calories = dev <= 0.05 ? 1 : clamp01(1 - (dev - 0.05) / 0.25);

  let fasting = 0;
  if (day?.fastStart && day?.fastEnd) {
    const actual = minutesBetween(day.fastStart, day.fastEnd) / 60;
    fasting = clamp01(actual / Math.max(1, fastHours));
  }

  const overall = (water * 0.2 + protein * 0.3 + calories * 0.3 + fasting * 0.2) * 100;
  return {
    overall: Math.round(overall),
    fasting: Math.round(fasting * 100),
    water: Math.round(water * 100),
    protein: Math.round(protein * 100),
    calories: Math.round(calories * 100),
  };
}

/** trailing simple moving average, keeping nulls where there is no data */
export function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v != null);
    out.push(slice.length ? round1(slice.reduce((a, b) => a + b, 0) / slice.length) : null);
  }
  return out;
}

export function projectedWeeks(current: number, target: number, dailyDeficitKcal: number): number | null {
  const deltaKg = current - target;
  if (Math.abs(deltaKg) < 0.1 || dailyDeficitKcal === 0) return null;
  const kcalNeeded = Math.abs(deltaKg) * 7700;
  const weeklyRate = Math.abs(dailyDeficitKcal) * 7;
  const sameDirection = (deltaKg > 0 && dailyDeficitKcal < 0) || (deltaKg < 0 && dailyDeficitKcal > 0);
  if (!sameDirection) return null;
  return Math.ceil(kcalNeeded / weeklyRate);
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const pct = (value: number, target: number) =>
  target <= 0 ? 0 : Math.min(999, Math.round((value / target) * 100));
