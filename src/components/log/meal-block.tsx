"use client";

import * as React from "react";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LightDot } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { sumEntries } from "@/lib/calc";
import type { LogEntry, MealBlockId } from "@/lib/types";
import { BLOCK_LABELS } from "@/lib/seed/defaults";

export function MealBlock({
  block,
  entries,
  onAdd,
}: {
  block: MealBlockId;
  entries: LogEntry[];
  onAdd: (block: MealBlockId) => void;
}) {
  const { deleteEntry } = useStore();
  const toast = useToast();
  const totals = sumEntries(entries);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{BLOCK_LABELS[block]}</CardTitle>
          <p className="num text-xs text-muted-foreground">
            {Math.round(totals.kcal)} קק״ל · {Math.round(totals.protein)} ג׳ חלבון
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onAdd(block)}>
          <Plus className="h-4 w-4" />
          הוספה
        </Button>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <button
            type="button"
            onClick={() => onAdd(block)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-6 text-sm text-muted-foreground transition-colors hover:bg-secondary"
          >
            <UtensilsCrossed className="h-4 w-4" />
            עדיין לא רשמת כלום לארוחה הזו
          </button>
        ) : (
          <ul className="divide-y">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <LightDot light={e.light} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.nameSnapshot}</p>
                  <p className="num text-xs text-muted-foreground">
                    {e.grams} גר׳ · {Math.round(e.kcal)} קק״ל · ח {Math.round(e.protein)} / פ {Math.round(e.carbs)} / ש{" "}
                    {Math.round(e.fat)}
                  </p>
                </div>
                <span className="num shrink-0 text-xs text-muted-foreground">{e.time}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`מחיקת ${e.nameSnapshot}`}
                  onClick={() => {
                    deleteEntry(e.id);
                    toast(`${e.nameSnapshot} נמחק`, "info");
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
