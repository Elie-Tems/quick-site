# Beauty/Spa Dashboard UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "today's appointments" widget to DashboardHome, a pending-count badge on the booking nav item, and a description field on booking services — making the dashboard feel native to a beauty/spa business owner.

**Architecture:** Three self-contained changes. TodayAppointmentsCard is a new component that reads from the existing `useAppointments` hook already fetched in Dashboard.tsx. Pending badge adds one prop to DashboardNav and one derived value in Dashboard.tsx. Description field adds a textarea to the existing BookingManager service form and passes the field through the existing upsertService mutation (the TypeScript type already includes `description`).

**Tech Stack:** React, TypeScript, TanStack Query, Supabase, Tailwind CSS, shadcn/ui, lucide-react

---

## File Map

| File | Change |
|---|---|
| `supabase/migrations/20260720120000_booking_service_description.sql` | Add `description` column to `booking_services` |
| `src/hooks/useBooking.ts` | Add `useTodayBookings` and `usePendingBookingsCount` hooks |
| `src/components/dashboard/TodayAppointmentsCard.tsx` | New component |
| `src/components/dashboard/DashboardHome.tsx` | Accept `todayAppointments`, `onConfirmAppointment`, `onCancelAppointment`, `hasBooking` props; render TodayAppointmentsCard at top |
| `src/components/dashboard/DashboardNav.tsx` | Accept `pendingBookingsCount?: number` prop; render badge on verticals item |
| `src/pages/Dashboard.tsx` | Derive `pendingBookingsCount` and `todayAppointments` from existing data; pass to DashboardHome and DashboardNav |
| `src/components/dashboard/booking/BookingManager.tsx` | Add `description` field to service form state and upsert call; show description in service list |

---

## Task 1: DB migration — description column on booking_services

**Files:**
- Create: `supabase/migrations/20260720120000_booking_service_description.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260720120000_booking_service_description.sql
ALTER TABLE booking_services
  ADD COLUMN IF NOT EXISTS description text;
```

- [ ] **Step 2: Apply the migration to production**

```bash
npx supabase@latest db push --project-ref ytqgeoviokgxxwalieev
```

Expected: `Applied 1 migration` (or `No migrations to apply` if the column already exists — both are fine).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260720120000_booking_service_description.sql
git commit -m "migration: add description to booking_services"
```

---

## Task 2: Add useTodayBookings and usePendingBookingsCount to useBooking.ts

**Files:**
- Modify: `src/hooks/useBooking.ts`

The existing `useAppointments` hook accepts `{ from?, to? }` options. We add two convenience wrappers that scope to today.

- [ ] **Step 1: Add the two hooks at the bottom of useBooking.ts, before the final export block**

Find the line with `export { ... }` or the last export in the file. Insert before it:

```ts
/** Appointments for today (Israel time). */
export function useTodayBookings(businessId?: string) {
  const todayISO = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" }); // "YYYY-MM-DD"
  return useAppointments(businessId, { from: todayISO, to: todayISO });
}

/** Count of appointments with status='pending' from today onwards. */
export function usePendingBookingsCount(businessId?: string) {
  const todayISO = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
  const { data: appointments = [] } = useAppointments(businessId, { from: todayISO });
  return appointments.filter((a) => a.status === "pending").length;
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing useBooking.ts.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBooking.ts
git commit -m "feat(booking): add useTodayBookings and usePendingBookingsCount hooks"
```

---

## Task 3: TodayAppointmentsCard component

**Files:**
- Create: `src/components/dashboard/TodayAppointmentsCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { CalendarDays, Check, X, Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/hooks/useBooking";

interface TodayAppointmentsCardProps {
  appointments: Appointment[];
  isLoading: boolean;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onNavigateToCalendar: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "מאושר",
  pending: "ממתין",
  completed: "הסתיים",
  cancelled: "בוטל",
  no_show: "לא הגיע",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
}

function todayDayName() {
  return new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    timeZone: "Asia/Jerusalem",
  });
}

export function TodayAppointmentsCard({
  appointments,
  isLoading,
  onConfirm,
  onCancel,
  onNavigateToCalendar,
}: TodayAppointmentsCardProps) {
  const active = appointments.filter((a) => a.status !== "cancelled");
  const pendingCount = active.filter((a) => a.status === "pending").length;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">היום, {todayDayName()}</span>
        </div>
        {!isLoading && active.length > 0 && (
          <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
            {active.length} תורים
            {pendingCount > 0 && (
              <span className="mr-1 text-amber-600">· {pendingCount} ממתין</span>
            )}
          </span>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="w-10 h-3 rounded" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-2.5 w-24 rounded" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <Palmtree className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">אין תורים היום — יום פנוי</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {active.map((appt) => {
            const isPending = appt.status === "pending";
            return (
              <div
                key={appt.id}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                  isPending ? "bg-amber-50/60 dark:bg-amber-950/20" : ""
                }`}
              >
                <span className="text-xs text-muted-foreground tabular-nums min-w-[36px]">
                  {formatTime(appt.starts_at)}
                </span>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                  {initials(appt.customer_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {appt.customer_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {Math.round(
                      (new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) /
                        60000
                    )}{" "}
                    דק'
                  </p>
                </div>
                {isPending ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                      onClick={() => onConfirm(appt.id)}
                    >
                      <Check className="w-3 h-3 ml-1" /> אשר
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => onCancel(appt.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      appt.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : appt.status === "completed"
                        ? "bg-muted text-muted-foreground"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                    }`}
                  >
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-border">
        <button
          onClick={onNavigateToCalendar}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          לכל היומן
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in TodayAppointmentsCard.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/TodayAppointmentsCard.tsx
git commit -m "feat(dashboard): add TodayAppointmentsCard component"
```

---

## Task 4: Wire TodayAppointmentsCard into DashboardHome

**Files:**
- Modify: `src/components/dashboard/DashboardHome.tsx`

- [ ] **Step 1: Add new props to DashboardHomeProps**

Find the `DashboardHomeProps` interface and add after the existing `onNavigate` line:

```ts
  hasBooking?: boolean;
  todayAppointments?: import("@/hooks/useBooking").Appointment[];
  todayAppointmentsLoading?: boolean;
  onConfirmAppointment?: (id: string) => void;
  onCancelAppointment?: (id: string) => void;
```

- [ ] **Step 2: Add import for TodayAppointmentsCard**

Add at the top of the imports:

```ts
import { TodayAppointmentsCard } from "./TodayAppointmentsCard";
```

- [ ] **Step 3: Destructure the new props in the function signature**

Find the line `export function DashboardHome({` and add the new props to the destructuring:

```ts
  hasBooking = false,
  todayAppointments = [],
  todayAppointmentsLoading = false,
  onConfirmAppointment,
  onCancelAppointment,
```

- [ ] **Step 4: Render TodayAppointmentsCard at the top of the return**

Find the opening `<div className="p-4 md:p-6 space-y-5">` and insert immediately after it (before the subscription banners):

```tsx
{hasBooking && (
  <TodayAppointmentsCard
    appointments={todayAppointments}
    isLoading={todayAppointmentsLoading}
    onConfirm={onConfirmAppointment ?? (() => {})}
    onCancel={onCancelAppointment ?? (() => {})}
    onNavigateToCalendar={() => onNavigate("verticals")}
  />
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in DashboardHome.tsx.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardHome.tsx
git commit -m "feat(dashboard): render TodayAppointmentsCard in DashboardHome"
```

---

## Task 5: Pending badge on DashboardNav

**Files:**
- Modify: `src/components/dashboard/DashboardNav.tsx`

- [ ] **Step 1: Add pendingBookingsCount to DashboardNavProps**

Find `interface DashboardNavProps` and add:

```ts
  pendingBookingsCount?: number;
```

- [ ] **Step 2: Destructure it in the component**

In the component function signature, add:

```ts
  pendingBookingsCount = 0,
```

- [ ] **Step 3: Render the badge on the verticals nav item**

The nav items are rendered with a label. Find where the item with view `'verticals'` renders its label text. This is inside the nav item render loop. Locate the section that renders the item label (something like `<span>{item.label}</span>`) and wrap the verticals item label:

```tsx
{item.view === "verticals" && pendingBookingsCount > 0 ? (
  <span className="flex items-center gap-2 flex-1 min-w-0">
    <span className="truncate">{item.label}</span>
    <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center px-1 leading-none">
      {pendingBookingsCount > 9 ? "9+" : pendingBookingsCount}
    </span>
  </span>
) : (
  <span className="truncate">{item.label}</span>
)}
```

Note: The exact location depends on whether desktop or mobile render paths — apply to both. The label render is typically something like `{item.label}` inside the nav button. Replace all occurrences of that pattern with the conditional above (both mobile and desktop paths).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in DashboardNav.tsx.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardNav.tsx
git commit -m "feat(nav): add pending bookings badge on calendar nav item"
```

---

## Task 6: Pass data from Dashboard.tsx to DashboardHome and DashboardNav

**Files:**
- Modify: `src/pages/Dashboard.tsx`

Dashboard.tsx already imports `useAppointments` and fetches appointments when `hasBookingModule` is true. We need to:
1. Also import `useTodayBookings` and `useUpdateAppointmentStatus`
2. Derive `todayAppointments`, `todayAppointmentsLoading`, `pendingBookingsCount`
3. Create confirm/cancel handlers
4. Pass everything down

- [ ] **Step 1: Add imports**

Find the existing import from `@/hooks/useBooking` and add:

```ts
import {
  // ...existing imports...
  useTodayBookings,
  useUpdateAppointmentStatus,
} from "@/hooks/useBooking";
```

- [ ] **Step 2: Add hooks and derived values after the existing useAppointments call**

Find the line with `useAppointments(hasBookingModule ? business?.id : undefined)` and add below it:

```ts
const { data: todayAppointments = [], isLoading: todayAppointmentsLoading } =
  useTodayBookings(hasBookingModule ? business?.id : undefined);

const pendingBookingsCount = todayAppointments.filter(
  (a) => a.status === "pending"
).length;

const updateAppointmentStatus = useUpdateAppointmentStatus();

const handleConfirmAppointment = (id: string) => {
  updateAppointmentStatus.mutate({ id, status: "confirmed" });
};

const handleCancelAppointment = (id: string) => {
  updateAppointmentStatus.mutate({ id, status: "cancelled" });
};
```

- [ ] **Step 3: Pass pendingBookingsCount to DashboardNav**

Find where `<DashboardNav` is rendered and add:

```tsx
pendingBookingsCount={pendingBookingsCount}
```

- [ ] **Step 4: Pass today's appointments to DashboardHome**

Find where `<DashboardHome` is rendered and add:

```tsx
hasBooking={hasBookingModule}
todayAppointments={todayAppointments}
todayAppointmentsLoading={todayAppointmentsLoading}
onConfirmAppointment={handleConfirmAppointment}
onCancelAppointment={handleCancelAppointment}
```

(`hasBookingModule` is already computed in Dashboard.tsx as a boolean from `getEnabledModules(business).includes("booking")`.)

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in Dashboard.tsx.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(dashboard): wire today appointments and pending count from Dashboard.tsx"
```

---

## Task 7: Description field in BookingManager service form

**Files:**
- Modify: `src/components/dashboard/booking/BookingManager.tsx`

The `BookingService` type already has `description?: string`. The `useUpsertService` mutation accepts the full `BookingService` shape. We just need to add it to local state and the form.

- [ ] **Step 1: Add description to newSvc state**

Find `const [newSvc, setNewSvc] = useState({ name: "", duration: "45", price: "" })` and change to:

```ts
const [newSvc, setNewSvc] = useState({ name: "", duration: "45", price: "", description: "" });
```

- [ ] **Step 2: Pass description in the upsert call**

Find the `addService` function (around line 87-94). Add `description: newSvc.description` to the mutate payload:

```ts
upsertService.mutate({
  ...(editingId ? { id: editingId } : {}),
  business_id: businessId,
  name: newSvc.name.trim(),
  duration_minutes: Number(newSvc.duration),
  price: Number(newSvc.price),
  description: newSvc.description.trim() || undefined,
});
```

- [ ] **Step 3: Pre-fill description when editing**

Find `editService` function (around line 96-99) and add description:

```ts
const editService = (s: BookingService) => {
  setEditingId(s.id);
  setNewSvc({ name: s.name, duration: String(s.duration_minutes), price: String(s.price), description: s.description ?? "" });
};
```

- [ ] **Step 4: Clear description on cancel**

Find the cancel button's onClick and update:

```ts
onClick={() => { setEditingId(null); setNewSvc({ name: "", duration: "45", price: "", description: "" }); }}
```

- [ ] **Step 5: Add the description textarea to the form**

After the existing three `<div>` field blocks (name / duration / price) and before the `<Button onClick={addService}>` line, add:

```tsx
<div className="w-full">
  <label className="block text-xs text-muted-foreground mb-1">
    תיאור קצר <span className="text-muted-foreground/60">(אופציונלי)</span>
  </label>
  <textarea
    rows={2}
    placeholder='למשל: "ניקוי עמוק, קילוף ועיסוי פנים — 60 דקות"'
    value={newSvc.description}
    onChange={(e) => setNewSvc({ ...newSvc, description: e.target.value })}
    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
  />
  <p className="text-[11px] text-muted-foreground mt-0.5">הלקוחה רואה את זה בדף ההזמנה</p>
</div>
```

The textarea should span the full width — wrap the entire add-form `<div className="flex flex-wrap gap-2 items-end">` in a `<div className="flex flex-col gap-3">` and put the description div outside the flex-wrap row.

Concrete change — replace the opening of the add section:

```tsx
{/* Before: <div className="flex flex-wrap gap-2 items-end"> */}
<div className="flex flex-col gap-3">
  <div className="flex flex-wrap gap-2 items-end">
    {/* name / duration / price inputs + buttons stay here */}
  </div>
  <div className="w-full">
    <label className="block text-xs text-muted-foreground mb-1">
      תיאור קצר <span className="text-muted-foreground/60">(אופציונלי)</span>
    </label>
    <textarea
      rows={2}
      placeholder='למשל: "ניקוי עמוק, קילוף ועיסוי פנים — 60 דקות"'
      value={newSvc.description}
      onChange={(e) => setNewSvc({ ...newSvc, description: e.target.value })}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
    />
    <p className="text-[11px] text-muted-foreground mt-0.5">הלקוחה רואה את זה בדף ההזמנה</p>
  </div>
</div>
```

- [ ] **Step 6: Show description in the service list item**

Find the service row render inside `services.map((s) => ...)`. After `<div className="text-xs text-muted-foreground flex items-center gap-2">`, add below it (as a sibling, not inside it):

```tsx
{s.description && (
  <div className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{s.description}</div>
)}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in BookingManager.tsx.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/booking/BookingManager.tsx
git commit -m "feat(booking): add description field to booking services form"
```

---

## Task 8: Deploy and verify

- [ ] **Step 1: Push to trigger Cloudflare Pages deploy**

```bash
git push origin main
```

- [ ] **Step 2: Open the demo-beauty store dashboard**

Log in as the demo-beauty owner and go to Dashboard → סקירה.

Verify:
- TodayAppointmentsCard appears at top with today's appointments (or empty state if none)
- Pending appointments show amber background + אשר/דחה buttons
- Confirming an appointment changes its chip to "מאושר" without page reload

- [ ] **Step 3: Check the nav badge**

If there are pending appointments, the "יומן ותורים" nav item shows a red badge with the count.

- [ ] **Step 4: Check the services description field**

Go to Dashboard → ניהול → יומן ותורים. In the services section, add a description to a service. Verify it saves and shows in the list.
