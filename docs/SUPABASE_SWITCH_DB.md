# החלפת פרויקט Supabase (DB חדש)

כשעוברים לפרויקט Supabase חדש עם כל הטבלאות המעודכנות - רשימת צ'ק ליסט.

---

## 1. משתני סביבה (`.env`)

עדכן ב־`.env` את הערכים מהפרויקט **החדש** ב־Supabase Dashboard → Settings → API:

```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...   # מפתח anon / public
VITE_SUPABASE_PROJECT_ID=YOUR_NEW_PROJECT_REF
```

- `VITE_ORDER_WEBHOOK_URL` - נשאר כמו שהוא (לא קשור ל־Supabase).

---

## 2. RLS (Row Level Security)

ב־DB החדש **חייבים** שה־RLS יוגדר כמו במיגרציות:

- **businesses** - כולם יכולים לקרוא (לחנות), רק הבעלים יכולים לעדכן/למחוק.
- **profiles** - קשור ל־`auth.uid()`.
- **products, banners, orders, order_items, campaigns** וכו' - לפי ownership (בעלים של העסק).

אם העתקת את כל המיגרציות והרצת אותן בפרויקט החדש - ה־RLS כבר אמור להיות מוגדר.  
אם יצרת טבלאות ידנית - צריך להוסיף ידנית:

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- `CREATE POLICY "..." ON ... FOR SELECT/INSERT/UPDATE/DELETE USING (...);`

פונקציות עזר שמשמשות ב־policies (אם קיימות במיגרציות):

- `is_business_owner(business_id)`
- `is_campaign_owner(campaign_id)`
- וכו'

וודא שהפונקציות האלה קיימות ב־DB החדש.

---

## 3. Auth (התחברות משתמשים)

- ב־Supabase החדש: **Authentication → Providers** - הפעל את מה שאתה משתמש (Email, Google וכו').
- **Authentication → URL Configuration** - הוסף את ה־Site URL ואת Redirect URLs של האתר (localhost + דומיין פרודקשן).
- משתמשים שנרשמו ב־DB הישן **לא** יועתקו אוטומטית - בפרויקט חדש צריך הרשמה מחדש (או migration של טבלת `auth.users` אם אתה מעתיק ידנית).

---

## 4. Storage (קבצים)

האפליקציה משתמשת ב־bucket:

- **`business-assets`** - תמונות עסק (לוגו, hero, תמונות מוצרים).

ב־DB החדש:

1. **Storage** → צור bucket בשם `business-assets`.
2. **Policies** של ה־bucket:
   - כולם (או anon) יכולים **לקרוא** (לצורך הצגת תמונות בחנות).
   - רק משתמשים מאומתים שהם בעלי העסק יכולים **להעלות/לעדכן/למחוק** (בהתאם ל־RLS שאתה רוצה).

אם יש buckets נוספים במיגרציות - צור גם אותם והגדר policies.

---

## 5. Edge Functions

האפליקציה קוראת ל־Supabase Functions:

- `generate-hero-image`
- `generate-product-image`
- (ואחרים בתיקייה `supabase/functions/`)

ב־פרויקט החדש:

- **Deploy** את ה־functions מהתיקייה `supabase/functions/` לפרויקט החדש (למשל `supabase functions deploy`).
- ב־Dashboard: **Edge Functions** → וודא שיש להן **Secrets** נדרשים (אם משתמשים ב־API keys ל־AI וכו').

ב־DB חדש ה־functions לא מועתקות אוטומטית - חייבים deploy מחדש.

---

## 6. Types (TypeScript)

אם ב־DB החדש יש **אותן** טבלאות ואותם שדות (למשל אחרי הרצת אותן מיגרציות):

- `src/integrations/supabase/types.ts` יכול להישאר כמו שהוא.

אם שינית שמות טבלאות/עמודות:

- הרץ `supabase gen types typescript` מול הפרויקט החדש והחלף את הקובץ, או עדכן ידנית.

---

## 7. סיכום צ'ק ליסט

| נושא | פעולה |
|------|--------|
| **.env** | עדכון URL + Publishable Key + Project ID מהפרויקט החדש |
| **טבלאות** | וידוא שכל המיגרציות הורצו (או שה־schema זהה) |
| **RLS** | וידוא שכל הטבלאות הרלוונטיות עם RLS ו־policies נכונים |
| **Auth** | הפערת providers ו־URLs בפרויקט החדש |
| **Storage** | יצירת bucket `business-assets` + policies |
| **Edge Functions** | Deploy מחדש + הגדרת secrets אם צריך |
| **משתמשים/נתונים** | בפרויקט חדש - אין נתונים; להעביר רק אם עושים migration ידני |

אחרי כל השלבים - רענן את האפליקציה (או הפעל מחדש את שרת הפיתוח) ובדוק התחברות, יצירת עסק, העלאת תמונה ופתיחת חנות.
