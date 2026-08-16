# Admin Dashboard UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Siango admin dashboard with a Triage-First home screen, reorganised 7-area sidebar, and a full merchant profile page with operational actions.

**Architecture:** Four focused changes: (1) extend `useCommandCenter` hook with two new alert types + yesterday deltas, (2) rewrite `AdminCommandCenter` layout to Triage-First, (3) restructure `AREAS` array in `AdminDashboardContent` + add merchant-profile routing, (4) new `AdminMerchantProfile` component. No new edge functions required — all reads/writes use the existing Supabase client with admin RLS. Admin notes already exist as `profiles.admin_notes` (text column) — no new DB table needed.

**Tech Stack:** React + TypeScript, Tailwind, shadcn/ui, @tanstack/react-query, lucide-react, date-fns, Supabase JS client, RTL Hebrew.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/hooks/useCommandCenter.ts` | Modify | Add `paymentErrors` + `unpublishedAfter5Days` alerts; add yesterday deltas to `today` |
| `src/components/admin/AdminCommandCenter.tsx` | Modify | Triage-First layout: alerts → compact pulse with deltas → KPIs → feed |
| `src/components/admin/AdminDashboardContent.tsx` | Modify | New 7-area AREAS array; sidebar divider; `selectedMerchantId` state; merchant profile routing |
| `src/components/admin/AdminMerchantProfile.tsx` | Create | Full merchant profile: header, action bar, 4 tabs (overview, log, site, notes) |
| `src/components/admin/AdminCustomers.tsx` | Modify | Add `onSelectMerchant?: (businessId: string) => void` prop; make rows clickable |
| `src/components/admin/AdminDormant.tsx` | Modify | Add `onSelectMerchant?: (businessId: string) => void` prop; make rows clickable |

---

## Task 1: Extend useCommandCenter with new alerts + yesterday deltas

**Files:**
- Modify: `src/hooks/useCommandCenter.ts`

### Context
`useCommandCenter` runs `Promise.allSettled` over parallel Supabase queries and returns `{ today, kpis, alerts }`. We need to:
1. Add `paymentErrors` count — businesses with `payment_status = 'failed'` in `subscriptions` or charge errors. Use `billing_charges` table with `status = 'failed'` (already queried by `BillingChargesPanel`).
2. Add `unpublishedAfter5Days` count — businesses created ≥5 days ago where `is_published = false`.
3. Add `yesterday` object with same 6 metrics as `today` so the UI can compute ↑/↓.

- [ ] **Step 1: Update the `CommandCenterData` interface**

In `src/hooks/useCommandCenter.ts`, replace the interface:

```typescript
export interface CommandCenterData {
  today: {
    signups: number;
    published: number;
    newSubscribers: number;
    orders: number;
    gmv: number;
    newDomains: number;
  };
  yesterday: {
    signups: number;
    published: number;
    newSubscribers: number;
    orders: number;
    gmv: number;
    newDomains: number;
  };
  kpis: {
    mrr: number;
    arr: number;
    activeStores: number;
    totalUsers: number;
    activeSubscribers: number;
  };
  alerts: {
    lowDomainBalance: { balance: number; currency: string } | null;
    failedDomainOrders: number;
    pendingCancellations: number;
    paymentErrors: number;
    unpublishedAfter5Days: number;
  };
}
```

- [ ] **Step 2: Add helper date ranges**

After the existing `startOfToday` function, add:

```typescript
const startOfYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfYesterday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const fiveDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  return d.toISOString();
};
```

- [ ] **Step 3: Add the new parallel queries**

In the `queryFn`, extend the `Promise.allSettled` array. Replace the existing destructure + allSettled call with:

```typescript
const today = startOfToday();
const yStart = startOfYesterday();
const yEnd = endOfYesterday();
const fiveAgo = fiveDaysAgo();
const nowIso = new Date().toISOString();

const [
  signups, published, newSubscribers, newDomains,
  ordersToday, subs, activeStores, totalUsers,
  balanceRow, failedDomainOrders, pendingCancellations,
  // new:
  ySignups, yPublished, yNewSubscribers, yNewDomains,
  ordersYesterday, paymentErrors, unpublishedAfter5Days,
] = await Promise.allSettled([
  // existing 11
  countSince("profiles", "created_at", today),
  countSince("businesses", "updated_at", today, (q) => q.eq("is_published", true)),
  countSince("subscriptions", "created_at", today),
  countSince("domains", "created_at", today),
  (supabase as any).from("orders").select("total_price").gte("created_at", today),
  (supabase as any).from("subscriptions").select("monthly_total, paid_until, status"),
  (supabase as any).from("businesses").select("*", { count: "exact", head: true }).eq("is_published", true),
  (supabase as any).from("profiles").select("*", { count: "exact", head: true }),
  (supabase as any).from("domain_provider_status").select("balance, currency").eq("provider", "openprovider").maybeSingle(),
  (supabase as any).from("domain_orders").select("*", { count: "exact", head: true }).in("status", ["failed", "failed_funds"]),
  (supabase as any).from("subscriptions").select("*", { count: "exact", head: true }).not("cancel_at", "is", null).gt("cancel_at", nowIso),
  // new — yesterday
  countSince("profiles", "created_at", yStart, (q) => q.lt("created_at", yEnd)),
  countSince("businesses", "updated_at", yStart, (q) => q.eq("is_published", true).lt("updated_at", yEnd)),
  countSince("subscriptions", "created_at", yStart, (q) => q.lt("created_at", yEnd)),
  countSince("domains", "created_at", yStart, (q) => q.lt("created_at", yEnd)),
  (supabase as any).from("orders").select("total_price").gte("created_at", yStart).lt("created_at", yEnd),
  // payment errors: billing_charges with status='failed'
  (supabase as any).from("billing_charges").select("*", { count: "exact", head: true }).eq("status", "failed"),
  // unpublished after 5 days
  (supabase as any).from("businesses").select("*", { count: "exact", head: true }).eq("is_published", false).lt("created_at", fiveAgo),
]);
```

- [ ] **Step 4: Update the return value**

```typescript
const yOrdersRows = (val(ordersYesterday as any, { data: [] }).data || []) as Array<{ total_price: number | null }>;

return {
  today: {
    signups: val(signups as any, 0),
    published: val(published as any, 0),
    newSubscribers: val(newSubscribers as any, 0),
    orders: ordersRows.length,
    gmv: ordersRows.reduce((s, o) => s + (Number(o.total_price) || 0), 0),
    newDomains: val(newDomains as any, 0),
  },
  yesterday: {
    signups: val(ySignups as any, 0),
    published: val(yPublished as any, 0),
    newSubscribers: val(yNewSubscribers as any, 0),
    orders: yOrdersRows.length,
    gmv: yOrdersRows.reduce((s, o) => s + (Number(o.total_price) || 0), 0),
    newDomains: val(yNewDomains as any, 0),
  },
  kpis: {
    mrr,
    arr: mrr * 12,
    activeStores: val(activeStores as any, { count: 0 }).count || 0,
    totalUsers: val(totalUsers as any, { count: 0 }).count || 0,
    activeSubscribers: activeSubs.length,
  },
  alerts: {
    lowDomainBalance:
      balance && balance.balance != null && balance.balance < 20
        ? { balance: balance.balance, currency: balance.currency || "USD" }
        : null,
    failedDomainOrders: val(failedDomainOrders as any, { count: 0 }).count || 0,
    pendingCancellations: val(pendingCancellations as any, { count: 0 }).count || 0,
    paymentErrors: val(paymentErrors as any, { count: 0 }).count || 0,
    unpublishedAfter5Days: val(unpublishedAfter5Days as any, { count: 0 }).count || 0,
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCommandCenter.ts
git commit -m "feat(admin): extend command-center hook — yesterday deltas + payment-error + unpublished alerts"
```

---

## Task 2: Rewrite AdminCommandCenter with Triage-First layout

**Files:**
- Modify: `src/components/admin/AdminCommandCenter.tsx`

### Context
Current layout: alerts → pulse (6 big cards) → KPIs. New layout: alerts (with 2 new types, color-coded) → compact pulse row with ↑/↓ delta → KPIs (unchanged) → activity feed moved here from its own tab.

The existing `BalanceModal`, `FailedDomainsModal`, `CancellationsModal` components and their queries stay unchanged. We add two new modal-less alert types (payment errors → navigate to payments tab; unpublished → navigate to merchants tab) so the caller (`AdminDashboardContent`) needs an `onNavigate` prop.

- [ ] **Step 1: Add `onNavigate` prop to the component signature**

```typescript
const AdminCommandCenter = ({ onNavigate }: { onNavigate: (area: string) => void }) => {
```

- [ ] **Step 2: Extend the alerts array**

Replace the existing `alerts` array construction (around line 262–269 in current file) with:

```typescript
const alerts: {
  key: "balance" | "domains" | "cancellations" | "paymentErrors" | "unpublished";
  label: string;
  icon: typeof AlertTriangle;
  severity: "danger" | "warning";
  onClickOverride?: () => void;
}[] = [];

if (a?.lowDomainBalance)
  alerts.push({ key: "balance", label: `יתרת Openprovider נמוכה: ${a.lowDomainBalance.currency} ${a.lowDomainBalance.balance} — כדאי לטעון`, icon: Wallet, severity: "danger" });
if (a?.failedDomainOrders)
  alerts.push({ key: "domains", label: `${a.failedDomainOrders} רכישות דומיין נכשלו`, icon: AlertTriangle, severity: "danger" });
if (a?.paymentErrors)
  alerts.push({ key: "paymentErrors", label: `${a.paymentErrors} שגיאות תשלום של סוחרים`, icon: XCircle, severity: "danger", onClickOverride: () => onNavigate("payments") });
if (a?.pendingCancellations)
  alerts.push({ key: "cancellations", label: `${a.pendingCancellations} מנויים סימנו ביטול עתידי`, icon: XCircle, severity: "warning" });
if (a?.unpublishedAfter5Days)
  alerts.push({ key: "unpublished", label: `${a.unpublishedAfter5Days} סוחרים נרשמו לפני 5+ ימים ועדיין לא פרסמו`, icon: AlertTriangle, severity: "warning", onClickOverride: () => onNavigate("merchants") });
```

- [ ] **Step 3: Replace the alert rendering block**

Replace the current alert render (the `alerts.map` block) with severity-aware colors:

```tsx
{alerts.length > 0 ? (
  <div className="space-y-1.5">
    {alerts.map((al) => {
      const Icon = al.icon;
      const isDanger = al.severity === "danger";
      return (
        <button
          key={al.key}
          onClick={() => al.onClickOverride ? al.onClickOverride() : setActiveModal(al.key as any)}
          className={`w-full flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm transition-colors cursor-pointer text-right ${
            isDanger
              ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
              : "border-amber-400/40 bg-amber-50/60 text-amber-700 hover:bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{al.label}</span>
          <ChevronLeft className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      );
    })}
  </div>
) : (
  <div className="flex items-center gap-2.5 rounded-xl border border-green-400/40 bg-green-50/60 dark:bg-green-950/20 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
    <CheckCircle2 className="h-4 w-4 shrink-0" />
    <span>הכל תקין — אין התראות פתוחות</span>
  </div>
)}
```

Add `CheckCircle2` to the lucide imports at the top.

- [ ] **Step 4: Replace the pulse section with compact row + deltas**

A helper delta function at the top of the component body:

```typescript
const delta = (today: number, yesterday: number): React.ReactNode => {
  if (yesterday === 0 && today === 0) return <span className="text-muted-foreground">= אתמול</span>;
  if (yesterday === 0) return <span className="text-green-600">↑ מאתמול</span>;
  const diff = today - yesterday;
  if (diff === 0) return <span className="text-muted-foreground">= אתמול</span>;
  return diff > 0
    ? <span className="text-green-600">↑{diff} מאתמול</span>
    : <span className="text-destructive">↓{Math.abs(diff)} מאתמול</span>;
};
```

Replace the existing pulse grid with a compact 6-column row:

```tsx
<div>
  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
    <Activity className="h-4 w-4 text-primary" /> דופק היום
  </h3>
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
    {[
      { label: "נרשמו", today: t?.signups, yest: data?.yesterday.signups },
      { label: "פורסמו", today: t?.published, yest: data?.yesterday.published },
      { label: "מנויים חדשים", today: t?.newSubscribers, yest: data?.yesterday.newSubscribers },
      { label: "הזמנות", today: t?.orders, yest: data?.yesterday.orders },
      { label: "מחזור חנויות", today: t ? ils(t.gmv) : undefined, yest: undefined },
      { label: "דומיינים", today: t?.newDomains, yest: data?.yesterday.newDomains },
    ].map((p, i) => (
      <div key={i} className="rounded-xl border border-border bg-card px-3 py-2.5">
        <div className="text-xl font-bold text-foreground leading-none">
          {isLoading || p.today === undefined ? "…" : p.today}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{p.label}</div>
        {p.yest !== undefined && !isLoading && p.today !== undefined && (
          <div className="text-xs mt-1">{delta(p.today as number, p.yest)}</div>
        )}
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 5: Move AdminActivityFeed to bottom of AdminCommandCenter**

Add import at top:

```typescript
import AdminActivityFeed from "./AdminActivityFeed";
```

Add at the bottom of the return, after the KPIs section:

```tsx
<div>
  <h3 className="text-sm font-semibold text-muted-foreground mb-2">פעילות אחרונה</h3>
  <AdminActivityFeed />
</div>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminCommandCenter.tsx
git commit -m "feat(admin): triage-first home — severity alerts, compact pulse with deltas, inline activity feed"
```

---

## Task 3: Restructure sidebar areas in AdminDashboardContent

**Files:**
- Modify: `src/components/admin/AdminDashboardContent.tsx`

### Context
Replace the 7 `AREAS` with the new 7-area structure. Add a sidebar divider between daily (home/merchants/payments) and weekly (revenue/growth/comms) groups. Add `selectedMerchantId` state for profile routing. Remove the "פעילות חיה" tab from home (now in AdminCommandCenter). Pass `onNavigate` to `AdminCommandCenter`.

- [ ] **Step 1: Add new imports**

Add to existing lucide-react imports: `BarChart3` (for growth area icon). Also import the new `AdminMerchantProfile` (created in Task 4 — add the import now, the file will exist after Task 4):

```typescript
import AdminMerchantProfile from "./AdminMerchantProfile";
```

- [ ] **Step 2: Replace the AREAS array**

Replace the entire `AREAS` constant with:

```typescript
const AREAS: Area[] = [
  {
    id: "home", label: "בוקר טוב", icon: LayoutDashboard, tabs: [
      { key: "overview", label: "סקירה", render: ({ stats, statsLoading, onNavigate }) =>
          <OverviewPanel stats={stats} statsLoading={statsLoading} onNavigate={onNavigate} /> },
    ],
  },
  {
    id: "merchants", label: "סוחרים", icon: Users, tabs: [
      { key: "customers", label: "כל הסוחרים", render: ({ onSelectMerchant }) =>
          <AdminCustomers onSelectMerchant={onSelectMerchant} /> },
      { key: "dormant", label: "בסיכון ורדומים", render: ({ onSelectMerchant }) =>
          <AdminDormant onSelectMerchant={onSelectMerchant} /> },
    ],
  },
  {
    id: "payments", label: "תשלומים", icon: CreditCard, tabs: [
      { key: "payments", label: "תשלומים", render: () => <AdminPayments /> },
      { key: "cancellations", label: "ביטולים", render: () => <AdminCancellations /> },
      { key: "payment-errors", label: "שגיאות תשלום", render: () => <AdminPaymentErrors /> },
      { key: "orders", label: "הזמנות", render: () => <AdminOrdersList /> },
    ],
  },
  {
    id: "revenue", label: "הכנסות", icon: TrendingUp, tabs: [
      { key: "mrr", label: "MRR / ARR", render: () => <AdminMRR /> },
      { key: "funnel", label: "מסלול הרשמה", render: () => <AdminFunnel /> },
      { key: "churn", label: "נטישת מנויים", render: () => <AdminChurnRate /> },
      { key: "cohort", label: "שימור לאורך זמן", render: () => <AdminCohortRetention /> },
    ],
  },
  {
    id: "growth", label: "גדילה ושוק", icon: BarChart3, tabs: [
      { key: "top", label: "הסוחרים המובילים", render: () => <AdminTopPerformers /> },
      { key: "categories", label: "קטגוריות", render: () => <AdminCategoryMap /> },
      { key: "marketplace", label: "תמונת שוק", render: () => <AdminMarketplace /> },
      { key: "analytics", label: "צפיות וביקורים", render: () => <AdminAnalytics /> },
      { key: "referrals", label: "הפניות", render: () => <AdminReferrals /> },
      { key: "partners", label: "רווחי שותפים", render: () => <AdminPartnerEarnings /> },
      { key: "marketing", label: "פרסום ושיווק", render: () => <AdminMarketing /> },
    ],
  },
  {
    id: "comms", label: "תקשורת", icon: MessageCircle, tabs: [
      { key: "whatsapp", label: "וואטסאפ", render: () => <AdminWhatsApp /> },
      { key: "whatsapp-bot", label: "הבוט שלנו", render: () => <AdminWhatsAppBot /> },
      { key: "email-log", label: "יומן מיילים", render: () => <AdminEmailLog /> },
      { key: "unsubscribes", label: "רשימת הסרות", render: () => <AdminUnsubscribes /> },
    ],
  },
  {
    id: "settings", label: "הגדרות", icon: Settings, tabs: [
      { key: "domains", label: "דומיינים", render: () => <AdminDomainSettings /> },
      { key: "email-pricing", label: "מייל עסקי", render: () => <AdminEmailSettings /> },
      { key: "coupons", label: "קופוני מנוי", render: () => <AdminSubscriptionCoupons /> },
      { key: "system", label: "מערכת", render: () => <AdminSystem /> },
    ],
  },
];
```

- [ ] **Step 3: Update the Tab interface to accept extra render props**

Replace:
```typescript
interface Tab { key: string; label: string; render: (ctx: { stats: any; statsLoading: boolean }) => JSX.Element; }
```
With:
```typescript
interface Tab {
  key: string;
  label: string;
  render: (ctx: {
    stats: any;
    statsLoading: boolean;
    onNavigate: (areaId: string) => void;
    onSelectMerchant: (businessId: string) => void;
  }) => JSX.Element;
}
```

- [ ] **Step 4: Update OverviewPanel to accept + forward onNavigate**

```typescript
function OverviewPanel({ stats, statsLoading, onNavigate }: {
  stats: any;
  statsLoading: boolean;
  onNavigate: (areaId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <AdminCommandCenter onNavigate={onNavigate} />
      <AdminStatsCards stats={stats} isLoading={statsLoading} />
    </div>
  );
}
```

(The AdminActivityFeed is now inside AdminCommandCenter itself — remove the two-column layout.)

- [ ] **Step 5: Add selectedMerchantId state + routing logic**

In `AdminDashboardContent`, add state:

```typescript
const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
```

- [ ] **Step 6: Add sidebar visual divider between daily and weekly groups**

In the `Sidebar` component's `nav`, after rendering the first 3 items (home, merchants, payments) and before the 4th (revenue), insert a divider:

```tsx
{AREAS.map((area, idx) => {
  const Icon = area.icon;
  const active = currentArea === area.id;
  return (
    <React.Fragment key={area.id}>
      {idx === 3 && (
        <div className={cn("my-1 border-t border-border", collapsed ? "mx-1" : "mx-2")} />
      )}
      {idx === 6 && (
        <div className={cn("my-1 border-t border-border", collapsed ? "mx-1" : "mx-2")} />
      )}
      <button
        onClick={() => onChange(area.id)}
        title={collapsed ? area.label : undefined}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors text-right",
          active ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{area.label}</span>}
      </button>
    </React.Fragment>
  );
})}
```

Add `import React from "react"` if not already present (check — if using `import { useState }` style, add `React` as default import or use `<>` fragments).

- [ ] **Step 7: Render merchant profile when selectedMerchantId is set**

In the `main` element, before the current tab content:

```tsx
{selectedMerchantId && areaId === "merchants" ? (
  <AdminMerchantProfile
    businessId={selectedMerchantId}
    onBack={() => setSelectedMerchantId(null)}
  />
) : (
  <>
    {/* existing topbar + tabs + content */}
  </>
)}
```

- [ ] **Step 8: Thread props into tab renders**

In the `tab.render(...)` call:

```typescript
{tab.render({ stats, statsLoading, onNavigate: selectArea, onSelectMerchant: (id) => { setSelectedMerchantId(id); } })}
```

- [ ] **Step 9: Add BarChart3 to lucide imports**

```typescript
import {
  LayoutDashboard, Users, CreditCard, TrendingUp, BarChart3,
  MessageCircle, Settings, ChevronRight, Menu,
} from "lucide-react";
```

Remove `Handshake` (no longer used).

- [ ] **Step 10: Commit**

```bash
git add src/components/admin/AdminDashboardContent.tsx
git commit -m "feat(admin): restructure sidebar — 7 areas by frequency, merchant profile routing, sidebar dividers"
```

---

## Task 4: Create AdminMerchantProfile component

**Files:**
- Create: `src/components/admin/AdminMerchantProfile.tsx`

### Context
Full-page merchant profile. Receives `businessId` (the `businesses.id` UUID). Fetches:
- `businesses` row: name, slug, business_category, is_published, enabled_modules, phone, email, address, created_at, primary_color
- Joined `profiles` row (via `profiles.id = businesses.profile_id` or via user join): full_name, email, phone, created_at (registered_at), admin_notes
- `subscriptions` row for this business's owner: plan, status, paid_until, cancel_at
- Recent `orders` (last 20): id, created_at, total_price, status
- Recent `customers` count

Admin notes use `profiles.admin_notes` (existing text column) — same as `AdminCustomers`.

- [ ] **Step 1: Create the file with imports and data hook**

```typescript
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  ArrowRight, Mail, ExternalLink, CreditCard, StickyNote, Trash2,
  Edit3, Globe, ToggleLeft, ToggleRight, Loader2, ChevronLeft,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface MerchantProfileData {
  businessId: string;
  businessName: string;
  slug: string | null;
  businessCategory: string | null;
  isPublished: boolean;
  enabledModules: Record<string, boolean>;
  businessPhone: string | null;
  businessEmail: string | null;
  businessCreatedAt: string;
  profileId: string | null;
  userId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerRegisteredAt: string | null;
  adminNotes: string;
  plan: string | null;
  subscriptionStatus: string | null;
  paidUntil: string | null;
  cancelAt: string | null;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  recentOrders: Array<{ id: string; created_at: string; total_price: number | null; status: string | null }>;
  recentActivity: Array<{ dot: string; text: string; time: string }>;
}

function useMerchantProfile(businessId: string) {
  return useQuery<MerchantProfileData>({
    queryKey: ["merchant-profile", businessId],
    queryFn: async () => {
      const [bizRes, ordersRes, customersRes] = await Promise.all([
        (supabase as any)
          .from("businesses")
          .select(`
            id, name, slug, business_category, is_published,
            enabled_modules, phone, email, created_at,
            profiles ( id, user_id, full_name, email, phone, created_at, admin_notes )
          `)
          .eq("id", businessId)
          .maybeSingle(),
        (supabase as any)
          .from("orders")
          .select("id, created_at, total_price, status")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase as any)
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId),
      ]);

      const biz = bizRes.data;
      if (!biz) throw new Error("Business not found");

      const profile = Array.isArray(biz.profiles) ? biz.profiles[0] : biz.profiles;
      const orders = (ordersRes.data || []) as Array<{ id: string; created_at: string; total_price: number | null; status: string | null }>;

      // Fetch subscription separately (by user_id)
      let sub: any = null;
      if (profile?.user_id) {
        const { data } = await (supabase as any)
          .from("subscriptions")
          .select("plan, status, paid_until, cancel_at, monthly_total")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        sub = data;
      }

      const totalRevenue = orders.reduce((s, o) => s + (Number(o.total_price) || 0), 0);

      // Build recent activity from orders
      const recentActivity = orders.slice(0, 5).map(o => ({
        dot: "green",
        text: `הזמנה #${o.id.slice(0, 8)} — ₪${Math.round(Number(o.total_price) || 0)}`,
        time: format(new Date(o.created_at), "dd/MM HH:mm", { locale: he }),
      }));

      return {
        businessId: biz.id,
        businessName: biz.name,
        slug: biz.slug,
        businessCategory: biz.business_category,
        isPublished: biz.is_published ?? false,
        enabledModules: (biz.enabled_modules as Record<string, boolean>) || {},
        businessPhone: biz.phone,
        businessEmail: biz.email,
        businessCreatedAt: biz.created_at,
        profileId: profile?.id ?? null,
        userId: profile?.user_id ?? null,
        ownerName: profile?.full_name ?? null,
        ownerEmail: profile?.email ?? null,
        ownerPhone: profile?.phone ?? null,
        ownerRegisteredAt: profile?.created_at ?? null,
        adminNotes: (profile?.admin_notes as string) ?? "",
        plan: sub?.plan ?? null,
        subscriptionStatus: sub?.status ?? null,
        paidUntil: sub?.paid_until ?? null,
        cancelAt: sub?.cancel_at ?? null,
        totalOrders: orders.length,
        totalRevenue,
        totalCustomers: customersRes.count || 0,
        recentOrders: orders,
        recentActivity,
      };
    },
  });
}
```

- [ ] **Step 2: Write the component shell with tabs**

```typescript
type Tab = "overview" | "log" | "site" | "notes";

const AdminMerchantProfile = ({
  businessId,
  onBack,
}: {
  businessId: string;
  onBack: () => void;
}) => {
  const { data, isLoading, error } = useMerchantProfile(businessId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [notes, setNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync notes from fetched data once
  if (data && notes === null) setNotes(data.adminNotes);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !data) return (
    <div className="p-6 text-destructive">שגיאה בטעינת הפרופיל</div>
  );

  const initials = (data.businessName || "?").slice(0, 2).toUpperCase();

  // ... render (Steps 3-6)
};

export default AdminMerchantProfile;
```

- [ ] **Step 3: Render header + action bar**

Inside the component return:

```tsx
return (
  <div className="flex flex-col h-full" dir="rtl">
    {/* Back bar */}
    <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card text-sm">
      <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowRight className="h-4 w-4" /> סוחרים
      </button>
      <ChevronLeft className="h-3 w-3 text-muted-foreground" />
      <span className="text-foreground font-medium">{data.businessName}</span>
    </div>

    {/* Merchant header */}
    <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-bold text-lg">{data.businessName}</h2>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
            {data.isPublished ? "פעיל" : "לא פורסם"}
          </span>
          {data.plan && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{data.plan}</span>
          )}
          {data.businessCategory && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">{data.businessCategory}</span>
          )}
        </div>
        {data.slug && (
          <p className="text-xs text-muted-foreground mt-1">
            siango.app/{data.slug} · נרשם {data.businessCreatedAt ? format(new Date(data.businessCreatedAt), "dd.MM.yyyy", { locale: he }) : "—"}
          </p>
        )}
      </div>
    </div>

    {/* Action bar */}
    <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border bg-card flex-wrap">
      {data.ownerEmail && (
        <a href={`mailto:${data.ownerEmail}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-primary">
          <Mail className="h-3.5 w-3.5" /> שלח מייל
        </a>
      )}
      {data.slug && (
        <a href={`https://siango.app/${data.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors">
          <Globe className="h-3.5 w-3.5" /> פתח אתר
        </a>
      )}
      <button
        onClick={() => { setActiveTab("notes"); }}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
      >
        <StickyNote className="h-3.5 w-3.5" /> הוסף הערה
      </button>
      <button
        onClick={() => setDeleteDialogOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors mr-auto"
      >
        <Trash2 className="h-3.5 w-3.5" /> מחק אתר
      </button>
    </div>

    {/* Tabs */}
    <div className="flex gap-1 px-6 py-0 border-b border-border bg-background">
      {(["overview","log","site","notes"] as Tab[]).map(t => {
        const labels: Record<Tab, string> = { overview: "סקירה", log: "לוג פעילות", site: "הגדרות אתר", notes: "הערות פנימיות" };
        return (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${activeTab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {labels[t]}
          </button>
        );
      })}
    </div>

    {/* Tab content */}
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "log" && <LogTab data={data} />}
      {activeTab === "site" && <SiteTab data={data} businessId={businessId} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["merchant-profile", businessId] })} />}
      {activeTab === "notes" && <NotesTab profileId={data.profileId} notes={notes ?? ""} setNotes={setNotes} savingNotes={savingNotes} setSavingNotes={setSavingNotes} />}
    </div>

    {/* Delete dialog */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>מחיקת אתר — {data.businessName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">האתר, המוצרים, ההזמנות, והלקוחות שלו יימחקו לצמיתות. אין דרך חזרה.</p>
        <DialogFooter className="flex gap-2 justify-start">
          <Button variant="destructive" disabled={deleting} onClick={async () => {
            setDeleting(true);
            const { error } = await (supabase as any).from("businesses").delete().eq("id", businessId);
            setDeleting(false);
            if (error) { toast.error("שגיאה במחיקה: " + error.message); return; }
            toast.success("האתר נמחק");
            setDeleteDialogOpen(false);
            onBack();
          }}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
            מחק לצמיתות
          </Button>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
```

- [ ] **Step 4: Write OverviewTab sub-component**

Define before `AdminMerchantProfile`:

```typescript
function OverviewTab({ data }: { data: MerchantProfileData }) {
  const ils = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "הזמנות סה\"כ", value: data.totalOrders },
          { label: "מחזור כולל", value: ils(data.totalRevenue) },
          { label: "לקוחות", value: data.totalCustomers },
          { label: "סטטוס מנוי", value: data.subscriptionStatus === "active" ? "פעיל" : data.subscriptionStatus || "—" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">פעילות אחרונה</div>
          {data.recentActivity.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">אין פעילות עדיין</p>
          ) : data.recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <div className={`w-1.5 h-1.5 rounded-full bg-green-500 shrink-0`} />
              <span className="flex-1 text-muted-foreground">{a.text}</span>
              <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
            </div>
          ))}
        </div>

        {/* Account details */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">פרטי חשבון</div>
          {[
            { label: "שם בעלים", value: data.ownerName || "—" },
            { label: "מייל", value: data.ownerEmail || "—" },
            { label: "טלפון", value: data.ownerPhone || "—" },
            { label: "מסלול", value: data.plan || "ללא מנוי" },
            { label: "חידוש הבא", value: data.paidUntil ? format(new Date(data.paidUntil), "dd.MM.yyyy", { locale: he }) : "—" },
          ].map(f => (
            <div key={f.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write LogTab sub-component**

```typescript
function LogTab({ data }: { data: MerchantProfileData }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">לוג הזמנות</div>
      {data.recentOrders.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">אין הזמנות עדיין</p>
      ) : data.recentOrders.map(o => (
        <div key={o.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 text-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="flex-1 text-muted-foreground">הזמנה #{o.id.slice(0, 8)}</span>
          <span className="font-medium">₪{Math.round(Number(o.total_price) || 0)}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {format(new Date(o.created_at), "dd/MM/yy HH:mm", { locale: he })}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write SiteTab sub-component**

```typescript
function SiteTab({ data, businessId, onRefresh }: {
  data: MerchantProfileData;
  businessId: string;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const knownModules: Array<{ key: string; label: string }> = [
    { key: "booking", label: "יומן תורים" },
    { key: "gallery", label: "גלריה" },
    { key: "crm_plus", label: "CRM+" },
    { key: "campaigns", label: "קמפיינים" },
    { key: "coupons", label: "קופונים" },
  ];

  const toggleModule = async (key: string, current: boolean) => {
    setSaving(true);
    const updated = { ...data.enabledModules, [key]: !current };
    const { error } = await (supabase as any)
      .from("businesses")
      .update({ enabled_modules: updated })
      .eq("id", businessId);
    setSaving(false);
    if (error) toast.error("שגיאה בעדכון מודול");
    else { toast.success("מודול עודכן"); onRefresh(); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">הגדרות אתר</div>
        {[
          { label: "שם עסק", value: data.businessName },
          { label: "slug", value: data.slug || "—" },
          { label: "קטגוריה", value: data.businessCategory || "—" },
          { label: "טלפון", value: data.businessPhone || "—" },
          { label: "מייל", value: data.businessEmail || "—" },
        ].map(f => (
          <div key={f.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-medium text-left" dir="ltr">{f.value}</span>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground flex items-center justify-between">
          מודולים פעילים
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
        {knownModules.map(m => {
          const active = !!data.enabledModules[m.key];
          return (
            <div key={m.key} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <span className="text-muted-foreground">{m.label}</span>
              <button
                onClick={() => toggleModule(m.key, active)}
                disabled={saving}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${active ? "text-green-600" : "text-muted-foreground"}`}
              >
                {active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                {active ? "פעיל" : "כבוי"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Write NotesTab sub-component**

```typescript
function NotesTab({ profileId, notes, setNotes, savingNotes, setSavingNotes }: {
  profileId: string | null;
  notes: string;
  setNotes: (v: string) => void;
  savingNotes: boolean;
  setSavingNotes: (v: boolean) => void;
}) {
  const save = async () => {
    if (!profileId) { toast.error("אין פרופיל — לא ניתן לשמור הערה"); return; }
    setSavingNotes(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ admin_notes: notes })
      .eq("id", profileId);
    setSavingNotes(false);
    if (error) toast.error("שגיאה בשמירת הערה: " + error.message);
    else toast.success("הערה נשמרה");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">הערות פנימיות — נראה רק למוטי ודניאל</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={6}
        placeholder="הוסף הערה..."
        dir="rtl"
        className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-y"
      />
      <Button size="sm" onClick={save} disabled={savingNotes}>
        {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : null}
        שמור הערה
      </Button>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/AdminMerchantProfile.tsx
git commit -m "feat(admin): AdminMerchantProfile — overview, log, site settings, notes, delete"
```

---

## Task 5: Wire AdminCustomers + AdminDormant to emit merchant selection

**Files:**
- Modify: `src/components/admin/AdminCustomers.tsx`
- Modify: `src/components/admin/AdminDormant.tsx`

### Context
`AdminCustomers` renders `MerchantCard` components. Each card has a `businesses` array. We need clicking on a business (StoreBadge) or the card header to call `onSelectMerchant(businessId)`. In `AdminDormant`, each row has a `biz.id` — clicking anywhere on the row calls `onSelectMerchant(biz.id)`.

- [ ] **Step 1: Add prop to AdminCustomers**

In `AdminCustomers`, change the component signature:

```typescript
const AdminCustomers = ({ onSelectMerchant }: { onSelectMerchant?: (businessId: string) => void }) => {
```

Pass it down to `MerchantCard`:

```typescript
<MerchantCard
  key={m.profile_id || m.email}
  m={m}
  onResetOnboarding={handleResetOnboarding}
  onDeleteUser={handleDeleteUser}
  onSelectMerchant={onSelectMerchant}
/>
```

- [ ] **Step 2: Add prop to MerchantCard**

Update MerchantCard signature:

```typescript
function MerchantCard({
  m,
  onResetOnboarding,
  onDeleteUser,
  onSelectMerchant,
}: {
  m: MerchantRow;
  onResetOnboarding: (profileId: string) => void;
  onDeleteUser: (userId: string, email: string | null) => void;
  onSelectMerchant?: (businessId: string) => void;
}) {
```

In `StoreBadge` inside MerchantCard's expanded section, add a clickable profile button per business:

```tsx
{m.businesses.map(b => (
  <div key={b.id} className="flex items-center gap-2">
    <StoreBadge b={b} />
    {onSelectMerchant && (
      <button
        onClick={e => { e.stopPropagation(); onSelectMerchant(b.id); }}
        className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
      >
        <Eye className="h-3.5 w-3.5" /> פרופיל
      </button>
    )}
  </div>
))}
```

- [ ] **Step 3: Add prop to AdminDormant**

Change `AdminDormant` signature:

```typescript
const AdminDormant = ({ onSelectMerchant }: { onSelectMerchant?: (businessId: string) => void }) => {
```

In the row div, add `onClick`:

```tsx
<div
  key={biz.id}
  onClick={() => onSelectMerchant?.(biz.id)}
  className={`flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 ${onSelectMerchant ? "cursor-pointer" : ""}`}
>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminCustomers.tsx src/components/admin/AdminDormant.tsx
git commit -m "feat(admin): make merchant rows clickable → opens full merchant profile"
```

---

## Task 6: Push and verify

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Verify in browser**

Open `siango.app/admin` (or localhost). Check:
1. Home screen shows green "הכל תקין" row OR alert rows with correct severity colors
2. Pulse row shows ↑/↓ deltas
3. Sidebar has dividers after "תשלומים" and before "הגדרות"
4. "סוחרים" → click "פרופיל" button → merchant profile opens with back button
5. "גדילה ושוק" contains top performers, categories, marketplace, analytics, referrals, partners, marketing
6. "הגדרות" contains domains, email, coupons, system
7. Delete button on merchant profile shows confirmation dialog before deleting

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(admin): post-deploy corrections"
git push origin main
```
