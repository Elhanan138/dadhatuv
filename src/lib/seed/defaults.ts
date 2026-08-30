import type { AlertRule, AppState, EngineConfig, Settings } from "@/lib/types";
import { CATEGORIES, SEED_FOODS } from "@/lib/seed/foods";

export const STATE_VERSION = 1;

export const DEFAULT_ENGINE: EngineConfig = {
  formula: "mifflin",
  activityMultipliers: {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
    athlete: 1.9,
  },
  calorieAdjustPct: -18,
  proteinPerKg: 2.0,
  fatPerKg: 0.8,
  useLeanMass: false,
  waterMlPerKg: 35,
  fiberPer1000Kcal: 14,
};

export const DEFAULT_ALERTS: AlertRule[] = [
  {
    id: "alert-protein",
    metric: "protein",
    comparator: "below",
    value: 80,
    pctOfTarget: true,
    message: "החלבון מתחת ל־80% מהיעד. הוסף מנת חלבון לארוחה הבאה.",
    enabled: true,
  },
  {
    id: "alert-kcal",
    metric: "kcal",
    comparator: "above",
    value: 110,
    pctOfTarget: true,
    message: "חרגת מיעד הקלוריות ביותר מ־10%.",
    enabled: true,
  },
  {
    id: "alert-water",
    metric: "water",
    comparator: "below",
    value: 60,
    pctOfTarget: true,
    message: "שתיית המים מתחת ל־60% מהיעד היומי.",
    enabled: true,
  },
  {
    id: "alert-red",
    metric: "red_items",
    comparator: "above",
    value: 2,
    pctOfTarget: false,
    message: "יותר מ־2 פריטים אדומים היום.",
    enabled: true,
  },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  weekStartsOn: 0,
  showSatiety: true,
  smoothingDays: 7,
  overrideTargets: false,
  manualTargets: { kcal: 2000, protein: 150, carbs: 180, fat: 65, fiber: 28, waterMl: 2800 },
  categories: [...CATEGORIES],
  tags: ["ארוחה מהירה", "מסעדה", "שבת", "אימון", "מתכון משפחתי"],
  alerts: DEFAULT_ALERTS,
};

export const INITIAL_STATE: AppState = {
  version: STATE_VERSION,
  onboarded: false,
  profile: null,
  engine: DEFAULT_ENGINE,
  settings: DEFAULT_SETTINGS,
  foods: SEED_FOODS,
  recipes: [],
  entries: [],
  days: {},
};

export const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "יושבני — ללא אימונים",
  light: "קל — 1–2 אימונים בשבוע",
  moderate: "בינוני — 3–4 אימונים בשבוע",
  high: "גבוה — 5–6 אימונים בשבוע",
  athlete: "ספורטאי — אימון יומי / עבודה פיזית",
};

export const GOAL_LABELS: Record<string, string> = {
  cut: "חיטוב וירידה באחוזי שומן",
  recomp: "ריקומפוזיציה — שמירה על משקל",
  bulk: "עלייה במסת שריר",
};

export const BLOCK_LABELS: Record<string, string> = {
  break_fast: "ארוחת שבירת הצום",
  secondary: "ארוחה משנית",
  snack: "נשנוש",
};

export const LIGHT_LABELS: Record<string, string> = {
  green: "ירוק",
  yellow: "צהוב",
  red: "אדום",
};

export const FASTING_PRESETS = [
  { label: "16:8", fast: 16, eat: 8 },
  { label: "14:10", fast: 14, eat: 10 },
  { label: "18:6", fast: 18, eat: 6 },
  { label: "20:4", fast: 20, eat: 4 },
];
