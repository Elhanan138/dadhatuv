"use client";

import * as React from "react";
import { ChefHat, Pencil, Plus, Salad, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, LightDot } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FoodDialog } from "@/components/food/food-dialog";
import { RecipeDialog } from "@/components/food/recipe-dialog";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { recipePer100g } from "@/lib/calc";
import type { FoodItem, Recipe, TrafficLight } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "name" | "kcal" | "protein" | "satiety";

export default function FoodPage() {
  const { state, deleteFood, deleteRecipe } = useStore();
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [light, setLight] = React.useState<TrafficLight | "all">("all");
  const [sort, setSort] = React.useState<SortKey>("name");
  const [foodDialog, setFoodDialog] = React.useState(false);
  const [editingFood, setEditingFood] = React.useState<FoodItem | null>(null);
  const [recipeDialog, setRecipeDialog] = React.useState(false);
  const [editingRecipe, setEditingRecipe] = React.useState<Recipe | null>(null);

  const foods = React.useMemo(() => {
    const q = query.trim();
    const filtered = state.foods.filter(
      (f) =>
        (category === "all" || f.category === category) &&
        (light === "all" || f.light === light) &&
        (!q || f.name.includes(q)),
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "he");
      return (b[sort] as number) - (a[sort] as number);
    });
    return sorted;
  }, [state.foods, query, category, light, sort]);

  function openNewFood() {
    setEditingFood(null);
    setFoodDialog(true);
  }

  function openEditFood(food: FoodItem) {
    setEditingFood(food);
    setFoodDialog(true);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">מאגר מזון</h1>
          <p className="num text-sm text-muted-foreground">
            {state.foods.length} פריטים · {state.recipes.length} מתכונים
          </p>
        </div>
      </header>

      <Tabs defaultValue="foods">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="foods">פריטים</TabsTrigger>
            <TabsTrigger value="recipes">מתכונים</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="foods" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש פריט"
                className="pe-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {state.settings.categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={light} onValueChange={(v) => setLight(v as TrafficLight | "all")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הרמזור</SelectItem>
                <SelectItem value="green">ירוק</SelectItem>
                <SelectItem value="yellow">צהוב</SelectItem>
                <SelectItem value="red">אדום</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">לפי שם</SelectItem>
                <SelectItem value="kcal">הכי קלורי</SelectItem>
                <SelectItem value="protein">הכי חלבוני</SelectItem>
                <SelectItem value="satiety">הכי משביע</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openNewFood}>
              <Plus className="h-4 w-4" />
              פריט חדש
            </Button>
          </div>

          {foods.length === 0 ? (
            <EmptyState
              icon={Salad}
              title="לא נמצאו פריטים"
              body="שנה את הסינון, או הוסף את הפריט שחיפשת למאגר האישי שלך."
              action={
                <Button onClick={openNewFood} variant="outline">
                  <Plus className="h-4 w-4" />
                  הוספת פריט
                </Button>
              }
            />
          ) : (
            <>
              {/* desktop table */}
              <Card className="hidden overflow-hidden md:block">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3 text-start font-medium">פריט</th>
                      <th className="p-3 text-start font-medium">קטגוריה</th>
                      <th className="p-3 text-start font-medium">קק״ל</th>
                      <th className="p-3 text-start font-medium">חלבון</th>
                      <th className="p-3 text-start font-medium">פחמ׳</th>
                      <th className="p-3 text-start font-medium">שומן</th>
                      <th className="p-3 text-start font-medium">סיבים</th>
                      {state.settings.showSatiety && <th className="p-3 text-start font-medium">שובע</th>}
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {foods.map((f) => (
                      <tr key={f.id} className="transition-colors hover:bg-secondary/50">
                        <td className="p-3">
                          <span className="flex items-center gap-2">
                            <LightDot light={f.light} />
                            <span className="font-medium">{f.name}</span>
                            {f.custom && <Badge variant="outline">שלי</Badge>}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{f.category}</td>
                        <td className="num p-3">{f.kcal}</td>
                        <td className="num p-3">{f.protein}</td>
                        <td className="num p-3">{f.carbs}</td>
                        <td className="num p-3">{f.fat}</td>
                        <td className="num p-3">{f.fiber}</td>
                        {state.settings.showSatiety && <td className="p-3"><SatietyBar value={f.satiety} /></td>}
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label={`עריכת ${f.name}`} onClick={() => openEditFood(f)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`מחיקת ${f.name}`}
                              onClick={() => {
                                deleteFood(f.id);
                                toast(`${f.name} נמחק מהמאגר`, "info");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* mobile cards */}
              <ul className="space-y-2 md:hidden">
                {foods.map((f) => (
                  <li key={f.id}>
                    <Card>
                      <CardContent className="flex items-start justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <LightDot light={f.light} />
                            <span className="truncate">{f.name}</span>
                          </p>
                          <p className="num mt-1 text-xs text-muted-foreground">
                            {f.kcal} קק״ל · ח {f.protein} · פ {f.carbs} · ש {f.fat} · ס {f.fiber}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{f.category}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon-sm" aria-label={`עריכת ${f.name}`} onClick={() => openEditFood(f)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`מחיקת ${f.name}`}
                            onClick={() => {
                              deleteFood(f.id);
                              toast(`${f.name} נמחק מהמאגר`, "info");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <div className="flex justify-start">
            <Button
              onClick={() => {
                setEditingRecipe(null);
                setRecipeDialog(true);
              }}
            >
              <Plus className="h-4 w-4" />
              מתכון חדש
            </Button>
          </div>

          {state.recipes.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              title="אין מתכונים עדיין"
              body="בנה מתכון ממרכיבים במאגר, קבע כמה מנות יוצאות ממנו, ותוכל לרשום מנה שלמה בלחיצה אחת."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.recipes.map((r) => {
                const p = recipePer100g(r, state.foods);
                return (
                  <li key={r.id}>
                    <Card>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-display font-semibold">{r.name}</p>
                            <p className="num text-xs text-muted-foreground">
                              {r.portions} מנות · {p.portionGrams} גר׳ למנה
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`עריכת ${r.name}`}
                              onClick={() => {
                                setEditingRecipe(r);
                                setRecipeDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`מחיקת ${r.name}`}
                              onClick={() => {
                                deleteRecipe(r.id);
                                toast(`${r.name} נמחק`, "info");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="num text-sm">
                          {Math.round(p.totals.kcal / Math.max(1, r.portions))} קק״ל למנה ·{" "}
                          {Math.round(p.totals.protein / Math.max(1, r.portions))} ג׳ חלבון
                        </p>
                        <p className="text-xs text-muted-foreground">{r.ingredients.length} מרכיבים</p>
                        {r.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{r.notes}</p>}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <FoodDialog open={foodDialog} onOpenChange={setFoodDialog} editing={editingFood} />
      <RecipeDialog open={recipeDialog} onOpenChange={setRecipeDialog} editing={editingRecipe} />
    </div>
  );
}

function SatietyBar({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`מדד שובע ${value} מתוך 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("h-3 w-1 rounded-sm", i <= value ? "bg-primary" : "bg-muted")} />
      ))}
    </span>
  );
}
