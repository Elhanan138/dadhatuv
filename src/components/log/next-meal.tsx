"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, ChefHat, Moon, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/lib/store";
import { useClock } from "@/lib/hooks";
import { sumEntries } from "@/lib/calc";
import { eatingWindow, formatDuration, remaining, suggestMeal } from "@/lib/coach";
import type { MealBlockId } from "@/lib/types";
import { fmt, nowTime, todayKey } from "@/lib/utils";

const DEFAULT_WINDOW = { fast: 16, eat: 8, windowOpensAt: "12:00" };

/**
 * The one card on the page that tells the user something instead of asking.
 * Takes the day's remaining macros and turns them into a plate they can log in one tap.
 */
export function NextMealCard({ date }: { date: string }) {
  const { state, targets, getDay, addEntry } = useStore();
  const toast = useToast();
  const clock = useClock();
  const [variant, setVariant] = React.useState(0);

  const isToday = date === todayKey();
  const entries = React.useMemo(() => state.entries.filter((e) => e.date === date), [state.entries, date]);
  const totals = sumEntries(entries);
  const day = getDay(date);

  const gap = remaining(totals, targets, day.waterMl);
  const eatenIds = React.useMemo(() => entries.map((e) => e.refId), [entries]);

  const suggestion = React.useMemo(
    () => suggestMeal(gap, state.foods, { variant, exclude: eatenIds }),
    [gap, state.foods, variant, eatenIds],
  );

  const windowState = eatingWindow(state.profile?.fasting ?? DEFAULT_WINDOW, isToday ? clock : "12:00");
  const fasting = isToday && windowState.phase === "fasting";

  function nextBlock(): MealBlockId {
    const has = (b: MealBlockId) => entries.some((e) => e.block === b);
    if (!has("break_fast")) return "break_fast";
    if (!has("secondary")) return "secondary";
    return "snack";
  }

  function logPlate() {
    if (!suggestion) return;
    const block = nextBlock();
    const time = nowTime();
    for (const item of suggestion.items) {
      addEntry({
        date,
        block,
        refType: "food",
        refId: item.food.id,
        grams: item.grams,
        nameSnapshot: item.food.name,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
        light: item.food.light,
        time,
      });
    }
    toast(`נרשמו ${suggestion.items.length} פריטים · ${fmt(suggestion.totals.kcal)} קק״ל`);
    setVariant((v) => v + 1);
  }

  // ── nothing left to plan ──────────────────────────────────────────────────
  if (!suggestion) {
    const done = gap.kcal < 120 && totals.kcal > 0;
    return (
      <Card className="border-success/30 bg-success/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            {done ? "סגרת את היום" : "אין מה להציע כרגע"}
          </CardTitle>
          <CardDescription>
            {done
              ? `${fmt(totals.kcal)} קק״ל ו־${fmt(totals.protein)}ג׳ חלבון. היעד נסגר — אל תוסיף עוד.`
              : "הוסף מזון למאגר כדי שאוכל להציע הרכבים שסוגרים את היעד."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/25">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-primary" />
            {fasting ? "מה מחכה לך בפתיחת החלון" : "מה לאכול עכשיו"}
          </CardTitle>
          <CardDescription className="num">
            נותרו {fmt(gap.kcal)} קק״ל · {fmt(gap.protein)}ג׳ חלבון
            {fasting && ` · החלון נפתח בעוד ${formatDuration(windowState.minutesToOpen)}`}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="הצעה אחרת"
          onClick={() => setVariant((v) => v + 1)}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-1.5">
          {suggestion.items.map((item, i) => (
            <motion.li
              key={`${item.food.id}-${variant}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: i * 0.04 }}
              className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="num shrink-0 rounded-md bg-background px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {item.grams}ג׳
                </span>
                <span className="truncate text-sm font-medium">{item.food.name}</span>
              </div>
              <span className="num shrink-0 text-xs text-muted-foreground">
                {fmt(item.kcal)} קק״ל · {fmt(item.protein)}ג׳ ח׳
              </span>
            </motion.li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="green" className="num gap-1">
            <Sparkles className="h-3 w-3" />
            סוגר {Math.round(suggestion.covers.protein * 100)}% מפער החלבון
          </Badge>
          <span className="num text-xs text-muted-foreground">
            סה״כ {fmt(suggestion.totals.kcal)} קק״ל · {fmt(suggestion.totals.protein)}ג׳ חלבון ·{" "}
            {fmt(suggestion.totals.fiber)}ג׳ סיבים
          </span>
        </div>

        <Button className="w-full" onClick={logPlate} disabled={fasting}>
          {fasting ? (
            <>
              <Moon className="h-4 w-4" />
              עדיין בצום — {formatDuration(windowState.minutesToOpen)} לפתיחה
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              רשום את כל המנה
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
