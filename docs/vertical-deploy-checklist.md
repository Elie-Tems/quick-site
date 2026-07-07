# Joint-deploy runbook: verticals (booking / CRM / listings / donations)

Everything below is built + typechecked + committed on `moti`. This is the
turnkey checklist to take it live together. Nothing here is deployed yet.

## What's built (on `moti`)
- **Phase 1 foundation** - `business_type` persist (deploy-safe, already LIVE) + `src/lib/businessModules.ts` (type -> modules).
- **Booking (Phase 2)** - migration `20260708120000_booking_core.sql`; engine `src/lib/booking/availability.ts` (10 tests); edge fns `booking-availability|create|holds-sweep|cancel-public`; hooks `useBooking.ts`; UI `BookingManager` (dashboard) + `BookingWidget` (storefront).
- **CRM (Phase 3)** - migration `20260708130000_crm_core.sql` (contacts + transactions + pipeline + orders->CRM trigger + idempotent backfill + `customer_contacts` view + `businesses.section46_enabled`); hooks `useCrm.ts`; UI `LeadsBoard`.
- **Listings (Phase 4)** - migration `20260708140000_listings.sql`; edge fn `contacts-capture` (lead form -> CRM); hooks `useListings.ts`; UI `ListingsManager`.
- **Donations (Phase 5)** - migration `20260708150000_donations.sql` (campaigns + `refresh_donation_campaign`); hooks `useDonations.ts`; UI `DonationsManager`.
- **Feature-gate** - `VerticalModules.tsx` renders the right managers per module.

## Step 1 - apply migrations (Moti, via Supabase Management API, IN ORDER)
1. `20260707120000_business_type.sql`  (already committed; activates Phase 1)
2. `20260708120000_booking_core.sql`
3. `20260708130000_crm_core.sql`
4. `20260708140000_listings.sql`
5. `20260708150000_donations.sql`

Then regenerate types: `supabase gen types typescript --project-id ytqgeoviokgxxwalieev > src/integrations/supabase/types.ts` (lets us drop the `as any` casts in the new hooks).

## Step 2 - secrets (Supabase Edge Functions -> Secrets)
- `BOOKING_CANCEL_SECRET` - random 32+ chars (self-cancel token signing).
- `CRON_SECRET` - if not already set (guards booking-holds-sweep).
- Calendar sync (later): `GOOGLE_CLIENT_ID/SECRET`, `MS_CLIENT_ID/SECRET`, `CALENDAR_TOKEN_KEY` (see the Google Cloud / Azure steps sent in chat).

## Step 3 - merge `moti` -> `main`
Push to main auto-deploys the frontend (Cloudflare) AND the edge functions
(supabase-functions.yml). Verify the functions deployed in the Actions tab.

## Step 4 - wire the modules into the real app (short, do together + test)
- `src/pages/Dashboard.tsx`: render `<VerticalModules business={business} />` (a new "וורטיקל" tab, or above the product tabs). Commerce stores are unaffected.
- `src/pages/StoreFront.tsx` / ServiceLayout: render `<BookingWidget businessId={business.id} />` when the business has the booking module; a listings board + lead form (using `useListings` + `useSubmitLead`) for listings; a donation widget for donations.
- Onboarding: default the storefront layout from `business_type` (getDefaultLayout).

## Step 5 - schedule crons (Supabase / pg_cron)
- `booking-holds-sweep` every ~5 min (frees unpaid holds).
- (Calendar phase) `booking-calendar-poll`, `booking-calendar-watch-renew`.

## Step 6 - test plan (together, on a real business)
- Set a test business's `business_type` (services). Add a service + working hours in BookingManager. From the storefront, book a slot -> appointment appears; try double-booking the same slot -> rejected (409 slot_taken). Expire a hold -> slot frees.
- Real estate: add a listing; submit a lead form -> contact + pipeline card appear in LeadsBoard; move card between stages.
- Nonprofit: create a campaign; toggle Section 46 on/off (verify it never shows when off).

## Still deferred (need approval / external / careful build)
- **Emails**: designs at `/preview/redesign/emails` awaiting Moti's OK; then wire notifications into booking-create / contacts-capture / donation flows.
- **Payments**: booking deposit + recurring donations reuse PayPlus/iCount - wire + test the exact payment round-trip together (money path, don't rush).
- **Calendar sync** (Google two-way then Microsoft): needs the OAuth apps + secrets above; functions/design ready in `docs/design-calendar-sync.md`.
- **Light mode** on the marketing pages: needs Header/Footer (hardcoded dark) made theme-aware + AllTemplates/Contact wrapped; visible-regression risk, review together.
- **HelpCenter FAQ + help-bot prompt**: document every new module (project rule - a feature without support docs is "not done").
