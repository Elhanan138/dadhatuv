"use client";

import * as React from "react";
import { Droplets, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/progress";
import { useStore } from "@/lib/store";

const STEPS = [250, 500, 750];

export function WaterCard({ date }: { date: string }) {
  const { getDay, addWater, targets } = useStore();
  const day = getDay(date);
  const glasses = Math.floor(day.waterMl / 250);
  const targetGlasses = Math.round(targets.waterMl / 250);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary" />
          מים
        </CardTitle>
        <span className="num text-sm text-muted-foreground">
          {day.waterMl} / {targets.waterMl} מ״ל
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <Meter value={day.waterMl} max={targets.waterMl} overflowTone="accent" />

        <div className="flex flex-wrap gap-1.5" aria-label="כוסות שנשתו">
          {Array.from({ length: Math.max(targetGlasses, glasses) }, (_, i) => (
            <span
              key={i}
              className={`h-6 w-4 rounded-sm border transition-colors ${
                i < glasses ? "border-primary bg-primary/70" : "border-border bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {STEPS.map((ml) => (
            <Button key={ml} variant="outline" size="sm" onClick={() => addWater(date, ml)}>
              <Plus className="h-3.5 w-3.5" />
              <span className="num">{ml} מ״ל</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addWater(date, -250)}
            disabled={day.waterMl === 0}
            aria-label="ביטול כוס אחרונה"
          >
            <Minus className="h-3.5 w-3.5" />
            ביטול כוס
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
