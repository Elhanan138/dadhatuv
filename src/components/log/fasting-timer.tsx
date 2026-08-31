"use client";

import * as React from "react";
import { ChevronDown, Moon, UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { useClock } from "@/lib/hooks";
import { minutesBetween } from "@/lib/calc";
import { eatingWindow, formatDuration } from "@/lib/coach";
import { cn, nowTime, todayKey } from "@/lib/utils";

const DEFAULT_WINDOW = { fast: 16, eat: 8, windowOpensAt: "12:00" };

/**
 * The number people check ten times a day: how long until they can eat, or how
 * long they have left to. Manual correction is still there, just demoted.
 */
export function FastingTimer({ date }: { date: string }) {
  const { state, getDay, patchDay } = useStore();
  const day = getDay(date);
  const fasting = state.profile?.fasting ?? DEFAULT_WINDOW;
  const isToday = date === todayKey();
  const clock = useClock();
  const [showManual, setShowManual] = React.useState(false);

  const w = eatingWindow(fasting, isToday ? clock : "12:00");
  const open = w.phase === "open";

  const countdown = open ? w.minutesToClose : w.minutesToOpen;
  const actualHours =
    day.fastStart && day.fastEnd ? minutesBetween(day.fastStart, day.fastEnd) / 60 : null;

  return (
    <Card className={cn("overflow-hidden", open ? "border-accent/30" : "border-primary/25")}>
      <CardContent className="space-y-5 pt-5">
        <div className="flex items-center gap-5">
          <PhaseRing progress={w.progress} open={open} label={formatDuration(countdown)} />

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-display text-lg font-bold leading-tight",
                open ? "text-accent" : "text-primary",
              )}
            >
              {open ? "חלון האכילה פתוח" : "בצום"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isToday
                ? open
                  ? `נותרו ${formatDuration(countdown)} עד הסגירה ב־${w.closesAt}`
                  : `${formatDuration(countdown)} עד הפתיחה ב־${w.opensAt}`
                : `חלון מתוכנן ${w.opensAt}–${w.closesAt}`}
            </p>
            <p className="num mt-1.5 text-xs text-muted-foreground">
              {fasting.fast}:{fasting.eat}
              {actualHours != null && ` · צום בפועל היום ${actualHours.toFixed(1)} שעות`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={day.fastStart ? "outline" : "default"}
            onClick={() => patchDay(date, { fastStart: nowTime() })}
          >
            <Moon className="h-4 w-4" />
            התחלתי לצום
          </Button>
          <Button
            variant={day.fastEnd ? "outline" : "accent"}
            onClick={() => patchDay(date, { fastEnd: nowTime() })}
            disabled={!day.fastStart}
          >
            <UtensilsCrossed className="h-4 w-4" />
            שברתי צום
          </Button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowManual((s) => !s)}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={showManual}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showManual && "rotate-180")} />
            תיקון ידני של השעות
          </button>

          {showManual && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PhaseRing({ progress, open, label }: { progress: number; open: boolean; label: string }) {
  const size = 108;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const color = open ? "hsl(var(--accent))" : "hsl(var(--primary))";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - clamped * c}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num font-display text-2xl font-black leading-none tabular-nums">{label}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {open ? "לסגירה" : "לפתיחה"}
        </span>
      </div>
    </div>
  );
}
