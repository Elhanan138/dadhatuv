"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Plus, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { MealBlock } from "@/components/log/meal-block";
import { WaterCard } from "@/components/log/water-card";
import { FastingTimer } from "@/components/log/fasting-timer";
import { NextMealCard } from "@/components/log/next-meal";
import { QuickAdd } from "@/components/log/quick-add";
import { AddEntryDialog } from "@/components/log/add-entry-dialog";
import { useStore, useToday } from "@/lib/store";
import { adherence, sumEntries } from "@/lib/calc";
import type { MealBlockId } from "@/lib/types";
import { cn, formatDateHe, relativeDayHe, shiftKey, todayKey } from "@/lib/utils";

export default function LogPage() {
  const today = useToday();
  const [date, setDate] = React.useState(today);
  const { state, targets, getDay, patchDay } = useStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [block, setBlock] = React.useState<MealBlockId>("break_fast");
  const [nsvDraft, setNsvDraft] = React.useState("");
  const [showJournal, setShowJournal] = React.useState(false);

  const entries = React.useMemo(() => state.entries.filter((e) => e.date === date), [state.entries, date]);
  const totals = sumEntries(entries);
  const day = getDay(date);
  const score = adherence(day, totals, targets, state.profile?.fasting.fast ?? 16);
  const isFuture = date > todayKey();
  const hasJournal = day.nsv.length > 0 || !!day.note;

  function openAdd(b: MealBlockId) {
    setBlock(b);
    setDialogOpen(true);
  }

  function addNsv() {
    const text = nsvDraft.trim();
    if (!text) return;
    patchDay(date, { nsv: [...day.nsv, text] });
    setNsvDraft("");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="יום קודם" onClick={() => setDate(shiftKey(date, -1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="min-w-[190px] text-center">
            <p className="font-display text-lg font-bold leading-tight">
              {relativeDayHe(date) ?? formatDateHe(date).split(",")[0]}
            </p>
            <p className="text-xs text-muted-foreground">{formatDateHe(date)}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="יום הבא"
            onClick={() => setDate(shiftKey(date, 1))}
            disabled={isFuture}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            max={todayKey()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="w-[160px]"
          />
          {date !== today && (
            <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
              <CalendarDays className="h-4 w-4" />
              היום
            </Button>
          )}
        </div>
      </header>

      {/* what to do next, before anything that asks for input */}
      <div className="grid gap-4 lg:grid-cols-2">
        <NextMealCard date={date} />
        <FastingTimer date={date} />
      </div>

      <QuickAdd date={date} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="קלוריות" value={totals.kcal} target={targets.kcal} />
        <Stat label="חלבון" value={totals.protein} unit="ג׳" target={targets.protein} tone="success" />
        <Stat label="פחמימות" value={totals.carbs} unit="ג׳" target={targets.carbs} tone="accent" />
        <Stat label="שומן" value={totals.fat} unit="ג׳" target={targets.fat} tone="warn" />
        <Stat label="סיבים" value={totals.fiber} unit="ג׳" target={targets.fiber} tone="success" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={score.overall >= 85 ? "green" : score.overall >= 60 ? "yellow" : "red"}>
          היצמדות {score.overall}%
        </Badge>
        {totals.greenCount > 0 && <Badge variant="green">{totals.greenCount} פריטים ירוקים</Badge>}
        {totals.redCount > 0 && <Badge variant="red">{totals.redCount} פריטים אדומים</Badge>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MealBlock block="break_fast" entries={entries.filter((e) => e.block === "break_fast")} onAdd={openAdd} />
        <MealBlock block="secondary" entries={entries.filter((e) => e.block === "secondary")} onAdd={openAdd} />
        <MealBlock block="snack" entries={entries.filter((e) => e.block === "snack")} onAdd={openAdd} />
      </div>

      <WaterCard date={date} />

      {/* optional, and out of the way until asked for */}
      <div>
        <button
          type="button"
          onClick={() => setShowJournal((s) => !s)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={showJournal || hasJournal}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", (showJournal || hasJournal) && "rotate-180")}
          />
          יומן אישי — ניצחונות והערות
          {hasJournal && <Badge variant="green">{day.nsv.length + (day.note ? 1 : 0)}</Badge>}
        </button>

        {(showJournal || hasJournal) && (
          <Card className="mt-3">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                ניצחונות שלא על המשקל
              </CardTitle>
              <CardDescription>אנרגיה, שינה, מכנסיים שנסגרים — כל מה שהמאזניים לא מודדים.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {day.nsv.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {day.nsv.map((n, i) => (
                    <li key={`${n}-${i}`}>
                      <Badge variant="green" className="gap-1">
                        {n}
                        <button
                          type="button"
                          aria-label={`הסרת ${n}`}
                          onClick={() => patchDay(date, { nsv: day.nsv.filter((_, j) => j !== i) })}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  value={nsvDraft}
                  onChange={(e) => setNsvDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNsv()}
                  placeholder="ישנתי 7 שעות רצוף"
                />
                <Button variant="outline" size="icon" aria-label="הוספת ניצחון" onClick={addNsv}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Textarea
                value={day.note ?? ""}
                onChange={(e) => patchDay(date, { note: e.target.value })}
                placeholder="הערות ליום — איך הרגשת, מה היה קשה, מה עבד."
              />
            </CardContent>
          </Card>
        )}
      </div>

      <AddEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} date={date} defaultBlock={block} />
    </div>
  );
}
