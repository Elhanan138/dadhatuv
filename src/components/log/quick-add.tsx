"use client";

import * as React from "react";
import { CopyPlus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/lib/store";
import { recipePer100g, scaleFood } from "@/lib/calc";
import { frequentFoods } from "@/lib/coach";
import type { LogEntry, MealBlockId } from "@/lib/types";
import { nowTime, shiftKey } from "@/lib/utils";

/**
 * Removes the reason the log stays empty: logging the same breakfast should not
 * mean search, weigh and confirm every morning.
 */
export function QuickAdd({ date, block }: { date: string; block?: MealBlockId }) {
  const { state, addEntry } = useStore();
  const toast = useToast();

  const frequent = React.useMemo(() => frequentFoods(state.entries, 8), [state.entries]);
  const yesterday = shiftKey(date, -1);
  const yesterdayEntries = React.useMemo(
    () => state.entries.filter((e) => e.date === yesterday),
    [state.entries, yesterday],
  );

  /** Rebuilds a full entry from a reference, so quick-adds carry real macros not stale snapshots. */
  const buildEntry = React.useCallback(
    (
      refType: "food" | "recipe",
      refId: string,
      grams: number,
      targetBlock: MealBlockId,
    ): Omit<LogEntry, "id" | "createdAt"> | null => {
      if (refType === "food") {
        const food = state.foods.find((f) => f.id === refId);
        if (!food) return null;
        return {
          date,
          block: targetBlock,
          refType,
          refId,
          grams,
          nameSnapshot: food.name,
          light: food.light,
          time: nowTime(),
          ...scaleFood(food, grams),
        };
      }

      const recipe = state.recipes.find((r) => r.id === refId);
      if (!recipe) return null;
      const per100 = recipePer100g(recipe, state.foods);
      const k = grams / 100;
      return {
        date,
        block: targetBlock,
        refType,
        refId,
        grams,
        nameSnapshot: recipe.name,
        light: "yellow",
        time: nowTime(),
        kcal: Math.round(per100.kcal * k),
        protein: Math.round(per100.protein * k),
        carbs: Math.round(per100.carbs * k),
        fat: Math.round(per100.fat * k),
        fiber: Math.round(per100.fiber * k),
      };
    },
    [date, state.foods, state.recipes],
  );

  function quickLog(refType: "food" | "recipe", refId: string, grams: number, name: string) {
    const entry = buildEntry(refType, refId, grams, block ?? "break_fast");
    if (!entry) {
      toast("הפריט כבר לא קיים במאגר", "error");
      return;
    }
    addEntry(entry);
    toast(`${name} · ${grams}ג׳ נרשם`);
  }

  function copyYesterday() {
    let copied = 0;
    for (const e of yesterdayEntries) {
      const entry = buildEntry(e.refType, e.refId, e.grams, e.block);
      if (entry) {
        addEntry(entry);
        copied++;
      }
    }
    toast(copied ? `הועתקו ${copied} רישומים מאתמול` : "אין מה להעתיק מאתמול", copied ? "success" : "info");
  }

  if (!frequent.length && !yesterdayEntries.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Zap className="h-3.5 w-3.5 text-accent" />
        רישום מהיר
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {yesterdayEntries.length > 0 && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={copyYesterday}>
            <CopyPlus className="h-3.5 w-3.5" />
            העתק את אתמול ({yesterdayEntries.length})
          </Button>
        )}

        {frequent.map((f) => (
          <Button
            key={`${f.refType}:${f.refId}`}
            variant="secondary"
            size="sm"
            className="num shrink-0"
            onClick={() => quickLog(f.refType, f.refId, f.grams, f.name)}
          >
            {f.name}
            <span className="text-muted-foreground">{f.grams}ג׳</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
