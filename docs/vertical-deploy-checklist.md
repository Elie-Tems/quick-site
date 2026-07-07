# Joint-deploy runbook: verticals (booking / CRM / listings / donations / calendar)

Everything below is built + typechecked + committed on `moti`. This is the
turnkey checklist to take it live together. Nothing here is deployed yet.

## What's built (on `moti`)
- **Phase 1 foundation** - `business_type` persist + `src/lib/businessModules.ts` (type -> modules). NOW actually wired through onboarding (was collected but never saved) + auto-layout by vertical.
- **Booking (Phase 2)** - migration `20260708120000_booking_core.sql`; engine `src/lib/booking/availability.ts` (10 tests); edge fns `booking-availability|create|holds-sweep|cancel-public`; hooks `useBooking.ts`; UI `BookingManager` (dashboard) + `BookingWidget` (storefront). Default staff + service-staff auto-link on first service. Deposit -> hosted payment round-trip.
- **CRM (Phase 3)** - migration `20260708130000_crm_core.sql`; hooks `useCrm.ts`; UI `LeadsBoard`.
- **Listings (Phase 4)** - migration `20260708140000_listings.sql`; edge fn `contacts-capture`; hooks `useListings.ts`; UI `ListingsManager` (dashboard) + `ListingsBoard` (storefront, real lead capture).
- **Donations (Phase 5)** - migration `20260708150000_donations.sql`; hooks `useDonations.ts`; UI `DonationsManager` (dashboard) + `DonationWidget` (storefront). Payment via `donation-create` + `donation-callback` (per-merchant gateway).
- **Calendar two-way sync (Google)** - `_shared/calendar/{crypto,google}.ts`; edge fns `calendar-oauth-start|oauth-callback|sync`; UI `CalendarConnect` in BookingManager. Inbound busy -> availability; outbound appointments -> Google.
- **Storefront branching** - `StorefrontVertical` mounted in `StoreFront.tsx` (booking/listings/donations above the catalog; commerce-only unaffected).
- **Dashboard wiring** - `VerticalModules` reachable via the "יומן ולידים" nav entry (shown only for non-commerce modules).
- **Support docs** - HelpCenter FAQ category + help-bot prompt cover every module.

## Step 1 - apply migrations (Moti, via Supabase Management API, IN ORDER)
1. `20260707120000_business_type.sql`
2. `20260708120000_booking_core.sql`
3. `20260708130000_crm_core.sql`
4. `20260708140000_listings.sql`
5. `20260708150000_donations.sql`

Then regenerate types: `supabase gen types typescript --project-id ytqgeoviokgxxwalieev > src/integrations/supabase/types.ts` (lets us drop the `as any` casts in the new hooks). NOTE: schema-dependent frontend is deploy-safe (defensive), but the modules only *work* once migrations are applied.

## Step 2 - secrets (Supabase Edge Functions -> Secrets)
- `BOOKING_CANCEL_SECRET` - random 32+ chars (self-cancel token signing).
- `CRON_SECRET` - guards `booking-holds-sweep` + `calendar-sync` cron.
- **Calendar (Google)** - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (= `https://<project>.functions.supabase.co/calendar-oauth-callback`), `CALENDAR_TOKEN_KEY` (32-byte hex/base64 for AES-GCM), `CALENDAR_STATE_SECRET` (random 32+).
- Payments (donations + booking deposits) reuse the merchant's existing `payment_credentials` - no new platform secret.

## Step 3 - merge `moti` -> `main`
Push to main auto-deploys the frontend (Cloudflare) AND edge functions (supabase-functions.yml). Verify in the Actions tab. New public functions have `verify_jwt=false` set in `config.toml`: `donation-create`, `donation-callback`, `calendar-oauth-callback`, `calendar-sync`.

## Step 4 - schedule crons (Supabase / pg_cron -> invoke with x-cron-secret)
- `booking-holds-sweep` every ~5 min (frees unpaid holds).
- `calendar-sync` every ~10-15 min (header `x-cron-secret: <CRON_SECRET>`, empty body -> syncs all active Google connections).

## Step 5 - Google Cloud OAuth app (for calendar)
- Create OAuth client (Web). Authorized redirect URI = the `GOOGLE_REDIRECT_URI` above.
- Scopes: `calendar.events`, `calendar.readonly`, `openid`, `email`. Publish the consent screen (or add test users while verifying).

## Step 6 - test plan (together, on a real business)
- **Services**: onboard as נותן שירות -> business_type=services, layout=service. Add a service + hours in BookingManager. Storefront: book a slot -> appointment appears; double-book same slot -> 409 slot_taken; expire a hold -> frees.
- **Deposit**: set a deposit on a service -> booking redirects to the merchant's hosted page -> paying confirms the appointment (payments-callback).
- **Calendar**: connect Google -> external event blocks a slot; a new booking appears in Google.
- **Real estate**: add a listing; submit a lead -> contact + pipeline card in LeadsBoard.
- **Nonprofit**: create a campaign; donate one-time -> reaches merchant gateway -> `donation-callback` marks paid + campaign total updates. Toggle Section 46 on/off (never shows when off).

## Still deferred (need approval / external / careful build)
- **Emails / notifications** (BLOCKED on Moti): designs at `/preview/redesign/emails` awaiting OK. Once approved, wire booking-confirm / lead-alert / donation-thank-you into booking-create / contacts-capture / donation-callback (reuse `_shared/email`), + WhatsApp reminders.
- **Recurring donations auto-renewal**: `donation-create` captures the FIRST charge now and records `details.recurring`; monthly re-charge on the merchant's gateway is the remaining piece (tie to the iCount/PayPlus recurring answer).
- **Microsoft/Outlook calendar**: mirror the Google shape in `_shared/calendar` + `calendar-sync`.
- **Minor**: per-vertical analytics, reviews/ratings on services, multi-staff roles.
