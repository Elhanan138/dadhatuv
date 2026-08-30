"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Download, Plus, RotateCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SettingRow, Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { parseImport } from "@/lib/storage";
import { computeTargets, tdee } from "@/lib/calc";
import type { ActivityLevel, AlertRule, FormulaId, Gender, Goal } from "@/lib/types";
import { ACTIVITY_LABELS, FASTING_PRESETS, GOAL_LABELS } from "@/lib/seed/defaults";
import { downloadJson, uid } from "@/lib/utils";

const FORMULA_LABELS: Record<FormulaId, string> = {
  mifflin: "Mifflin-St Jeor (ברירת מחדל)",
  harris: "Harris-Benedict מתוקן",
  katch: "Katch-McArdle (דורש אחוז שומן)",
};

const METRIC_LABELS: Record<AlertRule["metric"], string> = {
  kcal: "קלוריות",
  protein: "חלבון",
  carbs: "פחמימות",
  fat: "שומן",
  water: "מים",
  red_items: "פריטים אדומים",
};

export default function SettingsPage() {
  const { state, targets, patchProfile, patchEngine, patchSettings, replaceState, resetAll } = useStore();
  const toast = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [newCategory, setNewCategory] = React.useState("");

  const profile = state.profile;
  const maintenance = profile ? tdee(profile, state.engine) : 0;
  const computed = profile ? computeTargets(profile, state.engine) : null;

  function exportBackup() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`abba-hatuv-backup-${stamp}.json`, state);
    toast("הגיבוי הורד");
  }

  async function importBackup(file: File) {
    const text = await file.text();
    const result = parseImport(text);
    if (!result.ok || !result.state) {
      toast(result.error ?? "הייבוא נכשל", "error");
      return;
    }
    replaceState(result.state);
    toast("הנתונים יובאו בהצלחה");
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const next = [...state.settings.categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patchSettings({ categories: next });
  }

  function updateAlert(id: string, patch: Partial<AlertRule>) {
    patchSettings({ alerts: state.settings.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-black tracking-tight">הגדרות</h1>
        <p className="text-sm text-muted-foreground">כל נוסחה, יעד וקטגוריה — ניתנים לשינוי.</p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">פרופיל</TabsTrigger>
          <TabsTrigger value="engine">מנוע חישוב</TabsTrigger>
          <TabsTrigger value="categories">קטגוריות</TabsTrigger>
          <TabsTrigger value="alerts">התראות</TabsTrigger>
          <TabsTrigger value="data">נתונים</TabsTrigger>
        </TabsList>

        {/* ── פרופיל ─────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-4">
          {profile ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>נתונים ביומטריים</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="שם">
                    <Input value={profile.name} onChange={(e) => patchProfile({ name: e.target.value })} />
                  </Field>
                  <Field label="גיל">
                    <Input type="number" value={profile.age} onChange={(e) => patchProfile({ age: Number(e.target.value) })} />
                  </Field>
                  <Field label="מין">
                    <Select value={profile.gender} onValueChange={(v) => patchProfile({ gender: v as Gender })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">גבר</SelectItem>
                        <SelectItem value="female">אישה</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="גובה (ס״מ)">
                    <Input type="number" value={profile.heightCm} onChange={(e) => patchProfile({ heightCm: Number(e.target.value) })} />
                  </Field>
                  <Field label="משקל נוכחי (ק״ג)">
                    <Input
                      type="number"
                      step="0.1"
                      value={profile.currentWeightKg}
                      onChange={(e) => patchProfile({ currentWeightKg: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="משקל יעד (ק״ג)">
                    <Input
                      type="number"
                      step="0.1"
                      value={profile.targetWeightKg}
                      onChange={(e) => patchProfile({ targetWeightKg: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="אחוז שומן" hint="ריק = לא ידוע">
                    <Input
                      type="number"
                      step="0.5"
                      value={profile.bodyFatPct ?? ""}
                      onChange={(e) =>
                        patchProfile({ bodyFatPct: e.target.value === "" ? undefined : Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="רמת פעילות">
                    <Select value={profile.activity} onValueChange={(v) => patchProfile({ activity: v as ActivityLevel })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="מטרה">
                    <Select value={profile.goal} onValueChange={(v) => patchProfile({ goal: v as Goal })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(GOAL_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>חלון הצום</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {FASTING_PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        variant={profile.fasting.fast === p.fast ? "default" : "outline"}
                        onClick={() => patchProfile({ fasting: { ...profile.fasting, fast: p.fast, eat: p.eat } })}
                      >
                        <span className="num">{p.label}</span>
                      </Button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="שעות צום">
                      <Input
                        type="number"
                        value={profile.fasting.fast}
                        onChange={(e) =>
                          patchProfile({
                            fasting: { ...profile.fasting, fast: Number(e.target.value), eat: 24 - Number(e.target.value) },
                          })
                        }
                      />
                    </Field>
                    <Field label="שעות אכילה">
                      <Input
                        type="number"
                        value={profile.fasting.eat}
                        onChange={(e) =>
                          patchProfile({
                            fasting: { ...profile.fasting, eat: Number(e.target.value), fast: 24 - Number(e.target.value) },
                          })
                        }
                      />
                    </Field>
                    <Field label="פתיחת החלון">
                      <Input
                        type="time"
                        value={profile.fasting.windowOpensAt}
                        onChange={(e) => patchProfile({ fasting: { ...profile.fasting, windowOpensAt: e.target.value } })}
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">אין פרופיל שמור.</p>
          )}
        </TabsContent>

        {/* ── מנוע חישוב ─────────────────────────────────────── */}
        <TabsContent value="engine" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>נוסחה ומכפילים</CardTitle>
              <CardDescription>
                {profile
                  ? `TDEE נוכחי: ${maintenance} קק״ל · יעד מחושב: ${computed?.kcal} קק״ל`
                  : "השלם פרופיל כדי לראות חישוב"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="נוסחת BMR">
                <Select value={state.engine.formula} onValueChange={(v) => patchEngine({ formula: v as FormulaId })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FORMULA_LABELS) as FormulaId[]).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FORMULA_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div>
                <p className="mb-2 text-sm font-medium">מכפילי פעילות</p>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {(Object.keys(state.engine.activityMultipliers) as ActivityLevel[]).map((level) => (
                    <Field key={level} label={level}>
                      <Input
                        type="number"
                        step="0.025"
                        value={state.engine.activityMultipliers[level]}
                        onChange={(e) =>
                          patchEngine({
                            activityMultipliers: {
                              ...state.engine.activityMultipliers,
                              [level]: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="התאמה קלורית (%)" hint="שלילי = גירעון">
                  <Input
                    type="number"
                    value={state.engine.calorieAdjustPct}
                    onChange={(e) => patchEngine({ calorieAdjustPct: Number(e.target.value) })}
                  />
                </Field>
                <Field label="חלבון לק״ג">
                  <Input
                    type="number"
                    step="0.1"
                    value={state.engine.proteinPerKg}
                    onChange={(e) => patchEngine({ proteinPerKg: Number(e.target.value) })}
                  />
                </Field>
                <Field label="שומן לק״ג">
                  <Input
                    type="number"
                    step="0.1"
                    value={state.engine.fatPerKg}
                    onChange={(e) => patchEngine({ fatPerKg: Number(e.target.value) })}
                  />
                </Field>
                <Field label="מים למ״ל לק״ג">
                  <Input
                    type="number"
                    value={state.engine.waterMlPerKg}
                    onChange={(e) => patchEngine({ waterMlPerKg: Number(e.target.value) })}
                  />
                </Field>
                <Field label="סיבים ל־1000 קק״ל">
                  <Input
                    type="number"
                    value={state.engine.fiberPer1000Kcal}
                    onChange={(e) => patchEngine({ fiberPer1000Kcal: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <SettingRow
                title="חישוב לפי מסת גוף רזה"
                description="חלבון ושומן יחושבו לפי LBM במקום משקל מלא. דורש אחוז שומן."
              >
                <Switch
                  checked={state.engine.useLeanMass}
                  onCheckedChange={(v) => patchEngine({ useLeanMass: v })}
                  disabled={!profile?.bodyFatPct}
                />
              </SettingRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>יעדים ידניים</CardTitle>
              <CardDescription>עוקף לחלוטין את המנוע. שימושי כשתזונאי נתן לך מספרים.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingRow title="שימוש ביעדים ידניים">
                <Switch
                  checked={state.settings.overrideTargets}
                  onCheckedChange={(v) => patchSettings({ overrideTargets: v })}
                />
              </SettingRow>

              <div className={state.settings.overrideTargets ? "" : "pointer-events-none opacity-50"}>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {(
                    [
                      ["kcal", "קלוריות"],
                      ["protein", "חלבון"],
                      ["carbs", "פחמימות"],
                      ["fat", "שומן"],
                      ["fiber", "סיבים"],
                      ["waterMl", "מים (מ״ל)"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <Input
                        type="number"
                        value={state.settings.manualTargets[key]}
                        onChange={(e) =>
                          patchSettings({
                            manualTargets: { ...state.settings.manualTargets, [key]: Number(e.target.value) },
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
                {computed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => patchSettings({ manualTargets: computed })}
                  >
                    מילוי מהחישוב האוטומטי
                  </Button>
                )}
              </div>

              <p className="num text-sm text-muted-foreground">
                יעדים פעילים כרגע: {targets.kcal} קק״ל · {targets.protein} חלבון · {targets.carbs} פחמימות ·{" "}
                {targets.fat} שומן
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>תצוגה</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <SettingRow title="הצגת מדד שובע" description="עמודת השובע בטבלת המזון">
                <Switch checked={state.settings.showSatiety} onCheckedChange={(v) => patchSettings({ showSatiety: v })} />
              </SettingRow>
              <SettingRow title="חלון ממוצע נע" description="מספר הימים להחלקת גרף המשקל">
                <Input
                  type="number"
                  min={3}
                  max={21}
                  value={state.settings.smoothingDays}
                  onChange={(e) => patchSettings({ smoothingDays: Number(e.target.value) })}
                  className="w-20"
                />
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── קטגוריות ───────────────────────────────────────── */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>קטגוריות מזון</CardTitle>
              <CardDescription>הסדר כאן קובע את סדר הסינון במסכי החיפוש.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-y">
                {state.settings.categories.map((c, i) => {
                  const inUse = state.foods.filter((f) => f.category === c).length;
                  return (
                    <li key={c} className="flex items-center gap-2 py-2">
                      <span className="flex-1 text-sm">{c}</span>
                      <span className="num text-xs text-muted-foreground">{inUse} פריטים</span>
                      <Button variant="ghost" size="icon-sm" aria-label="הזזה למעלה" onClick={() => moveCategory(i, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="הזזה למטה" onClick={() => moveCategory(i, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`מחיקת ${c}`}
                        disabled={inUse > 0}
                        title={inUse > 0 ? "יש פריטים שמשויכים לקטגוריה" : undefined}
                        onClick={() =>
                          patchSettings({ categories: state.settings.categories.filter((x) => x !== c) })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="קטגוריה חדשה"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const v = newCategory.trim();
                    if (!v || state.settings.categories.includes(v)) return;
                    patchSettings({ categories: [...state.settings.categories, v] });
                    setNewCategory("");
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    const v = newCategory.trim();
                    if (!v) return;
                    if (state.settings.categories.includes(v)) {
                      toast("הקטגוריה כבר קיימת", "error");
                      return;
                    }
                    patchSettings({ categories: [...state.settings.categories, v] });
                    setNewCategory("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  הוספה
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>תגיות</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {state.settings.tags.map((t) => (
                <Badge key={t} className="gap-1">
                  {t}
                  <button
                    type="button"
                    aria-label={`הסרת ${t}`}
                    onClick={() => patchSettings({ tags: state.settings.tags.filter((x) => x !== t) })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── התראות ─────────────────────────────────────────── */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>כללי התראה</CardTitle>
              <CardDescription>מופיעים בראש מסך היום כשהתנאי מתקיים.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.settings.alerts.map((a) => (
                <div key={a.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={a.message}
                      onChange={(e) => updateAlert(a.id, { message: e.target.value })}
                      className="flex-1"
                    />
                    <Switch checked={a.enabled} onCheckedChange={(v) => updateAlert(a.id, { enabled: v })} />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="מחיקת כלל"
                      onClick={() => patchSettings({ alerts: state.settings.alerts.filter((x) => x.id !== a.id) })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Select value={a.metric} onValueChange={(v) => updateAlert(a.id, { metric: v as AlertRule["metric"] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(METRIC_LABELS) as AlertRule["metric"][]).map((m) => (
                          <SelectItem key={m} value={m}>
                            {METRIC_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={a.comparator}
                      onValueChange={(v) => updateAlert(a.id, { comparator: v as AlertRule["comparator"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="above">מעל</SelectItem>
                        <SelectItem value="below">מתחת</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={a.value}
                      onChange={(e) => updateAlert(a.id, { value: Number(e.target.value) })}
                    />
                    <Select
                      value={a.pctOfTarget ? "pct" : "abs"}
                      onValueChange={(v) => updateAlert(a.id, { pctOfTarget: v === "pct" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pct">% מהיעד</SelectItem>
                        <SelectItem value="abs">ערך מוחלט</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={() =>
                  patchSettings({
                    alerts: [
                      ...state.settings.alerts,
                      {
                        id: uid("alert"),
                        metric: "kcal",
                        comparator: "above",
                        value: 100,
                        pctOfTarget: true,
                        message: "כלל חדש",
                        enabled: true,
                      },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4" />
                כלל חדש
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── נתונים ─────────────────────────────────────────── */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>גיבוי ושחזור</CardTitle>
              <CardDescription>
                כל הנתונים נשמרים על המכשיר בלבד. ייצוא לפני החלפת מכשיר או ניקוי דפדפן.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportBackup}>
                  <Download className="h-4 w-4" />
                  ייצוא JSON
                </Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  ייבוא מגיבוי
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importBackup(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="num text-sm text-muted-foreground">
                {state.entries.length} רישומי אכילה · {Object.keys(state.days).length} ימים · {state.foods.length} פריטים
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">איפוס מלא</CardTitle>
              <CardDescription>מוחק פרופיל, יומן, מתכונים ופריטים מותאמים. אין דרך חזרה בלי גיבוי.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                איפוס כל הנתונים
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>לאפס הכל?</DialogTitle>
            <DialogDescription>
              הפעולה מוחקת את כל הנתונים מהמכשיר ומחזירה אותך למסך ההרשמה. ייצא גיבוי קודם אם חשוב לך לשמור.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={async () => {
                await resetAll();
                setResetOpen(false);
              }}
            >
              כן, מחק הכל
            </Button>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
