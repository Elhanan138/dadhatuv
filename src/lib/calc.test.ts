import { describe, expect, it } from "vitest";
import {
  addMinutes,
  adherence,
  bmr,
  clamp01,
  computeTargets,
  leanBodyMass,
  macroKcal,
  minutesBetween,
  movingAverage,
  pct,
  projectedWeeks,
  recipePer100g,
  round1,
  scaleFood,
  sumEntries,
  tdee,
} from "@/lib/calc";
import { DEFAULT_ENGINE } from "@/lib/seed/defaults";
import type { DayRecord, FoodItem, LogEntry, Profile, Recipe, Targets } from "@/lib/types";

const MALE: Profile = {
  name: "בדיקה",
  gender: "male",
  age: 40,
  heightCm: 180,
  startWeightKg: 95,
  currentWeightKg: 90,
  targetWeightKg: 85,
  activity: "moderate",
  goal: "cut",
  fasting: { fast: 16, eat: 8, windowOpensAt: "12:00" },
  createdAt: "2026-01-01T00:00:00.000Z",
};

const FEMALE: Profile = { ...MALE, gender: "female", age: 30, heightCm: 165, currentWeightKg: 70 };

const food = (over: Partial<FoodItem> = {}): FoodItem => ({
  id: "f1",
  name: "עוף",
  category: "חלבון",
  kcal: 100,
  protein: 10,
  carbs: 5,
  fat: 3,
  fiber: 1,
  satiety: 3,
  light: "green",
  ...over,
});

const entry = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: "e1",
  date: "2026-08-30",
  block: "break_fast",
  refType: "food",
  refId: "f1",
  grams: 100,
  nameSnapshot: "עוף",
  kcal: 100,
  protein: 10,
  carbs: 5,
  fat: 3,
  fiber: 1,
  light: "green",
  time: "12:00",
  createdAt: "2026-08-30T12:00:00.000Z",
  ...over,
});

describe("leanBodyMass", () => {
  it("subtracts the fat mass", () => {
    expect(leanBodyMass(90, 20)).toBe(72);
  });

  it("returns null when body fat is missing or out of a plausible range", () => {
    expect(leanBodyMass(90)).toBeNull();
    expect(leanBodyMass(90, 0)).toBeNull();
    expect(leanBodyMass(90, 70)).toBeNull();
  });
});

describe("bmr", () => {
  it("uses Mifflin-St Jeor by default", () => {
    // 10*90 + 6.25*180 - 5*40 + 5
    expect(bmr(MALE, DEFAULT_ENGINE)).toBe(1830);
  });

  it("applies the female Mifflin constant", () => {
    // 10*70 + 6.25*165 - 5*30 - 161
    expect(bmr(FEMALE, DEFAULT_ENGINE)).toBe(1420);
  });

  it("supports Harris-Benedict", () => {
    expect(bmr(MALE, { ...DEFAULT_ENGINE, formula: "harris" })).toBe(1931);
  });

  it("supports Katch-McArdle when body fat is known", () => {
    // 370 + 21.6 * 72kg lean
    expect(bmr({ ...MALE, bodyFatPct: 20 }, { ...DEFAULT_ENGINE, formula: "katch" })).toBe(1925);
  });

  it("falls back to Mifflin when Katch is selected without body fat", () => {
    expect(bmr(MALE, { ...DEFAULT_ENGINE, formula: "katch" })).toBe(1830);
  });
});

describe("tdee", () => {
  it("scales BMR by the activity multiplier", () => {
    expect(tdee(MALE, DEFAULT_ENGINE)).toBe(2837); // 1830 * 1.55
  });

  it("falls back to a light multiplier for an unknown activity level", () => {
    const engine = { ...DEFAULT_ENGINE, activityMultipliers: {} as never };
    expect(tdee(MALE, engine)).toBe(Math.round(1830 * 1.375));
  });
});

describe("computeTargets", () => {
  const targets = computeTargets(MALE, DEFAULT_ENGINE);

  it("applies the calorie adjustment to maintenance", () => {
    expect(targets.kcal).toBe(2326); // round(2837 * 0.82)
  });

  it("derives protein and fat per kg of bodyweight", () => {
    expect(targets.protein).toBe(180);
    expect(targets.fat).toBe(72);
  });

  it("fills the remaining calories with carbs", () => {
    expect(targets.carbs).toBe(240); // (2326 - 720 - 648) / 4
  });

  it("derives fiber from calories and water from bodyweight", () => {
    expect(targets.fiber).toBe(33);
    expect(targets.waterMl).toBe(3150);
  });

  it("never drops below a 1000 kcal floor", () => {
    const starved = computeTargets(MALE, { ...DEFAULT_ENGINE, calorieAdjustPct: -95 });
    expect(starved.kcal).toBe(1000);
  });

  it("never returns negative carbs when protein and fat exceed the budget", () => {
    const extreme = computeTargets(MALE, {
      ...DEFAULT_ENGINE,
      calorieAdjustPct: -95,
      proteinPerKg: 3,
      fatPerKg: 2,
    });
    expect(extreme.carbs).toBe(0);
  });

  it("uses lean mass for macros when configured", () => {
    const lean = computeTargets(
      { ...MALE, bodyFatPct: 20 },
      { ...DEFAULT_ENGINE, useLeanMass: true },
    );
    expect(lean.protein).toBe(144); // 72kg lean * 2.0
  });

  it("rounds the water target to the nearest 50 ml", () => {
    expect(computeTargets({ ...MALE, currentWeightKg: 83 }, DEFAULT_ENGINE).waterMl % 50).toBe(0);
  });
});

describe("macroKcal", () => {
  it("uses 4/4/9 kcal per gram", () => {
    expect(macroKcal({ protein: 10, carbs: 10, fat: 10 })).toBe(170);
  });
});

describe("scaleFood", () => {
  it("scales per-100g values to the logged grams", () => {
    expect(scaleFood(food(), 250)).toEqual({ kcal: 250, protein: 25, carbs: 12.5, fat: 7.5, fiber: 2.5 });
  });

  it("returns zeros for a zero-gram portion", () => {
    expect(scaleFood(food(), 0)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  });
});

describe("recipePer100g", () => {
  const recipe: Recipe = {
    id: "r1",
    name: "תבשיל",
    category: "עיקריות",
    ingredients: [{ foodId: "f1", grams: 200 }],
    yieldGrams: 200,
    portions: 2,
    createdAt: "2026-08-30T00:00:00.000Z",
  };

  it("normalises the cooked yield to 100 g", () => {
    const per100 = recipePer100g(recipe, [food()]);
    expect(per100.kcal).toBe(100);
    expect(per100.totals.kcal).toBe(200);
  });

  it("derives the portion size from the yield", () => {
    expect(recipePer100g(recipe, [food()]).portionGrams).toBe(100);
  });

  it("skips ingredients whose food was deleted", () => {
    expect(recipePer100g(recipe, []).kcal).toBe(0);
  });

  it("does not divide by zero on a missing yield", () => {
    const broken = { ...recipe, yieldGrams: 0 };
    expect(Number.isFinite(recipePer100g(broken, [food()]).kcal)).toBe(true);
  });

  it("treats a zero portion count as one portion", () => {
    expect(recipePer100g({ ...recipe, portions: 0 }, [food()]).portionGrams).toBe(200);
  });
});

describe("sumEntries", () => {
  it("adds up macros and counts traffic lights", () => {
    const totals = sumEntries([entry(), entry({ id: "e2", light: "red" }), entry({ id: "e3", light: "yellow" })]);
    expect(totals.kcal).toBe(300);
    expect(totals.protein).toBe(30);
    expect(totals.redCount).toBe(1);
    expect(totals.greenCount).toBe(1);
  });

  it("returns a zeroed day for no entries", () => {
    expect(sumEntries([])).toEqual({
      kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, redCount: 0, greenCount: 0,
    });
  });
});

describe("minutesBetween", () => {
  it("measures a same-day gap", () => {
    expect(minutesBetween("08:00", "12:30")).toBe(270);
  });

  it("wraps across midnight", () => {
    expect(minutesBetween("20:00", "12:00")).toBe(960); // a 16h fast
  });
});

describe("addMinutes", () => {
  it("adds within the day", () => {
    expect(addMinutes("08:15", 90)).toBe("09:45");
  });

  it("wraps past midnight", () => {
    expect(addMinutes("23:30", 60)).toBe("00:30");
  });

  it("wraps backwards", () => {
    expect(addMinutes("00:30", -60)).toBe("23:30");
  });
});

describe("adherence", () => {
  const targets: Targets = { kcal: 2000, protein: 150, carbs: 200, fat: 60, fiber: 28, waterMl: 3000 };
  const perfectDay: DayRecord = {
    date: "2026-08-30",
    waterMl: 3000,
    nsv: [],
    fastStart: "20:00",
    fastEnd: "12:00",
  };
  const totals = { kcal: 2000, protein: 150, carbs: 200, fat: 60, fiber: 28, redCount: 0, greenCount: 4 };

  it("scores a fully compliant day at 100", () => {
    const score = adherence(perfectDay, totals, targets, 16);
    expect(score).toEqual({ overall: 100, fasting: 100, water: 100, protein: 100, calories: 100 });
  });

  it("gives full calorie credit inside a 5% band", () => {
    expect(adherence(perfectDay, { ...totals, kcal: 2100 }, targets, 16).calories).toBe(100);
  });

  it("decays the calorie score outside the band", () => {
    // 17.5% over target sits halfway down the 5%..30% ramp
    expect(adherence(perfectDay, { ...totals, kcal: 2350 }, targets, 16).calories).toBe(50);
  });

  it("zeroes the calorie score past 30% deviation", () => {
    expect(adherence(perfectDay, { ...totals, kcal: 3000 }, targets, 16).calories).toBe(0);
  });

  it("caps over-delivery at 100", () => {
    expect(adherence({ ...perfectDay, waterMl: 9000 }, totals, targets, 16).water).toBe(100);
  });

  it("scores fasting as zero when the window was never logged", () => {
    const score = adherence({ date: "2026-08-30", waterMl: 3000, nsv: [] }, totals, targets, 16);
    expect(score.fasting).toBe(0);
    expect(score.overall).toBe(80);
  });

  it("handles a missing day record", () => {
    const score = adherence(undefined, totals, targets, 16);
    expect(score.water).toBe(0);
    expect(score.fasting).toBe(0);
  });
});

describe("movingAverage", () => {
  it("averages a trailing window", () => {
    expect(movingAverage([1, 2, 3], 2)).toEqual([1, 1.5, 2.5]);
  });

  it("keeps null where the window holds no data", () => {
    expect(movingAverage([null, 2, null], 2)).toEqual([null, 2, 2]);
  });

  it("returns all nulls for an empty series", () => {
    expect(movingAverage([null, null], 7)).toEqual([null, null]);
  });
});

describe("projectedWeeks", () => {
  it("projects a cut at the current deficit", () => {
    expect(projectedWeeks(90, 85, -500)).toBe(11); // 5kg * 7700 / (500*7)
  });

  it("projects a bulk at the current surplus", () => {
    expect(projectedWeeks(80, 85, 500)).toBe(11);
  });

  it("returns null when the deficit pushes away from the target", () => {
    expect(projectedWeeks(90, 85, 500)).toBeNull();
  });

  it("returns null once the target is reached", () => {
    expect(projectedWeeks(85, 85, -500)).toBeNull();
  });

  it("returns null at maintenance", () => {
    expect(projectedWeeks(90, 85, 0)).toBeNull();
  });
});

describe("helpers", () => {
  it("round1 keeps one decimal", () => {
    expect(round1(2.449)).toBe(2.4);
  });

  it("clamp01 bounds to 0..1", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });

  it("pct guards a zero target", () => {
    expect(pct(50, 0)).toBe(0);
  });

  it("pct caps runaway percentages", () => {
    expect(pct(1_000_000, 1)).toBe(999);
  });
});
