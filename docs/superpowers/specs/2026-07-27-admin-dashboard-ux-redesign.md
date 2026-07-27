# Admin Dashboard UX Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Siango admin dashboard from a passive data-viewer into an operational command center — organized by usage frequency, with full merchant management actions.

**Architecture:** Single-file refactor of `AdminDashboardContent.tsx` (nav structure + area IDs) + new `AdminMerchantProfile.tsx` component (merchant detail page). All existing panel components (`AdminMRR`, `AdminFunnel`, etc.) stay unchanged — only their grouping into areas changes.

**Tech Stack:** React + TypeScript, Tailwind, shadcn/ui, Supabase (existing client), lucide-react icons, RTL Hebrew.

---

## Core Design Principle

The current sidebar organizes by *what a thing is* (Merchants, Revenue, Payments…). The new sidebar organizes by *when you need it*:

- **Daily** (top 3): Home · Merchants · Payments
- **Weekly** (middle): Revenue · Growth & Market · Comms
- **Rarely** (bottom): Settings

---

## Part 1 — New Navigation Structure

Replace the 7 current `AREAS` in `AdminDashboardContent.tsx` with 7 new areas:

| # | id | Label | Icon | Tabs | Frequency |
|---|---|---|---|---|---|
| 1 | `home` | בוקר טוב | LayoutDashboard | סקירה · פעילות חיה | יומי |
| 2 | `merchants` | סוחרים | Users | כל הסוחרים · בסיכון/רדומים | יומי |
| 3 | `payments` | תשלומים | CreditCard | תשלומים · ביטולים · שגיאות | יומי |
| 4 | `revenue` | הכנסות | TrendingUp | MRR/ARR · פאנל · churn · cohort | שבועי |
| 5 | `growth` | גדילה ושוק | ChartBar | מובילים · קטגוריות · שוק · הפניות · שותפים · שיווק | חודשי |
| 6 | `comms` | תקשורת | MessageCircle | וואטסאפ · בוט · מיילים · הסרות | שבועי |
| 7 | `settings` | הגדרות | Settings | דומיינים · מייל עסקי · קופונים · מערכת | נדיר |

**Changes from current:**
- `control` → `home` (same content, new name)
- `merchants`: removes "חנויות" tab (duplicate of "כל הסוחרים"), removes "הזמנות" tab (moved to payments area), adds click-through to merchant profile
- `revenue`: drops marketplace/top performers/categories/analytics tabs → moved to `growth`
- `payments`: unchanged tabs, absorbs "הזמנות" from old merchants area
- `pricing` area deleted — its tabs split between `growth` (referrals, partners, marketing) and `settings` (domains, email, coupons)
- `comms`: unchanged
- `system` tab merged into `settings` area

**Sidebar visual:** Add a `<hr>` divider between payments (daily) and revenue (weekly) so the frequency grouping is visually clear.

---

## Part 2 — Home Screen (מרכז שליטה → בוקר טוב)

Replace `AdminCommandCenter` layout with Triage First pattern:

### 2a — Alert block (top, always visible)
- If alerts exist: show red/amber rows per severity, each clickable → modal with detail + action
- If no alerts: single green "הכל תקין — אין התראות פתוחות" row
- Alert types (red = critical, amber = warning):
  - 🔴 יתרת Openprovider נמוכה מ-$20
  - 🔴 רכישות דומיין שנכשלו (count)
  - 🔴 שגיאות תשלום של סוחרים (count) ← NEW
  - 🟠 ביטולים עתידיים (count)
  - 🟠 סוחרים שנרשמו לפני 5+ ימים ועדיין לא פרסמו (count) ← NEW

### 2b — Daily pulse (compact row of 6)
Keep same 6 metrics. Add ↑/↓/= delta vs yesterday next to each number. No large icons — just number + label + delta. Use a tight single-row grid, not tall cards.

### 2c — Headline KPIs (5 cards, unchanged content)
MRR · ARR · מנויים פעילים · חנויות פעילות · סה"כ משתמשים

### 2d — Activity feed
Move `AdminActivityFeed` to bottom of home screen (currently hidden inside a separate tab). Always visible on the home screen.

---

## Part 3 — Merchant Profile Page

New component: `src/components/admin/AdminMerchantProfile.tsx`

Triggered when user clicks a row in `AdminCustomers` or `AdminDormant`. Rendered as a new view inside the merchants area (not a modal — replaces the tab content, with a back button).

### 3a — Header
- Avatar (initials), business name, status pill (פעיל/לא פעיל), plan pill, business-type pill
- URL: `siango.app/<slug>` · registration date · last login

### 3b — Action bar (always visible below header)
Buttons: שלח מייל · ערוך אתר · פתח אתר · שנה מסלול · הוסף הערה · מחק אתר (red, requires confirmation dialog)

### 3c — Tabs
**סקירה** (default):
- 4 stat cards: הזמנות סה"כ · מחזור כולל · לקוחות · המרה
- Two-column: פעילות אחרונה (last 5 events) + פרטי חשבון (email, phone, plan, next renewal) with inline "ערוך" links

**לוג פעילות:**
- Chronological list of all events for this merchant fetched from relevant tables: orders created, customers added, logins, product updates, payment events, emails sent
- Each row: colored dot (green=order, blue=customer/login, amber=edit, red=error) + description + timestamp

**הגדרות אתר:**
- Two-column: "הגדרות אתר" (name, slug, city, public phone — each with inline edit) + "מודולים פעילים" (list of enabled_modules with toggle per module)
- Slug edit shows warning: "שינוי ה-slug ישבור קישורים קיימים"

**הערות פנימיות:**
- List of admin notes (stored in new `admin_notes` table: id, business_id, author_email, content, created_at)
- Textarea + "שמור הערה" button at bottom

### 3d — Actions implementation
- **שלח מייל**: opens a small modal with `to` (pre-filled), `subject`, `body` → calls Resend via existing email edge function
- **שנה מסלול**: modal with plan selector (Free / Pro / custom) → updates `subscriptions` table
- **מחק אתר**: confirmation dialog "האתר יימחק לצמיתות. אין דרך חזרה." → calls edge function or direct Supabase delete with cascade
- **ערוך אתר**: inline edits save directly to `businesses` table
- **פתח אתר**: `window.open('https://siango.app/' + slug)`

---

## Part 4 — DB: admin_notes table

New migration needed:

```sql
create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  author_email text not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_notes enable row level security;
create policy "Service role only" on public.admin_notes
  using (false) with check (false);
```

Notes are read/written server-side via the Supabase service role (admin dashboard already uses service role via `useIsAdmin`).

---

## Files Changed

| File | Action |
|---|---|
| `src/components/admin/AdminDashboardContent.tsx` | Modify: new AREAS array, sidebar divider, merchant profile routing |
| `src/components/admin/AdminCommandCenter.tsx` | Modify: Triage First layout, delta on pulse cards, new alert types |
| `src/components/admin/AdminMerchantProfile.tsx` | Create: full merchant profile component |
| `src/components/admin/AdminCustomers.tsx` | Modify: add clickable rows → `onSelectMerchant(businessId)` callback |
| `src/components/admin/AdminDormant.tsx` | Modify: add clickable rows → same callback |
| `supabase/migrations/20260727000000_admin_notes.sql` | Create: admin_notes table |

---

## Out of Scope

- Revenue, Comms, Payments screens: content unchanged, only regrouped into new areas
- AdminStatsCards: unchanged
- Mobile layout: sidebar stays collapsed-icon mode on mobile, no change
- Merchant deletion: cascades via DB foreign keys — no custom edge function needed unless additional cleanup is required (TBD with Moti)
