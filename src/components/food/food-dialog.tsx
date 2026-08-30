"use client";

import * as React from "react";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SettingRow, Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import type { FoodItem, TrafficLight } from "@/lib/types";
import { LIGHT_LABELS } from "@/lib/seed/defaults";
import { macroKcal } from "@/lib/calc";

type Draft = Omit<FoodItem, "id" | "custom" | "createdAt">;

const BLANK: Draft = {
  name: "",
  category: "",
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  satiety: 3,
  light: "green",
  servingName: "",
  servingGrams: undefined,
  liquid: false,
};

export function FoodDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FoodItem | null;
}) {
  const { state, addFood, updateFood } = useStore();
  const toast = useToast();
  const [draft, setDraft] = React.useState<Draft>(BLANK);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setDraft(
      editing
        ? {
            name: editing.name,
            category: editing.category,
            kcal: editing.kcal,
            protein: editing.protein,
            carbs: editing.carbs,
            fat: editing.fat,
            fiber: editing.fiber,
            satiety: editing.satiety,
            light: editing.light,
            servingName: editing.servingName ?? "",
            servingGrams: editing.servingGrams,
            liquid: editing.liquid ?? false,
          }
        : { ...BLANK, category: state.settings.categories[0] ?? "" },
    );
  }, [open, editing, state.settings.categories]);

  const derivedKcal = macroKcal(draft);
  const drift = draft.kcal > 0 ? Math.abs(derivedKcal - draft.kcal) / draft.kcal : 0;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  function save() {
    if (!draft.name.trim()) {
      setError("צריך שם לפריט.");
      return;
    }
    if (!draft.category) {
      setError("בחר קטגוריה.");
      return;
    }
    const payload: Draft = {
      ...draft,
      name: draft.name.trim(),
      servingName: draft.servingName?.trim() || undefined,
      servingGrams: draft.servingGrams && draft.servingGrams > 0 ? draft.servingGrams : undefined,
    };
    if (editing) {
      updateFood(editing.id, payload);
      toast(`${payload.name} עודכן`);
    } else {
      addFood(payload);
      toast(`${payload.name} נוסף למאגר`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "עריכת פריט" : "פריט חדש במאגר"}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="שם הפריט">
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} autoFocus />
            </Field>
            <Field label="קטגוריה">
              <Select value={draft.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  {state.settings.categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <p className="text-xs font-semibold text-muted-foreground">
            ערכים ל־100 {draft.liquid ? "מ״ל" : "גרם"}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="קלוריות">
              <Input type="number" value={draft.kcal} onChange={(e) => set("kcal", Number(e.target.value))} />
            </Field>
            <Field label="חלבון (ג׳)">
              <Input type="number" step="0.1" value={draft.protein} onChange={(e) => set("protein", Number(e.target.value))} />
            </Field>
            <Field label="פחמימות (ג׳)">
              <Input type="number" step="0.1" value={draft.carbs} onChange={(e) => set("carbs", Number(e.target.value))} />
            </Field>
            <Field label="שומן (ג׳)">
              <Input type="number" step="0.1" value={draft.fat} onChange={(e) => set("fat", Number(e.target.value))} />
            </Field>
            <Field label="סיבים (ג׳)">
              <Input type="number" step="0.1" value={draft.fiber} onChange={(e) => set("fiber", Number(e.target.value))} />
            </Field>
            <Field label="קטגוריית רמזור">
              <Select value={draft.light} onValueChange={(v) => set("light", v as TrafficLight)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LIGHT_LABELS) as TrafficLight[]).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LIGHT_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {drift > 0.15 && (
            <p className="num rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs">
              המאקרו מסתכם ב־{derivedKcal} קק״ל אבל רשמת {draft.kcal}. בדוק את הערכים.
            </p>
          )}

          <Field label={`מדד שובע — ${draft.satiety}/5`}>
            <Slider value={[draft.satiety]} min={1} max={5} step={1} onValueChange={([v]) => set("satiety", v)} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="שם מנה טבעית" hint="למשל: ביצה, פיתה, כף">
              <Input value={draft.servingName ?? ""} onChange={(e) => set("servingName", e.target.value)} />
            </Field>
            <Field label="משקל מנה (גרם)">
              <Input
                type="number"
                value={draft.servingGrams ?? ""}
                onChange={(e) => set("servingGrams", e.target.value === "" ? undefined : Number(e.target.value))}
              />
            </Field>
          </div>

          <SettingRow title="פריט נוזלי" description="נמדד במ״ל ונספר גם כשתייה">
            <Switch checked={draft.liquid ?? false} onCheckedChange={(v) => set("liquid", v)} />
          </SettingRow>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button onClick={save}>{editing ? "שמירת שינויים" : "הוספה למאגר"}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
