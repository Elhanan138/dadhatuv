"use client";

import * as React from "react";
import { LineChart, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdherenceChart, IntakeChart, MacroSplit, WeightChart } from "@/components/progress/charts";
import { MeasurementsCard } from "@/components/progress/measurements-card";
import { useStore, useToday } from "@/lib/store";
import { adherence, movingAverage, sumEntries } from "@/lib/calc";
import { lastNDays } from "@/lib/utils";

const RANGES = [
  { key: "14", label: "14 יום", days: 14 },
  { key: "30", label: "30 יום", days: 30 },
  { key: "90", label: "3 חודשים", days: 90 },
];

export default function ProgressPage() {
  const today = useToday();
  const { state, targets } = useStore();
  const [range, setRange] = React.useState("30");

  const days = React.useMemo(
    () => lastNDays(RANGES.find((r) => r.key === range)!.days, today),
    [range, today],
  );

  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, typeof state.entries>();
    for (const e of state.entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [state.entries]);

  const weightSeries = React.useMemo(() => {
    const raw = days.map((d) => state.days[d]?.weightKg ?? null);
    const avg = movingAverage(raw, state.settings.smoothingDays);
    return days.map((d, i) => ({ date: d, weight: raw[i], avg: avg[i] }));
  }, [days, state.days, state.settings.smoothingDays]);

  const intakeSeries = React.useMemo(
    () => days.map((d) => ({ date: d, kcal: Math.round(sumEntries(entriesByDate.get(d) ?? []).kcal) })),
    [days, entriesByDate],
  );

  const adherenceSeries = React.useMemo(
    () =>
      days.map((d) => ({
        date: d,
        score: adherence(
          state.days[d],
          sumEntries(entriesByDate.get(d) ?? []),
          targets,
          state.profile?.fasting.fast ?? 16,
        ).overall,
      })),
    [days, entriesByDate, state.days, state.profile, targets],
  );

  const rangeTotals = React.useMemo(() => {
    const all = days.flatMap((d) => entriesByDate.get(d) ?? []);
    return sumEntries(all);
  }, [days, entriesByDate]);

  const loggedDays = intakeSeries.filter((d) => d.kcal > 0).length;
  const avgKcal = loggedDays ? Math.round(intakeSeries.reduce((a, b) => a + b.kcal, 0) / loggedDays) : 0;
  const avgAdherence = adherenceSeries.length
    ? Math.round(adherenceSeries.reduce((a, b) => a + b.score, 0) / adherenceSeries.length)
    : 0;

  const weights = weightSeries.map((w) => w.weight).filter((v): v is number => v != null);
  const netChange = weights.length >= 2 ? +(weights[weights.length - 1] - weights[0]).toFixed(1) : null;

  const hasData = state.entries.length > 0 || weights.length > 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">התקדמות</h1>
          <p className="text-sm text-muted-foreground">מגמות, לא תמונות בודדות.</p>
        </div>
        <Tabs value={range} onValueChange={setRange}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.key} value={r.key}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {!hasData ? (
        <EmptyState
          icon={LineChart}
          title="אין מספיק נתונים"
          body="רשום שקילת בוקר וכמה ארוחות. אחרי שלושה־ארבעה ימים הגרפים מתחילים לספר סיפור אמיתי."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="שינוי במשקל" value={netChange != null ? `${netChange > 0 ? "+" : ""}${netChange} ק״ג` : "—"} />
            <Summary label="ממוצע קלוריות" value={avgKcal ? `${avgKcal} קק״ל` : "—"} />
            <Summary label="ממוצע היצמדות" value={`${avgAdherence}%`} />
            <Summary label="ימים מתועדים" value={`${loggedDays} מתוך ${days.length}`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                מגמת משקל
              </CardTitle>
              <CardDescription>
                הקו הכהה הוא ממוצע נע של {state.settings.smoothingDays} ימים — הוא מנטרל תנודות מים.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeightChart data={weightSeries} target={state.profile?.targetWeightKg} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>צריכה קלורית יומית</CardTitle>
                <CardDescription>הקו המקווקו הוא היעד היומי שלך.</CardDescription>
              </CardHeader>
              <CardContent>
                <IntakeChart data={intakeSeries} target={targets.kcal} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ציון היצמדות יומי</CardTitle>
                <CardDescription>משוקלל מקלוריות, חלבון, מים וחלון הצום.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdherenceChart data={adherenceSeries} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>פילוח מאקרו בטווח</CardTitle>
                <CardDescription>אחוז מהקלוריות שנצרכו בפועל.</CardDescription>
              </CardHeader>
              <CardContent>
                <MacroSplit protein={rangeTotals.protein} carbs={rangeTotals.carbs} fat={rangeTotals.fat} />
              </CardContent>
            </Card>

            <MeasurementsCard date={today} />
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
