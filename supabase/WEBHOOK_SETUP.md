# הגדרת Webhooks אוטומטיים ב-Supabase

מדריך זה מסביר כיצד להפעיל webhooks אוטומטיים שנשלחים ל-Make.com כאשר נוצר משתמש חדש או עסק חדש.

## סקירה כללית

במקום לשלוח webhooks מהקליינט (React), השתמשנו בגישה מקצועית יותר:
- **Database Triggers** - מופעלים אוטומטית כשנוצר רשומה חדשה
- **pg_net Extension** - שולח HTTP requests ישירות מהדאטאבייס

## שלבי ההתקנה

### 1. הפעלת pg_net Extension

בקונסול של Supabase, הפעל את ה-extension:

```sql
-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

או דרך ה-Dashboard:
1. עבור ל-Database → Extensions
2. חפש "pg_net"
3. לחץ על "Enable"

### 2. הרצת Migration

הרץ את ה-migration שיוצר את ה-triggers:

```bash
# אם אתה משתמש ב-Supabase CLI
supabase db push

# או העתק את התוכן של הקובץ הזה והרץ ב-SQL Editor:
# supabase/migrations/20260306085331_webhook_notifications.sql
```

### 3. בדיקה שה-Triggers פועלים

אחרי ההתקנה, בדוק שה-triggers נוצרו:

```sql
-- בדוק שהפונקציות קיימות
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%webhook%';

-- בדוק שה-triggers קיימות
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%webhook%';
```

אמור להופיע:
- `send_user_registration_webhook` (function)
- `send_business_creation_webhook` (function)
- `on_user_registration_webhook` (trigger על profiles)
- `on_business_creation_webhook` (trigger על businesses)

## איך זה עובד?

### משתמש חדש נרשם:
1. משתמש נרשם דרך Supabase Auth
2. Trigger אוטומטי יוצר רשומה בטבלת `profiles`
3. ה-trigger `on_user_registration_webhook` מופעל
4. הפונקציה `send_user_registration_webhook` נקראת
5. Webhook נשלח ל-Make.com עם הנתונים:
   ```json
   {
     "type": "user_registration",
     "userId": "uuid",
     "email": "user@example.com",
     "fullName": "שם מלא",
     "authProvider": "email" או "google",
     "registeredAt": "2026-03-06T08:53:31Z"
   }
   ```

### עסק חדש נוצר:
1. משתמש יוצר עסק חדש דרך ה-onboarding
2. רשומה חדשה נוספת לטבלת `businesses`
3. ה-trigger `on_business_creation_webhook` מופעל
4. הפונקציה `send_business_creation_webhook` נקראת
5. Webhook נשלח ל-Make.com עם הנתונים:
   ```json
   {
     "type": "business_creation",
     "businessId": "uuid",
     "slug": "my-business",
     "businessName": "העסק שלי",
     "email": "business@example.com",
     "phone": "050-1234567",
     "businessCategory": "restaurant",
     "createdAt": "2026-03-06T08:53:31Z",
     "ownerId": "uuid"
   }
   ```

## יתרונות הגישה הזו

✅ **אמינות גבוהה** - הוובהוק נשלח מהשרת, לא מהקליינט  
✅ **אוטומטי לחלוטין** - אין צורך לזכור לשלוח webhook בכל מקום בקוד  
✅ **ביצועים טובים** - לא מעכב את הקליינט  
✅ **שגיאות לא מפילות** - אם הוובהוק נכשל, זה לא משפיע על יצירת המשתמש/עסק  
✅ **ריכוזי** - כל הלוגיקה של webhooks במקום אחד  

## פתרון בעיות

### הוובהוק לא נשלח?

1. בדוק שה-extension `pg_net` מופעל:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

2. בדוק את הלוגים ב-Supabase Dashboard:
   - Database → Logs
   - חפש warnings שמתחילים ב-"Failed to send"

3. בדוק שה-URL של Make.com נכון:
   ```sql
   -- ראה את הקוד של הפונקציה
   SELECT pg_get_functiondef('send_user_registration_webhook'::regproc);
   ```

### איך לבדוק ידנית?

```sql
-- סימולציה של יצירת משתמש חדש
INSERT INTO profiles (user_id, auth_provider) 
VALUES ('test-user-id', 'email');

-- סימולציה של יצירת עסק חדש
INSERT INTO businesses (name, slug, owner_id) 
VALUES ('Test Business', 'test-business', 'existing-profile-id');
```

## עדכון URL של Webhook

אם תרצה לשנות את ה-URL של Make.com בעתיד:

```sql
-- עדכן את הפונקציה של משתמשים
CREATE OR REPLACE FUNCTION send_user_registration_webhook()
RETURNS TRIGGER AS $$
-- ... (העתק את כל הפונקציה ושנה את ה-URL)
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- עדכן את הפונקציה של עסקים
CREATE OR REPLACE FUNCTION send_business_creation_webhook()
RETURNS TRIGGER AS $$
-- ... (העתק את כל הפונקציה ושנה את ה-URL)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## הסרת ה-Webhooks

אם תרצה להסיר את ה-webhooks:

```sql
-- הסר את ה-triggers
DROP TRIGGER IF EXISTS on_user_registration_webhook ON public.profiles;
DROP TRIGGER IF EXISTS on_business_creation_webhook ON public.businesses;

-- הסר את הפונקציות
DROP FUNCTION IF EXISTS send_user_registration_webhook();
DROP FUNCTION IF EXISTS send_business_creation_webhook();
```
