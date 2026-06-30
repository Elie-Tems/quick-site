// Emails the comprehensive Siango investor deck to the two admins as a self-contained
// HTML attachment (openable / presentable offline) + a link to the live one at
// /presentation. Recipients hardcoded to admins; token guard via NEWSLETTER_TOKEN.
// All market-research figures are sourced; gaps are stated honestly (no fabrication).

const ADMINS = ["moti4384@gmail.com", "furmand713@gmail.com"];
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const G = "#0E9F6E";
const P = "#7C3AED";

type Group = { h: string; items: string[] };
type Slide = {
  kind: "cover" | "section" | "content" | "table" | "sources";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  points?: string[];
  groups?: Group[];
  note?: string;
  soon?: boolean;
  table?: { headers: string[]; rows: string[][] };
  sources?: { label: string; url: string }[];
};

const SLIDES: Slide[] = [
  // ── PART A: company + opportunity ──
  { kind: "cover", title: "siango", subtitle: "בניית חנות אונליין חכמה - בעברית, מהקצה לקצה, בדקות", eyebrow: "מצגת משקיעים · ארפור טכנולוגיות בע\"מ" },

  { kind: "section", eyebrow: "ההזדמנות", title: "הפער הישראלי", subtitle: "רוב העסקים הקטנים בישראל עוד לא באמת באונליין" },
  { kind: "content", eyebrow: "הבעיה", title: "עסק קטן בישראל מתקשה לעלות לאונליין",
    points: [
      "רק 62% מהעסקים בישראל מחזיקים אתר - מתחת לממוצע ה-OECD (77%)",
      "29% מהעסקים בישראל ללא שום נוכחות אינטרנטית",
      "רק ~34% מהאתרים בכלל מציגים מחירים - כלומר מעטים מוכרים אונליין באמת",
      "הפתרונות הקיימים יקרים, באנגלית, ולא נותנים עברית/RTL מלא",
    ],
    note: "מקור: הלשכה המרכזית לסטטיסטיקה דרך איגוד האינטרנט הישראלי (נתוני 2020-2021). isoc.org.il/sts-data" },

  { kind: "content", eyebrow: "גודל השוק", title: "שוק גדול וצומח - וקהל יעד ברור",
    groups: [
      { h: "מסחר אלקטרוני בישראל", items: ["21.4 מיליארד $ ב-2024 → 29.1 מיליארד $ עד 2028 (CAGR ~8%)", "90% מהישראלים קונים אונליין; חדירה 44.5% → 58.7% עד 2029"] },
      { h: "קהל היעד (SAM)", items: ["~600,000 עסקים פעילים בישראל", "מעל 90% מהם עסקים קטנים ובינוניים - בדיוק הלקוח של סיאנגו"] },
    ],
    note: "מקורות: Research and Markets (Israel Ecommerce Databook); trade.gov; Statista; israelbusiness.org.il. הערה: הגדרות שוק שונות נותנות מספרים שונים (Statista ~9.5B מול 21.4B) - הוצג המקור הרחב." },

  { kind: "content", eyebrow: "למה עכשיו", title: "הרוח הגבית",
    points: [
      "מסחר אלקטרוני בישראל ממשיך לצמוח, וחדירת הקונים עולה",
      "עלות הקליק בפרסום בישראל נמוכה בכ-55% מארה\"ב - רכישת לקוחות זולה יחסית",
      "תקדים ישראלי: Wix נוסדה בתל אביב (2006) והפכה למובילת קטגוריה עם 250M+ משתמשים - הוכחה שמכאן יוצאות מנהיגות עולמיות בתחום",
    ],
    note: "מקורות: WordStream (CPC ישראל מול ארה\"ב); Colorlib / MageComp (נתוני Wix). מספרי CPC לישראל הם הערכה נגזרת, לא מספר ישיר." },

  // ── PART B: the product, all features expanded ──
  { kind: "section", eyebrow: "המוצר", title: "מה סיאנגו עושה", subtitle: "פלטפורמה אחת - מהקמת החנות ועד ניהול מלא, בעברית" },

  { kind: "content", eyebrow: "ההתחלה", title: "אשף הקמה חכם (Onboarding)",
    points: [
      "תהליך מודרך צעד-צעד: תחום העסק → פרטים → עיצוב וצבעים → תמונה ראשית → מוצרים → משלוחים ותשלומים → פרסום",
      "ה-AI מציע לאורך הדרך: תיאורי מוצר, תמונות, וטקסט 'אודות'",
      "תצוגה מקדימה חיה לכל אורך הבנייה",
      "מסרים מרגיעים: אפשר תמיד להרחיב, לשנות ולסדר אחר כך בדשבורד",
      "סיור מודרך בכניסה הראשונה לדשבורד",
    ] },

  { kind: "content", eyebrow: "תוכן החנות", title: "ניהול מוצרים - הכל במקום אחד",
    groups: [
      { h: "5 דרכים להוסיף מוצרים", items: ["ידני · קובץ Excel · קובץ PDF · סריקת קישור מאתר קיים · הקלטה קולית"] },
      { h: "ארגון", items: ["רשימה / קטגוריות / מבצעים ומובילים - בטאבים", "שדות מותאמים, מק\"ט, סדר תצוגה, גרירה"] },
      { h: "AI לתמונות", items: ["יצירת תמונת מוצר ב-AI + עריכת תמונה ('רקע לבן', 'תאורה חמה')", "גלריית תמונות AI"] },
    ] },

  { kind: "content", eyebrow: "בינה מלאכותית", title: "AI לאורך כל המערכת",
    points: [
      "כתיבת תיאורי מוצר אוטומטית",
      "יצירת ועריכת תמונות מוצר ותמונת Hero",
      "כתיבת טקסט 'אודות' מקצועי (מטקסט או מהקלטה קולית)",
      "סריקת קטלוג שלם מקישור לאתר קיים",
      "תמלול קולי להוספת מוצרים בדיבור",
    ] },

  { kind: "content", eyebrow: "ניהול מכירות", title: "הזמנות",
    points: [
      "ניהול כל ההזמנות + סטטוסים שנשמרים (התקבלה / בטיפול / נשלחה / הושלמה / בוטלה)",
      "פרטי לקוח, כתובת משלוח, ומה הוזמן",
      "הדפסה וייצוא",
      "תשלום במזומן (COD) או סליקה אונליין",
      "מייל 'כסף-קודם' לסוחר על כל הזמנה ('💰 נכנסה הזמנה על ₪...')",
    ] },

  { kind: "content", eyebrow: "CRM (פרימיום)", title: "CRM · טאב לקוחות - כל היכולות",
    groups: [
      { h: "כרטיס לקוח", items: ["נבנה אוטומטית מההזמנות · סך רכישות (LTV) · ציר זמן רכישות מלא"] },
      { h: "סגמנטציה חכמה (RFM)", items: ["סטטוס אוטומטי: חדש / פעיל / בסיכון / רדום · זיהוי VIP · לקוחות חוזרים"] },
      { h: "תזכורת רכישה חוזרת", items: ["לומד את קצב הקנייה האישי ומסמן מי שהגיע זמנו להזמין שוב - opt-in, לא נשלח אוטומטית"] },
      { h: "ניהול ופעולות", items: ["תגיות והערות פנימיות · שליחת הטבה בוואטסאפ / התקשרות / מייל · ייצוא לאקסל · אזורי הזדמנות"] },
    ] },

  { kind: "content", eyebrow: "CRM (פרימיום)", title: "CRM · טאב ספקים",
    points: [
      "כרטיס ספק מסודר לכל ספק: איש קשר, טלפון, מייל, הערות (תנאי תשלום, אספקה, מינימום)",
      "הרשימה נבנית אוטומטית מהספק שהוזן במוצרים - לא צריך להקליד פעמיים",
      "כל המוצרים מכל ספק במקום אחד",
      "יצירת קשר ישירה מהכרטיס (וואטסאפ / טלפון / מייל)",
    ] },

  { kind: "content", eyebrow: "CRM (פרימיום)", title: "CRM · טאב רווחיות",
    points: [
      "מזינים מחיר עלות + ספק לכל מוצר (אופציונלי, פנימי בלבד - הלקוח לא רואה)",
      "רווח ואחוז רווח לכל מוצר, אוטומטית",
      "סך רווח גולמי מהמכירות + אחוז רווח כולל",
      "התראת מוצרים ברווחיות נמוכה (לתמחור מחדש)",
      "רווח לפי ספק · צילום עלות בזמן ההזמנה לשמירת דיוק היסטורי",
    ],
    note: "מודל עסקי: שלושת הטאבים (לקוחות+ספקים+רווחיות) הם תוסף פרימיום ב-₪49/חודש. כולם רואים דמו; רק משלם מפעיל." },

  { kind: "content", eyebrow: "חווית הקנייה", title: "החנות שהלקוח רואה",
    groups: [
      { h: "מציאת מוצרים", items: ["חיפוש מוצרים חי · מיון (מחיר/שם) · סינון (מבצעים/חדש/חם)"] },
      { h: "המרה", items: ["עגלה וצ'ק-אאוט · חלון מבצע קופץ (פופאפ) לכל קמפיין · באנרים · מועדפים"] },
      { h: "אמון", items: ["ביקורות Google · אימות גיל (מוצרים מתאימים) · עמודי תקנון/פרטיות · נגישות מלאה"] },
    ] },

  { kind: "content", eyebrow: "מראה", title: "עיצוב החנות",
    points: [
      "תבניות, פונטים, צבע מותג ראשי, תמונת Hero",
      "ניהול באנרים (כולל באנרי קמפיין)",
      "מצב בהיר/כהה · עברית RTL מהיסוד",
      "כל שינוי מתעדכן בחנות מיד",
    ] },

  { kind: "content", eyebrow: "צמיחה", title: "שיווק וקידום",
    groups: [
      { h: "קמפיינים והנחות", items: ["קמפיינים עם מחירי מבצע · חלון מבצע קופץ · קופונים (אחוז/סכום, תוקף, מינימום)"] },
      { h: "מעקב ואנליטיקה", items: ["תגי מעקב: Meta / Google / TikTok / GTM (תוסף ₪149) · מקורות הגעה ותובנות"] },
      { h: "מוניטין", items: ["ביקורות Google בחנות (תוסף ₪14/חודש)"] },
    ] },

  { kind: "content", eyebrow: "שיווק", title: "מערכת דיוור מובנית (ESP) - כמו רב-מסר",
    points: [
      "אנשי קשר, סגמנטים לפי תגיות, וקמפיינים - עם עורך מיילים",
      "שליחה מתוזמנת + אוטומציות: ברוכים הבאים, עגלה נטושה, יום הולדת",
      "מעקב פתיחות והקלקות (analytics אמיתי)",
      "תואם חוק הספאם הישראלי (הסרה, רשימת חסומים)",
      "נמכר גם כמוצר עצמאי - לא רק ללקוחות החנות",
    ] },

  { kind: "content", eyebrow: "תפעול", title: "סליקה, משלוחים ודומיין",
    groups: [
      { h: "סליקה (מודל פר-סוחר)", items: ["PayPlus חי · נוספים בקרוב (HYP/Cardcom/iCount/Tranzila/PayPal) · 'הזמנות בלבד' ללא סליקה", "הכסף נכנס ישירות לחשבון הסוחר - לא דרך סיאנגו"] },
      { h: "משלוחים", items: ["אזורי משלוח ומחירים · משלוח חינם מסכום · איסוף עצמי"] },
      { h: "דומיין", items: ["רכישת דומיין מתוך המערכת · דומיינים מותאמים"] },
    ] },

  { kind: "content", eyebrow: "אמון ותאימות", title: "מוכן לרגולציה הישראלית",
    points: [
      "מע\"מ מוצג בכל המערכת (+מע\"מ)",
      "הצהרת נגישות + ווידג'ט נגישות (תקן IS 5568) - חובה בחוק",
      "תקנון ומדיניות פרטיות לחנות, ושער אישור משפטי לפני עלייה לאוויר",
      "אבטחה: RLS, אימות webhooks, הגבלות קצב, ניטור ו-uptime",
    ] },

  { kind: "content", eyebrow: "תמיכה", title: "מרכז ידע ובוט חכם",
    points: [
      "מרכז ידע עם חיפוש - מאות שאלות ותשובות",
      "בוט עזרה בעברית בכל עמוד, מבוסס AI",
      "ריבוי שפות (עברית/אנגלית/ערבית/צרפתית/רוסית) - שפה אוטומטית לפי מיקום",
    ] },

  // ── PART C: roadmap, expanded ──
  { kind: "section", eyebrow: "מה מגיע", title: "החזון - הרבה מעבר לחנות", subtitle: "כל אחד מהבאים נבנה כדי להפוך את סיאנגו למערכת ההפעלה של העסק" },

  { kind: "content", eyebrow: "בקרוב", soon: true, title: "וואטסאפ - כל היכולות המתוכננות",
    points: [
      "שיחות עם לקוחות מתוך כרטיס הלקוח ב-CRM (Inbox מאוחד)",
      "דיוור וקמפיינים בוואטסאפ (broadcast)",
      "בוט אוטומטי למענה, תיאום ותמיכה",
      "חיבור בלחיצה (Embedded Signup) דרך Twilio BSP",
      "מודל מספר: המספר של הסוחר + תוסף בתשלום",
    ] },

  { kind: "content", eyebrow: "בקרוב", soon: true, title: "עוד מנועי הכנסה חוזרת",
    groups: [
      { h: "מייל עסקי", items: ["תיבות דואר על הדומיין של העסק (מודל reseller) - הכנסה חוזרת"] },
      { h: "דומיינים", items: ["הרחבת רכישת דומיינים + .co.il · חיבור אוטומטי לחנות"] },
      { h: "CRM Pro", items: ["אוטומציות שיווק, המלצות מוצר ('קנו גם'), מועדון נקודות, אזור 'החשבון שלי' ללקוח"] },
      { h: "חיוב", items: ["חיוב חוזר (הוראת קבע) דרך iCount"] },
    ] },

  // ── PART D: market + competition ──
  { kind: "section", eyebrow: "השוק והתחרות", title: "מי המתחרים - ולמה יש לנו פתח", subtitle: "הרבה יותר מ-Wix אחד" },

  { kind: "table", eyebrow: "נוף תחרותי", title: "מתחרים גלובליים - מחיר ועברית/RTL",
    table: {
      headers: ["פלטפורמה", "מחיר התחלתי למסחר", "עברית / RTL"],
      rows: [
        ["Wix (ישראלית)", "Core $29/חו'", "הטובה ביותר, אך RTL חלקי ב-Forms/Stores"],
        ["Shopify", "Basic $39/חו' +עמלה", "מוגבל - דורש אפליקציות/קוד"],
        ["Squarespace", "Basic $16/חו' +2%", "חלש מאוד - ממשק נשאר LTR"],
        ["Webflow", "$29/חו' +2%", "טוב אוטומטית, אך טכני ובתשלום נוסף"],
        ["Weebly (Square)", "~$15-32/חו'", "כמעט לא קיים"],
        ["Webador", "~$10.5/חו' (0% עמלה)", "לא קיים (אין עברית בכלל)"],
        ["BigCommerce / Square", "$29+ / חו'", "לא נמצא נתון לתמיכת RTL"],
      ],
    },
    note: "מקורות: עמודי תמחור רשמיים + Website Builder Expert. מחירים בחיוב שנתי, USD, נכון ל-2025; משתנים לפי מדינה/מטבע. נתוני RTL ממסמכי התמיכה הרשמיים של כל פלטפורמה." },

  { kind: "content", eyebrow: "השוק המקומי", title: "גם בישראל - שדה צפוף, בלי מנהיג עברית-first",
    points: [
      "השוק נשלט בפועל ע\"י זרים: WooCommerce ~55% מהחנויות בישראל, Shopify ~10,875 חנויות, Wix ~9,271 חנויות",
      "מתחרים ישראליים: SITE123, Konimbo, iStores, e-shop, Coi, Wobily, 2All - אף אחד לא דומיננטי",
      "אף פתרון לא מציע חבילה מלאה: עברית-first + CRM + רווחיות + AI + סליקה ישראלית, במחיר נגיש",
    ],
    note: "מקורות: StoreLeads / BuiltWith (ספירת חנויות משתנה לפי מתודולוגיה - הוצג כהערכה); עמודי תמחור רשמיים של הפלטפורמות הישראליות." },

  { kind: "content", eyebrow: "הבידול", title: "היתרון הברור: עברית ו-RTL מהיסוד",
    points: [
      "בדקנו 11+ מתחרים גלובליים ומקומיים - לאף אחד אין עברית/RTL מלא ונייטיב end-to-end מהקופסה",
      "Wix (הטובה ביותר) עדיין עם מגבלות RTL ב-Forms וב-Stores",
      "Shopify/Squarespace/Weebly דורשים קוד, אפליקציות בתשלום, או פשוט לא תומכים",
      "סיאנגו: עברית, RTL, מע\"מ, נגישות, וסליקה ישראלית - מובנים, לא תוספת",
    ],
    note: "מבוסס על מסמכי התמיכה הרשמיים של כל פלטפורמה (ראו שקף המקורות). זו נקודת הבידול המרכזית." },

  { kind: "content", eyebrow: "תקדים מנצח", title: "שחקן מקומי מנצח את הגלובלי - שוב ושוב",
    points: [
      "Tiendanube/Nuvemshop כבשה את אמריקה הלטינית מול Shopify - ~190K חנויות, שווי 3.1+ מיליארד $",
      "Shopline שולטת באסיה (700K+ מותגים); Loja Integrada כבשה את ברזיל",
      "הנוסחה זהה בכל אזור: שפה מקומית, תשלומים מקומיים, התאמה תרבותית - מה ש-Shopify לא נותן",
      "מכל המתחרים (גלובליים ואזוריים) רק ל-PrestaShop יש RTL נייטיב - והוא self-hosted וטכני, לא no-code",
    ],
    note: "מקורות: Store Leads; FreightWaves (שווי Tiendanube); PrestaShop devdocs (RTL). שחקן אזורי-נייטיב הוא דפוס מנצח מוכח - וישראל/עברית עוד פנויה." },

  { kind: "content", eyebrow: "כלכלת רכישה", title: "מילות מפתח ועלויות - מה שידוע, וביושר מה שלא",
    points: [
      "\"online store builder\" ~1,600 חיפושים/חודש (Ahrefs) - פוטנציאל תנועה גבוה לוריאציות",
      "CPC ממוצע בגוגל ~3.67$ גלובלי; בישראל נמוך בכ-55% מארה\"ב",
      "CAC טיפוסי לכלי SMB ב-SaaS: ~300-600$ ללקוח",
      "פער ביושר: נפחי חיפוש מדויקים בעברית דורשים חשבון Google Ads פעיל - טרם הופקו. לא המצאנו מספרים.",
    ],
    note: "מקורות: Ahrefs (דרך Style Factory); Chariot Creative / Digital Position (CPC 2024); WordStream (ישראל מול ארה\"ב); First Page Sage (CAC). נפחי חיפוש בעברית: לא נמצא נתון ציבורי מהימן." },

  { kind: "content", eyebrow: "מודל עסקי", title: "איך סיאנגו מרוויחה",
    groups: [
      { h: "מנוי בסיס", items: ["חבילות לפי גודל קטלוג: קלאסית ₪59 · פרו ₪79 · פרו+ ₪99 · פרמיום ₪149 (+מע\"מ)"] },
      { h: "תוספים (Upsell)", items: ["CRM (לקוחות+ספקים+רווחיות) ₪49/חו' · תגי מעקב ₪149 חד-פעמי · ביקורות Google ₪14/חו'"] },
      { h: "הכנסה חוזרת עתידית", items: ["וואטסאפ · מייל עסקי · דומיינים · CRM Pro"] },
    ] },

  { kind: "content", eyebrow: "סיכום", title: "למה סיאנגו, למה עכשיו",
    points: [
      "שוק גדול עם פער מובהק: רוב העסקים הקטנים בישראל עוד לא מוכרים אונליין",
      "מוצר רחב ובוגר: בנייה + מכירה + CRM + רווחיות + שיווק + AI - הכל בעברית",
      "בידול אמיתי: עברית/RTL/מע\"מ/נגישות/סליקה ישראלית מהיסוד - מה שלמתחרים אין",
      "מודל הכנסה מרובד עם הרבה מנועי צמיחה עתידיים (וואטסאפ, מייל, דומיינים)",
    ] },

  { kind: "sources", title: "מקורות (נבחר)",
    sources: [
      { label: "פער דיגיטלי בישראל - איגוד האינטרנט / למ\"ס", url: "https://isoc.org.il/sts-data" },
      { label: "מסחר אלקטרוני ישראל - trade.gov", url: "https://www.trade.gov/country-commercial-guides/israel-ecommerce" },
      { label: "גודל שוק - Research and Markets", url: "https://www.researchandmarkets.com/reports/5648301" },
      { label: "Wix pricing", url: "https://www.websitebuilderexpert.com/website-builders/wix-pricing/" },
      { label: "Shopify pricing", url: "https://www.shopify.com/pricing" },
      { label: "Shopify RTL (אפליקציה)", url: "https://apps.shopify.com/rtlmaster" },
      { label: "Squarespace RTL (פורום רשמי)", url: "https://forum.squarespace.com/topic/208903-right-to-left-script/" },
      { label: "CPC ישראל מול ארה\"ב - WordStream", url: "https://www.wordstream.com/blog/average-cost-per-click" },
      { label: "CAC ל-SaaS - First Page Sage", url: "https://firstpagesage.com/reports/b2b-saas-customer-acquisition-cost-2024-report/" },
    ] },

  { kind: "cover", title: "siango", subtitle: "בשלב הבדיקות - הכל פתוח וללא תשלום · siango.app", eyebrow: "תודה" },
];

const bullet = (txt: string, accent: string) =>
  `<li style="display:flex;gap:12px;align-items:flex-start;font-size:19px;line-height:1.5;margin:11px 0;color:rgba(255,255,255,.92)"><span style="margin-top:9px;width:8px;height:8px;border-radius:50%;background:${accent};flex:0 0 auto"></span><span>${txt}</span></li>`;

const slideHtml = (s: Slide, idx: number) => {
  const accent = s.soon ? P : G;
  let inner = "";
  if (s.kind === "cover") {
    inner = `<div style="text-align:center">
      ${s.eyebrow ? `<div style="font-size:13px;letter-spacing:2px;color:rgba(255,255,255,.45);font-weight:700;margin-bottom:20px">${s.eyebrow}</div>` : ""}
      <div style="font-size:64px;font-weight:800;color:${idx === 0 ? G : "#fff"}">${s.title}</div>
      <div style="font-size:22px;color:${accent};margin-top:18px;font-weight:700">${s.subtitle || ""}</div></div>`;
  } else if (s.kind === "section") {
    inner = `<div style="border-right:4px solid ${accent};padding-right:24px">
      <div style="font-size:14px;letter-spacing:2px;color:${accent};font-weight:800">${s.eyebrow || ""}</div>
      <div style="font-size:48px;font-weight:800;margin:10px 0 14px">${s.title}</div>
      <div style="font-size:21px;color:rgba(255,255,255,.7)">${s.subtitle || ""}</div></div>`;
  } else if (s.kind === "content") {
    const head = `<div style="font-size:13px;letter-spacing:2px;color:${accent};font-weight:800">${s.eyebrow || ""}${s.soon ? " · בקרוב" : ""}</div>
      <div style="font-size:36px;font-weight:800;margin:6px 0 22px">${s.title}</div>`;
    let body = "";
    if (s.groups) {
      body = s.groups.map((g) => `<div style="margin:0 0 18px">
        <div style="font-size:15px;font-weight:800;color:${accent};margin-bottom:4px">${g.h}</div>
        <ul style="list-style:none;padding:0;margin:0">${g.items.map((it) => bullet(it, accent)).join("")}</ul></div>`).join("");
    } else if (s.points) {
      body = `<ul style="list-style:none;padding:0;margin:0">${s.points.map((p) => bullet(p, accent)).join("")}</ul>`;
    }
    inner = head + body + (s.note ? `<div style="margin-top:22px;font-size:12px;color:rgba(255,255,255,.4);line-height:1.5;border-top:1px solid rgba(255,255,255,.1);padding-top:10px">${s.note}</div>` : "");
  } else if (s.kind === "table" && s.table) {
    const th = s.table.headers.map((h) => `<th style="text-align:right;padding:10px 12px;font-size:14px;color:${accent};border-bottom:2px solid ${accent}">${h}</th>`).join("");
    const rows = s.table.rows.map((r) => `<tr>${r.map((c, i) => `<td style="padding:9px 12px;font-size:15px;color:rgba(255,255,255,${i === 0 ? ".95" : ".8"});border-bottom:1px solid rgba(255,255,255,.08)${i === 0 ? ";font-weight:700" : ""}">${c}</td>`).join("")}</tr>`).join("");
    inner = `<div style="font-size:13px;letter-spacing:2px;color:${accent};font-weight:800">${s.eyebrow || ""}</div>
      <div style="font-size:34px;font-weight:800;margin:6px 0 18px">${s.title}</div>
      <table style="width:100%;border-collapse:collapse"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>
      ${s.note ? `<div style="margin-top:18px;font-size:12px;color:rgba(255,255,255,.4);line-height:1.5">${s.note}</div>` : ""}`;
  } else if (s.kind === "sources" && s.sources) {
    const items = s.sources.map((src) => `<li style="margin:9px 0;font-size:15px"><span style="color:rgba(255,255,255,.85)">${src.label}</span> <span style="color:rgba(255,255,255,.35);font-size:12px">${src.url}</span></li>`).join("");
    inner = `<div style="font-size:34px;font-weight:800;margin:0 0 18px">${s.title}</div><ul style="list-style:none;padding:0;margin:0">${items}</ul>
      <div style="margin-top:18px;font-size:12px;color:rgba(255,255,255,.4)">כל הנתונים מגובים במקורות. היכן שלא נמצא נתון מהימן - צוין במפורש. אין נתונים מומצאים.</div>`;
  }
  return `<section class="slide" style="display:${idx === 0 ? "flex" : "none"};min-height:100vh;align-items:center;justify-content:center;padding:56px 48px"><div style="max-width:860px;width:100%">${inner}</div></section>`;
};

const DECK_HTML = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>סיאנגו - מצגת משקיעים</title>
<style>body{margin:0;background:#0B1120;color:#fff;font-family:Heebo,Arial,sans-serif}.counter{position:fixed;top:18px;left:22px;font-size:13px;color:rgba(255,255,255,.4)}.dots{position:fixed;bottom:16px;left:0;right:0;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:0 40px}.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.22);border:none;cursor:pointer}.dot.on{background:${G}}.nav{position:fixed;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.08);border:none;color:#fff;font-size:26px;width:46px;height:46px;border-radius:50%;cursor:pointer;z-index:5}</style></head>
<body>${SLIDES.map(slideHtml).join("")}
<div class="counter" id="counter"></div>
<button class="nav" style="right:16px" onclick="go(-1)">&#8250;</button>
<button class="nav" style="left:16px" onclick="go(1)">&#8249;</button>
<div class="dots" id="dots"></div>
<script>var i=0,S=document.querySelectorAll('.slide');var d=document.getElementById('dots'),c=document.getElementById('counter');S.forEach(function(_,k){var b=document.createElement('button');b.className='dot'+(k===0?' on':'');b.onclick=function(){show(k)};d.appendChild(b)});function show(n){i=Math.max(0,Math.min(S.length-1,n));S.forEach(function(s,k){s.style.display=k===i?'flex':'none'});document.querySelectorAll('.dot').forEach(function(x,k){x.className='dot'+(k===i?' on':'')});c.textContent=(i+1)+' / '+S.length}function go(x){show(i+x)}show(0);document.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key===' ')go(1);if(e.key==='ArrowRight')go(-1)});</script>
</body></html>`;

const EMAIL_HTML = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:580px;margin:auto;padding:24px;color:#111827">
<div style="font-size:26px;font-weight:800;color:${G}">siango</div>
<p style="font-size:16px;line-height:1.7;color:#374151">מצורפת <b>מצגת המשקיעים המקיפה</b> על המערכת - כל הפיצ'רים (קיימים ובקרוב), מורחבים, יחד עם מחקר שוק ומתחרים מגובה במקורות.</p>
<p style="font-size:16px;line-height:1.7;color:#374151">פותחים את הקובץ המצורף בדפדפן ומדפדפים עם החיצים (←/→). אפשר גם להציג מהלינק:</p>
<p><a href="https://siango.app/presentation" style="display:inline-block;background:${G};color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 26px">פתיחת המצגת ↗</a></p>
<p style="font-size:13px;color:#6B7280;line-height:1.6">כל נתון במחקר השוק מגובה במקור; היכן שאין נתון מהימן - צוין במפורש (בלי המצאות).<br>סיאנגו · ארפור טכנולוגיות בע"מ</p></div>`;

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  // Accept either admin trigger secret (both are admin-only; guards the same action).
  const provided = url.searchParams.get("token") || req.headers.get("x-trigger-secret") || "";
  const valid = [Deno.env.get("NEWSLETTER_TOKEN"), Deno.env.get("CRON_SECRET")].filter(Boolean);
  if (!provided || !valid.includes(provided)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ ok: false, error: "no RESEND_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "סיאנגו <noreply@send.siango.app>",
      to: ADMINS,
      subject: "סיאנגו - מצגת משקיעים מקיפה 🎬📊",
      html: EMAIL_HTML,
      reply_to: "office@siango.app",
      attachments: [{ filename: "siango-investor-deck.html", content: toBase64(DECK_HTML) }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: res.ok, slides: SLIDES.length, id: (data as any)?.id, error: res.ok ? undefined : data }), {
    status: res.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
