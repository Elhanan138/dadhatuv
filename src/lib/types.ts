export type Gender = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "high"
  | "athlete";

export type TrafficLight = "green" | "yellow" | "red";

export type MealBlockId = "break_fast" | "secondary" | "snack";

export type Goal = "cut" | "recomp" | "bulk";

export type FormulaId = "mifflin" | "harris" | "katch";

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  /** per 100 g / 100 ml */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** 1 (low) – 5 (very filling) */
  satiety: number;
  light: TrafficLight;
  /** optional natural serving, e.g. "ביצה" 55 g */
  servingName?: string;
  servingGrams?: number;
  liquid?: boolean;
  custom?: boolean;
  tags?: string[];
  createdAt?: string;
}

export interface RecipeIngredient {
  foodId: string;
  grams: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  ingredients: RecipeIngredient[];
  /** total cooked yield in grams; portions are derived from it */
  yieldGrams: number;
  portions: number;
  notes?: string;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  block: MealBlockId;
  /** either a food or a recipe reference */
  refType: "food" | "recipe";
  refId: string;
  /** grams for food, portions*yield for recipe */
  grams: number;
  nameSnapshot: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  light: TrafficLight;
  time: string;
  createdAt: string;
}

export interface DayRecord {
  date: string;
  weightKg?: number;
  waterMl: number;
  fastStart?: string;
  fastEnd?: string;
  nsv: string[];
  note?: string;
  measurements?: Measurements;
}

export interface Measurements {
  waist?: number;
  chest?: number;
  hips?: number;
  armR?: number;
  thighR?: number;
  neck?: number;
}

export interface FastingWindow {
  /** hours of fasting */
  fast: number;
  /** hours of eating */
  eat: number;
  /** HH:mm — when the eating window opens */
  windowOpensAt: string;
}

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
}

export interface EngineConfig {
  formula: FormulaId;
  activityMultipliers: Record<ActivityLevel, number>;
  /** percentage applied to TDEE, negative = deficit */
  calorieAdjustPct: number;
  proteinPerKg: number;
  fatPerKg: number;
  /** if true, protein/fat per kg use lean body mass */
  useLeanMass: boolean;
  waterMlPerKg: number;
  fiberPer1000Kcal: number;
}

export interface Profile {
  name: string;
  gender: Gender;
  age: number;
  heightCm: number;
  startWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  bodyFatPct?: number;
  activity: ActivityLevel;
  goal: Goal;
  fasting: FastingWindow;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  metric: "kcal" | "protein" | "water" | "carbs" | "fat" | "red_items";
  comparator: "above" | "below";
  /** absolute value, or percentage of target when pctOfTarget = true */
  value: number;
  pctOfTarget: boolean;
  message: string;
  enabled: boolean;
}

export interface Settings {
  theme: "light" | "dark" | "system";
  weekStartsOn: 0 | 1;
  showSatiety: boolean;
  smoothingDays: number;
  overrideTargets: boolean;
  manualTargets: Targets;
  categories: string[];
  tags: string[];
  alerts: AlertRule[];
}

export interface AppState {
  version: number;
  onboarded: boolean;
  profile: Profile | null;
  engine: EngineConfig;
  settings: Settings;
  foods: FoodItem[];
  recipes: Recipe[];
  entries: LogEntry[];
  days: Record<string, DayRecord>;
}

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  redCount: number;
  greenCount: number;
}

export interface AdherenceScore {
  overall: number;
  fasting: number;
  water: number;
  protein: number;
  calories: number;
}
