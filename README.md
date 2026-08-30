# אבא חטוב — מערכת ניהול הרכב גוף

אפליקציית Next.js 14 (App Router) בעברית RTL מלאה לניהול צום לסירוגין, קלוריות, מאקרו, מדידות גוף והרגלים.
כל הנתונים נשמרים מקומית (IndexedDB + מראה ב-localStorage), ללא שרת וללא בסיס נתונים — מוכן ל-deploy סטטי ב-Vercel ללא הגדרות.

## הרצה מקומית

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

## מבנה הפרויקט

```
abba-hatuv/
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── app/
    │   ├── globals.css          design tokens (light/dark), RTL, utilities
    │   ├── layout.tsx           <html lang="he" dir="rtl">, טעינת Assistant + Rubik
    │   ├── providers.tsx        Theme → Store → Toast → OnboardingGate → AppShell
    │   ├── page.tsx             מסך היום: היצמדות, יעדים, צום, מים, ארוחות
    │   ├── log/page.tsx         יומן יומי עם ניווט תאריכים, NSV, הערות
    │   ├── food/page.tsx        מאגר מזון + מתכונים (CRUD מלא)
    │   ├── progress/page.tsx    גרפים: משקל, צריכה, היצמדות, מאקרו, היקפים
    │   ├── settings/page.tsx    פרופיל, מנוע חישוב, קטגוריות, התראות, גיבוי
    │   ├── onboarding/page.tsx  אשף 4 שלבים
    │   ├── error.tsx  not-found.tsx
    ├── components/
    │   ├── ui/                  button, card, input, label, badge, progress,
    │   │                        dialog, tabs, select, switch, slider, stat,
    │   │                        skeleton, empty-state, toast
    │   ├── layout/              app-shell (sidebar + bottom nav), theme, nav-config
    │   ├── log/                 add-entry-dialog, meal-block, water-card, fasting-card
    │   ├── food/                food-dialog, recipe-dialog
    │   ├── progress/            charts, measurements-card
    │   └── profile/             onboarding-wizard
    └── lib/
        ├── types.ts             כל מודל הדומיין
        ├── calc.ts              BMR/TDEE, יעדים, שקלול היצמדות, ממוצע נע
        ├── storage.ts           IndexedDB + localStorage + migrate + import
        ├── store.tsx            Context + write-behind persistence + CRUD API
        ├── utils.ts             תאריכים מקומיים, cn, uid, ייצוא JSON
        └── seed/
            ├── foods.ts         ~160 פריטים ישראליים/ים-תיכוניים + קטגוריות
            └── defaults.ts      engine defaults, alerts, labels, presets
```

## מנוע החישוב

| שלב | מקור |
|---|---|
| BMR | Mifflin-St Jeor (ברירת מחדל), Harris-Benedict מתוקן, או Katch-McArdle לפי LBM |
| TDEE | BMR × מכפיל פעילות (5 רמות, כל מכפיל ניתן לעריכה) |
| יעד קלורי | TDEE × (1 + התאמה%) — ברירת מחדל −18% לחיטוב |
| חלבון / שומן | גרם לק״ג משקל גוף או מסת רזה (מתג בהגדרות) |
| פחמימות | שארית הקלוריות אחרי חלבון ושומן |
| מים | מ״ל לק״ג משקל (35 כברירת מחדל), מעוגל ל-50 |
| סיבים | גרם לכל 1000 קק״ל (14 כברירת מחדל) |

ציון ההיצמדות היומי משוקלל: קלוריות 30%, חלבון 30%, מים 20%, חלון צום 20%.
כל מספר בטבלה ניתן לעקיפה ידנית ב-**הגדרות → מנוע חישוב**, או להשבתה מוחלטת עם *יעדים ידניים*.

## אריזה ל-ZIP

```bash
cd abba-hatuv
rm -rf node_modules .next
cd .. && zip -r abba-hatuv.zip abba-hatuv -x "*/.git/*"
```

## פריסה ל-Vercel

### דרך ה-CLI

```bash
npm i -g vercel
cd abba-hatuv
vercel login
vercel            # preview deployment
vercel --prod     # production
```

אין משתני סביבה ואין בסיס נתונים — פשוט מאשרים את הזיהוי האוטומטי של Next.js.

### דרך הדשבורד

1. `git init && git add . && git commit -m "init"` ודחיפה ל-GitHub.
2. ב-vercel.com: **Add New → Project → Import** את הריפו.
3. Framework Preset: **Next.js** (מזוהה אוטומטית). Build: `next build`. Output: `.next`.
4. **Deploy**.

## הערות

- כל הנתונים על המכשיר בלבד. **הגדרות → נתונים → ייצוא JSON** לפני החלפת דפדפן או מכשיר.
- הייבוא עובר `migrate()` ולכן גיבוי מגרסה ישנה נטען בלי לשבור את הסכימה.
- האפליקציה היא כלי מעקב, לא ייעוץ רפואי. יעדים קיצוניים כדאי לבדוק מול איש מקצוע.
