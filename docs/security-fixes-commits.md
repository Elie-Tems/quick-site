# תיקוני אבטחה - רשימה לאימות (לדניאל)

כל התיקונים על branch `main`, ה-commit האחרון: **1161aa2**. כל שורה: הממצא ->
ה-commit -> מה תוקן -> איך לאמת מול הקוד הנוכחי.

| Commit | ממצא | מה תוקן | איך לאמת |
|---|---|---|---|
| **26223f9** | 🔴 פאנל אדמין פתוח | הוסר `DEV_BYPASS=true` מ-`AdminDashboard.tsx`; הוחזרו redirect + isAdmin + 2FA | `grep -rn DEV_BYPASS src/` -> אין תוצאות; כניסה ל-/manage-x7k9 בלי אדמין -> "אין גישה" |
| **10bf17c** | 🔴 C6 מפתח תשלום חשוף + 🟠 H7 דגלי תשלום | `DROP COLUMN businesses.payment_api_key`; trigger `protect_paid_addon_flags` (חוסם שינוי `tracking_paid`/`reviews_paid` שלא ע"י service_role) | migration `20260628180000`; נסה anon `select('payment_api_key')` -> עמודה לא קיימת |
| **d14e80b** | 🟠 H1 מנוי חינם + H3 קופון אינסופי | trigger `protect_subscription_billing` (נועל `paid_until`/status/plan/total); `payments-create` תופס שימוש-קופון אטומית (CAS על `current_uses`) | migration `20260628190000`; `payments-create/index.ts` ~שורה 92 |
| **330987f** | 🟠 H6 referral self-reward + H2 ad_links + C2 webhooks | נמחקה מדיניות UPDATE של `referral_logs`; constant-time compare ב-2 ה-webhooks; webhook דומיינים דוחה IPN עם סכום < הזמנה | migration `20260628200000`; `domain-purchase-webhook` + `icount-webhook` (`safeEqual`) |
| **9f07e8d** | 🔴 C5 פישינג מהמייל | `send-platform-email` שולף זהות החנות מה-DB, לא מהבקשה; מתעלם מ-fromName/replyTo נשלטי-תוקף | `send-platform-email/index.ts` |
| **052e3d3** | 🟠 H4 SSRF + XSS ב-JSON-LD | `analyze-website`: resolve DNS + בדיקת IP אמיתי (anti-rebinding), חסימת IP מספרי, אימות redirect, תקרת גודל; `_middleware`: escape ל-`</>&` ב-JSON-LD | `analyze-website/index.ts` (`safeFetch`/`ipIsBlocked`); `_middleware.ts` (`ldJson`) |
| **78317c4** | (תאימות) הסרה מדיוור | דף הסרה ציבורי + רשימת הסרות (חוק הספאם) | `PlatformUnsubscribe.tsx` |

## הבהרה על "False Positive"
הממצאים מעלה אומתו **ישירות בקוד** לפני התיקון - לא תיאורטיים:
- `DEV_BYPASS = true` היה מילולית בקובץ (שורה 95) - האדמין היה פתוח. זה ודאי לא FP.
- `payment_api_key` הייתה עמודה אמיתית קריאה ל-anon דרך `select('*')`.
- מדיניות RLS שאיפשרה מנוי-חינם / קופון-אינסופי / self-reward - היו קיימות.

ייתכן שהסריקה השנייה רצה **אחרי** התיקונים (ואז ראתה קוד נקי), או על מצב-קוד שונה.
מסכימים על ה-XSS. כדי לסנכרן: בבקשה אמת מול **commit 1161aa2** (ה-HEAD הנוכחי).

## נשאר פתוח (מתועד, לא "פתוח מהצד שלנו")
- **C2 מלא:** סיבוב `ICOUNT_WEBHOOK_SECRET` (דורש עדכון גם בדף iCount - פעולת מוטי) + אימות-סכום out-of-band מלא מול iCount API.
- **תלות `xlsx`:** אין תיקון upstream - לשקול מעבר ל-exceljs.
- H8 (הזמנה ₪0.01 בחנות ללא-סליקה) ואנליטיקה/CORS - נמוך מאוד.
