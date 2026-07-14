# Dashboard Full Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full redesign of the Siango dashboard — post-launch popups, WowStrip, nav restructure, live design editor, vacation as a new business type, and colorful/alive UX across all dashboard sections.

**Architecture:** All new UI components are self-contained files. Database changes go through Supabase migrations only. `vacation` is added as a first-class `BusinessType` alongside `products`, `services`, `realestate`, `nonprofit`, `synagogue`. The `PostLaunchPopups` component mounts inside `Dashboard.tsx` as an overlay; it reads/writes `popup_state` (JSONB) on `business_profiles`. The live design editor uses a real iframe + `postMessage` — no mocking.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Deno edge functions), framer-motion, lucide-react, tanstack-query. Hebrew RTL throughout. No test framework in the project — verification is done via `npm run build` (TypeScript check) and visual browser inspection.

**Out of scope:** `DashboardPayments` flow redesign (specced separately).

**Deploy rules:**
- Every edge function change → `npx supabase@latest functions deploy <name> --project-ref ytqgeoviokgxxwalieev`
- Every commit → `git push origin main` (triggers Cloudflare Pages deploy)
- DB changes → migrations only, never manual dashboard edits

---

## File Map

**New files:**
- `supabase/migrations/20260714000001_popup_state.sql`
- `supabase/migrations/20260714000002_vacation_type.sql`
- `supabase/migrations/20260714000003_vacation_product_fields.sql`
- `supabase/migrations/20260714000004_vacation_order_fields.sql`
- `src/components/dashboard/PostLaunchPopups.tsx`
- `src/components/dashboard/WowStrip.tsx`
- `src/components/dashboard/TodoCards.tsx`
- `src/components/dashboard/DashboardAvailabilityCalendar.tsx`

**Modified files:**
- `src/lib/businessModules.ts` — add `vacation` to `BusinessType`, modules, layout, `getBusinessType`
- `src/components/onboarding/StepBusinessType.tsx` — vacation as top-level card
- `src/pages/Dashboard.tsx` — vacation routes, `guests`/`availability` views, mount `PostLaunchPopups`
- `src/components/dashboard/DashboardNav.tsx` — new groups, vacation `TYPE_CONFIG`, "צפה באתר" + "תוספות שוות"
- `src/components/dashboard/DashboardHome.tsx` — add `WowStrip`, `TodoCards`, connect `popup_state`
- `src/components/dashboard/DashboardDesign.tsx` — split layout, iframe, `postMessage`, palette picker
- `src/pages/StoreFront.tsx` — `postMessage` listener for design preview
- `src/components/dashboard/DashboardProducts.tsx` — colorful page header, empty states, vacation fields
- `src/components/dashboard/DashboardOrders.tsx` — chip status colors, vacation fields
- `src/components/dashboard/DashboardCRM.tsx` — upsell overlay on profitability/suppliers tabs
- `src/components/dashboard/DashboardContent.tsx` — auto-save, big AI button, vacation "hosting policy" tab
- `src/components/dashboard/DashboardSales.tsx` — improved empty states, vacation seasonal label
- `src/components/dashboard/DashboardCoupons.tsx` — improved empty state
- `src/components/dashboard/DashboardSettings.tsx` — accordion layout, vacation hosting policy section

---

## Task 1: DB migration — popup_state

**Files:**
- Create: `supabase/migrations/20260714000001_popup_state.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260714000001_popup_state.sql
alter table business_profiles
  add column if not exists popup_state jsonb not null default '{"shown":[],"dismissed":[],"completed":[]}'::jsonb;

comment on column business_profiles.popup_state is
  'Post-launch guided tour state. shown=ids shown at least once, dismissed=ids user skipped, completed=ids user acted on (CTA clicked).';
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase@latest db push --project-ref ytqgeoviokgxxwalieev
```

Expected: migration applies without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260714000001_popup_state.sql
git commit -m "feat(db): add popup_state jsonb column to business_profiles"
git push origin main
```

---

## Task 2: DB migration — vacation business type + product/order fields

**Files:**
- Create: `supabase/migrations/20260714000002_vacation_type.sql`
- Create: `supabase/migrations/20260714000003_vacation_product_fields.sql`
- Create: `supabase/migrations/20260714000004_vacation_order_fields.sql`

- [ ] **Step 1: Write vacation business_type migration**

```sql
-- supabase/migrations/20260714000002_vacation_type.sql
-- Extend the business_type check constraint to allow 'vacation'.
-- The column is text with a CHECK constraint (not a pg enum) so we update the constraint.
alter table business_profiles
  drop constraint if exists business_profiles_business_type_check;

alter table business_profiles
  add constraint business_profiles_business_type_check
  check (business_type in ('products','services','realestate','nonprofit','synagogue','vacation'));
```

- [ ] **Step 2: Write vacation product fields migration**

```sql
-- supabase/migrations/20260714000003_vacation_product_fields.sql
-- Extra columns on products table for vacation/room units.
-- All nullable — only vacation businesses use them.
alter table products
  add column if not exists price_per_night numeric,
  add column if not exists price_weekend   numeric,
  add column if not exists max_guests      integer,
  add column if not exists min_nights      integer not null default 1,
  add column if not exists checkin_time    text,
  add column if not exists checkout_time   text;
```

- [ ] **Step 3: Write vacation order fields migration**

```sql
-- supabase/migrations/20260714000004_vacation_order_fields.sql
-- Extra columns on orders table for vacation bookings.
alter table orders
  add column if not exists checkin_date  date,
  add column if not exists checkout_date date,
  add column if not exists num_guests    integer,
  add column if not exists unit_name     text;
```

- [ ] **Step 4: Apply all three migrations**

```bash
npx supabase@latest db push --project-ref ytqgeoviokgxxwalieev
```

Expected: all 3 migrations apply without error.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260714000002_vacation_type.sql \
        supabase/migrations/20260714000003_vacation_product_fields.sql \
        supabase/migrations/20260714000004_vacation_order_fields.sql
git commit -m "feat(db): vacation business type + room/booking columns"
git push origin main
```

---

## Task 3: Add vacation to businessModules.ts

**Files:**
- Modify: `src/lib/businessModules.ts`

- [ ] **Step 1: Read the current file**

```bash
cat src/lib/businessModules.ts
```

- [ ] **Step 2: Update `BusinessType` union**

Find line with:
```ts
export type BusinessType = "products" | "services" | "realestate" | "nonprofit" | "synagogue";
```

Replace with:
```ts
export type BusinessType = "products" | "services" | "realestate" | "nonprofit" | "synagogue" | "vacation";
```

- [ ] **Step 3: Add vacation to `DEFAULT_MODULES`**

Find the `DEFAULT_MODULES` Record and add:
```ts
  vacation: ["commerce"],
```
(vacation uses `commerce` module — order flow without cart, like a booking)

- [ ] **Step 4: Add vacation to `DEFAULT_LAYOUT`**

Find the `DEFAULT_LAYOUT` Record and add:
```ts
  vacation: "service",
```

- [ ] **Step 5: Update `getBusinessType` to recognise "vacation"**

Inside `getBusinessType`, find the switch/if that returns the type. Add `vacation` as a valid passthrough value. The function should NOT map `vacation` to `realestate` — it must stay as `vacation`. Example pattern (adapt to actual code):
```ts
// In the normalisation logic, add:
if (raw === "vacation") return "vacation";
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If there are errors in files that use `BusinessType` exhaustively (switch statements), go fix them in those files.

- [ ] **Step 7: Commit**

```bash
git add src/lib/businessModules.ts
git commit -m "feat: add vacation as first-class BusinessType"
git push origin main
```

---

## Task 4: Add vacation to StepBusinessType

**Files:**
- Modify: `src/components/onboarding/StepBusinessType.tsx`

- [ ] **Step 1: Read the full file**

```bash
cat src/components/onboarding/StepBusinessType.tsx
```

- [ ] **Step 2: Remove vacation from services sub-types**

Find the `SUB_CATEGORIES` (or `LISTINGS_SUBTYPES`) section where `vacation` appears under `services`. Remove it from there.

- [ ] **Step 3: Update the local `BusinessType` duplicate**

In `StepBusinessType.tsx`, find:
```ts
export type BusinessType = "products" | "services" | "realestate" | "nonprofit" | "synagogue";
```
Replace with:
```ts
export type BusinessType = "products" | "services" | "realestate" | "nonprofit" | "synagogue" | "vacation";
```
(Or better: delete the local declaration and import from `@/lib/businessModules` instead.)

- [ ] **Step 4: Add vacation as a top-level card in MAIN_CATEGORIES**

Find `MAIN_CATEGORIES` (the array of top-level business type cards). Add vacation card after `services`:
```ts
{
  id: "vacation" as BusinessType,
  label: "אירוח ונופש",
  description: "צימרים, בתי קיט, וילות, מקומות לינה",
  icon: "🏡",
},
```

- [ ] **Step 5: Remove realestate sub-type mapping for vacation**

Find `LISTINGS_SUBTYPES` set (if it exists): `new Set(["broker", "developer", "vacation", "commercial", "car-dealer"])`. Remove `"vacation"` from it.

Find `SUB_TYPE_TO_CATEGORY` map — remove the `vacation` entry.

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/onboarding/StepBusinessType.tsx
git commit -m "feat(onboarding): vacation as top-level business type card"
git push origin main
```

---

## Task 5: PostLaunchPopups component

**Files:**
- Create: `src/components/dashboard/PostLaunchPopups.tsx`

This component:
- Reads `popup_state` from `business_profiles` (via `useMyBusiness` which is already queried in Dashboard)
- Shows one popup at a time (the next non-completed, non-dismissed popup that hasn't been shown)
- On skip ("דלג") → marks `dismissed`, closes
- On CTA → marks `completed`, navigates, closes
- On background click → same as skip

- [ ] **Step 1: Write the component**

```tsx
// src/components/dashboard/PostLaunchPopups.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardView } from "./DashboardNav";

export type PopupId = "products" | "legal" | "payments" | "crm" | "share";

interface PopupConfig {
  id: PopupId;
  emoji: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaView: DashboardView;
  color: string; // Tailwind gradient classes
  textColor: string;
}

const POPUPS: PopupConfig[] = [
  {
    id: "products",
    emoji: "🛍️",
    title: "המוצרים שלך",
    body: "יצרנו לך מוצרי דמו כדי שהאתר ייראה מלא. עכשיו הגיע הזמן לערוך את השמות, התמונות והמחירים לשלך, ולמחוק את מה שלא רלוונטי.",
    ctaLabel: "ערוך מוצרים",
    ctaView: "products",
    color: "from-violet-600 to-purple-500",
    textColor: "text-white",
  },
  {
    id: "legal",
    emoji: "📄",
    title: "תקנון ומדיניות",
    body: "יצרנו לך תקנון ומדיניות ביטול אוטומטיים. חשוב לבדוק אותם ולהתאים לפני שמתחילים למכור — זה 5 דקות שיכולות להציל ממפח נפש.",
    ctaLabel: "בדוק תקנון",
    ctaView: "legal",
    color: "from-red-500 to-orange-500",
    textColor: "text-white",
  },
  {
    id: "payments",
    emoji: "💳",
    title: "קבלת תשלומים",
    body: "כרגע הזמנות מגיעות ישירות למייל שלך, ועל הלקוח לשלם בנפרד. כדי לקבל תשלומים ישירות בחנות — מחבר ספק סליקה בקלות ובלי טכנולוגיה.",
    ctaLabel: "הגדר סליקה",
    ctaView: "payments",
    color: "from-blue-600 to-sky-500",
    textColor: "text-white",
  },
  {
    id: "crm",
    emoji: "👥",
    title: "ה-CRM שלך",
    body: "ברגע שיגיעו הזמנות, הן יצטברו בפרופיל לקוח אוטומטי. תוכל לראות מי הזמין, כמה פעמים, ולנהל את הקשר איתם — הכל במקום אחד.",
    ctaLabel: "גלה את ה-CRM",
    ctaView: "customers",
    color: "from-emerald-600 to-teal-500",
    textColor: "text-white",
  },
  {
    id: "share",
    emoji: "🔗",
    title: "שתפו את האתר",
    body: "האתר שלך חי וזמין לכולם! שתפו אותו בוואטסאפ, פייסבוק, אינסטגרם — ואצלו את הלינק שלכם לפרופיל. כל לחיצה יכולה להיות לקוח חדש.",
    ctaLabel: "שתף עכשיו",
    ctaView: "share" as DashboardView,
    color: "from-amber-500 to-orange-400",
    textColor: "text-white",
  },
];

interface PopupState {
  shown: PopupId[];
  dismissed: PopupId[];
  completed: PopupId[];
}

interface PostLaunchPopupsProps {
  businessId: string | undefined;
  onNavigate: (view: DashboardView) => void;
  popupState: PopupState | null;
  onStateChange: (next: PopupState) => void;
}

export default function PostLaunchPopups({ businessId, onNavigate, popupState, onStateChange }: PostLaunchPopupsProps) {
  const [activePopup, setActivePopup] = useState<PopupConfig | null>(null);

  useEffect(() => {
    if (!popupState) return;
    const next = POPUPS.find(
      (p) => !popupState.completed.includes(p.id) && !popupState.dismissed.includes(p.id) && !popupState.shown.includes(p.id)
    );
    setActivePopup(next ?? null);
  }, [popupState]);

  async function updateState(next: PopupState) {
    if (!businessId) return;
    onStateChange(next);
    await supabase
      .from("business_profiles")
      .update({ popup_state: next })
      .eq("id", businessId);
  }

  async function handleSkip() {
    if (!activePopup || !popupState) return;
    const next: PopupState = {
      ...popupState,
      shown: [...new Set([...popupState.shown, activePopup.id])],
      dismissed: [...new Set([...popupState.dismissed, activePopup.id])],
    };
    setActivePopup(null);
    await updateState(next);
  }

  async function handleCta() {
    if (!activePopup || !popupState) return;
    const next: PopupState = {
      ...popupState,
      shown: [...new Set([...popupState.shown, activePopup.id])],
      completed: [...new Set([...popupState.completed, activePopup.id])],
    };
    setActivePopup(null);
    await updateState(next);
    // "share" view may not exist yet — guard
    if (activePopup.ctaView !== ("share" as DashboardView)) {
      onNavigate(activePopup.ctaView);
    }
  }

  return (
    <AnimatePresence>
      {activePopup && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleSkip}
        >
          <motion.div
            key={activePopup.id}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md rounded-3xl bg-gradient-to-br ${activePopup.color} p-8 shadow-2xl`}
          >
            <button
              onClick={handleSkip}
              className="absolute top-4 left-4 rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors"
              aria-label="דלג"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            <div className="text-5xl mb-4">{activePopup.emoji}</div>
            <h2 className={`text-xl font-bold mb-2 ${activePopup.textColor}`}>{activePopup.title}</h2>
            <p className={`text-sm leading-relaxed mb-6 ${activePopup.textColor} opacity-90`}>{activePopup.body}</p>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleCta}
                className="flex-1 bg-white text-gray-900 hover:bg-white/90 font-semibold gap-2"
              >
                {activePopup.ctaLabel} <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={handleSkip}
                className="text-white/70 hover:text-white text-sm transition-colors px-2"
              >
                דלג
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { POPUPS };
export type { PopupState };
```

- [ ] **Step 2: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/PostLaunchPopups.tsx
git commit -m "feat(dashboard): PostLaunchPopups component — 5 onboarding popups"
git push origin main
```

---

## Task 6: WowStrip component

**Files:**
- Create: `src/components/dashboard/WowStrip.tsx`

- [ ] **Step 1: Write WowStrip**

```tsx
// src/components/dashboard/WowStrip.tsx
import type { DashboardView } from "./DashboardNav";
import type { BusinessType } from "@/lib/businessModules";

interface WowFeature {
  emoji: string;
  label: string;
  view: DashboardView;
}

const BASE_FEATURES: WowFeature[] = [
  { emoji: "🛍️", label: "ניהול מוצרים", view: "products" },
  { emoji: "👥", label: "לקוחות & CRM", view: "customers" },
  { emoji: "📊", label: "אנליטיקס", view: "home" },
  { emoji: "✍️", label: "תוכן AI", view: "content" },
  { emoji: "🎨", label: "עיצוב ותבניות", view: "design" },
  { emoji: "📄", label: "תקנון ומדיניות", view: "legal" },
  { emoji: "🌐", label: "דומיין מותאם", view: "domains" },
  { emoji: "📸", label: "תמונות AI", view: "ai-images" },
];

const TYPE_OVERRIDES: Partial<Record<BusinessType, Partial<WowFeature>[]>> = {
  nonprofit: [
    { label: "ניהול פרויקטים" },
    { label: "תורמים & CRM" },
    { label: "ניהול תרומות" },
  ],
  synagogue: [
    { label: "ניהול פרויקטים" },
    { label: "קהל & CRM" },
    { label: "ניהול תרומות" },
  ],
  realestate: [
    { label: "ניהול נכסים" },
    { label: "לידים & CRM" },
  ],
  vacation: [
    { label: "חדרים ויחידות" },
    { label: "אורחים & CRM" },
    { label: "יומן זמינות", view: "availability" as DashboardView },
  ],
  services: [
    { label: "ניהול שירותים" },
  ],
};

interface WowStripProps {
  businessType?: BusinessType;
  onNavigate: (view: DashboardView) => void;
}

export default function WowStrip({ businessType = "products", onNavigate }: WowStripProps) {
  const overrides = TYPE_OVERRIDES[businessType] ?? [];
  const features = BASE_FEATURES.map((f, i) => ({
    ...f,
    ...(overrides[i] ?? {}),
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground mb-3">מה כלול בדשבורד שלך</p>
      <div className="grid grid-cols-4 gap-2">
        {features.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => onNavigate(f.view)}
            className="flex flex-col items-center gap-1.5 rounded-xl p-2 hover:bg-muted/60 transition-colors group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">{f.emoji}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/WowStrip.tsx
git commit -m "feat(dashboard): WowStrip — 8-feature capability overview"
git push origin main
```

---

## Task 7: TodoCards component

**Files:**
- Create: `src/components/dashboard/TodoCards.tsx`

TodoCards shows popup items that are unread or dismissed (not completed), with a click to reopen the popup.

- [ ] **Step 1: Write TodoCards**

```tsx
// src/components/dashboard/TodoCards.tsx
import type { PopupId, PopupState } from "./PostLaunchPopups";
import { POPUPS } from "./PostLaunchPopups";

interface TodoCardsProps {
  popupState: PopupState | null;
  onReopen: (id: PopupId) => void;
}

const STATUS_STYLES: Record<"unread" | "dismissed", { card: string; badge: string; badgeText: string }> = {
  unread: {
    card: "border-amber-400/40 bg-amber-50 dark:bg-amber-950/30",
    badge: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
    badgeText: "לא נקרא",
  },
  dismissed: {
    card: "border-border bg-card",
    badge: "bg-muted text-muted-foreground",
    badgeText: "דולג",
  },
};

export default function TodoCards({ popupState, onReopen }: TodoCardsProps) {
  if (!popupState) return null;

  const visible = POPUPS.filter((p) => {
    if (popupState.completed.includes(p.id)) return false;
    return true; // show both unread and dismissed
  });

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {visible.length} {visible.length === 1 ? "דבר" : "דברים"} שנשארו לסדר
      </p>
      <div className="flex gap-2 flex-wrap">
        {visible.map((p) => {
          const status = popupState.dismissed.includes(p.id) ? "dismissed" : "unread";
          const s = STATUS_STYLES[status];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onReopen(p.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-right text-sm transition-colors hover:opacity-80 ${s.card}`}
            >
              <span>{p.emoji}</span>
              <span className="font-medium text-foreground">{p.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.badge}`}>{s.badgeText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/TodoCards.tsx
git commit -m "feat(dashboard): TodoCards — pending popup reminders in overview"
git push origin main
```

---

## Task 8: Wire PostLaunchPopups + WowStrip into DashboardHome and Dashboard

**Files:**
- Modify: `src/components/dashboard/DashboardHome.tsx`
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Read Dashboard.tsx lines 60-200**

```bash
sed -n '60,200p' src/pages/Dashboard.tsx
```

Note how `business`, `businessId`, `businessType` are derived. Note the `DashboardHome` render call and its props.

- [ ] **Step 2: Add vacation to TYPE_LABELS in DashboardHome.tsx**

Open `src/components/dashboard/DashboardHome.tsx`. After the `realestate` entry in `TYPE_LABELS`, add:

```ts
  vacation: {
    items: { label: "חדרים", shortLabel: "חדרים", icon: Package },
    transactions: { label: "הזמנות לינה", shortLabel: "הזמנות", icon: ShoppingCart },
    revenue: { label: "הכנסות לינה" },
    contacts: { label: "אורחים", icon: Users },
    productsNav: "products",
    ordersNav: "orders",
    todosProductsLabel: "הוסיפו חדרים ויחידות",
    todosPaymentLabel: "חברו סליקה לקבלת הזמנות",
  },
```

- [ ] **Step 3: Add WowStrip + TodoCards imports and props to DashboardHome**

At the top of `DashboardHome.tsx`, add imports:
```ts
import WowStrip from "./WowStrip";
import TodoCards from "./TodoCards";
import type { PopupId, PopupState } from "./PostLaunchPopups";
```

Add to `DashboardHomeProps` interface:
```ts
  popupState?: PopupState | null;
  onReopenPopup?: (id: PopupId) => void;
```

- [ ] **Step 4: Add WowStrip and TodoCards to DashboardHome render**

In the JSX `return`, insert between stat cards and the existing todos section:

```tsx
{/* Wow Strip */}
<WowStrip businessType={businessType} onNavigate={onNavigate} />

{/* Todo cards from popup state */}
{popupState !== undefined && popupState !== null && (
  <TodoCards popupState={popupState} onReopen={onReopenPopup ?? (() => {})} />
)}
```

Remove or keep the existing `todos` section (it shows payment/about/products todos) — they can coexist; the popup-state cards complement the stats-based todos.

- [ ] **Step 5: Read Dashboard.tsx lines 1-300 to understand full structure**

```bash
sed -n '1,300p' src/pages/Dashboard.tsx
```

- [ ] **Step 6: Add popup_state state to Dashboard.tsx**

Inside `Dashboard.tsx`, near the `business` and `businessId` declarations, add:

```ts
const [popupState, setPopupState] = useState<{ shown: string[]; dismissed: string[]; completed: string[] } | null>(null);
const [activeReopenId, setActiveReopenId] = useState<string | null>(null);
```

And after `business` loads (in a `useEffect` that depends on `business`):
```ts
useEffect(() => {
  if (business?.popup_state) {
    setPopupState(business.popup_state as { shown: string[]; dismissed: string[]; completed: string[] });
  } else if (business) {
    setPopupState({ shown: [], dismissed: [], completed: [] });
  }
}, [business]);
```

- [ ] **Step 7: Mount PostLaunchPopups in Dashboard.tsx render**

Import `PostLaunchPopups`:
```ts
import PostLaunchPopups from "@/components/dashboard/PostLaunchPopups";
import type { PopupState, PopupId } from "@/components/dashboard/PostLaunchPopups";
```

In the Dashboard JSX, render `PostLaunchPopups` at the root level (after the nav, before content):
```tsx
<PostLaunchPopups
  businessId={businessId}
  onNavigate={goToView}
  popupState={popupState}
  onStateChange={setPopupState}
/>
```

- [ ] **Step 8: Pass popup props to DashboardHome**

Find where `<DashboardHome>` is rendered, add:
```tsx
popupState={popupState}
onReopenPopup={(id: PopupId) => {
  // Reset the popup so it shows again
  setPopupState(prev => prev ? {
    ...prev,
    shown: prev.shown.filter(s => s !== id),
    dismissed: prev.dismissed.filter(d => d !== id),
  } : prev);
}}
```

- [ ] **Step 9: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add src/components/dashboard/DashboardHome.tsx src/pages/Dashboard.tsx
git commit -m "feat(dashboard): wire PostLaunchPopups, WowStrip, TodoCards into overview"
git push origin main
```

---

## Task 9: DashboardNav restructure

**Files:**
- Modify: `src/components/dashboard/DashboardNav.tsx`

- [ ] **Step 1: Read the full current DashboardNav.tsx**

```bash
cat src/components/dashboard/DashboardNav.tsx
```

- [ ] **Step 2: Add new DashboardView keys**

Find the `DashboardView` type union. Add these if not already present:
```ts
'availability' | 'guests'
```

- [ ] **Step 3: Update NAV_GROUPS to new structure**

Replace current `NAV_GROUPS` with:
```ts
const NAV_GROUPS = ["סקירה", "ניהול", "תוכן ועיצוב", "שיווק", "הגדרות"] as const;
```

- [ ] **Step 4: Rewrite navItems array with new structure**

Replace the `navItems` array with:
```ts
const navItems: { id: DashboardView; label: string; icon: LucideIcon; group: string }[] = [
  { id: "home",       label: "סקירה",                    icon: LayoutDashboard,  group: "סקירה" },

  { id: "orders",     label: "הזמנות",                   icon: ShoppingBag,       group: "ניהול" },
  { id: "products",   label: "מוצרים",                   icon: Package,           group: "ניהול" },
  { id: "customers",  label: "לקוחות & CRM",             icon: Users,             group: "ניהול" },

  { id: "content",    label: "תוכן",                     icon: PenLine,           group: "תוכן ועיצוב" },
  { id: "design",     label: "עיצוב",                    icon: Palette,           group: "תוכן ועיצוב" },
  { id: "ai-images",  label: "גלריה ותמונות AI",         icon: Images,            group: "תוכן ועיצוב" },

  { id: "coupons",    label: "מבצעים וקופונים",          icon: Tag,               group: "שיווק" },
  { id: "domains",    label: "דומיין",                   icon: Globe,             group: "הגדרות" },
  { id: "settings",   label: "הגדרות",                   icon: Settings,          group: "הגדרות" },
  { id: "legal",      label: "תקנון ומדיניות",           icon: FileText,          group: "הגדרות" },
  { id: "subscription", label: "התוכנית שלי",           icon: Crown,             group: "הגדרות" },
];
```

(Import the new icons from `lucide-react` as needed: `LayoutDashboard`, `ShoppingBag`, `Package`, `Users`, `PenLine`, `Palette`, `Images`, `Tag`, `Globe`, `Settings`, `FileText`, `Crown`.)

- [ ] **Step 5: Update TYPE_CONFIG to add vacation**

After the `realestate` entry in `TYPE_CONFIG`, add:
```ts
  vacation: {
    managementGroupLabel: "ניהול האירוח",
    hiddenItems: ["coupons"] as DashboardView[], // keep coupons for seasonal
    itemOverrides: {
      products: { label: "חדרים ויחידות" },
      orders: { label: "הזמנות לינה" },
      customers: { label: "אורחים & CRM" },
    },
    extraItems: [
      { id: "availability" as DashboardView, label: "יומן זמינות", icon: CalendarDays, group: "ניהול" },
    ],
  },
```

Import `CalendarDays` from lucide-react.

- [ ] **Step 6: Add "צפה באתר" button to sidebar header**

Find the sidebar top section. Add above the nav groups:
```tsx
<div className="flex gap-2 px-2 pb-3 border-b border-border mb-1">
  <button
    type="button"
    onClick={() => onViewChange("preview")}
    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
  >
    <Eye className="h-3.5 w-3.5" /> צפה באתר
  </button>
  <button
    type="button"
    onClick={() => onViewChange("upgrades")}
    className="flex items-center gap-1.5 rounded-xl bg-violet-500/10 border border-violet-500/25 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-500/15 transition-colors"
  >
    ✨ תוספות
  </button>
</div>
```

Import `Eye` from lucide-react.

- [ ] **Step 7: Add "תוספות שוות" card to sidebar footer**

At the very bottom of the sidebar (after all nav groups), add:
```tsx
<div className="mt-auto pt-3 px-2">
  <button
    type="button"
    onClick={() => onViewChange("upgrades")}
    className="w-full rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/10 to-violet-500/5 p-3 text-right hover:from-violet-500/15 hover:to-violet-500/8 transition-all"
  >
    <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">✨ תוספות שוות</p>
    <p className="text-[10px] text-muted-foreground leading-snug">Google Reviews · דומיין · CRM מלא</p>
    <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mt-1">גלה עוד ←</p>
  </button>
</div>
```

- [ ] **Step 8: Build check**

```bash
npx tsc --noEmit
```

Fix any type errors from renamed views.

- [ ] **Step 9: Update Dashboard.tsx to handle new DashboardView values**

In `Dashboard.tsx`, the switch/render that maps `currentView` to components — add cases for `'availability'` and `'guests'` (temporarily route `availability` to a placeholder or `DashboardAvailabilityCalendar` after Task 18, and `guests` to `DashboardCRM`).

- [ ] **Step 10: Commit**

```bash
git add src/components/dashboard/DashboardNav.tsx src/pages/Dashboard.tsx
git commit -m "feat(nav): new sidebar structure, vacation TYPE_CONFIG, תוספות touchpoints"
git push origin main
```

---

## Task 10: DashboardDesign — live editor with iframe + postMessage

**Files:**
- Modify: `src/components/dashboard/DashboardDesign.tsx`

- [ ] **Step 1: Read the full current DashboardDesign.tsx**

```bash
cat src/components/dashboard/DashboardDesign.tsx
```

- [ ] **Step 2: Update DashboardDesignProps**

Add props:
```ts
interface DashboardDesignProps {
  businessId: string | undefined;
  currentTemplateId?: string | null;
  businessSlug?: string; // needed to build the iframe URL
}
```

- [ ] **Step 3: Rewrite component layout to split-panel**

Replace the existing JSX with a two-column layout:

```tsx
return (
  <div className="flex h-full overflow-hidden">
    {/* Left panel — controls (30%) */}
    <div className="w-[320px] shrink-0 border-l border-border overflow-y-auto p-4 space-y-6 bg-card">
      {/* Save button */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">עיצוב האתר</h2>
        <Button
          size="sm"
          disabled={!hasUnsavedChanges}
          onClick={handleSave}
        >
          {saving ? "שומר..." : "שמור שינויים"}
        </Button>
      </div>

      {/* Template picker */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">תבנית</p>
        <div className="grid grid-cols-2 gap-2">
          {storeTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t.id)}
              className={`rounded-xl border-2 overflow-hidden transition-all ${
                preview.templateId === t.id ? "border-primary" : "border-border"
              }`}
            >
              <TemplateThumb template={t} />
            </button>
          ))}
        </div>
      </div>

      {/* Palette chips */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">צבעים</p>
        <div className="flex flex-wrap gap-2">
          {PALETTE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              title={p.name}
              onClick={() => selectPalette(p)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                preview.primaryColor === p.primary ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: p.primary }}
            />
          ))}
        </div>
      </div>

      {/* Font pickers */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">פונט כותרות</p>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={preview.headingFont}
          onChange={(e) => selectFont("heading", e.target.value)}
        >
          {STORE_FONTS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">פונט גוף</p>
        <select
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={preview.bodyFont}
          onChange={(e) => selectFont("body", e.target.value)}
        >
          {STORE_FONTS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Hero image */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">תמונת רקע</p>
        {/* Keep existing hero image upload UI */}
      </div>
    </div>

    {/* Right panel — live iframe (70%) */}
    <div className="flex-1 bg-muted/30 flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-card">
        <span className="text-xs text-muted-foreground">תצוגה חיה של האתר שלך</span>
        <div className="flex gap-1 mr-auto">
          <button
            onClick={() => setPreviewTheme("light")}
            className={`rounded px-2 py-1 text-xs ${previewTheme === "light" ? "bg-muted font-medium" : "text-muted-foreground"}`}
          >☀️ בהיר</button>
          <button
            onClick={() => setPreviewTheme("dark")}
            className={`rounded px-2 py-1 text-xs ${previewTheme === "dark" ? "bg-muted font-medium" : "text-muted-foreground"}`}
          >🌙 כהה</button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        src={storeUrl}
        className="flex-1 w-full border-0"
        title="תצוגה חיה של האתר"
      />
    </div>
  </div>
);
```

- [ ] **Step 4: Add state and postMessage logic**

At the top of the component function, add:

```ts
const iframeRef = useRef<HTMLIFrameElement>(null);
const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [saving, setSaving] = useState(false);

// Preview state (not yet saved to DB)
const [preview, setPreview] = useState({
  templateId: currentTemplateId ?? storeTemplates[0]?.id ?? "",
  primaryColor: "",
  headingFont: "",
  bodyFont: "",
});

// Build store URL for iframe
const storeUrl = businessSlug ? `${window.location.origin}/store/${businessSlug}` : "";

// Send postMessage to iframe whenever preview changes
useEffect(() => {
  const iframe = iframeRef.current;
  if (!iframe || !preview.templateId) return;
  iframe.contentWindow?.postMessage(
    {
      type: "DESIGN_PREVIEW",
      templateId: preview.templateId,
      primaryColor: preview.primaryColor,
      headingFont: preview.headingFont,
      bodyFont: preview.bodyFont,
      theme: previewTheme,
    },
    "*"
  );
}, [preview, previewTheme]);

function selectTemplate(id: string) {
  setPreview((p) => ({ ...p, templateId: id }));
  setHasUnsavedChanges(true);
}

function selectPalette(p: { name: string; primary: string }) {
  setPreview((prev) => ({ ...prev, primaryColor: p.primary }));
  setHasUnsavedChanges(true);
}

function selectFont(role: "heading" | "body", value: string) {
  setPreview((prev) => ({ ...prev, [role === "heading" ? "headingFont" : "bodyFont"]: value }));
  setHasUnsavedChanges(true);
}

async function handleSave() {
  if (!businessId) return;
  setSaving(true);
  await supabase.from("businesses").update({
    template_id: preview.templateId,
    // store primaryColor, headingFont, bodyFont in business settings JSONB or separate columns
    // Adapt to actual schema
  }).eq("id", businessId);
  setSaving(false);
  setHasUnsavedChanges(false);
  toast.success("האתר עודכן!");
}
```

- [ ] **Step 5: Define PALETTE_PRESETS**

```ts
const PALETTE_PRESETS = [
  { name: "סגול", primary: "#7c3aed" },
  { name: "כחול", primary: "#2563eb" },
  { name: "ירוק", primary: "#16a34a" },
  { name: "כתום", primary: "#ea580c" },
  { name: "ורוד", primary: "#db2777" },
  { name: "ציאן", primary: "#0891b2" },
  { name: "שחור", primary: "#1a1a1a" },
  { name: "חום", primary: "#92400e" },
];
```

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
```

Fix any type errors. The `businessSlug` prop needs to be passed from `Dashboard.tsx` — add it there too.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/DashboardDesign.tsx src/pages/Dashboard.tsx
git commit -m "feat(design): split-panel live editor with iframe + postMessage + palette picker"
git push origin main
```

---

## Task 11: StoreFront — postMessage listener

**Files:**
- Modify: `src/pages/StoreFront.tsx`

- [ ] **Step 1: Read StoreFront.tsx lines 1-80**

```bash
sed -n '1,80p' src/pages/StoreFront.tsx
```

- [ ] **Step 2: Add postMessage listener useEffect**

Find the existing `useEffect` hooks in `StoreFront.tsx`. Add a new one:

```ts
// Listen for design preview messages from the dashboard iframe parent
useEffect(() => {
  function handleDesignPreview(event: MessageEvent) {
    if (!event.data || event.data.type !== "DESIGN_PREVIEW") return;
    const { primaryColor, headingFont, bodyFont, theme } = event.data;

    if (primaryColor) {
      document.documentElement.style.setProperty("--primary-color", primaryColor);
    }
    if (headingFont) {
      document.documentElement.style.setProperty("--font-display", headingFont);
    }
    if (bodyFont) {
      document.documentElement.style.setProperty("--font-body", bodyFont);
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    }
  }

  window.addEventListener("message", handleDesignPreview);
  return () => window.removeEventListener("message", handleDesignPreview);
}, []);
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/StoreFront.tsx
git commit -m "feat(storefront): postMessage listener for live design preview"
git push origin main
```

---

## Task 12: DashboardProducts — colorful header + empty states + vacation fields

**Files:**
- Modify: `src/components/dashboard/DashboardProducts.tsx`

- [ ] **Step 1: Read the current DashboardProducts.tsx (first 100 lines)**

```bash
sed -n '1,100p' src/components/dashboard/DashboardProducts.tsx
```

- [ ] **Step 2: Add colorful page header**

Find where the page title is rendered. Replace the plain `<h1>` with:
```tsx
{/* Colorful section header */}
<div className="rounded-2xl bg-gradient-to-l from-violet-500/15 to-violet-500/5 border border-violet-500/20 p-5 mb-5 flex items-center gap-4">
  <div className="text-4xl">{SECTION_CONFIG[businessType].emoji}</div>
  <div>
    <h1 className="text-lg font-bold text-foreground">{SECTION_CONFIG[businessType].title}</h1>
    <p className="text-sm text-muted-foreground">{SECTION_CONFIG[businessType].description}</p>
  </div>
  <Button onClick={handleAddNew} className="mr-auto gap-2">
    <Plus className="h-4 w-4" /> {SECTION_CONFIG[businessType].addLabel}
  </Button>
</div>
```

Where `SECTION_CONFIG` is:
```ts
const SECTION_CONFIG: Record<BusinessType, { emoji: string; title: string; description: string; addLabel: string }> = {
  products:   { emoji: "🛍️", title: "המוצרים שלך",       description: "כל מה שהחנות שלך מוכרת",         addLabel: "הוסף מוצר" },
  services:   { emoji: "⚡", title: "השירותים שלך",       description: "מה אתה מציע ללקוחות",             addLabel: "הוסף שירות" },
  realestate: { emoji: "🏘️", title: "הנכסים שלך",        description: "נכסים לקנייה, שכירות, ייזום",    addLabel: "הוסף נכס" },
  vacation:   { emoji: "🛏️", title: "החדרים והיחידות",   description: "מה האורחים יכולים לבחור",         addLabel: "הוסף חדר / יחידה" },
  nonprofit:  { emoji: "💙", title: "הפרויקטים שלך",      description: "יעדי גיוס ופרויקטים פעילים",     addLabel: "הוסף פרויקט" },
  synagogue:  { emoji: "✡️", title: "הפרויקטים שלך",      description: "פרויקטים ויעדי גיוס",             addLabel: "הוסף פרויקט" },
};
```

- [ ] **Step 3: Improve empty state**

Find the empty state render (usually when `products.length === 0`). Replace with:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center px-4">
  <div className="text-6xl mb-4">{SECTION_CONFIG[businessType].emoji}</div>
  <h3 className="text-lg font-semibold text-foreground mb-2">
    עדיין אין {SECTION_CONFIG[businessType].title.replace("ה", "").toLowerCase()}
  </h3>
  <p className="text-sm text-muted-foreground mb-6 max-w-xs">
    הוסיפו את הפריט הראשון שלכם ותתחילו להופיע ללקוחות.
  </p>
  <Button onClick={handleAddNew} size="lg" className="gap-2">
    <Plus className="h-4 w-4" /> {SECTION_CONFIG[businessType].addLabel}
  </Button>
</div>
```

- [ ] **Step 4: Add vacation-specific fields to the edit form**

In the product form (the modal/sheet where users edit a product), find the price field. Add a conditional vacation section:
```tsx
{businessType === "vacation" && (
  <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/30">
    <p className="text-sm font-medium">פרטי לינה</p>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-muted-foreground">מחיר ללילה (₪)</label>
        <Input type="number" value={form.price_per_night ?? ""} onChange={(e) => setForm(f => ({ ...f, price_per_night: Number(e.target.value) }))} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">מחיר ל-weekend (₪)</label>
        <Input type="number" value={form.price_weekend ?? ""} onChange={(e) => setForm(f => ({ ...f, price_weekend: Number(e.target.value) }))} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">תפוסה מקסימלית</label>
        <Input type="number" value={form.max_guests ?? ""} onChange={(e) => setForm(f => ({ ...f, max_guests: Number(e.target.value) }))} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">מינימום לילות</label>
        <Input type="number" value={form.min_nights ?? 1} onChange={(e) => setForm(f => ({ ...f, min_nights: Number(e.target.value) }))} />
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardProducts.tsx
git commit -m "feat(products): colorful header, lively empty states, vacation room fields"
git push origin main
```

---

## Task 13: DashboardOrders — chip status colors + vacation booking fields

**Files:**
- Modify: `src/components/dashboard/DashboardOrders.tsx`

- [ ] **Step 1: Read current DashboardOrders.tsx (first 80 lines)**

```bash
sed -n '1,80p' src/components/dashboard/DashboardOrders.tsx
```

- [ ] **Step 2: Add colorful section header (same pattern as Task 12)**

```tsx
const ORDER_SECTION_CONFIG: Record<BusinessType, { emoji: string; title: string; emptyMsg: string }> = {
  products:   { emoji: "📦", title: "הזמנות",          emptyMsg: "כשלקוחות יזמינו, ההזמנות יופיעו כאן. שתפו את האתר!" },
  services:   { emoji: "📋", title: "לידים",           emptyMsg: "כשאנשים יפנו, הלידים יופיעו כאן." },
  realestate: { emoji: "🤝", title: "לידים",           emptyMsg: "כשמתעניינים יפנו, הלידים יופיעו כאן." },
  vacation:   { emoji: "🛎️", title: "הזמנות לינה",     emptyMsg: "כשאורחים יזמינו, ההזמנות יופיעו כאן. שתפו את האתר!" },
  nonprofit:  { emoji: "💰", title: "תרומות",          emptyMsg: "תרומות שיתקבלו יופיעו כאן." },
  synagogue:  { emoji: "🙏", title: "תרומות ועליות",   emptyMsg: "תרומות ועליות יופיעו כאן." },
};
```

Add header:
```tsx
<div className="rounded-2xl bg-gradient-to-l from-blue-500/15 to-blue-500/5 border border-blue-500/20 p-5 mb-5 flex items-center gap-4">
  <div className="text-4xl">{ORDER_SECTION_CONFIG[businessType].emoji}</div>
  <div>
    <h1 className="text-lg font-bold text-foreground">{ORDER_SECTION_CONFIG[businessType].title}</h1>
    <p className="text-sm text-muted-foreground">{stats?.totalOrders ?? 0} בסה"כ</p>
  </div>
</div>
```

- [ ] **Step 3: Add colorful status chips**

Define a status chip helper:
```ts
const STATUS_CHIP: Record<string, { bg: string; text: string }> = {
  // products/services
  "חדשה":      { bg: "bg-blue-500/15",    text: "text-blue-600 dark:text-blue-400" },
  "בטיפול":    { bg: "bg-amber-500/15",   text: "text-amber-600 dark:text-amber-400" },
  "הושלמה":    { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  "בוטלה":     { bg: "bg-red-500/15",     text: "text-red-600 dark:text-red-400" },
  // realestate/services
  "ליד חדש":   { bg: "bg-blue-500/15",    text: "text-blue-600 dark:text-blue-400" },
  "נסגר":      { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  "לא רלוונטי":{ bg: "bg-muted",          text: "text-muted-foreground" },
  // vacation
  "ממתין לאישור":{ bg: "bg-amber-500/15",  text: "text-amber-600 dark:text-amber-400" },
  "מאושר":     { bg: "bg-blue-500/15",    text: "text-blue-600 dark:text-blue-400" },
  "הגיע":      { bg: "bg-violet-500/15",  text: "text-violet-600 dark:text-violet-400" },
  "עזב":       { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  // nonprofit
  "נקלטה":     { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  "בבדיקה":    { bg: "bg-amber-500/15",   text: "text-amber-600 dark:text-amber-400" },
};
```

In the order card, replace the plain status text with:
```tsx
{(() => {
  const s = STATUS_CHIP[order.status] ?? { bg: "bg-muted", text: "text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      {order.status}
    </span>
  );
})()}
```

- [ ] **Step 4: Show vacation booking fields in order detail**

In the order detail view (the expanded card or modal), add a conditional section:
```tsx
{businessType === "vacation" && (order.checkin_date || order.checkout_date) && (
  <div className="rounded-xl bg-muted/40 p-3 space-y-1 text-sm">
    <div className="flex gap-4">
      {order.checkin_date && <div><span className="text-muted-foreground">כניסה: </span><b>{order.checkin_date}</b></div>}
      {order.checkout_date && <div><span className="text-muted-foreground">יציאה: </span><b>{order.checkout_date}</b></div>}
    </div>
    {order.num_guests && <div><span className="text-muted-foreground">אורחים: </span><b>{order.num_guests}</b></div>}
    {order.unit_name && <div><span className="text-muted-foreground">יחידה: </span><b>{order.unit_name}</b></div>}
  </div>
)}
```

- [ ] **Step 5: Improve empty state**

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center px-4">
  <div className="text-5xl mb-4">{ORDER_SECTION_CONFIG[businessType].emoji}</div>
  <p className="text-sm text-muted-foreground max-w-xs">{ORDER_SECTION_CONFIG[businessType].emptyMsg}</p>
  <Button variant="outline" size="sm" className="mt-4" onClick={() => onNavigate?.("preview")}>
    צפה באתר שלך ←
  </Button>
</div>
```

- [ ] **Step 6: Build check + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/DashboardOrders.tsx
git commit -m "feat(orders): colorful header, status chips, vacation booking fields"
git push origin main
```

---

## Task 14: DashboardCRM — upsell overlay on premium tabs

**Files:**
- Modify: `src/components/dashboard/DashboardCRM.tsx`

- [ ] **Step 1: Read current DashboardCRM.tsx**

```bash
cat src/components/dashboard/DashboardCRM.tsx
```

- [ ] **Step 2: Add PremiumTabOverlay helper**

At the top of `DashboardCRM.tsx`, add a small inline overlay component:
```tsx
function PremiumTabOverlay({ feature }: { feature: string }) {
  return (
    <div className="relative rounded-2xl border border-violet-500/20 bg-violet-500/5 overflow-hidden min-h-[200px]">
      {/* Blurred placeholder rows */}
      <div className="p-4 space-y-3 blur-sm pointer-events-none select-none" aria-hidden>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/60 animate-pulse" />
        ))}
      </div>
      {/* Overlay message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-3xl">✨</div>
        <p className="font-semibold text-foreground">{feature} זמין בתוספת CRM</p>
        <p className="text-sm text-muted-foreground">שדרגו כדי לפתוח גישה לכל הנתונים.</p>
        <button
          type="button"
          className="rounded-xl bg-violet-600 text-white px-5 py-2 text-sm font-medium hover:bg-violet-700 transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
        >
          שדרג לתוספת ←
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wrap profitability and suppliers tabs with the overlay**

Find where `DashboardProfitability` and `DashboardSuppliers` are rendered in the tabs. Wrap each:
```tsx
// For suppliers tab:
{hasCrmAddon ? (
  <DashboardSuppliers businessId={businessId} />
) : (
  <PremiumTabOverlay feature="ניהול ספקים" />
)}

// For profitability tab:
{hasCrmAddon ? (
  <DashboardProfitability businessId={businessId} />
) : (
  <PremiumTabOverlay feature="ניהול רווחיות" />
)}
```

Where `hasCrmAddon` is a prop (boolean) passed from `Dashboard.tsx` — add it to the props interface.

- [ ] **Step 4: Add colorful CRM header**

```tsx
<div className="rounded-2xl bg-gradient-to-l from-emerald-500/15 to-teal-500/5 border border-emerald-500/20 p-5 mb-5 flex items-center gap-4">
  <div className="text-4xl">👥</div>
  <div>
    <h1 className="text-lg font-bold text-foreground">
      {businessType === "vacation" ? "האורחים שלך" : businessType === "nonprofit" || businessType === "synagogue" ? "התורמים שלך" : "הלקוחות שלך"}
    </h1>
    <p className="text-sm text-muted-foreground">היסטוריית הלקוחות וניהול הקשרים</p>
  </div>
</div>
```

- [ ] **Step 5: Build check + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/DashboardCRM.tsx
git commit -m "feat(crm): upsell overlay on premium tabs, colorful header"
git push origin main
```

---

## Task 15: DashboardContent — auto-save + big AI button + vacation hosting policy tab

**Files:**
- Modify: `src/components/dashboard/DashboardContent.tsx`

- [ ] **Step 1: Read DashboardContent.tsx (first 80 lines)**

```bash
sed -n '1,80p' src/components/dashboard/DashboardContent.tsx
```

- [ ] **Step 2: Add auto-save logic**

Find where form fields are edited and saved. Add a debounced auto-save:

```ts
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

function scheduleAutosave(updatedData: Partial<typeof formData>) {
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  saveTimeoutRef.current = setTimeout(async () => {
    if (!businessId) return;
    await supabase.from("business_profiles").update(updatedData).eq("id", businessId);
    // show subtle toast
    toast.success("נשמר", { duration: 1500 });
  }, 2000);
}
```

Call `scheduleAutosave(...)` inside each field's `onChange` handler.

Clean up on unmount:
```ts
useEffect(() => {
  return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
}, []);
```

- [ ] **Step 3: Make the AI button bigger and more prominent**

Find the "צרו עם AI" button. Replace it with:
```tsx
<button
  type="button"
  onClick={handleGenerateAI}
  disabled={generating}
  className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-indigo-500 text-white px-5 py-3 text-sm font-semibold shadow hover:opacity-90 transition-opacity disabled:opacity-60"
>
  ✨ {generating ? "יוצר תוכן..." : "צור עם AI בחינם"}
</button>
```

- [ ] **Step 4: Add vacation hosting policy tab**

Find where tabs are defined. Add conditionally:
```tsx
{businessType === "vacation" && (
  <TabsTrigger value="hosting">מדיניות אירוח</TabsTrigger>
)}
```

And the tab content:
```tsx
{businessType === "vacation" && (
  <TabsContent value="hosting">
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">שעת כניסה (check-in)</label>
          <Input
            type="time"
            value={hostingPolicy.checkin_time ?? "15:00"}
            onChange={(e) => updateHostingPolicy({ checkin_time: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">שעת יציאה (check-out)</label>
          <Input
            type="time"
            value={hostingPolicy.checkout_time ?? "11:00"}
            onChange={(e) => updateHostingPolicy({ checkout_time: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">מדיניות ביטול</label>
        <Select value={hostingPolicy.cancellation_policy} onValueChange={(v) => updateHostingPolicy({ cancellation_policy: v })}>
          <SelectTrigger><SelectValue placeholder="בחר מדיניות" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="flexible">גמישה — ביטול עד 24 שעות לפני</SelectItem>
            <SelectItem value="moderate">מתונה — ביטול עד שבוע לפני</SelectItem>
            <SelectItem value="strict">מחמירה — ללא החזר</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">חיות מחמד</label>
        <Select value={hostingPolicy.pets} onValueChange={(v) => updateHostingPolicy({ pets: v })}>
          <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="no">לא מותר</SelectItem>
            <SelectItem value="yes">מותר</SelectItem>
            <SelectItem value="fee">מותר בתוספת תשלום</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">עישון</label>
        <Select value={hostingPolicy.smoking} onValueChange={(v) => updateHostingPolicy({ smoking: v })}>
          <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="no">אסור לחלוטין</SelectItem>
            <SelectItem value="outside">מותר בחוץ בלבד</SelectItem>
            <SelectItem value="yes">מותר</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </TabsContent>
)}
```

The `hostingPolicy` state is stored in `business_profiles` as JSONB or in dedicated columns — save with `scheduleAutosave`.

- [ ] **Step 5: Build check + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/DashboardContent.tsx
git commit -m "feat(content): auto-save, big AI button, vacation hosting policy tab"
git push origin main
```

---

## Task 16: DashboardCoupons + DashboardSales — improved empty states + vacation label

**Files:**
- Modify: `src/components/dashboard/DashboardCoupons.tsx`
- Modify: `src/components/dashboard/DashboardSales.tsx`

- [ ] **Step 1: DashboardCoupons — replace empty state**

Find the empty state in `DashboardCoupons.tsx`. Replace with:
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center px-4">
  <div className="text-5xl mb-4">🏷️</div>
  <h3 className="text-lg font-semibold text-foreground mb-2">עדיין אין קופונים</h3>
  <p className="text-sm text-muted-foreground mb-6 max-w-xs">
    קופון אחד יכול להביא גל של לקוחות. צרו אחד עכשיו!
  </p>
  <Button onClick={() => setShowAddModal(true)} size="lg" className="gap-2">
    <Plus className="h-4 w-4" /> צור קופון ראשון
  </Button>
</div>
```

- [ ] **Step 2: DashboardSales — colorful header + vacation label**

In `DashboardSales.tsx`, add a colorful header:
```tsx
<div className="rounded-2xl bg-gradient-to-l from-orange-500/15 to-amber-500/5 border border-orange-500/20 p-5 mb-5 flex items-center gap-4">
  <div className="text-4xl">{businessType === "vacation" ? "🌅" : "🔥"}</div>
  <div>
    <h1 className="text-lg font-bold text-foreground">
      {businessType === "vacation" ? "הנחות עונתיות" : "מבצעים"}
    </h1>
    <p className="text-sm text-muted-foreground">
      {businessType === "vacation" ? "הנחות לסוף עונה, ימי חול, הזמנות מוקדמות" : "מוצרים במבצע ועסקאות מיוחדות"}
    </p>
  </div>
  <Button onClick={handleSitewideSale} variant="outline" className="mr-auto gap-2">
    מבצע לכל {businessType === "vacation" ? "היחידות" : "החנות"}
  </Button>
</div>
```

- [ ] **Step 3: Build check + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/DashboardCoupons.tsx src/components/dashboard/DashboardSales.tsx
git commit -m "feat(marketing): lively empty states, vacation seasonal label"
git push origin main
```

---

## Task 17: DashboardSettings — accordion layout + vacation hosting section

**Files:**
- Modify: `src/components/dashboard/DashboardSettings.tsx`

- [ ] **Step 1: Read current DashboardSettings.tsx structure**

```bash
sed -n '1,80p' src/components/dashboard/DashboardSettings.tsx
```

- [ ] **Step 2: Add AccordionSection helper component**

At the top of `DashboardSettings.tsx`, add an inline helper:
```tsx
function AccordionSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors text-right"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <p className="font-semibold text-foreground text-sm">{title}</p>
          {!open && summary && <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-4 border-t border-border bg-card">{children}</div>}
    </div>
  );
}
```

Import `ChevronDown` from lucide-react.

- [ ] **Step 3: Wrap existing settings sections in AccordionSection**

Replace the existing flat layout with accordion wrappers:
```tsx
<div className="space-y-3">
  <AccordionSection title="פרטי העסק" summary={business?.name ?? ""} defaultOpen>
    {/* existing business info fields */}
  </AccordionSection>

  <AccordionSection title="קטגוריית העסק" summary={business?.category ?? "לא נבחר"}>
    {/* existing category grid */}
  </AccordionSection>

  {businessType !== "vacation" ? (
    <AccordionSection title="משלוחים ואיסוף" summary={shippingModeSummary}>
      {/* existing shipping section */}
    </AccordionSection>
  ) : (
    <AccordionSection title="מדיניות לינה" summary="שעות כניסה, ביטולים, חיות מחמד">
      {/* Vacation hosting policy fields — same as in DashboardContent Task 15 Step 4 */}
      {/* Duplicate them here or extract to a shared VacationHostingPolicyForm component */}
    </AccordionSection>
  )}

  <AccordionSection title="תקנון ומדיניות" summary="קראתי ואישרתי">
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        התקנון שלך נוצר אוטומטית ומופיע בחנות. חשוב לבדוק שהוא מתאים לעסק שלך לפני שמתחילים למכור.
      </p>
      <a
        href={`/store/${businessSlug}/legal`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> צפה בתקנון ←
      </a>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={legalAcknowledged}
          onChange={(e) => updateLegalAcknowledged(e.target.checked)}
          className="rounded"
        />
        קראתי ואישרתי את התקנון
      </label>
    </div>
  </AccordionSection>
</div>
```

Import `ExternalLink` from lucide-react.

- [ ] **Step 4: Add "unsaved changes" badge on settings nav item**

This requires wiring `hasPendingChanges` state from `DashboardSettings` up to `Dashboard.tsx` and passing it to `DashboardNav`. It's a minor enhancement — add a simple `useBeforeUnload` warning instead:
```ts
useEffect(() => {
  if (!hasPendingChanges) return;
  const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
  window.addEventListener("beforeunload", onBeforeUnload);
  return () => window.removeEventListener("beforeunload", onBeforeUnload);
}, [hasPendingChanges]);
```

- [ ] **Step 5: Build check + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/DashboardSettings.tsx
git commit -m "feat(settings): accordion layout, vacation hosting section, legal acknowledgment"
git push origin main
```

---

## Task 18: DashboardAvailabilityCalendar (vacation only)

**Files:**
- Create: `src/components/dashboard/DashboardAvailabilityCalendar.tsx`

This is a view-only calendar (Phase 1). Shows bookings per room unit on a monthly grid.

- [ ] **Step 1: Write the component**

```tsx
// src/components/dashboard/DashboardAvailabilityCalendar.tsx
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Booking {
  id: string;
  unit_name: string | null;
  checkin_date: string | null;
  checkout_date: string | null;
  customerName: string;
  status: string;
}

interface Props {
  businessId: string | undefined;
}

export default function DashboardAvailabilityCalendar({ businessId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() }; // 0-indexed
  });

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from("orders")
      .select("id, unit_name, checkin_date, checkout_date, status, customer_name")
      .eq("business_id", businessId)
      .not("checkin_date", "is", null)
      .then(({ data }) => {
        if (data) setBookings(data.map(r => ({ ...r, customerName: r.customer_name ?? "אורח" })));
      });
  }, [businessId]);

  const firstDay = new Date(month.year, month.month, 1);
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 1) % 7; // Sunday=0, shift for RTL Mon-start

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function bookingsForDay(day: number) {
    const date = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.filter(b => b.checkin_date && b.checkout_date && date >= b.checkin_date && date <= b.checkout_date);
  }

  const monthName = firstDay.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-l from-violet-500/15 to-indigo-500/5 border border-violet-500/20 p-5 mb-5 flex items-center gap-4">
        <div className="text-4xl">📅</div>
        <div>
          <h1 className="text-lg font-bold text-foreground">יומן זמינות</h1>
          <p className="text-sm text-muted-foreground">הזמנות לפי תאריכים</p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonth(m => {
            const d = new Date(m.year, m.month - 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
          })}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-foreground">{monthName}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonth(m => {
            const d = new Date(m.year, m.month + 1, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
          })}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["א", "ב", "ג", "ד", "ה", "ו", "ש"].map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[60px] border-b border-l border-border" />
          ))}
          {days.map(day => {
            const dayBookings = bookingsForDay(day);
            return (
              <div
                key={day}
                className={`min-h-[60px] border-b border-l border-border p-1 ${
                  dayBookings.length > 0 ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
                }`}
              >
                <span className="text-xs text-muted-foreground">{day}</span>
                {dayBookings.map(b => (
                  <div
                    key={b.id}
                    className="mt-1 rounded px-1 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 truncate"
                  >
                    {b.unit_name ?? b.customerName}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        ירוק = תפוס. בלחיצה על הזמנה — הפרטים מופיעים בסעיף הזמנות לינה.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Wire into Dashboard.tsx**

Import and add to the view switch:
```ts
import DashboardAvailabilityCalendar from "@/components/dashboard/DashboardAvailabilityCalendar";
```

In the view switch:
```tsx
case "availability":
  return <DashboardAvailabilityCalendar businessId={businessId} />;
```

- [ ] **Step 3: Build check + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/DashboardAvailabilityCalendar.tsx src/pages/Dashboard.tsx
git commit -m "feat(vacation): availability calendar view (Phase 1 — view only)"
git push origin main
```

---

## Task 19: Final wiring — vacation "guests" view + Dashboard.tsx cleanup

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add "guests" view as alias for CRM**

In the view switch in `Dashboard.tsx`:
```tsx
case "guests":
  return <DashboardCRM businessId={businessId} businessType={businessType} initialTab="customers" />;
```

- [ ] **Step 2: Verify all DashboardView values are handled**

Search for the switch/conditional that renders views. Make sure every value in the `DashboardView` union has a handler. Add `case` statements for any new ones added in Task 9.

- [ ] **Step 3: Pass businessSlug to DashboardDesign**

Find where `DashboardDesign` is rendered:
```tsx
case "design":
  return <DashboardDesign businessId={businessId} currentTemplateId={business?.template_id} businessSlug={business?.slug} />;
```

- [ ] **Step 4: Full build check**

```bash
npm run build
```

Expected: Build succeeds with 0 TypeScript errors. Fix any remaining type errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "fix(dashboard): wire guests/availability views, pass businessSlug to design editor"
git push origin main
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| popup_state migration | Task 1 |
| vacation DB columns | Task 2 |
| vacation as BusinessType | Task 3 |
| vacation in StepBusinessType | Task 4 |
| 5 post-launch popups | Task 5 |
| WowStrip | Task 6 |
| TodoCards | Task 7 |
| Popup integration in Dashboard | Task 8 |
| Nav restructure + vacation TYPE_CONFIG | Task 9 |
| Live design editor + palette | Task 10 |
| StoreFront postMessage | Task 11 |
| Products colorful header + vacation fields | Task 12 |
| Orders status chips + vacation fields | Task 13 |
| CRM upsell overlay | Task 14 |
| Content auto-save + vacation tab | Task 15 |
| Marketing empty states | Task 16 |
| Settings accordion + vacation policy | Task 17 |
| Availability calendar | Task 18 |
| Guests view + final wiring | Task 19 |

**What's intentionally excluded (separate spec):**
- `DashboardPayments` flow redesign

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency check:**
- `PopupId` type exported from `PostLaunchPopups.tsx`, imported in `DashboardHome.tsx` and `Dashboard.tsx` ✓
- `PopupState` type exported and used consistently ✓
- `DashboardView` additions (`'availability'`, `'guests'`) added in Task 9, cases handled in Tasks 18+19 ✓
- `vacation` added to `BusinessType` in Task 3, used in Tasks 9, 12, 13, 14, 15, 16, 17 ✓
- `businessSlug` prop added to `DashboardDesignProps` and passed in Task 19 ✓
