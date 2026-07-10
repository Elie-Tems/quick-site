# מסמך תכנון: מ-CRM נגזר-הזמנות ל-CRM רב-ורטיקלי

מצב: הצעה לתכנון (ללא שינויי קוד) · 2026-07-07. מבוסס סריקת קוד.

## 0. מצב קיים (מאומת מהקוד)

- **אין ישות איש-קשר עצמאית.** רשימת הלקוחות נבנית כולה ב-useMemo מתוך `orders` (`DashboardCustomers.tsx:157-203`). המפתח: `(customerEmail || customerPhone || customerName).trim().toLowerCase()`.
- **`customer_crm`** = שכבת אנוטציה בלבד: `(business_id, customer_key) -> tags[], notes`. אין FK ללקוח, רק מפתח נגזר.
- אין pipeline, stages, follow-up, interaction log.
- **לשימוש חוזר שכבר קיים:** כרטיס לקוח, RFM (VIP/חוזר/בסיכון/רדום), LTV, cadence לקנייה חוזרת, tags/notes, פעולות WhatsApp/מייל/טלפון, CSV.
- **קונבנציות DB:** `business_id uuid references businesses(id) on delete cascade`; RLS דרך `is_business_owner(business_id)`; תקדים contacts ב-`mkt_contacts`; add-ons כדגלים על `subscriptions`.

עיקרון-על: **לא לשבור את רשימת הלקוחות הנגזרת-הזמנות שעובדת היום.** מוסיפים שכבה מעליה, לא מחליפים.

## 1. ישות `contacts` עצמאית

טבלה חדשה `contacts` (business_id-scoped, RLS כמו customer_crm) עם `dedup_key = lower(trim(coalesce(email,phone,name)))` - **בדיוק הנוסחה הקיימת בפרונט** (`DashboardCustomers.tsx:160`), כדי שאיש-קשר וה"תאום" הנגזר-הזמנה יתמזגו לשורה אחת. `unique(business_id, dedup_key)`.

מיזוג בלי שבירה בשלוש שכבות:
1. Backfill חד-פעמי idempotent מ-orders (`ON CONFLICT DO NOTHING`).
2. טריגר `AFTER INSERT ON orders` -> upsert ל-contacts (COALESCE, לא דורס), מקדם txn_count.
3. View `customer_contacts` שמצליב tags/notes ישנים מ-customer_crm לפי אותו מפתח -> מיגרציה שקופה, אפס איבוד נתונים.

lead-form ציבורי מהחנות: דרך edge function `contacts-capture` עם `verify_jwt=false` + rate-limit (יש `rate_limits`), **לא** INSERT אנונימי ישיר.

## 2. `transactions` מוכללת (המלצה: טבלה אחת מטיפוסת)

טבלת `transactions` אחת עם `kind in ('order','appointment','lead','donation')`, `contact_id`, `amount`, `occurred_at`, `source_table/source_id` (idempotency), ו-`details jsonb` פר-ורטיקל.

**הצדקה לקודבייס הזה:** `orders` נשארת source-of-truth לסחר (RLS, INSERT אנונימי, order_items, PayPlus, מיילים, טריגרים) - לשכפל אותה = סיכון רגרסיה מול אפס תועלת. `transactions` היא שכבת-על מאוחדת ש-orders מזרימה אליה בטריגר, וה-CRM קורא ממנה timeline אחיד חוצה-ורטיקל. טבלה אחת = פחות RLS לתחזק (צוות קטן), ו-LTV/RFM חוצה-ורטיקל = sum/count פשוט. `details jsonb` = ורטיקל חדש בלי מיגרציית סכמה.

## 3. Pipeline/Stages data-driven

- `pipelines` (business_id, vertical, `stages jsonb`) + `pipeline_cards` (contact_id, stage_key, follow_up_at, `details jsonb`, status open/won/lost) + `interactions` (append-only: call/whatsapp/meeting/viewing/stage_change).
- **Leads (נדל"ן/רכב):** card.details = נכס/רכב מתעניין; stages `new->contacted->viewing->offer->closed_won/lost`; follow-up list = `where open and follow_up_at<=now()` (index חלקי).
- **Donors:** transaction kind='donation', details `{recurring,frequency,campaign_id}`; lifetime giving = sum(amount) = ה-LTV הקיים; **סעיף 46 = `section46_enabled boolean default false`, off-by-default, המונח מוסתר עד הפעלה מפורשת** (עמותה בלי 46 מנהלת תורמים רגיל).
- **Service clients:** transaction kind='appointment'; rebook nudge = מנוע ה-cadence הקיים בשימוש חוזר.

## 4. נתיב מיגרציה (additive, לא שובר)

A: טבלאות חדשות בלבד. B: backfill idempotent מ-orders. C: טריגר orders->contacts/transactions. Frontend: הגרסה החדשה מאחורי `crm_addon_enabled`; התצוגה הישנה נשארת ברירת מחדל. `customer_crm`: deprecate דרך view, לא drop (עד אימות פרודקשן). בכל שלב אם עוצרים - האתר עובד.

## 5. שימוש חוזר מ-DashboardCustomers.tsx

as-is (רק מקור נתונים אחר): כרטיס לקוח, RFM, LTV, cadence, tags/notes, פעולות מהירות, CSV, segment chips, כרטיסי הזדמנות, ציר זמן.
חדש: לוח Kanban, פאנל follow-up "לטיפול היום", טופס ליד ידני+ציבורי, interaction-log timeline מעורב, בורר ורטיקל+עורך שלבים, מודול תרומות.

## 6. מדורג + סיכונים

- **v1:** migrations A+B+C, contacts+מיזוג customer_crm, pipeline+Kanban+follow-up, ורטיקל Leads end-to-end, מאחורי crm_addon_enabled, +תיעוד HelpCenter.
- **v1.5:** Service (rebook), Donors (+toggle 46 בלי הפקת קבלה עדיין).
- **Later:** הפקת קבלות 46, מיזוג ידני, שליחה מה-pipeline, הורדת customer_crm, שקילת טבלת appointments ייעודית.
- **סיכונים:** דריפט dedup_key (נוסחה יחידה מתועדת); שכפול אמת orders/transactions (orders נשארת single-source, כתיבה רק דרך טריגר); הנחת 46 (off-by-default); פונקציה לא-פרוסה/verify_jwt (צ'קליסט); INSERT אנונימי על contacts (רק דרך edge fn); בלבול UX (הכל מאחורי add-on).

**המלצה:** contacts עם dedup_key זהה לנוסחה הקיימת; transactions אחת מטיפוסת (orders נשארת אמת); pipeline data-driven ב-jsonb; סעיף 46 toggle-off-by-default; הכל additive מאחורי crm_addon_enabled.
