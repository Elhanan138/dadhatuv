import { describe, expect, it } from "vitest";
import {
  eatingWindow,
  formatDuration,
  remaining,
  roleOf,
  frequentFoods,
  streak,
  suggestMeal,
  weeklyInsights,
  type DaySummary,
} from "@/lib/coach";
import type { DayTotals, FoodItem, LogEntry, Targets } from "@/lib/types";

const TARGETS: Targets = { kcal: 2000, protein: 160, carbs: 180, fat: 60, fiber: 28, waterMl: 3000 };

const totals = (over: Partial<DayTotals> = {}): DayTotals => ({
  kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, redCount: 0, greenCount: 0, ...over,
});

const food = (over: Partial<FoodItem>): FoodItem => ({
  id: "x", name: "x", category: "x", kcal: 100, protein: 0, carbs: 0, fat: 0, fiber: 0,
  satiety: 3, light: "green", ...over,
});

const CHICKEN = food({ id: "chicken", name: "חזה עוף", kcal: 165, protein: 31, fat: 3.6, satiety: 5 });
const TURKEY = food({ id: "turkey", name: "חזה הודו", kcal: 135, protein: 29, fat: 2, satiety: 5 });
const RICE = food({ id: "rice", name: "אורז מבושל", kcal: 130, protein: 2.7, carbs: 28, fiber: 0.4 });
const POTATO = food({ id: "potato", name: "תפוח אדמה", kcal: 87, protein: 2, carbs: 20, fiber: 1.8 });
const BROCCOLI = food({ id: "broccoli", name: "ברוקולי", kcal: 34, protein: 2.8, carbs: 7, fiber: 2.6 });
const OLIVE_OIL = food({ id: "oil", name: "שמן זית", kcal: 884, fat: 100, satiety: 1 });
const CAKE = food({ id: "cake", name: "עוגה", kcal: 400, carbs: 55, fat: 18, light: "red" });

const PANTRY = [CHICKEN, TURKEY, RICE, POTATO, BROCCOLI, OLIVE_OIL, CAKE];

describe("remaining", () => {
  it("reports the gap to each target", () => {
    const gap = remaining(totals({ kcal: 500, protein: 40 }), TARGETS, 1000);
    expect(gap.kcal).toBe(1500);
    expect(gap.protein).toBe(120);
    expect(gap.waterMl).toBe(2000);
  });

  it("never goes negative once a target is passed", () => {
    const gap = remaining(totals({ kcal: 2600, protein: 200 }), TARGETS, 4000);
    expect(gap.kcal).toBe(0);
    expect(gap.protein).toBe(0);
    expect(gap.waterMl).toBe(0);
  });
});

describe("eatingWindow", () => {
  const w = { fast: 16, eat: 8, windowOpensAt: "12:00" };

  it("is open at the moment the window opens", () => {
    const s = eatingWindow(w, "12:00");
    expect(s.phase).toBe("open");
    expect(s.minutesToClose).toBe(480);
  });

  it("counts down to the close from inside the window", () => {
    const s = eatingWindow(w, "17:30");
    expect(s.phase).toBe("open");
    expect(s.minutesToClose).toBe(150);
  });

  it("closes exactly at the end of the eating hours", () => {
    expect(eatingWindow(w, "20:00").phase).toBe("fasting");
  });

  it("counts down to the next opening while fasting", () => {
    const s = eatingWindow(w, "22:00");
    expect(s.phase).toBe("fasting");
    expect(s.minutesToOpen).toBe(840); // 14h to noon
  });

  it("handles a window that wraps past midnight", () => {
    const night = { fast: 16, eat: 8, windowOpensAt: "20:00" };
    expect(eatingWindow(night, "01:00").phase).toBe("open");
    expect(eatingWindow(night, "05:00").phase).toBe("fasting");
  });

  it("reports progress through the current phase", () => {
    expect(eatingWindow(w, "16:00").progress).toBeCloseTo(0.5, 2);
  });
});

describe("formatDuration", () => {
  it("renders hours and padded minutes", () => {
    expect(formatDuration(167)).toBe("2:47");
    expect(formatDuration(5)).toBe("0:05");
  });

  it("floors at zero", () => {
    expect(formatDuration(-30)).toBe("0:00");
  });
});

describe("roleOf", () => {
  it("classifies by the dominant macro", () => {
    expect(roleOf(CHICKEN)).toBe("protein");
    expect(roleOf(RICE)).toBe("carb");
    expect(roleOf(OLIVE_OIL)).toBe("fat");
    expect(roleOf(BROCCOLI)).toBe("veg");
  });

  it("treats a low-calorie high-fibre food as a vegetable even when protein is dense", () => {
    expect(roleOf(food({ kcal: 30, protein: 3, fiber: 2 }))).toBe("veg");
  });
});

describe("suggestMeal", () => {
  const bigGap = remaining(totals(), TARGETS, 0);

  it("says nothing when barely any calories are left", () => {
    expect(suggestMeal(remaining(totals({ kcal: 1950 }), TARGETS, 0), PANTRY)).toBeNull();
  });

  it("leads with a protein source", () => {
    const s = suggestMeal(bigGap, PANTRY)!;
    expect(s.items[0].food.id).toMatch(/chicken|turkey/);
  });

  it("never proposes more calories than are left in the day", () => {
    const s = suggestMeal(bigGap, PANTRY)!;
    expect(s.totals.kcal).toBeLessThanOrEqual(bigGap.kcal);
  });

  it("stays inside the calorie budget on a tight gap too", () => {
    const tight = remaining(totals({ kcal: 1700, protein: 120 }), TARGETS, 0);
    const s = suggestMeal(tight, PANTRY);
    if (s) expect(s.totals.kcal).toBeLessThanOrEqual(tight.kcal);
  });

  it("closes a meaningful share of the protein gap", () => {
    const s = suggestMeal(bigGap, PANTRY)!;
    expect(s.covers.protein).toBeGreaterThan(0.4);
  });

  it("adds vegetables for the fibre target", () => {
    const s = suggestMeal(bigGap, PANTRY)!;
    expect(s.items.some((i) => i.food.id === "broccoli")).toBe(true);
  });

  it("leaves red-light foods out", () => {
    const s = suggestMeal(bigGap, PANTRY)!;
    expect(s.items.some((i) => i.food.light === "red")).toBe(false);
  });

  it("honours the exclude list", () => {
    const s = suggestMeal(bigGap, PANTRY, { exclude: ["chicken", "turkey"] })!;
    expect(s.items.some((i) => roleOf(i.food) === "protein")).toBe(false);
  });

  it("offers a different plate on a different variant", () => {
    const a = suggestMeal(bigGap, PANTRY, { variant: 0 })!;
    const b = suggestMeal(bigGap, PANTRY, { variant: 1 })!;
    expect(a.items[0].food.id).not.toBe(b.items[0].food.id);
  });

  it("returns whole portions, rounded to something weighable", () => {
    const s = suggestMeal(bigGap, PANTRY)!;
    for (const item of s.items) expect(item.grams % 5).toBe(0);
  });

  it("copes with an empty pantry", () => {
    expect(suggestMeal(bigGap, [])).toBeNull();
  });

  it("copes with a pantry of nothing but red foods", () => {
    expect(suggestMeal(bigGap, [CAKE])).toBeNull();
  });
});

describe("frequentFoods", () => {
  const log = (refId: string, grams: number, createdAt: string): LogEntry => ({
    id: `${refId}-${createdAt}`, date: "2026-08-30", block: "break_fast", refType: "food", refId,
    grams, nameSnapshot: refId, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
    light: "green", time: "12:00", createdAt,
  });

  it("ranks by how often a food is logged", () => {
    const entries = [
      log("eggs", 100, "2026-08-30T08:00:00Z"),
      log("eggs", 100, "2026-08-29T08:00:00Z"),
      log("eggs", 100, "2026-08-28T08:00:00Z"),
      log("rice", 150, "2026-08-30T13:00:00Z"),
    ];
    const top = frequentFoods(entries);
    expect(top[0].refId).toBe("eggs");
    expect(top[0].count).toBe(3);
  });

  it("returns the habitual portion, not the latest one", () => {
    const entries = [
      log("eggs", 100, "2026-08-28T08:00:00Z"),
      log("eggs", 110, "2026-08-29T08:00:00Z"),
      log("eggs", 105, "2026-08-30T08:00:00Z"),
    ];
    expect(frequentFoods(entries)[0].grams).toBe(105);
  });

  it("is not dragged off by a single mistyped portion", () => {
    const entries = [
      log("eggs", 100, "2026-08-28T08:00:00Z"),
      log("eggs", 100, "2026-08-29T08:00:00Z"),
      log("eggs", 1000, "2026-08-30T08:00:00Z"),
    ];
    expect(frequentFoods(entries)[0].grams).toBe(100);
  });

  it("respects the limit", () => {
    const entries = ["a", "b", "c", "d"].map((id) => log(id, 100, "2026-08-30T08:00:00Z"));
    expect(frequentFoods(entries, 2)).toHaveLength(2);
  });

  it("returns nothing for an empty log", () => {
    expect(frequentFoods([])).toEqual([]);
  });
});

describe("weeklyInsights", () => {
  const day = (over: Partial<DaySummary>): DaySummary => ({
    date: "2026-08-30", kcal: 2000, protein: 160, fiber: 28, waterMl: 3000, logged: true, ...over,
  });

  it("stays quiet until there is enough data", () => {
    expect(weeklyInsights([day({}), day({})], TARGETS)).toEqual([]);
  });

  it("calls out a protein shortfall", () => {
    const days = Array.from({ length: 7 }, () => day({ protein: 100 }));
    const insight = weeklyInsights(days, TARGETS)[0];
    expect(insight.severity).toBe("bad");
    expect(insight.text).toContain("63%");
  });

  it("confirms protein when it is on target", () => {
    const days = Array.from({ length: 7 }, () => day({}));
    expect(weeklyInsights(days, TARGETS)[0].severity).toBe("good");
  });

  it("flags eating over the calorie target", () => {
    const days = Array.from({ length: 7 }, () => day({ kcal: 2400 }));
    expect(weeklyInsights(days, TARGETS).some((i) => i.text.includes("הגירעון נסגר"))).toBe(true);
  });

  it("flags an over-aggressive deficit", () => {
    const days = Array.from({ length: 7 }, () => day({ kcal: 1200 }));
    expect(weeklyInsights(days, TARGETS).some((i) => i.text.includes("חד מדי"))).toBe(true);
  });

  it("counts missing days as their own problem", () => {
    const days = [...Array.from({ length: 4 }, () => day({})), ...Array.from({ length: 3 }, () => day({ logged: false }))];
    expect(weeklyInsights(days, TARGETS).some((i) => i.text.includes("ללא רישום"))).toBe(true);
  });
});

describe("streak", () => {
  const d = (logged: boolean): DaySummary => ({
    date: "2026-08-30", kcal: 0, protein: 0, fiber: 0, waterMl: 0, logged,
  });

  it("counts back from today", () => {
    expect(streak([d(true), d(false), d(true), d(true), d(true)])).toBe(3);
  });

  it("is zero when today is unlogged", () => {
    expect(streak([d(true), d(true), d(false)])).toBe(0);
  });

  it("is zero for no history", () => {
    expect(streak([])).toBe(0);
  });
});
