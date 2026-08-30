"use client";

import * as React from "react";
import { ArrowRight, Search, X } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, LightDot } from "@/components/ui/badge";
import { Field } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { recipePer100g, scaleFood } from "@/lib/calc";
import type { FoodItem, MealBlockId, Recipe } from "@/lib/types";
import { BLOCK_LABELS } from "@/lib/seed/defaults";
import { cn, nowTime } from "@/lib/utils";

type Pick =
  | { kind: "food"; food: FoodItem }
  | { kind: "recipe"; recipe: Recipe; per100: ReturnType<typeof recipePer100g> };

export function AddEntryDialog({
  open,
  onOpenChange,
  date,
  defaultBlock = "break_fast",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  defaultBlock?: MealBlockId;
}) {
  const { state, addEntry } = useStore();
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [picked, setPicked] = React.useState<Pick | null>(null);
  const [grams, setGrams] = React.useState(100);
  const [block, setBlock] = React.useState<MealBlockId>(defaultBlock);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory("all");
    setPicked(null);
    setGrams(100);
    setBlock(defaultBlock);
  }, [open, defaultBlock]);

  const results = React.useMemo(() => {
    const q = query.trim();
    const foods = state.foods.filter(
      (f) => (category === "all" || f.category === category) && (!q || f.name.includes(q)),
    );
    const recipes = state.recipes.filter((r) => !q || r.name.includes(q));
    return { foods: foods.slice(0, 80), recipes: recipes.slice(0, 40) };
  }, [state.foods, state.recipes, query, category]);

  const preview = React.useMemo(() => {
    if (!picked) return null;
    if (picked.kind === "food") return scaleFood(picked.food, grams);
    const p = picked.per100;
    const k = grams / 100;
    return {
      kcal: Math.round(p.kcal * k),
      protein: Math.round(p.protein * k),
      carbs: Math.round(p.carbs * k),
      fat: Math.round(p.fat * k),
      fiber: Math.round(p.fiber * k),
    };
  }, [picked, grams]);

  function choose(p: Pick) {
    setPicked(p);
    if (p.kind === "food") setGrams(p.food.servingGrams ?? 100);
    else setGrams(p.per100.portionGrams);
  }

  function save() {
    if (!picked || !preview || grams <= 0) return;
    addEntry({
      date,
      block,
      refType: picked.kind,
      refId: picked.kind === "food" ? picked.food.id : picked.recipe.id,
      grams,
      nameSnapshot: picked.kind === "food" ? picked.food.name : picked.recipe.name,
      kcal: preview.kcal,
      protein: preview.protein,
      carbs: preview.carbs,
      fat: preview.fat,
      fiber: preview.fiber,
      light: picked.kind === "food" ? picked.food.light : "green",
      time: nowTime(),
    });
    toast(`${picked.kind === "food" ? picked.food.name : picked.recipe.name} נוסף ל${BLOCK_LABELS[block]}`);
    onOpenChange(false);
  }

  const quickGrams = picked?.kind === "food" && picked.food.servingGrams
    ? [picked.food.servingGrams, 50, 100, 150, 200]
    : [50, 100, 150, 200, 250];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{picked ? "כמה אכלת?" : "הוספה ליומן"}</DialogTitle>
          <DialogDescription>
            {picked
              ? picked.kind === "food"
                ? picked.food.name
                : picked.recipe.name
              : "חפש פריט מהמאגר או בחר מתכון שיצרת."}
          </DialogDescription>
        </DialogHeader>

        {!picked ? (
          <>
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="חיפוש: חזה עוף, טחינה, בטטה…"
                  className="pe-9"
                />
              </div>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                <Chip active={category === "all"} onClick={() => setCategory("all")}>
                  הכל
                </Chip>
                {state.settings.categories.map((c) => (
                  <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>

            <DialogBody className="max-h-[46dvh]">
              {results.recipes.length > 0 && (
                <>
                  <p className="px-1 pb-1 pt-2 text-xs font-semibold text-muted-foreground">מתכונים שלי</p>
                  <ul className="space-y-1">
                    {results.recipes.map((r) => {
                      const per100 = recipePer100g(r, state.foods);
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => choose({ kind: "recipe", recipe: r, per100 })}
                            className="flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 text-start transition-colors hover:bg-secondary"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{r.name}</span>
                              <span className="num block text-xs text-muted-foreground">
                                {Math.round(per100.kcal)} קק״ל / 100 גר׳ · מנה {per100.portionGrams} גר׳
                              </span>
                            </span>
                            <Badge variant="outline">מתכון</Badge>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {results.foods.length === 0 && results.recipes.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="אין התאמות"
                  body="נסה שם קצר יותר, או הוסף את הפריט למאגר דרך מסך מאגר המזון."
                  className="mt-4"
                />
              ) : (
                <ul className="space-y-1 pt-2">
                  {results.foods.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => choose({ kind: "food", food: f })}
                        className="flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 text-start transition-colors hover:bg-secondary"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <LightDot light={f.light} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{f.name}</span>
                            <span className="num block text-xs text-muted-foreground">
                              {f.kcal} קק״ל · {f.protein} חלבון / 100 {f.liquid ? "מ״ל" : "גר׳"}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{f.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </DialogBody>
          </>
        ) : (
          <DialogBody className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(quickGrams)).map((g) => (
                <Chip key={g} active={grams === g} onClick={() => setGrams(g)}>
                  <span className="num">
                    {g} {picked.kind === "food" && picked.food.liquid ? "מ״ל" : "גר׳"}
                  </span>
                  {picked.kind === "food" && picked.food.servingGrams === g && picked.food.servingName
                    ? ` · ${picked.food.servingName}`
                    : ""}
                </Chip>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={picked.kind === "food" && picked.food.liquid ? "כמות (מ״ל)" : "כמות (גרם)"}>
                <Input
                  type="number"
                  min={1}
                  value={grams}
                  onChange={(e) => setGrams(Math.max(0, Number(e.target.value)))}
                />
              </Field>
              <Field label="שיוך לארוחה">
                <Select value={block} onValueChange={(v) => setBlock(v as MealBlockId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BLOCK_LABELS) as MealBlockId[]).map((b) => (
                      <SelectItem key={b} value={b}>
                        {BLOCK_LABELS[b]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {preview && (
              <div className="grid grid-cols-4 gap-2 rounded-lg border bg-muted/40 p-3 text-center">
                <PreviewCell label="קק״ל" value={preview.kcal} />
                <PreviewCell label="חלבון" value={preview.protein} unit="ג׳" />
                <PreviewCell label="פחמ׳" value={preview.carbs} unit="ג׳" />
                <PreviewCell label="שומן" value={preview.fat} unit="ג׳" />
              </div>
            )}
          </DialogBody>
        )}

        <DialogFooter>
          {picked ? (
            <>
              <Button onClick={save} disabled={grams <= 0}>
                הוספה ליומן
              </Button>
              <Button variant="ghost" onClick={() => setPicked(null)}>
                <ArrowRight className="h-4 w-4" />
                חזרה לחיפוש
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
              ביטול
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewCell({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <p className="num font-display text-lg font-bold leading-none">
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground"> {unit}</span>}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
