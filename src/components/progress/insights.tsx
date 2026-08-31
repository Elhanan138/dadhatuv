"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Flame, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { sumEntries } from "@/lib/calc";
import { streak, weeklyInsights, type DaySummary } from "@/lib/coach";
import type { LogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Says the thing the charts only imply. One or two sentences a person can act on,
 * rather than four graphs they have to interpret themselves.
 */
export function InsightsCard({ dayKeys }: { dayKeys: string[] }) {
  const { state, targets } = useStore();

  const summaries = React.useMemo<DaySummary[]>(() => {
    const byDate = new Map<string, LogEntry[]>();
    for (const e of state.entries) {
      const list = byDate.get(e.date) ?? [];
      list.push(e);
      byDate.set(e.date, list);
    }
    return dayKeys.map((date) => {
      const entries = byDate.get(date) ?? [];
      const totals = sumEntries(entries);
      return {
        date,
        kcal: totals.kcal,
        protein: totals.protein,
        fiber: totals.fiber,
        waterMl: state.days[date]?.waterMl ?? 0,
        logged: entries.length > 0,
      };
    });
  }, [dayKeys, state.entries, state.days]);

  const insights = React.useMemo(() => weeklyInsights(summaries, targets), [summaries, targets]);
  const days = streak(summaries);

  if (!insights.length) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent" />
            מה הנתונים אומרים
          </CardTitle>
          <CardDescription>המסקנות, לא הגרפים.</CardDescription>
        </div>
        {days > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5">
            <Flame className="h-4 w-4 text-accent" />
            <span className="num text-sm font-bold">{days}</span>
            <span className="text-xs text-muted-foreground">ימים ברצף</span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ul className="space-y-2.5">
          {insights.slice(0, 4).map((insight, i) => {
            const Icon = insight.severity === "good" ? CheckCircle2 : AlertTriangle;
            return (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    insight.severity === "good" && "text-success",
                    insight.severity === "watch" && "text-warn",
                    insight.severity === "bad" && "text-destructive",
                  )}
                />
                <span className={cn(insight.severity === "bad" && "font-medium")}>{insight.text}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
