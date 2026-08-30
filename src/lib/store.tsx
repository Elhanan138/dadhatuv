"use client";

import * as React from "react";
import type {
  AppState,
  DayRecord,
  EngineConfig,
  FoodItem,
  LogEntry,
  Profile,
  Recipe,
  Settings,
  Targets,
} from "@/lib/types";
import { INITIAL_STATE } from "@/lib/seed/defaults";
import { clearState, loadState, saveState } from "@/lib/storage";
import { computeTargets } from "@/lib/calc";
import { todayKey, uid } from "@/lib/utils";

type Updater = (state: AppState) => AppState;

interface StoreApi {
  state: AppState;
  ready: boolean;
  targets: Targets;
  apply: (updater: Updater) => void;

  saveProfile: (profile: Profile) => void;
  patchProfile: (patch: Partial<Profile>) => void;
  patchEngine: (patch: Partial<EngineConfig>) => void;
  patchSettings: (patch: Partial<Settings>) => void;

  addFood: (food: Omit<FoodItem, "id" | "custom" | "createdAt">) => FoodItem;
  updateFood: (id: string, patch: Partial<FoodItem>) => void;
  deleteFood: (id: string) => void;

  addRecipe: (recipe: Omit<Recipe, "id" | "createdAt">) => Recipe;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;

  addEntry: (entry: Omit<LogEntry, "id" | "createdAt">) => void;
  updateEntry: (id: string, patch: Partial<LogEntry>) => void;
  deleteEntry: (id: string) => void;

  getDay: (date: string) => DayRecord;
  patchDay: (date: string, patch: Partial<DayRecord>) => void;
  addWater: (date: string, ml: number) => void;

  replaceState: (next: AppState) => void;
  resetAll: () => Promise<void>;
}

const StoreContext = React.createContext<StoreApi | null>(null);

export const emptyDay = (date: string): DayRecord => ({ date, waterMl: 0, nsv: [] });

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>(INITIAL_STATE);
  const [ready, setReady] = React.useState(false);
  const dirty = React.useRef(false);

  React.useEffect(() => {
    let alive = true;
    loadState().then((loaded) => {
      if (!alive) return;
      setState(loaded);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // debounced write-behind so rapid edits don't hammer IndexedDB
  React.useEffect(() => {
    if (!ready || !dirty.current) return;
    const t = setTimeout(() => void saveState(state), 250);
    return () => clearTimeout(t);
  }, [state, ready]);

  const apply = React.useCallback((updater: Updater) => {
    dirty.current = true;
    setState((prev) => updater(prev));
  }, []);

  const api = React.useMemo<StoreApi>(() => {
    const targets: Targets =
      state.settings.overrideTargets || !state.profile
        ? state.settings.manualTargets
        : computeTargets(state.profile, state.engine);

    return {
      state,
      ready,
      targets,
      apply,

      saveProfile: (profile) => apply((s) => ({ ...s, profile, onboarded: true })),

      patchProfile: (patch) =>
        apply((s) => (s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s)),

      patchEngine: (patch) => apply((s) => ({ ...s, engine: { ...s.engine, ...patch } })),

      patchSettings: (patch) => apply((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      addFood: (food) => {
        const created: FoodItem = {
          ...food,
          id: uid("food"),
          custom: true,
          createdAt: new Date().toISOString(),
        };
        apply((s) => ({ ...s, foods: [created, ...s.foods] }));
        return created;
      },

      updateFood: (id, patch) =>
        apply((s) => ({ ...s, foods: s.foods.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

      deleteFood: (id) =>
        apply((s) => ({
          ...s,
          foods: s.foods.filter((f) => f.id !== id),
          recipes: s.recipes.map((r) => ({
            ...r,
            ingredients: r.ingredients.filter((i) => i.foodId !== id),
          })),
        })),

      addRecipe: (recipe) => {
        const created: Recipe = { ...recipe, id: uid("rcp"), createdAt: new Date().toISOString() };
        apply((s) => ({ ...s, recipes: [created, ...s.recipes] }));
        return created;
      },

      updateRecipe: (id, patch) =>
        apply((s) => ({ ...s, recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),

      deleteRecipe: (id) => apply((s) => ({ ...s, recipes: s.recipes.filter((r) => r.id !== id) })),

      addEntry: (entry) =>
        apply((s) => ({
          ...s,
          entries: [{ ...entry, id: uid("log"), createdAt: new Date().toISOString() }, ...s.entries],
        })),

      updateEntry: (id, patch) =>
        apply((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      deleteEntry: (id) => apply((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })),

      getDay: (date) => state.days[date] ?? emptyDay(date),

      patchDay: (date, patch) =>
        apply((s) => {
          const current = s.days[date] ?? emptyDay(date);
          const next = { ...current, ...patch };
          const days = { ...s.days, [date]: next };
          // the profile's current weight always tracks the newest weigh-in
          const isLatest = Object.keys(days).every((k) => k <= date || days[k].weightKg == null);
          const profile =
            patch.weightKg != null && s.profile && isLatest
              ? { ...s.profile, currentWeightKg: patch.weightKg }
              : s.profile;
          return { ...s, days, profile };
        }),

      addWater: (date, ml) =>
        apply((s) => {
          const current = s.days[date] ?? emptyDay(date);
          return {
            ...s,
            days: { ...s.days, [date]: { ...current, waterMl: Math.max(0, current.waterMl + ml) } },
          };
        }),

      replaceState: (next) => apply(() => next),

      resetAll: async () => {
        await clearState();
        dirty.current = true;
        setState(INITIAL_STATE);
      },
    };
  }, [state, ready, apply]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export function useToday(): string {
  const [key, setKey] = React.useState(todayKey);
  React.useEffect(() => {
    const t = setInterval(() => setKey(todayKey()), 60_000);
    return () => clearInterval(t);
  }, []);
  return key;
}
