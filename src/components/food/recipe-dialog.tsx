"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { recipePer100g, scaleFood } from "@/lib/calc";
import type { Recipe, RecipeIngredient } from "@/lib/types";

export function RecipeDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Recipe | null;
}) {
  const { state, addRecipe, updateRecipe } = useStore();
  const toast = useToast();

  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [portions, setPortions] = React.useState(4);
  const [yieldGrams, setYieldGrams] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [ingredients, setIngredients] = React.useState<RecipeIngredient[]>([]);
  const [pickId, setPickId] = React.useState("");
  const [pickGrams, setPickGrams] = React.useState(100);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setName(editing?.name ?? "");
    setCategory(editing?.category ?? state.settings.categories[0] ?? "");
    setPortions(editing?.portions ?? 4);
    setYieldGrams(editing?.yieldGrams ?? 0);
    setNotes(editing?.notes ?? "");
    setIngredients(editing?.ingredients ?? []);
    setPickId("");
    setPickGrams(100);
  }, [open, editing, state.settings.categories]);

  const rawGrams = ingredients.reduce((a, i) => a + i.grams, 0);
  const effectiveYield = yieldGrams > 0 ? yieldGrams : rawGrams;

  const preview = React.useMemo(
    () =>
      recipePer100g(
        {
          id: "preview",
          name,
          category,
          ingredients,
          yieldGrams: effectiveYield,
          portions,
          createdAt: "",
        },
        state.foods,
      ),
    [name, category, ingredients, effectiveYield, portions, state.foods],
  );

  const foodsById = React.useMemo(() => new Map(state.foods.map((f) => [f.id, f])), [state.foods]);

  function addIngredient() {
    if (!pickId || pickGrams <= 0) return;
    setIngredients((list) => {
      const existing = list.find((i) => i.foodId === pickId);
      return existing
        ? list.map((i) => (i.foodId === pickId ? { ...i, grams: i.grams + pickGrams } : i))
        : [...list, { foodId: pickId, grams: pickGrams }];
    });
    setPickId("");
    setPickGrams(100);
  }

  function save() {
    if (!name.trim()) return setError("צריך שם למתכון.");
    if (ingredients.length === 0) return setError("הוסף לפחות מרכיב אחד.");
    if (portions < 1) return setError("מספר המנות חייב להיות לפחות 1.");

    const payload = {
      name: name.trim(),
      category,
      ingredients,
      yieldGrams: effectiveYield,
      portions,
      notes: notes.trim() || undefined,
    };
    if (editing) {
      updateRecipe(editing.id, payload);
      toast(`${payload.name} עודכן`);
    } else {
      addRecipe(payload);
      toast(`${payload.name} נוסף למתכונים`);
    }
    onOpenChange(false);
  }

  const perPortion = {
    kcal: Math.round((preview.totals.kcal / Math.max(1, portions)) * 1),
    protein: Math.round(preview.totals.protein / Math.max(1, portions)),
    carbs: Math.round(preview.totals.carbs / Math.max(1, portions)),
    fat: Math.round(preview.totals.fat / Math.max(1, portions)),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "עריכת מתכון" : "מתכון חדש"}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="שם המתכון">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="קציצות עוף ברוטב עגבניות" autoFocus />
            </Field>
            <Field label="קטגוריה">
              <Select value={category} onValueChange={setCategory}>
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

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">מרכיבים</p>
            {ingredients.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">עדיין ריק. הוסף מרכיב ראשון.</p>
            ) : (
              <ul className="divide-y">
                {ingredients.map((ing) => {
                  const food = foodsById.get(ing.foodId);
                  if (!food) return null;
                  const s = scaleFood(food, ing.grams);
                  return (
                    <li key={ing.foodId} className="flex items-center gap-2 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm">{food.name}</span>
                      <Input
                        type="number"
                        value={ing.grams}
                        onChange={(e) =>
                          setIngredients((list) =>
                            list.map((i) =>
                              i.foodId === ing.foodId ? { ...i, grams: Math.max(0, Number(e.target.value)) } : i,
                            ),
                          )
                        }
                        className="h-8 w-[88px]"
                      />
                      <span className="num w-20 shrink-0 text-xs text-muted-foreground">{Math.round(s.kcal)} קק״ל</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`הסרת ${food.name}`}
                        onClick={() => setIngredients((list) => list.filter((i) => i.foodId !== ing.foodId))}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <Select value={pickId} onValueChange={setPickId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מרכיב מהמאגר" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.foods.slice(0, 200).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                value={pickGrams}
                onChange={(e) => setPickGrams(Number(e.target.value))}
                className="w-24"
                aria-label="גרם"
              />
              <Button variant="outline" onClick={addIngredient} disabled={!pickId}>
                <Plus className="h-4 w-4" />
                הוספה
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="משקל סופי אחרי בישול (גרם)" hint={`סכום המרכיבים: ${Math.round(rawGrams)} גר׳`}>
              <Input
                type="number"
                value={yieldGrams || ""}
                placeholder={String(Math.round(rawGrams))}
                onChange={(e) => setYieldGrams(Number(e.target.value))}
              />
            </Field>
            <Field label="מספר מנות">
              <Input type="number" min={1} value={portions} onChange={(e) => setPortions(Number(e.target.value))} />
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-2 rounded-lg border bg-muted/40 p-3 text-center">
            <Cell label="קק״ל למנה" value={perPortion.kcal} />
            <Cell label="חלבון" value={perPortion.protein} />
            <Cell label="פחמימות" value={perPortion.carbs} />
            <Cell label="שומן" value={perPortion.fat} />
          </div>
          <p className="num text-xs text-muted-foreground">
            מנה אחת ≈ {preview.portionGrams} גר׳ · {Math.round(preview.kcal)} קק״ל ל־100 גר׳
          </p>

          <Field label="הערות הכנה">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="180 מעלות, 35 דקות…" />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogBody>

        <DialogFooter>
          <Button onClick={save}>{editing ? "שמירת שינויים" : "שמירת מתכון"}</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="num font-display text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
