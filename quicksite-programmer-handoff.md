# QUICKSITE — משימות פתוחות למתכנת (לזום)

עודכן: יוני 2026. כל מה שאני (Claude) לא יכול לבצע — דורש גישה לשרת, חשבונות חיצוניים, או החלטות. **הקוד מוכן; רובו הרצה/הגדרה/חיבור.**

מקרא: 🔴 חוסם עכשיו · 🟠 להפעלת פיצ'רים · 🟢 בהמשך

---

## ✅ 1. מיגרציות — הוחלו ידנית (21/6/2026)
המיגרציות העדכניות הוחלו ישירות דרך ה-SQL Editor של Supabase על פרויקט `ytqgeoviokgxxwalieev` (אומת מול ה-DB). `is_published` כבר היה קיים מקודם. מה שהוחל והופעל:
- `legal_documents` — `terms_sections` / `privacy_sections` / `legal_acknowledged_at` ✅
- `subscription_cancellation` — `cancel_at` / `cancel_type` ✅
- `cancel_reason` ✅
- `email_consents` — טבלה + RLS + RPC `unsubscribe_email` ✅
- `shabbat_mode` ✅

**הופעלו:** מסמכים משפטיים · ביטול מנוי (כולל טאב אדמין) · הסכמות והסרה למייל · "סגירת החנות בשבת". (פרסום אתר עבד גם קודם — `is_published` היה קיים.)

⚠️ **חשוב למתכנת:** לפרויקט הזה **אין** טבלת `supabase_migrations.schema_migrations` (נוצר ב-Lovable, לא נוהל ב-CLI). לכן `supabase db push` **לא** יעבוד כמו שהוא — צריך קודם **baseline** (למשל `supabase migration repair --status applied <version>` לכל המיגרציות הקיימות, או יצירת הטבלה וסימון הקיימות כ-applied). המיגרציות שהוחלו ידנית הן idempotent (`IF NOT EXISTS`), אז גם אם db push ירוץ עליהן שוב — לא ישבור.

## 🔴 2. לפרוס Edge Functions (`supabase functions deploy`)
הפונקציות הקיימות **כבר פרוסות** ב-`ytqgeoviokgxxwalieev` ועובדות (finalize-publish, icount-webhook, analyze-website, generate-*). שני דברים נשארו:
- **redeploy** לקוד המעודכן: `analyze-website` (SSRF-guard + זיהוי צבעים מ-CSS/meta), `finalize-publish`, `generate-*` — הקוד המקומי חדש מהפרוס.
- **`expire-subscriptions` (חדש, עדיין לא פרוס)** — פונקציית cron להורדת אתרים בתום תקופת ביטול. זה הפיצ'ר היחיד מבין החמישה שעדיין לא פעיל.
  - להגדיר משתנה סביבה `CRON_SECRET` + **תזמון יומי** שקורא לה עם הכותרת `x-cron-secret`.

## 🔴 3. הגדרת Google OAuth (התחברות עם גוגל)
שגיאת "Unsupported provider: missing OAuth secret" = ספק גוגל לא מוגדר.
1. Google Cloud Console → OAuth Client (Web) → Redirect URI: `https://ytqgeoviokgxxwalieev.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Providers → Google → Enable + Client ID + Secret.
3. Supabase → URL Configuration → Redirect URLs: `http://localhost:8080/auth/callback` ו-`https://quick-site.app/auth/callback`.

---

## 🟠 4. Cloudflare Pages — משתני סביבה (SEO / sitemap / שבת-פלטפורמה)
Pages → הפרויקט → Settings → Environment variables:
- `SUPABASE_URL` = (מ-`.env`: `VITE_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` = (מ-`.env`: `VITE_SUPABASE_PUBLISHABLE_KEY`)
- (אופציונלי) `SITE_URL`, `BASE_DOMAIN`
לוודא ש-Pages Functions (תיקיית `functions/`) פעילות → Redeploy.

## 🟠 5. Make.com — חיבור התראות הזמנות + רוטציית סוד
הקוד כבר שולח כל הזמנה ל-webhook (`useOrders.ts`). צריך: להגדיר את הכתובת + לבנות תרחיש ב-Make.com + **להחליף את הכתובת החשופה** (אבטחה).

## 🟠 6. Wildcard DNS לתת-דומיינים
ב-Cloudflare: רשומת `*.quick-site.app` → פרויקט ה-Pages. פעולה אחת מכסה את כל הלקוחות.

## 🟠 7. העלאה ל-GitHub
ה-commit מוכן ונקי (בלי סודות). gh מותקן וממתין ל-`gh auth login` (אישור בדפדפן של בעל החשבון), ואז יצירת repo פרטי ודחיפה.

---

## 🟢 8. אבטחה — הצפנת `payment_api_key` (נשמר גלוי)
## 🟢 9. Google Search Console — חיבור + הגשת sitemap (אחרי שיש דומיין חי)
## 🟢 10. ליישר קרדיטים חינמיים ל-AI (config=10, שרת=2 — להחליט מספר)
## 🟢 11. אוטומציית מיילים — שכבת השליחה
לבחור **ESP** (Smoove / ActiveTrail / Resend), לממש שליחה ב-Edge Function (נקודה אחת — `sendEmail`), ולהגדיר **אימות דומיין (SPF/DKIM/DMARC)**. (התבניות, הסדרות, ההסכמה וההסרה כבר בנויים.)

---

## החלטות / חומרים שצריך מכם (לא טכני)
- **עו"ד:** בדיקת נוסחי תקנון + פרטיות; דרישות **ישראכרט** לתקנון הסוחר. הישות המשפטית: **ארפור טכנולוגיות בע"מ, ח.פ. 517331708**.
  - ✅ **תקנון הפלטפורמה הוטמע (21/6/2026):** הנוסח הסופי המלא (9 פרקים, כולל ביטול/החזרים, DPA, AI, חוק הספאם) חי בעמוד `/terms` ([src/pages/Terms.tsx](src/pages/Terms.tsx)) + קישור בפוטר + **checkbox אישור תקנון בהרשמה** (חוסם הרשמה רגילה ו-Google). לעדכון עתידי — עורכים את `CHAPTERS` ב-Terms.tsx.
  - ⚠️ לתיקון במסמך המקור: סעיפים **9.7 ו-9.8 היו זהים** (הוטמע פעם אחת). פרק 2 (פרטיות) בתקנון **תמציתי יותר** מעמוד [/privacy](src/pages/Privacy.tsx) הקיים — השארתי את העמוד המפורט; לאמת עקביות מול העו"ד.
- **תשלומים:** בחירת ספק סליקה לפיילוט + דוגמת "קוד הטמעה" שלקוח מקבל מהספק.
- **דומיינים למכירה ברווח:** לא דרך Cloudflare (מחיר עלות) — צריך תוכנית Reseller. פרויקט נפרד.

---

### המלצה לזום
**סעיפים 1–4 הם הליבה.** ברגע שהם נעשים, כמעט כל מה שבנינו קופץ לחיים (פרסום, אבטחה, SEO, מסמכים, ביטולים, מיילים-הסכמה, שבת). לאחר מכן — **deploy מסודר ל-Cloudflare** לכתובת קבועה.
