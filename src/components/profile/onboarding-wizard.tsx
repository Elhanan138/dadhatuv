"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";
import { computeTargets, tdee } from "@/lib/calc";
import type { ActivityLevel, Gender, Goal, Profile } from "@/lib/types";
import { ACTIVITY_LABELS, FASTING_PRESETS, GOAL_LABELS } from "@/lib/seed/defaults";
import { cn, todayKey } from "@/lib/utils";

const STEPS = ["מי אתה", "אורח חיים", "חלון הצום", "היעדים שלך"];

const GOAL_ADJUST: Record<Goal, number> = { cut: -18, recomp: -5, bulk: 10 };

export function OnboardingWizard() {
  const router = useRouter();
  const { state, saveProfile, patchEngine, patchDay } = useStore();
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const [draft, setDraft] = React.useState<Profile>({
    name: "",
    gender: "male",
    age: 35,
    heightCm: 175,
    startWeightKg: 85,
    currentWeightKg: 85,
    targetWeightKg: 75,
    bodyFatPct: undefined,
    activity: "light",
    goal: "cut",
    fasting: { fast: 16, eat: 8, windowOpensAt: "12:00" },
    createdAt: new Date().toISOString(),
  });

  const engine = { ...state.engine, calorieAdjustPct: GOAL_ADJUST[draft.goal] };
  const preview = computeTargets(draft, engine);
  const maintenance = tdee(draft, engine);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  function validate(current: number): boolean {
    if (current === 0) {
      if (!draft.name.trim()) return fail("צריך שם כדי להתחיל.");
      if (draft.age < 14 || draft.age > 100) return fail("גיל חייב להיות בין 14 ל־100.");
      if (draft.heightCm < 120 || draft.heightCm > 230) return fail("גובה חייב להיות בין 120 ל־230 ס״מ.");
    }
    if (current === 1) {
      if (draft.currentWeightKg < 35 || draft.currentWeightKg > 300) return fail("משקל נוכחי לא תקין.");
      if (draft.targetWeightKg < 35 || draft.targetWeightKg > 300) return fail("משקל יעד לא תקין.");
    }
    return true;
  }

  function fail(message: string) {
    setError(message);
    return false;
  }

  function next() {
    if (!validate(step)) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    finish();
  }

  function finish() {
    const profile: Profile = { ...draft, startWeightKg: draft.currentWeightKg };
    saveProfile(profile);
    patchEngine({ calorieAdjustPct: GOAL_ADJUST[draft.goal] });
    patchDay(todayKey(), { weightKg: draft.currentWeightKg });
    router.replace("/");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <p className="font-display text-2xl font-black">אבא חטוב</p>
        <p className="text-sm text-muted-foreground">
          ארבעה מסכים ואנחנו מחשבים לך יעדים אמיתיים. הכל ניתן לשינוי אחר כך.
        </p>
      </div>

      <div className="mb-6 flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemax={STEPS.length}>
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 space-y-1.5">
            <div className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
            <span className={cn("block text-[10px]", i === step ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <motion.div key={step} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
            {step === 0 && (
              <div className="space-y-4">
                <Field label="איך קוראים לך">
                  <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="השם שלך" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="גיל">
                    <Input type="number" value={draft.age} onChange={(e) => set("age", Number(e.target.value))} />
                  </Field>
                  <Field label="מין">
                    <Select value={draft.gender} onValueChange={(v) => set("gender", v as Gender)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">גבר</SelectItem>
                        <SelectItem value="female">אישה</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="גובה (ס״מ)">
                  <Input type="number" value={draft.heightCm} onChange={(e) => set("heightCm", Number(e.target.value))} />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="משקל נוכחי (ק״ג)">
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.currentWeightKg}
                      onChange={(e) => set("currentWeightKg", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="משקל יעד (ק״ג)">
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.targetWeightKg}
                      onChange={(e) => set("targetWeightKg", Number(e.target.value))}
                    />
                  </Field>
                </div>

                <Field label="אחוז שומן משוער" hint="לא חובה. אם תמלא, נוכל להשתמש בנוסחת Katch-McArdle.">
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[draft.bodyFatPct ?? 22]}
                      min={5}
                      max={50}
                      step={0.5}
                      onValueChange={([v]) => set("bodyFatPct", v)}
                      className="flex-1"
                    />
                    <span className="num w-12 text-sm">{draft.bodyFatPct ?? "—"}%</span>
                  </div>
                </Field>

                <Field label="רמת פעילות">
                  <Select value={draft.activity} onValueChange={(v) => set("activity", v as ActivityLevel)}>
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
                  <Select value={draft.goal} onValueChange={(v) => set("goal", v as Goal)}>
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
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Field label="מבנה הצום">
                  <div className="grid grid-cols-4 gap-2">
                    {FASTING_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => set("fasting", { ...draft.fasting, fast: p.fast, eat: p.eat })}
                        className={cn(
                          "num rounded-md border py-2 text-sm font-medium transition-colors",
                          draft.fasting.fast === p.fast
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="שעות צום">
                    <Input
                      type="number"
                      min={10}
                      max={23}
                      value={draft.fasting.fast}
                      onChange={(e) =>
                        set("fasting", {
                          ...draft.fasting,
                          fast: Number(e.target.value),
                          eat: 24 - Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="פתיחת חלון האכילה">
                    <Input
                      type="time"
                      value={draft.fasting.windowOpensAt}
                      onChange={(e) => set("fasting", { ...draft.fasting, windowOpensAt: e.target.value })}
                    />
                  </Field>
                </div>

                <p className="num rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                  חלון אכילה של {draft.fasting.eat} שעות, מ־{draft.fasting.windowOpensAt}.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <Row label="הוצאה קלורית יומית (TDEE)" value={`${maintenance} קק״ל`} />
                <Row label="יעד קלוריות" value={`${preview.kcal} קק״ל`} strong />
                <Row label="חלבון" value={`${preview.protein} גר׳`} />
                <Row label="פחמימות" value={`${preview.carbs} גר׳`} />
                <Row label="שומן" value={`${preview.fat} גר׳`} />
                <Row label="סיבים תזונתיים" value={`${preview.fiber} גר׳`} />
                <Row label="מים" value={`${preview.waterMl} מ״ל`} />
                <p className="pt-2 text-xs text-muted-foreground">
                  היעדים מחושבים בנוסחת Mifflin-St Jeor. אפשר לשנות כל מכפיל, יחס מאקרו או יעד ידני במסך ההגדרות.
                </p>
              </div>
            )}
          </motion.div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowRight className="h-4 w-4" />
          חזרה
        </Button>
        <Button onClick={next}>
          {step === STEPS.length - 1 ? (
            <>
              <Check className="h-4 w-4" />
              יאללה, מתחילים
            </>
          ) : (
            <>
              המשך
              <ArrowLeft className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between border-b pb-2 text-sm last:border-0", strong && "text-base")}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("num font-medium", strong && "font-display text-lg font-bold")}>{value}</span>
    </div>
  );
}
