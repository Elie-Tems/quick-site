# מנוע חיוב עצמאי (iCount token) + קופוני מנוי - רפרנס והפעלה

מנוע לניהול **החיוב החודשי אצלנו** (לא הו"ק של iCount), כדי לתת גמישות מלאה
בהנחות/קמפיינים. iCount רק מבצע: אנחנו קובעים כל פעם סכום + תיאור. נבנה על ענף
`moti`, **build-only - לא פרוס ולא חי** עד שמפעילים את מודול האחסון ב-iCount ובודקים.

## המודל (מאומת מול הדוקומנטציה של iCount v3)
- **תשלום ראשון:** `paypage/generate_sale` - אנחנו שולחים `sum` (מוזל אם יש קופון),
  `description`, `ipn_url` שלנו, `x_order_id`=session_token → מקבלים `sale_url`
  ששולחים אליו את הלקוח (iframe). הדף המאובטח **שומר את הכרטיס כטוקן** (PCI אצל iCount).
- **חיוב חודשי:** `cc/bill` עם `cc_token_id` + `sum` (מחושב אצלנו) + `payment_description`.
  merchant-initiated, תומך `is_test`. מחזיר `success` + `confirmation_code`.
- **ביטול:** פשוט מפסיקים לחייב. אין הו"ק מקביל. **החזר:** `cc/refund`.

## מה נבנה (הכל ב-commit הזה)
- **מיגרציה** `20260703100000_self_managed_billing.sql`:
  `subscription_coupons` (המסך `AdminSubscriptionCoupons` כבר מצפה לזה), `subscription_
  coupon_redemptions`, `billing_tokens` (רק reference לטוקן - **אין פרטי כרטיס אצלנו**),
  `billing_charges` (לוג ביקורת append-only), פונקציית `validate_subscription_coupon`
  (אנטי-אנומרציה), והרחבת `subscriptions` (billing_provider, cc_token_id, base_amount,
  coupon snapshot, next_charge_at, billing_cycle_count).
- **`_shared/icount/api.ts`** - עוטף `paypage/generate_sale`, `cc/bill`, `cc_storage/token_info`, `cc/refund`.
- **`_shared/billing/pricing.ts`** - חישוב סכום שרת-צד (קופון + מחזור) + תקרת-בטיחות.
- **`billing-create-checkout`** (JWT) - יוצר את התשלום הראשון עם הסכום המוזל.
- **`billing-icount-ipn`** (secret) - קולט את הטוקן, מפעיל מנוי, מפרסם חנות, מממש קופון.
- **`billing-charge-run`** (cron) - מחייב מנויים שהגיע זמנם, idempotent + capped + dunning.
- מיגרציית קרון `20260703101000_...` (לא ליישם עד go-live).

## הגנות אבטחה שנבנו
- חיוב נוצר **רק** ב-`billing-charge-run` (service-role + CRON_SECRET). אין endpoint משתמש שמחייב.
- **אין פרטי כרטיס אצלנו** - רק `cc_token_id` (reference). הטוקן חסר-ערך בלי מפתח ה-API שלנו (secret בשרת).
- **תקרת-סכום קשיחה** לכל חיוב (`withinChargeCeiling`) - לא יעבור את מחיר הבסיס.
- **Idempotency** לפי `${subscription}:cycle${n}` (unique ב-`billing_charges`) - אין חיוב כפול.
- **הסכום מחושב בשרת** מהבסיס + קופון מאומת - לא מקלט לקוח.
- **RLS**: לקוח רואה רק את שלו; הלוג append-only; קופונים רק לאדמין; ולידציה דרך RPC (בלי לחשוף את הטבלה).
- **Dunning**: כשלון → retry +יומיים, אחרי 3 כשלונות → past_due + מייל.
- `is_test` (`BILLING_TEST_MODE=true`) לבדיקה בלי חיוב אמיתי.

## מה צריך כדי להעלות לאוויר (צ'קליסט)
1. **iCount:** להפעיל את מודול **Credit-Card Storage** (שמירת כרטיסים; יתכן חיוב נוסף).
2. **iCount:** ליצור עמוד סליקה (paypage) עם שמירת כרטיס מופעלת + 3DS כבוי, ולקבל את ה-`paypage_id`.
3. **לברר מול iCount:** איפה חוזר ה-`cc_token_id` אחרי תשלום ב-paypage (ב-IPN? דרך `cc_storage/token_info`?) → להתאים את `extractTokenId` ב-`billing-icount-ipn` בהתאם.
4. **Secrets ב-Supabase:** `ICOUNT_API_TOKEN` (קיים), `ICOUNT_WEBHOOK_SECRET` (קיים), `ICOUNT_PUBLISH_PAYPAGE_ID`, `PUBLISH_FEE_ILS` (אופ'), `BILLING_TEST_MODE=true` (לבדיקה).
5. **ליישם את המיגרציות** (`20260703100000` + הקרון) ב-DB.
6. **לפרוס** את הפונקציות (merge ל-main).
7. **פרונט:** בדף הפרסום - שדה "קוד קופון" (ולידציה דרך `validate_subscription_coupon`) + לנתב את "פרסמו" ל-`billing-create-checkout` → iframe של `saleUrl`. (מאחורי flag `VITE_BILLING_SELF_MANAGED` כדי לא לגעת בזרימה הנוכחית שעובדת.)
8. **לבדוק** עם `BILLING_TEST_MODE=true` מקצה לקצה, ואז לכבות.
9. **קרון:** ליישם את `20260703101000`.
10. תיעוד במרכז השירות.

## קופונים - איפה יוצרים
אדמין → "תמחור ושותפים" → **"קופוני מנוי"** (`AdminSubscriptionCoupons`). קוד, אחוז/סכום,
duration = **first_month** (חודש ראשון) או **forever** (לתמיד). *(הרחבה עתידית: N חודשים -
דורש עמודת `duration_months`; המנוע כבר מבוסס-מחזור אז זו הרחבה קטנה.)*

## הערה על ה-הו"ק הקיים
הזרימה הנוכחית (iCount hk) עדיין חיה ועובדת (אחרי תיקוני הלילה). המנוע החדש **מחליף**
אותה כשמוכנים - `billing_provider='icount_token'` מבדיל בין השניים, אז אפשר להריץ במקביל
ולהגר בהדרגה.
