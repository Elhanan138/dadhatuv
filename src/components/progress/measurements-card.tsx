"use client";

import * as React from "react";
import { Ruler, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import type { Measurements } from "@/lib/types";
import { formatDateHe } from "@/lib/utils";

const FIELDS: Array<{ key: keyof Measurements; label: string }> = [
  { key: "waist", label: "מותניים" },
  { key: "chest", label: "חזה" },
  { key: "hips", label: "ירכיים" },
  { key: "armR", label: "זרוע ימין" },
  { key: "thighR", label: "ירך ימין" },
  { key: "neck", label: "צוואר" },
];

export function MeasurementsCard({ date }: { date: string }) {
  const { state, getDay, patchDay } = useStore();
  const toast = useToast();
  const day = getDay(date);
  const [draft, setDraft] = React.useState<Measurements>(day.measurements ?? {});

  React.useEffect(() => setDraft(day.measurements ?? {}), [date, day.measurements]);

  // most recent earlier record that actually has measurements
  const baseline = React.useMemo(() => {
    const keys = Object.keys(state.days)
      .filter((k) => k < date && state.days[k].measurements)
      .sort();
    const last = keys[keys.length - 1];
    return last ? { key: last, m: state.days[last].measurements! } : null;
  }, [state.days, date]);

  function save() {
    const cleaned = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => typeof v === "number" && !Number.isNaN(v) && v > 0),
    ) as Measurements;
    patchDay(date, { measurements: Object.keys(cleaned).length ? cleaned : undefined });
    toast("המדידות נשמרו");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-primary" />
          היקפי גוף (ס״מ)
        </CardTitle>
        <CardDescription>
          {baseline ? `השוואה מול ${formatDateHe(baseline.key)}` : "המדידה הראשונה תשמש כנקודת ייחוס"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FIELDS.map(({ key, label }) => {
            const current = draft[key];
            const before = baseline?.m[key];
            const delta = current != null && before != null ? +(current - before).toFixed(1) : null;
            return (
              <Field key={key} label={label}>
                <Input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={current ?? ""}
                  placeholder="—"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [key]: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                />
                {delta !== null && delta !== 0 && (
                  <span
                    className={`num inline-flex items-center gap-1 text-[11px] ${
                      delta < 0 ? "text-success" : "text-accent"
                    }`}
                  >
                    {delta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                )}
              </Field>
            );
          })}
        </div>
        <Button onClick={save} size="sm">
          שמירת מדידות
        </Button>
      </CardContent>
    </Card>
  );
}
