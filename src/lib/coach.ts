/**
 * The decision layer.
 *
 * Everything else in the app records what already happened. This module answers the
 * two questions that actually come up during the day:
 *
 *   "am I still fasting, and for how long?"   -> eatingWindow()
 *   "what should I eat right now?"            -> suggestMeal()
 *
 * All of it is pure so it can be tested without a browser.
 */
import { addMinutes, minutesBetween, round1, scaleFood } from "@/lib/calc";
import type { DayTotals, FastingWindow, FoodItem, LogEntry, Targets } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// what is left of today
// ─────────────────────────────────────────────────────────────────────────────

export interface Remaining {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
}

/** Never negative: once a target is met the gap is zero, not a debt to carry. */
export function remaining(totals: DayTotals, targets: Targets, waterMl: number): Remaining {
  const gap = (target: number, actual: number) => Math.max(0, round1(target - actual));
  return {
    kcal: gap(targets.kcal, totals.kcal),
    protein: gap(targets.protein, totals.protein),
    carbs: gap(targets.carbs, totals.carbs),
    fat: gap(targets.fat, totals.fat),
    fiber: gap(targets.fiber, totals.fiber),
    waterMl: gap(targets.waterMl, waterMl),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// the fasting window
// ─────────────────────────────────────────────────────────────────────────────

export type WindowPhase = "fasting" | "open";

export interface WindowState {
  phase: WindowPhase;
  /** minutes until the eating window opens; 0 while it is open */
  minutesToOpen: number;
  /** minutes until the eating window closes; 0 while fasting */
  minutesToClose: number;
  opensAt: string;
  closesAt: string;
  /** 0..1 through the current phase, for a progress ring */
  progress: number;
}

export function eatingWindow(fasting: FastingWindow, now: string): WindowState {
  const opensAt = fasting.windowOpensAt;
  const eatMinutes = Math.max(1, Math.round(fasting.eat * 60));
  const fastMinutes = Math.max(1, 1440 - eatMinutes);
  const closesAt = addMinutes(opensAt, eatMinutes);

  const sinceOpen = minutesBetween(opensAt, now);
  const isOpen = sinceOpen < eatMinutes;

  if (isOpen) {
    return {
      phase: "open",
      minutesToOpen: 0,
      minutesToClose: eatMinutes - sinceOpen,
      opensAt,
      closesAt,
      progress: sinceOpen / eatMinutes,
    };
  }

  const minutesToOpen = minutesBetween(now, opensAt);
  return {
    phase: "fasting",
    minutesToOpen,
    minutesToClose: 0,
    opensAt,
    closesAt,
    progress: (fastMinutes - minutesToOpen) / fastMinutes,
  };
}

/** "2:47" — hours and minutes, never a bare minute count. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// meal suggestion
// ─────────────────────────────────────────────────────────────────────────────

export type FoodRole = "protein" | "carb" | "fat" | "veg" | "other";

/** Classifies a food by which macro carries most of its calories. */
export function roleOf(f: FoodItem): FoodRole {
  const kcal = f.kcal > 0 ? f.kcal : 1;
  if (f.kcal <= 70 && f.fiber >= 1.5) return "veg";
  if ((f.protein * 4) / kcal >= 0.35) return "protein";
  if ((f.carbs * 4) / kcal >= 0.5) return "carb";
  if ((f.fat * 9) / kcal >= 0.55) return "fat";
  return "other";
}

export interface SuggestedItem {
  food: FoodItem;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Suggestion {
  items: SuggestedItem[];
  totals: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
  /** share of the remaining calorie and protein gap this plate closes, 0..1 */
  covers: { kcal: number; protein: number };
}

export interface SuggestOptions {
  /** rotates the picks so the same gap doesn't always produce chicken and rice */
  variant?: number;
  /** ids to keep out — usually what was already eaten today */
  exclude?: string[];
  /** allow yellow-light foods when green alone cannot fill the plate */
  allowYellow?: boolean;
}

const round = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function build(food: FoodItem, grams: number): SuggestedItem {
  return { food, grams, ...scaleFood(food, grams) };
}

/**
 * Ranks candidates for a role and picks one, rotating by `variant` so repeated
 * calls with the same gap surface different foods.
 */
function pick(
  foods: FoodItem[],
  role: FoodRole,
  score: (f: FoodItem) => number,
  opts: { variant: number; exclude: Set<string>; allowYellow: boolean },
): FoodItem | null {
  const candidates = foods
    .filter((f) => !opts.exclude.has(f.id))
    .filter((f) => f.light === "green" || (opts.allowYellow && f.light === "yellow"))
    .filter((f) => roleOf(f) === role)
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "he"));

  if (!candidates.length) return null;
  // rotate within the strongest handful rather than the whole list, so quality holds
  const pool = candidates.slice(0, Math.min(6, candidates.length));
  return pool[opts.variant % pool.length];
}

/**
 * Composes a plate that closes today's remaining gap: a protein anchor first,
 * then carbs, vegetables for fibre, and a fat source only if there is room.
 * Returns null when there is not enough left in the day to be worth a suggestion.
 */
export function suggestMeal(
  gap: Remaining,
  foods: FoodItem[],
  options: SuggestOptions = {},
): Suggestion | null {
  const variant = Math.max(0, Math.floor(options.variant ?? 0));
  const exclude = new Set(options.exclude ?? []);
  const allowYellow = options.allowYellow ?? true;
  const opts = { variant, exclude, allowYellow };

  if (gap.kcal < 120) return null;

  const items: SuggestedItem[] = [];
  let leftKcal = gap.kcal;

  // 1. protein anchor — the macro people actually miss, so it goes first
  const proteinFood = pick(foods, "protein", (f) => f.protein / Math.max(1, f.kcal), opts);
  if (proteinFood && gap.protein >= 8) {
    const per100 = Math.max(1, proteinFood.protein);
    const grams = round(clamp((gap.protein * 0.65 * 100) / per100, 80, 250), 10);
    const item = build(proteinFood, grams);
    if (item.kcal <= leftKcal) {
      items.push(item);
      leftKcal -= item.kcal;
      exclude.add(proteinFood.id);
    }
  }

  // 2. vegetables — cheap in calories, and the fibre target is otherwise never met
  if (gap.fiber >= 3) {
    const vegFood = pick(foods, "veg", (f) => f.fiber / Math.max(1, f.kcal) + f.satiety / 20, opts);
    if (vegFood) {
      const item = build(vegFood, 150);
      if (item.kcal <= leftKcal) {
        items.push(item);
        leftKcal -= item.kcal;
        exclude.add(vegFood.id);
      }
    }
  }

  // 3. carbohydrate — sized to what is left after the anchor, not to the raw target
  const carbsLeft = Math.max(0, gap.carbs - items.reduce((s, i) => s + i.carbs, 0));
  if (carbsLeft >= 20 && leftKcal >= 100) {
    const carbFood = pick(foods, "carb", (f) => f.fiber / Math.max(1, f.carbs) + f.satiety / 10, opts);
    if (carbFood) {
      const per100 = Math.max(1, carbFood.carbs);
      let grams = round(clamp((carbsLeft * 0.8 * 100) / per100, 40, 250), 10);
      // never let the carb serving alone blow the remaining calories
      const maxGrams = Math.floor((leftKcal * 100) / Math.max(1, carbFood.kcal));
      grams = round(clamp(grams, 30, Math.max(30, maxGrams)), 10);
      const item = build(carbFood, grams);
      if (item.kcal <= leftKcal) {
        items.push(item);
        leftKcal -= item.kcal;
        exclude.add(carbFood.id);
      }
    }
  }

  // 4. fat — only when there is both a fat gap and calories spare for it
  const fatLeft = Math.max(0, gap.fat - items.reduce((s, i) => s + i.fat, 0));
  if (fatLeft >= 10 && leftKcal >= 90) {
    const fatFood = pick(foods, "fat", (f) => f.satiety / 5 - f.kcal / 900, opts);
    if (fatFood) {
      const per100 = Math.max(1, fatFood.fat);
      const grams = round(clamp((fatLeft * 0.7 * 100) / per100, 10, 40), 5);
      const item = build(fatFood, grams);
      if (item.kcal <= leftKcal) {
        items.push(item);
        leftKcal -= item.kcal;
      }
    }
  }

  if (!items.length) return null;

  const totals = items.reduce(
    (acc, i) => ({
      kcal: round1(acc.kcal + i.kcal),
      protein: round1(acc.protein + i.protein),
      carbs: round1(acc.carbs + i.carbs),
      fat: round1(acc.fat + i.fat),
      fiber: round1(acc.fiber + i.fiber),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  return {
    items,
    totals,
    covers: {
      kcal: gap.kcal > 0 ? Math.min(1, totals.kcal / gap.kcal) : 1,
      protein: gap.protein > 0 ? Math.min(1, totals.protein / gap.protein) : 1,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// one-tap repeats
// ─────────────────────────────────────────────────────────────────────────────

export interface FrequentFood {
  refId: string;
  refType: "food" | "recipe";
  name: string;
  /** the portion this food is usually logged at, so a tap needs no follow-up */
  grams: number;
  count: number;
}

/**
 * The foods this user actually eats, with their habitual portion.
 * Ranked by how often they appear, so the top of the list is genuinely one tap.
 */
export function frequentFoods(entries: LogEntry[], limit = 8): FrequentFood[] {
  const groups = new Map<string, { entry: LogEntry; grams: number[]; count: number; last: string }>();

  for (const e of entries) {
    const key = `${e.refType}:${e.refId}`;
    const g = groups.get(key);
    if (g) {
      g.grams.push(e.grams);
      g.count++;
      if (e.createdAt > g.last) g.last = e.createdAt;
    } else {
      groups.set(key, { entry: e, grams: [e.grams], count: 1, last: e.createdAt });
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map(({ entry, grams, count }) => ({
      refId: entry.refId,
      refType: entry.refType,
      name: entry.nameSnapshot,
      grams: median(grams),
      count,
    }));
}

/** Median rather than mean: one mistyped 1000g entry shouldn't move the habitual portion. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.max(1, Math.round(value));
}

// ─────────────────────────────────────────────────────────────────────────────
// weekly insight
// ─────────────────────────────────────────────────────────────────────────────

export interface Insight {
  /** ranked so the caller can show only the most useful one */
  severity: "good" | "watch" | "bad";
  text: string;
}

export interface DaySummary {
  date: string;
  kcal: number;
  protein: number;
  fiber: number;
  waterMl: number;
  logged: boolean;
}

/**
 * Turns a fortnight of days into at most a handful of plain sentences.
 * Only says something when the data actually supports it.
 */
export function weeklyInsights(days: DaySummary[], targets: Targets): Insight[] {
  const logged = days.filter((d) => d.logged);
  if (logged.length < 3) return [];

  const out: Insight[] = [];
  const avg = (pick: (d: DaySummary) => number) =>
    logged.reduce((s, d) => s + pick(d), 0) / logged.length;

  const proteinPct = Math.round((avg((d) => d.protein) / Math.max(1, targets.protein)) * 100);
  const kcalPct = Math.round((avg((d) => d.kcal) / Math.max(1, targets.kcal)) * 100);
  const fiberPct = Math.round((avg((d) => d.fiber) / Math.max(1, targets.fiber)) * 100);
  const waterPct = Math.round((avg((d) => d.waterMl) / Math.max(1, targets.waterMl)) * 100);

  if (proteinPct < 85) {
    out.push({
      severity: proteinPct < 70 ? "bad" : "watch",
      text: `החלבון עומד על ${proteinPct}% מהיעד בממוצע. זה המחסור שהכי פוגע בשמירה על מסת שריר בחיטוב.`,
    });
  } else {
    out.push({ severity: "good", text: `החלבון יציב על ${proteinPct}% מהיעד — בדיוק איפה שצריך.` });
  }

  if (kcalPct > 108) {
    out.push({
      severity: "bad",
      text: `הקלוריות בממוצע ${kcalPct}% מהיעד. בקצב הזה הגירעון נסגר והמשקל לא יזוז.`,
    });
  } else if (kcalPct < 80 && kcalPct > 0) {
    out.push({
      severity: "watch",
      text: `הקלוריות בממוצע ${kcalPct}% מהיעד — גירעון חד מדי, שחוק ואיבוד שריר.`,
    });
  }

  if (fiberPct < 70) {
    out.push({ severity: "watch", text: `סיבים ${fiberPct}% מהיעד — הוסף ירקות לארוחה העיקרית.` });
  }

  if (waterPct < 70) {
    out.push({ severity: "watch", text: `שתייה ${waterPct}% מהיעד בממוצע.` });
  }

  // consistency matters more than any single day
  const gapDays = days.length - logged.length;
  if (gapDays >= 3) {
    out.push({
      severity: "watch",
      text: `${gapDays} ימים ללא רישום מתוך ${days.length}. ימים חסרים הם הסיבה הכי שכיחה לתקיעות.`,
    });
  }

  return out;
}

/** Consecutive logged days ending today — the number people actually chase. */
export function streak(days: DaySummary[]): number {
  let count = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (!days[i].logged) break;
    count++;
  }
  return count;
}
