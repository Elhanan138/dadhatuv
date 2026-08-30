"use client";

import * as React from "react";
import { Moon, Timer, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { addMinutes, minutesBetween } from "@/lib/calc";
import { nowTime, todayKey } from "@/lib/utils";

export function FastingCard({ date }: { date: string }) {
  const { state, getDay, patchDay } = useStore();
  const day = getDay(date);
  const fasting = state.profile?.fasting ?? { fast: 16, eat: 8, windowOpensAt: "12:00" };
  const isToday = date === todayKey();

  const [clock, setClock] = React.useState(nowTime);
  React.useEffect(() => {
    if (!isToday) return;
    const t = setInterval(() => setClock(nowTime()), 30_000);
    return () => clearInterval(t);
  }, [isToday]);

  const plannedOpen = fasting.windowOpensAt;
  const plannedClose = addMinutes(plannedOpen, fasting.eat * 60);

  const actualHours = day.fastStart && day.fastEnd ? minutesBetween(day.fastStart, day.fastEnd) / 60 : null;
  const elapsed = day.fastStart && !day.fastEnd && isToday ? minutesBetween(day.fastStart, clock) / 60 : null;
  const remaining = elapsed != null ? Math.max(0, fasting.fast - elapsed) : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-accent" />
          חלון הצום
        </CardTitle>
        <span className="num text-sm text-muted-foreground">
          {fasting.fast}:{fasting.eat}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <WindowBar openAt={plannedOpen} closeAt={plannedClose} now={isToday ? clock : null} />

        <p className="num text-sm text-muted-foreground">
          חלון אכילה מתוכנן: {plannedOpen} – {plannedClose}
        </p>

        {elapsed != null && (
          <div className="rounded-lg border bg-accent/10 p-3">
            <p className="num font-display text-2xl font-bold leading-none">
              {Math.floor(elapsed)}ש׳ {Math.round((elapsed % 1) * 60)}ד׳
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {remaining! > 0
                ? `נותרו ${Math.floor(remaining!)}ש׳ ${Math.round((remaining! % 1) * 60)}ד׳ עד סוף הצום`
                : "הצום המתוכנן הושלם — אפשר לפתוח את חלון האכילה"}
            </p>
          </div>
        )}

        {actualHours != null && (
          <p className="num text-sm">
            צום בפועל: <strong>{actualHours.toFixed(1)} שעות</strong> מתוך {fasting.fast}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="תחילת צום">
            <Input
              type="time"
              value={day.fastStart ?? ""}
              onChange={(e) => patchDay(date, { fastStart: e.target.value || undefined })}
            />
          </Field>
          <Field label="שבירת צום">
            <Input
              type="time"
              value={day.fastEnd ?? ""}
              onChange={(e) => patchDay(date, { fastEnd: e.target.value || undefined })}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={day.fastStart ? "outline" : "default"}
            size="sm"
            onClick={() => patchDay(date, { fastStart: nowTime() })}
          >
            <Moon className="h-4 w-4" />
            התחלתי לצום עכשיו
          </Button>
          <Button
            variant={day.fastEnd ? "outline" : "accent"}
            size="sm"
            onClick={() => patchDay(date, { fastEnd: nowTime() })}
            disabled={!day.fastStart}
          >
            <UtensilsCrossed className="h-4 w-4" />
            שברתי צום
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** 24h strip, right-to-left: 00:00 sits on the right edge. */
function WindowBar({ openAt, closeAt, now }: { openAt: string; closeAt: string; now: string | null }) {
  const toPct = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return ((h * 60 + m) / 1440) * 100;
  };
  const start = toPct(openAt);
  const end = toPct(closeAt);
  const segments = end > start ? [[start, end - start]] : [[start, 100 - start], [0, end]];

  return (
    <div className="relative h-8 w-full overflow-hidden rounded-md bg-muted">
      {segments.map(([from, width], i) => (
        <div
          key={i}
          className="absolute inset-y-0 bg-accent/35"
          style={{ right: `${from}%`, width: `${width}%` }}
        />
      ))}
      {now && (
        <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ right: `${toPct(now)}%` }} aria-hidden />
      )}
      <div className="num pointer-events-none absolute inset-0 flex items-center justify-between px-2 text-[10px] text-muted-foreground">
        <span>00:00</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
