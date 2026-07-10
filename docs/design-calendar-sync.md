# מסמך תכנון: מנוע תורים/הזמנות + סנכרון יומן דו-כיווני

מצב: תכנון (מוכן ליישום) · 2026-07-07. מבוסס סריקת קוד.
החלטת מוצר (מוטי): **דו-כיווני מהיום הראשון.** גוגל קודם, Microsoft/Outlook שני.

## 0. הקשר וכללים מנחים
אין היום שום טבלת תורים/יומן. תואם לקונבנציות שנקראו מהריפו:
- שרשרת בעלות: `businesses.owner_id -> profiles.id`, `profiles.user_id -> auth.uid()`. כל RLS הולך בשרשרת הזו.
- סודות לא על טבלת public-read: טוקנים בטבלה נפרדת בלי anon policy, רק service-role (דפוס `payment_credentials`).
- server-authoritative: הזמינות מחושבת בשרת, אף פעם לא סומכים על הלקוח (כמו price ב-orders-create).
- webhook auth בלי JWT: secret ב-URL + `safeEqual`, `verify_jwt=false` (כמו billing-icount-ipn).
- הכל timestamptz UTC; אזור זמן `Asia/Jerusalem`; DST בזמן חישוב סלוטים, לא באחסון מחרוזות.

## 1. מודל נתונים (migration חדש)
- **booking_services**: name, duration_minutes, buffers, price, deposit_type/value, min_notice, max_advance_days, active.
- **booking_staff**: resource/נותן שירות (profile_id אופציונלי, timezone). עסק יחיד = staff אחד מובלע.
- **booking_service_staff**: join מי מבצע מה.
- **booking_working_hours**: זמינות שבועית פר-staff, כ**דקות מקומיות** (weekday, start_minute, end_minute) -> נפתר ל-timestamptz פר-תאריך (DST-נכון). מכבד Shabbat mode הקיים.
- **booking_blackouts**: חסימות חד-פעמיות (חופשות/ידני).
- **booking_appointments**: הליבה. starts_at/ends_at (UTC), status (pending/confirmed/cancelled/completed/no_show), פרטי לקוח, price/deposit snapshot, order_id (קישור לסליקה הקיימת), hold_expires_at (hold רך), cancel_token (HMAC self-cancel), google_event_id/ms_event_id, sync_state.
- **calendar_connections**: OAuth פר-**staff** (בלי anon policy). access/refresh token **מוצפנים**, token_expires_at, sync_token (Google), delta_link (MS), watch_channel_id/subscription_id, watch_expires_at, status (active/needs_reauth/revoked).
- **calendar_busy_blocks**: cache של busy חיצוני (unique(connection_id, external_event_id)) - כדי לא לפגוע ב-API חיצוני בכל בקשת חנות.
- **calendar_sync_log**: audit + idempotency.

**מגן double-booking ברמת DB:** exclusion constraint (btree_gist) שמונע חפיפה בין תורים פעילים לאותו staff -> race נכשל loud ב-insert.

RLS: owner/staff דרך שרשרת העסק; admin read; **לקוח נוגע בנתונים רק דרך edge functions (service-role)**, לא INSERT anon ישיר. טבלאות הטוקנים - בלי anon policy בכלל.

## 2. זרימת הזמנה (חנות)
בחירת שירות -> **זמינות אמיתית** (edge fn מחשב: שעות עבודה פחות תורים/חסימות/**busy חיצוני**, מכבד min_notice/max_advance/buffers/שבת) -> בחירת סלוט -> פרטים -> **מקדמה** (re-validate בשרת מול ה-constraint; יוצר appointment pending + hold; משתמש ב-orders/PayPlus/iCount הקיימים) -> callback תשלום -> confirmed + push ליומן -> **אישור + תזכורות** דרך מייל/וואטסאפ הקיימים + לינק self-cancel. cron מנקה holds שלא שולמו.

## 3. סנכרון דו-כיווני
- **נכנס (חיצוני -> Siango):** busy חיצוני חוסם זמינות. Google: events.list + nextSyncToken (incremental), events.watch -> webhook, fallback polling; 410 -> full resync. Microsoft Graph: calendarView + `@odata.deltaLink`, subscriptions/webhook - **הבדלים:** handshake של validationToken (echo תוך ~10ש), תפוגה קצרה (~3 ימים, renew תכוף יותר), clientState.
- **יוצא (Siango -> חיצוני):** כל תור מאושר -> event ביומן ה-staff. idempotency: extended property `siango_appointment_id` (מונע כפילויות ולולאות echo). update/delete בהתאם.
- **חוצה:** אזור זמן ב-IANA (DST ע"י tz db); external wins ל-busy; reschedule מהצד החיצוני של תור שלנו ב-v1 = flag + התראה לצוות (לא auto-move); token refresh מרוכז; connection שבור -> needs_reauth + באנר + degrade לנתונים פנימיים, לא קורס.

## 4. Edge functions (שמות + מטרה)
חנות (public): booking-services-list, booking-availability, booking-create, booking-cancel-public.
OAuth+webhooks: booking-google-oauth-start/callback, booking-google-watch, booking-ms-oauth-start/callback, booking-ms-notifications.
crons: booking-calendar-push, booking-calendar-poll (fallback ~15ד), booking-calendar-watch-renew, booking-holds-sweep, booking-reminders.
dashboard (owner): booking-appointment-manage, booking-calendar-disconnect.
shared: `_shared/calendar/` (google.ts, microsoft.ts, tokens.ts, crypto.ts, availability.ts).
**כלל הזהב:** כל פונקציה נפרסת מיד; כל public/webhook עם verify_jwt=false.

## 5. אבטחה
טוקנים מוצפנים AES-GCM (מפתח `CALENDAR_TOKEN_KEY` ב-Edge secrets); טבלת הטוקנים בלי anon; זמינות מחושבת בשרת + constraint כ-backstop; webhook auth ב-secret/clientState + safeEqual; scopes מינימליים; disconnect שמבטל אצל הספק; אפשרות להסתיר PII של הלקוח באירוע החיצוני.

## 6. תוכנית מדורגת + סיכונים
- **v1 - תורים בלי סנכרון חיצוני (ערך עצמאי):** טבלאות + constraint, availability פנימי, booking-create עם מקדמה, holds-sweep, אישורים/תזכורות, ניהול בדשבורד. +תיעוד HelpCenter (פיצ'ר בלי תיעוד = לא גמור).
- **v2 - Google דו-כיווני:** OAuth, טוקנים מוצפנים, events.list+syncToken, busy_blocks בזמינות, watch+webhook, push יוצא, poll+renew fallbacks, מניעת לולאה.
- **v3 - Microsoft/Outlook:** אותה הפשטה, calendarView/delta, subscription עם handshake, renew תכוף.
- **v4:** auto-reconcile reschedule, בחירת יומן, הזמנות קבוצתיות/משאבים, waitlist, Apple/CalDAV.
- **5 סיכונים:** (1) webhook שנפל -> זמינות ישנה -> double-book: fallback poll + re-check בזמן הזמנה + constraint; (2) טוקן שפג/בוטל בשקט: refresh מרוכז + needs_reauth + degrade; (3) לולאת echo: extended property + upsert idempotent; (4) באגי TZ/DST/שבת: UTC בלבד + IANA + Shabbat mode + בדיקות סביב מעברי שעון; (5) race על הסלוט האחרון: exclusion constraint + holds קצרים.
