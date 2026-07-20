# Beauty/Spa Dashboard UX — Design Spec

## Goal

Make the dashboard feel native to a beauty/spa business owner. She opens it every morning to check appointments — the UI should meet her there, not make her hunt.

## Scope (3 changes)

### 1. TodayAppointmentsCard — widget on DashboardHome

**Where:** Top of `DashboardHome.tsx`, before the stat cards. Visible only when `hasBooking` is true.

**Data:** Query `bookings` joined with `booking_services` where `business_id = current` and `date = today (Israel time)`, ordered by start time ascending.

**Layout:**
- Card header: calendar icon + "היום, [day name]" + pill showing appointment count
- List rows, one per appointment: time (tabular nums) | avatar circle (initials) | client name + service name + duration | status chip
- **Pending rows** (`status = 'pending'`): highlighted with amber background tint, inline אשר / דחה buttons. Confirm calls the existing confirm mutation, reject opens a small inline reason input (optional) then calls cancel mutation.
- Footer: "לכל היומן ←" navigates to `verticals` view
- **Empty state:** beach/sun icon + "אין תורים היום — יום פנוי"
- **Loading state:** 3 skeleton rows (shimmer), same height as real rows

**Feel:** Calm, not alarming. Pending rows draw attention via amber tint — not red. Confirm/reject buttons are small and secondary in visual weight; the appointment info is the star, not the action.

**Mutations:** Reuse existing `useBookings` / `useConfirmBooking` / `useCancelBooking` hooks (already exist in `useBooking.ts`).

---

### 2. Pending badge on nav item "יומן ותורים"

**Where:** `DashboardNav.tsx`, on the nav item for the `verticals` view (the booking one, labeled "יומן ותורים").

**Logic:** Count of `bookings` where `business_id = current`, `status = 'pending'`, `date >= today`. If count > 0, show a small red pill with the number to the left of the label. If count = 0, no pill.

**Data source:** Same query as TodayAppointmentsCard — pass the count down as a prop, or let the nav fetch it independently with a lightweight query. Prefer passing as prop from Dashboard.tsx to avoid double fetching.

**Feel:** Subtle — a small `18px × 18px` pill, not a screaming badge. Disappears the moment she confirms or cancels all pending appointments.

---

### 3. Description field on booking services

**Where:** `BookingManager.tsx` — the service add/edit inline form.

**DB migration:** Add `description text` column to the `booking_services` table (nullable, no default).

**UI change:** Below the existing name/duration/price row, add a single `<textarea>` (2 rows, auto-resize) labeled "תיאור קצר (אופציונלי)" — e.g. "ניקוי עמוק, קילוף ועיסוי פנים". Helper text: "הלקוחה רואה את זה בדף ההזמנה".

**Storefront:** In the booking flow's service picker, show the description as a small muted line beneath the service name when it exists.

**Feel:** Optional field, visually quiet. The form doesn't grow intimidatingly — just a soft textarea below the existing row.

---

## Files to touch

| File | Change |
|---|---|
| `src/components/dashboard/DashboardHome.tsx` | Add `<TodayAppointmentsCard>` at top, gated on `hasBooking` |
| `src/components/dashboard/TodayAppointmentsCard.tsx` | New component |
| `src/components/dashboard/DashboardNav.tsx` | Accept `pendingCount` prop, render badge on booking nav item |
| `src/pages/Dashboard.tsx` | Fetch pending count, pass to nav + home |
| `src/components/dashboard/booking/BookingManager.tsx` | Add description textarea to service form |
| `src/hooks/useBooking.ts` | Add `useTodayBookings(businessId)` and `usePendingCount(businessId)` |
| `supabase/migrations/YYYYMMDD_booking_service_description.sql` | `ALTER TABLE booking_services ADD COLUMN description text` |

---

## UX principles for this feature

- **Information first, actions second.** The appointment list is about knowing, not doing. Actions are available but not pushed.
- **Calm colors.** Pending = amber, not red. Confirmed = green chip, no fill. No alerts, no exclamation marks.
- **Zero empty-state anxiety.** "אין תורים היום — יום פנוי" reads as a positive, not a warning.
- **Instant feedback.** Confirming a booking removes the amber tint and switches the chip to "מאושר" in place — no full reload.

---

## Out of scope (future)

- Connecting the Products service card to the BookingManager service (two separate systems — architectural change)
- Staff assignment per service
- Deposit / prepayment settings
- SMS/email reminders
- Before/after photo gallery on About page
