# דוח ביקורת SEO מלא - Siango (סיאנגו)

**תאריך:** 2026-07-07
**דומיין:** https://siango.app
**סוג עסק שזוהה:** SaaS ישראלי (בונה אתרי מכירות) + פלטפורמת חנויות רב-דיירת (multi-tenant storefronts)
**ציון בריאות SEO כולל: ~69 / 100** (בינוני-טוב. תשתית איכותית, אבל שתי תקלות מונעות מהאתר להגיע לפוטנציאל.)

> הערה על המתודולוגיה: הביקורת נעשתה גם מול האתר החי (כזחלן Googlebot ו-facebookexternalhit) וגם מול קוד המקור המקומי וה-DB דרך ה-REST API. כל ממצא טכני אומת בפועל, לא נלקח מהערכה.

---

## תקציר מנהלים

### מה כבר טוב (בסיס חזק שלא צריך לגעת בו)
- **meta מלא בדף הבית** בתוך `index.html` הסטטי: title, description, keywords, canonical, Open Graph, Twitter card, theme-color, `lang=he dir=rtl`.
- **robots.txt מוקפד** - חוסם אזורי מערכת (dashboard/onboarding/auth/preview), מתיר במפורש זחלני AI (GPTBot, ChatGPT-User, Claude-Web, PerplexityBot, Google-Extended), מפנה ל-sitemap ול-llms.txt.
- **sitemap.xml דינמי** (Cloudflare Pages Function) שמונה אוטומטית כל חנות מפורסמת + עמוד ה-about שלה.
- **llms.txt** מלא ומדויק לזחלני AI (תיאור, קהל, תכונות, תמחור, מילות מפתח).
- **Edge-SSR אמיתי לחנויות** (`functions/_middleware.ts`): מזריק title/meta/OG/JSON-LD + בלוק תוכן גלוי-לזחלן דרך HTMLRewriter לפני שה-JS רץ. הנדסה מצוינת - פותר את בעיית ה-SPA לחנויות.
- **סכמות עשירות**: Organization, WebSite (עם SearchAction), SoftwareApplication, FAQPage בדף הבית; LocalBusiness, Product, ItemList, BreadcrumbList בחנויות.
- **security headers** (HSTS, nosniff, frame-options, referrer-policy) + CSP (עדיין במצב Report-Only).

### 5 הבעיות הקריטיות
1. **[קריטי] דירוג מזויף ב-schema** - `SEOHead.tsx` מזריק `aggregateRating` קבוע של 4.8 כוכבים מ-150 ביקורות. נתון מומצא. מפר את מדיניות הנתונים המובנים של גוגל (סיכון לפנדל/ביטול rich-results) וגם את כלל "בלי נתונים מזויפים" של הפרויקט.
2. **[גבוה] ה-SSR של חנויות נכשל לחנויות עם slug בעברית** כשה-URL מגיע כבייטים גולמיים (מה שסורקים חברתיים ושיתופים ידניים לרוב שולחים). רוב העסקים הישראליים = שם בעברית, ולכן רוב החנויות לא מקבלות תצוגה מקדימה בשיתוף ואינדוקס חלש.
3. **[גבוה] חנויות טסט מתפרסמות ומאונדקסות** - test20, טסט, moos, intorya, "הבינותי-בעמ" (כפילות של "הבינותי"), renove-studio ועוד. תוכן דק/כפול פוגע באיכות הדומיין.
4. **[גבוה] נתוני משלוח והחזרות קבועים בכל מוצר** - `StoreSEO.tsx` מצהיר בכל מוצר של כל חנות על "משלוח חינם" ו"14 יום החזרה חינם". לא נכון פר-סוחר, סיכון ב-Google Merchant + נתון לא אמיתי.
5. **[בינוני] עמודי השיווק המשניים חולקים את ה-meta של דף הבית** בסריקה ראשונה ובשיתופים (`/templates`, `/contact`, `/help`, `/register` וכו') - ה-meta הייחודי שלהם מוזרק רק ב-JS (react-helmet), וה-middleware לא מטפל בהם.

### 5 נצחונות מהירים
- למחוק את ה-`aggregateRating` המזויף (5 דקות, מסיר סיכון פנדל + מפר-כלל).
- לתקן את פענוח ה-slug ב-`_middleware.ts` כדי לתמוך ב-path בעברית גולמי.
- לקודד (percent-encode) את ה-`<loc>` בסיטמאפ במקום עברית גולמית.
- להוריד `/login` מהסיטמאפ (עמוד דק ללא ערך SEO).
- להזריק בלוק טקסט גלוי-לזחלן גם בדף הבית (כרגע `#root` ריק לגמרי ללא JS).

---

## 1. טכני (Technical SEO)

| נושא | מצב | פירוט |
|---|---|---|
| robots.txt | ✅ טוב | חוסם נכון, מתיר AI, מפנה ל-sitemap/llms.txt |
| sitemap.xml | ⚠️ עובד עם רעש | דינמי ותקין, אבל כולל חנויות טסט + `/login`; ה-`<loc>` בעברית גולמית (לא percent-encoded) |
| canonical | ✅ טוב | קיים בדף הבית ובחנויות (דרך middleware/helmet) |
| SPA rendering | ⚠️ חלקי | חנויות מקבלות edge-SSR; דף הבית ועמודי השיווק תלויים ב-JS בלבד |
| Hebrew-slug SSR | ❌ שבור | נכשל ל-path בעברית גולמי (ראה סעיף 6) |
| security headers | ✅ / ⚠️ | HSTS+nosniff+frame טובים; CSP עדיין Report-Only (לא אוכף) |
| HTTPS/HSTS | ✅ טוב | max-age שנה + includeSubDomains |

## 2. תוכן (Content)
- **דף הבית ללא טקסט גלוי-לזחלן ללא JS.** `<div id="root">` מכיל רק לואדר. Googlebot מרנדר JS ויקלוט, אבל זחלני AI (GPTBot וכו') שמותרים ב-robots אך לא מריצים JS רואים ריק. ה-llms.txt מפצה חלקית.
- **חנויות** מקבלות בלוק תוכן מוזרק (h1 + tagline + about + רשימת מוצרים) - טוב.
- **תוכן דק/כפול**: חנויות הטסט. "הבינותי" ו"הבינותי-בעמ" הן כמעט-כפילות.

## 3. On-Page
- **דף הבית**: title ~60 תווים ("סיאנגו - אתר מכירתי לעסק שלך תוך 5 דקות | בניית אתר מכירות מהירה"), description איכותי. מצוין.
- **עמודי משנה**: `/templates`, `/contact`, `/help` וכו' מחזירים לזחלן את ה-title של דף הבית (אומת: `/templates` כ-Googlebot מחזיר "סיאנגו - אתר מכירתי..."). ה-meta הייחודי מגיע רק אחרי ריצת JS.
- **חנויות**: title `{שם} | הזמנה אונליין` - טוב (כשה-SSR עובד).

## 4. Schema / נתונים מובנים
- **עשיר ומקצועי** ברובו.
- ❌ **`aggregateRating` מזויף** (4.8 / 150) ב-`SEOHead.tsx`. להסיר.
- ⚠️ **`softwareSchema` עם `offers` 99-299** - תואם ל-llms.txt, אמיתי. תקין.
- ⚠️ **shipping/returns קבועים** ב-`StoreSEO.tsx` (משלוח חינם + 14 יום החזרה חינם לכל מוצר). לא אמיתי פר-סוחר.

## 5. ביצועים (CWV)
- לא נמדד בשדה (דורש GSC/CrUX). מהקוד: preconnect לפונטים, `font-display:swap`, code-splitting (react-vendor/query/supabase/motion/icons בנפרד), modulepreload, לואדר מיידי CSS-only. פרקטיקות טובות.
- og-image.png: 200, ~158KB. תקין (לוודא 1200x630).
- **המלצה:** לחבר Google Search Console + CrUX למדידת שדה אמיתית לפני אופטימיזציית ביצועים.

## 6. הבאג של ה-SSR בעברית (פירוט טכני מלא)

**התסמין (אומת):** אותה חנות, אותו User-Agent, ההבדל היחיד הוא הקידוד ב-path.

| בקשה | תוצאה |
|---|---|
| `/store/moos` (ASCII) | ✅ `MOOS \| הזמנה אונליין` + בלוק seo-content |
| `/store/הבינותי` (בייטים גולמיים) | ❌ מחזיר את title של דף הבית |
| `/store/%D7%94%D7%91...` (percent-encoded) | ✅ `הבינותי \| הזמנה אונליין` |

**שורש הבעיה:** כשה-path מגיע כבייטים גולמיים של UTF-8, ה-runtime של Cloudflare מפרש אותם כ-Latin-1. `url.pathname` הופך ל-mojibake (כל בייט הופך לתו Latin-1 נפרד). `matchStoreRoute` מחלץ את ה-mojibake, `decodeURIComponent` לא משנה אותו (אין `%`), ואז `fetchStore` שולח ל-Supabase slug לא-תואם -> אין התאמה -> `null` -> ה-middleware נופל בבטחה (fail-open) חזרה ל-SPA -> הזחלן רואה את דף הבית.

**מה זה שובר בפועל:** תצוגות מקדימות בשיתוף (WhatsApp/Facebook/Twitter) לחנויות בשם עברי, ואינדוקס פחות אמין לזחלנים שלא מקודדים את ה-path. Googlebot לרוב מקודד ולכן כנראה תקין, אבל אסור להישען על זה.

**הנתונים ב-DB נקיים:** אומת דרך Node (UTF-8 תקין לכל השמות וה-slugs). אין שחיתות נתונים. הבעיה כולה בשכבת ה-request של ה-middleware.

**הכיוון לתיקון:**
1. ב-`_middleware.ts`: לשחזר את ה-slug נכון מ-`request.url` הגולמי (למשל לזהות path לא-ASCII ולפענח מ-bytes ב-UTF-8), במקום להסתמך על `url.pathname` שכבר עבר Latin-1.
2. ב-`functions/sitemap.xml.ts`: לקודד percent-encode את ה-slug ב-`<loc>` (גם תקן ה-sitemap דורש זאת).

## 7. תמונות
- og-image קיים ותקין. alt-text למוצרים בחנות: תלוי-משתמש (לבדוק בהמשך).

## 8. AI Search Readiness (GEO)
- ✅ llms.txt + זחלני AI מותרים + תוכן מוזרק בחנויות.
- ⚠️ דף הבית ריק מטקסט ללא JS -> זחלני AI ללא רינדור רואים ריק. מומלץ בלוק hero גלוי-לזחלן גם ל-`/`.

---

*הדוח נכתב ע"י ביקורת אוטומטית. תוכנית הפעולה המתועדפת: `docs/seo/ACTION-PLAN.md`.*
