"use client";

import * as React from "react";
import { AlertTriangle, Plus, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Ring } from "@/components/ui/progress";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { MealBlock } from "@/components/log/meal-block";
import { WaterCard } from "@/components/log/water-card";
import { FastingTimer } from "@/components/log/fasting-timer";
import { NextMealCard } from "@/components/log/next-meal";
import { QuickAdd } from "@/components/log/quick-add";
import { InstallBanner } from "@/components/layout/pwa";
import { AddEntryDialog } from "@/components/log/add-entry-dialog";
import { useStore, useToday } from "@/lib/store";
import { adherence, movingAverage, projectedWeeks, sumEntries, tdee } from "@/lib/calc";
import type { AlertRule, MealBlockId } from "@/lib/types";
import { formatDateHe, lastNDays } from "@/lib/utils";

export default function DashboardPage() {
  const today = useToday();
  const { state, targets, getDay, patchDay } = useStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [block, setBlock] = React.useState<MealBlockId>("break_fast");

  const entries = React.useMemo(() => state.entries.filter((e) => e.date === today), [state.entries, today]);
  const totals = sumEntries(entries);
  const day = getDay(today);
  const profile = state.profile;
  const fastHours = profile?.fasting.fast ?? 16;
  const score = adherence(day, totals, targets, fastHours);

  const alerts = React.useMemo(
    () => state.settings.alerts.filter((a) => a.enabled && triggered(a, totals, day.waterMl, targets)),
    [state.settings.alerts, totals, day.waterMl, targets],
  );

  const trend = React.useMemo(() => {
    const days = lastNDays(state.settings.smoothingDays, today);
    const weights = days.map((d) => state.days[d]?.weightKg ?? null);
    const avg = movingAverage(weights, state.settings.smoothingDays);
    return avg[avg.length - 1];
  }, [state.days, state.settings.smoothingDays, today]);

  const maintenance = profile ? tdee(profile, state.engine) : 0;
  const weeks = profile
    ? projectedWeeks(profile.currentWeightKg, profile.targetWeightKg, targets.kcal - maintenance)
    : null;

  function openAdd(b: MealBlockId) {
    setBlock(b);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">
            {greeting()}
            {profile?.name ? `, ${profile.name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDateHe(today)}</p>
        </div>
        <Button onClick={() => openAdd("break_fast")}>
          <Plus className="h-4 w-4" />
          רישום אכילה
        </Button>
      </header>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <InstallBanner />

      {/* the two answers first: what to eat, and how long until you can */}
      <div className="grid gap-4 lg:grid-cols-2">
        <NextMealCard date={today} />
        <FastingTimer date={today} />
      </div>

      <QuickAdd date={today} />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 pt-4">
          <Ring value={score.overall} label={`${score.overall}%`} sublabel="היצמדות" />
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <MiniScore label="קלוריות" value={score.calories} />
            <MiniScore label="חלבון" value={score.protein} />
            <MiniScore label="מים" value={score.water} />
            <MiniScore label="צום" value={score.fasting} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="קלוריות" value={totals.kcal} target={targets.kcal} />
        <Stat label="חלבון" value={totals.protein} unit="ג׳" target={targets.protein} tone="success" />
        <Stat label="פחמימות" value={totals.carbs} unit="ג׳" target={targets.carbs} tone="accent" />
        <Stat label="שומן" value={totals.fat} unit="ג׳" target={targets.fat} tone="warn" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <WaterCard date={today} />

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                שקילת בוקר
              </CardTitle>
              <CardDescription>
                {trend != null
                  ? `ממוצע נע ${state.settings.smoothingDays} ימים: ${trend} ק״ג`
                  : "רשום שקילה כדי להתחיל ממוצע נע"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="ק״ג"
                  value={day.weightKg ?? ""}
                  onChange={(e) =>
                    patchDay(today, { weightKg: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                  className="max-w-[140px]"
                />
                {profile && (
                  <span className="num text-sm text-muted-foreground">
                    יעד {profile.targetWeightKg} ק״ג
                  </span>
                )}
              </div>
              {weeks != null && (
                <p className="num flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  בקצב הנוכחי ({targets.kcal - maintenance} קק״ל ליום) היעד בעוד כ־{weeks} שבועות
                </p>
              )}
              {totals.redCount > 0 && (
                <Badge variant="red">{totals.redCount} פריטים אדומים היום</Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MealBlock block="break_fast" entries={entries.filter((e) => e.block === "break_fast")} onAdd={openAdd} />
        <MealBlock block="secondary" entries={entries.filter((e) => e.block === "secondary")} onAdd={openAdd} />
        <MealBlock block="snack" entries={entries.filter((e) => e.block === "snack")} onAdd={openAdd} />
      </div>

      <AddEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} date={today} defaultBlock={block} />
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="num font-display text-xl font-bold leading-none">{value}%</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

function triggered(
  rule: AlertRule,
  totals: ReturnType<typeof sumEntries>,
  waterMl: number,
  targets: { kcal: number; protein: number; carbs: number; fat: number; waterMl: number },
): boolean {
  const actual: Record<AlertRule["metric"], number> = {
    kcal: totals.kcal,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    water: waterMl,
    red_items: totals.redCount,
  };
  const targetFor: Record<AlertRule["metric"], number> = {
    kcal: targets.kcal,
    protein: targets.protein,
    carbs: targets.carbs,
    fat: targets.fat,
    water: targets.waterMl,
    red_items: 1,
  };
  const value = actual[rule.metric];
  const threshold = rule.pctOfTarget ? (targetFor[rule.metric] * rule.value) / 100 : rule.value;

  // a "below" rule on an untouched day would fire before the user has eaten anything
  if (rule.comparator === "below" && value === 0) return false;
  return rule.comparator === "above" ? value > threshold : value < threshold;
}
