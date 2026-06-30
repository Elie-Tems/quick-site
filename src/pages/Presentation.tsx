import { useState, useEffect, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import { ChevronRight, ChevronLeft } from "lucide-react";

// Standalone, presentable investor deck about Siango. Shareable link (/presentation),
// arrow-key / click navigation. RTL Hebrew, Siango branded. Mirrors the emailed deck
// (send-presentation). All market figures are sourced; data gaps stated honestly.

const G = "#0E9F6E";
const P = "#7C3AED";

type Group = { h: string; items: string[] };
interface Slide {
  kind: "cover" | "section" | "content" | "table" | "sources" | "end";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  points?: string[];
  groups?: Group[];
  note?: string;
  soon?: boolean;
  table?: { headers: string[]; rows: string[][] };
  sources?: { label: string; url: string }[];
}

const SLIDES: Slide[] = [
  { kind: "cover", title: "siango", subtitle: "בניית חנות אונליין חכמה - בעברית, מהקצה לקצה, בדקות", eyebrow: "מצגת משקיעים · ארפור טכנולוגיות בע\"מ" },

  { kind: "section", eyebrow: "ההזדמנות", title: "הפער הישראלי", subtitle: "רוב העסקים הקטנים בישראל עוד לא באמת באונליין" },
  { kind: "content", eyebrow: "הבעיה", title: "עסק קטן בישראל מתקשה לעלות לאונליין",
    points: [
      "רק 62% מהעסקים בישראל מחזיקים אתר - מתחת לממוצע ה-OECD (77%)",
      "29% מהעסקים בישראל ללא שום נוכחות אינטרנטית",
      "רק ~34% מהאתרים בכלל מציגים מחירים - מעטים מוכרים אונליין באמת",
      "הפתרונות הקיימים יקרים, באנגלית, ולא נותנים עברית/RTL מלא",
    ],
    note: "מקור: הלשכה המרכזית לסטטיסטיקה דרך איגוד האינטרנט הישראלי (נתוני 2020-2021)." },

  { kind: "content", eyebrow: "גודל השוק", title: "שוק גדול וצומח - וקהל יעד ברור",
    groups: [
      { h: "מסחר אלקטרוני בישראל", items: ["21.4 מיליארד $ ב-2024 → 29.1 מיליארד $ עד 2028 (CAGR ~8%)", "90% מהישראלים קונים אונליין; חדירה 44.5% → 58.7% עד 2029"] },
      { h: "קהל היעד (SAM)", items: ["~600,000 עסקים פעילים בישראל", "מעל 90% מהם עסקים קטנים ובינוניים - בדיוק הלקוח של סיאנגו"] },
    ],
    note: "מקורות: Research and Markets; trade.gov; Statista. הגדרות שוק שונות נותנות מספרים שונים - הוצג המקור הרחב." },

  { kind: "content", eyebrow: "למה עכשיו", title: "הרוח הגבית",
    points: [
      "מסחר אלקטרוני בישראל ממשיך לצמוח, וחדירת הקונים עולה",
      "עלות הקליק בפרסום בישראל נמוכה בכ-55% מארה\"ב - רכישת לקוחות זולה יחסית",
      "תקדים ישראלי: Wix נוסדה בת\"א (2006) והפכה למובילת קטגוריה עם 250M+ משתמשים",
    ],
    note: "מקורות: WordStream; Colorlib / MageComp. מספרי CPC לישראל הם הערכה נגזרת." },

  { kind: "section", eyebrow: "המוצר", title: "מה סיאנגו עושה", subtitle: "פלטפורמה אחת - מהקמת החנות ועד ניהול מלא, בעברית" },

  { kind: "content", eyebrow: "ההתחלה", title: "אשף הקמה חכם (Onboarding)",
    points: [
      "תהליך מודרך: תחום → פרטים → עיצוב → תמונה ראשית → מוצרים → משלוחים ותשלומים → פרסום",
      "ה-AI מציע תיאורי מוצר, תמונות וטקסט 'אודות'",
      "תצוגה מקדימה חיה לכל אורך הבנייה",
      "סיור מודרך בכניסה הראשונה + מסרים מרגיעים (אפשר תמיד להרחיב אח\"כ)",
    ] },

  { kind: "content", eyebrow: "תוכן החנות", title: "ניהול מוצרים - הכל במקום אחד",
    groups: [
      { h: "5 דרכים להוסיף מוצרים", items: ["ידני · Excel · PDF · סריקת קישור · הקלטה קולית"] },
      { h: "ארגון", items: ["רשימה / קטגוריות / מבצעים - בטאבים · שדות מותאמים, מק\"ט, גרירה"] },
      { h: "AI לתמונות", items: ["יצירת ועריכת תמונת מוצר · גלריית AI"] },
    ] },

  { kind: "content", eyebrow: "בינה מלאכותית", title: "AI לאורך כל המערכת",
    points: [
      "כתיבת תיאורי מוצר אוטומטית",
      "יצירת ועריכת תמונות מוצר ותמונת Hero",
      "כתיבת טקסט 'אודות' (מטקסט או מהקלטה קולית)",
      "סריקת קטלוג מקישור · תמלול קולי",
    ] },

  { kind: "content", eyebrow: "ניהול מכירות", title: "הזמנות",
    points: [
      "ניהול הזמנות + סטטוסים שנשמרים",
      "פרטי לקוח, כתובת, ומה הוזמן · הדפסה וייצוא",
      "תשלום במזומן (COD) או סליקה אונליין",
      "מייל 'כסף-קודם' לסוחר על כל הזמנה",
    ] },

  { kind: "content", eyebrow: "CRM (פרימיום)", title: "CRM · טאב לקוחות",
    groups: [
      { h: "כרטיס לקוח", items: ["נבנה אוטומטית מההזמנות · LTV · ציר זמן רכישות"] },
      { h: "סגמנטציה (RFM)", items: ["חדש / פעיל / בסיכון / רדום · VIP · חוזרים"] },
      { h: "תזכורת רכישה חוזרת", items: ["לומד את קצב הקנייה ומסמן מי שהגיע זמנו - opt-in"] },
      { h: "פעולות", items: ["תגיות, הערות · וואטסאפ/התקשרות/מייל/הטבה · ייצוא לאקסל"] },
    ] },

  { kind: "content", eyebrow: "CRM (פרימיום)", title: "CRM · טאב ספקים",
    points: [
      "כרטיס ספק: איש קשר, טלפון, מייל, הערות (תשלום/אספקה/מינימום)",
      "הרשימה נבנית אוטומטית מהמוצרים - לא צריך להקליד פעמיים",
      "כל המוצרים מכל ספק במקום אחד",
      "יצירת קשר ישירה (וואטסאפ/טלפון/מייל)",
    ] },

  { kind: "content", eyebrow: "CRM (פרימיום)", title: "CRM · טאב רווחיות",
    points: [
      "מחיר עלות + ספק לכל מוצר (פנימי בלבד)",
      "רווח ואחוז רווח לכל מוצר · רווח גולמי כולל",
      "התראת מוצרים ברווחיות נמוכה · רווח לפי ספק",
      "צילום עלות בזמן ההזמנה לדיוק היסטורי",
    ],
    note: "מודל: שלושת הטאבים = תוסף פרימיום ₪49/חודש. כולם רואים דמו; רק משלם מפעיל." },

  { kind: "content", eyebrow: "חווית הקנייה", title: "החנות שהלקוח רואה",
    groups: [
      { h: "מציאת מוצרים", items: ["חיפוש חי · מיון (מחיר/שם) · סינון (מבצעים/חדש/חם)"] },
      { h: "המרה", items: ["עגלה וצ'ק-אאוט · חלון מבצע קופץ · באנרים · מועדפים"] },
      { h: "אמון", items: ["ביקורות Google · אימות גיל · תקנון/פרטיות · נגישות"] },
    ] },

  { kind: "content", eyebrow: "שיווק", title: "שיווק, קידום ומערכת דיוור",
    groups: [
      { h: "קמפיינים", items: ["מחירי מבצע · חלון מבצע קופץ · קופונים"] },
      { h: "מעקב", items: ["תגי Meta/Google/TikTok/GTM (₪149) · ביקורות Google (₪14/חו') · תובנות"] },
      { h: "דיוור (ESP)", items: ["אנשי קשר, סגמנטים, עורך · אוטומציות (ברוכים הבאים/עגלה/יומולדת) · מעקב פתיחות · תואם חוק הספאם"] },
    ] },

  { kind: "content", eyebrow: "תפעול ותאימות", title: "סליקה, משלוחים, דומיין ורגולציה",
    groups: [
      { h: "סליקה (פר-סוחר)", items: ["PayPlus חי · נוספים בקרוב · 'הזמנות בלבד' · הכסף ישירות לסוחר"] },
      { h: "משלוחים ודומיין", items: ["אזורים, מחירים, חינם-מסכום, איסוף · רכישת דומיין מהמערכת"] },
      { h: "תאימות ישראלית", items: ["מע\"מ · נגישות IS 5568 · תקנון/פרטיות + שער אישור משפטי"] },
    ] },

  { kind: "section", eyebrow: "מה מגיע", title: "החזון - מעבר לחנות", subtitle: "להפוך את סיאנגו למערכת ההפעלה של העסק" },

  { kind: "content", eyebrow: "בקרוב", soon: true, title: "וואטסאפ - כל היכולות המתוכננות",
    points: [
      "שיחות עם לקוחות מתוך כרטיס ה-CRM (Inbox מאוחד)",
      "דיוור וקמפיינים בוואטסאפ (broadcast)",
      "בוט אוטומטי למענה, תיאום ותמיכה",
      "חיבור בלחיצה (Embedded Signup) דרך Twilio · מודל מספר של הסוחר + תוסף",
    ] },

  { kind: "content", eyebrow: "בקרוב", soon: true, title: "עוד מנועי הכנסה חוזרת",
    groups: [
      { h: "מייל עסקי", items: ["תיבות דואר על הדומיין (reseller) - הכנסה חוזרת"] },
      { h: "דומיינים", items: [".co.il + חיבור אוטומטי לחנות"] },
      { h: "CRM Pro", items: ["אוטומציות, המלצות מוצר, מועדון נקודות, אזור 'החשבון שלי'"] },
      { h: "חיוב", items: ["הוראת קבע דרך iCount"] },
    ] },

  { kind: "section", eyebrow: "השוק והתחרות", title: "מי המתחרים - ולמה יש פתח", subtitle: "הרבה יותר מ-Wix אחד" },

  { kind: "table", eyebrow: "נוף תחרותי", title: "מתחרים גלובליים - מחיר ועברית/RTL",
    table: {
      headers: ["פלטפורמה", "מחיר התחלתי", "עברית / RTL"],
      rows: [
        ["Wix (ישראלית)", "Core $29/חו'", "הטובה ביותר, אך RTL חלקי"],
        ["Shopify", "Basic $39 +עמלה", "מוגבל - דורש אפליקציות/קוד"],
        ["Squarespace", "$16 +2%", "חלש מאוד - ממשק LTR"],
        ["Webflow", "$29 +2%", "טוב אוטומטית, אך טכני ובתשלום"],
        ["Weebly / Webador", "~$10-32", "כמעט/לא קיים"],
        ["PrestaShop (אזורי)", "קוד פתוח", "RTL נייטיב - אך self-hosted/טכני"],
      ],
    },
    note: "מקורות: עמודי תמחור רשמיים + Website Builder Expert. מחירים שנתיים, USD, 2025." },

  { kind: "content", eyebrow: "השוק המקומי", title: "גם בישראל - שדה צפוף, בלי מנהיג עברית-first",
    points: [
      "נשלט בפועל ע\"י זרים: WooCommerce ~55% מהחנויות, Shopify ~10,875, Wix ~9,271",
      "מתחרים ישראליים: SITE123, Konimbo, iStores, e-shop, Coi, Wobily, 2All - אף אחד דומיננטי",
      "אף פתרון לא נותן חבילה מלאה: עברית-first + CRM + רווחיות + AI + סליקה ישראלית, בנגישות מחיר",
    ],
    note: "מקורות: StoreLeads / BuiltWith (ספירה משתנה לפי מתודולוגיה - הערכה); עמודי תמחור." },

  { kind: "content", eyebrow: "תקדים מנצח", title: "שחקן מקומי מנצח את הגלובלי - שוב ושוב",
    points: [
      "Tiendanube כבשה את אמריקה הלטינית מול Shopify - ~190K חנויות, שווי 3.1+ מיליארד $",
      "Shopline שולטת באסיה (700K+ מותגים); Loja Integrada בברזיל",
      "הנוסחה זהה: שפה מקומית, תשלומים מקומיים, התאמה תרבותית",
      "מכל המתחרים - רק ל-PrestaShop יש RTL נייטיב, והוא טכני/self-hosted",
    ],
    note: "מקורות: Store Leads; FreightWaves; PrestaShop devdocs. ישראל/עברית עוד פנויה." },

  { kind: "content", eyebrow: "הבידול", title: "היתרון הברור: עברית ו-RTL מהיסוד",
    points: [
      "בדקנו 11+ מתחרים - לאף אחד אין עברית/RTL מלא נייטיב end-to-end מהקופסה",
      "Wix (הטובה ביותר) עדיין עם מגבלות RTL ב-Forms וב-Stores",
      "Shopify/Squarespace/Weebly - קוד, אפליקציות בתשלום, או לא תומכים",
      "סיאנגו: עברית, RTL, מע\"מ, נגישות, סליקה ישראלית - מובנים, לא תוספת",
    ] },

  { kind: "content", eyebrow: "כלכלת רכישה", title: "מילות מפתח ועלויות - מה שידוע, וביושר מה שלא",
    points: [
      "\"online store builder\" ~1,600 חיפושים/חודש (Ahrefs)",
      "CPC ממוצע ~3.67$ גלובלי; בישראל נמוך בכ-55% מארה\"ב",
      "CAC טיפוסי לכלי SMB ב-SaaS: ~300-600$ ללקוח",
      "ביושר: נפחי חיפוש מדויקים בעברית דורשים חשבון Google Ads פעיל - טרם הופקו. לא המצאנו מספרים.",
    ],
    note: "מקורות: Ahrefs; Digital Position; WordStream; First Page Sage. נפחי חיפוש בעברית: לא נמצא נתון ציבורי מהימן." },

  { kind: "content", eyebrow: "מודל עסקי", title: "איך סיאנגו מרוויחה",
    groups: [
      { h: "מנוי בסיס", items: ["קלאסית ₪59 · פרו ₪79 · פרו+ ₪99 · פרמיום ₪149 (+מע\"מ)"] },
      { h: "תוספים", items: ["CRM ₪49/חו' · תגי מעקב ₪149 · ביקורות ₪14/חו'"] },
      { h: "עתידי", items: ["וואטסאפ · מייל עסקי · דומיינים · CRM Pro"] },
    ] },

  { kind: "content", eyebrow: "סיכום", title: "למה סיאנגו, למה עכשיו",
    points: [
      "שוק גדול עם פער מובהק - רוב העסקים הקטנים עוד לא מוכרים אונליין",
      "מוצר רחב ובוגר: בנייה + מכירה + CRM + רווחיות + שיווק + AI, הכל בעברית",
      "בידול אמיתי: עברית/RTL/מע\"מ/נגישות/סליקה ישראלית מהיסוד",
      "מודל הכנסה מרובד עם מנועי צמיחה עתידיים",
    ] },

  { kind: "sources", title: "מקורות (נבחר)",
    sources: [
      { label: "פער דיגיטלי - איגוד האינטרנט / למ\"ס", url: "isoc.org.il/sts-data" },
      { label: "מסחר אלקטרוני ישראל", url: "trade.gov" },
      { label: "גודל שוק", url: "researchandmarkets.com" },
      { label: "Wix / Shopify / Squarespace pricing", url: "websitebuilderexpert.com · shopify.com" },
      { label: "RTL (אפליקציות/פורומים רשמיים)", url: "apps.shopify.com · forum.squarespace.com" },
      { label: "CPC ישראל · CAC SaaS", url: "wordstream.com · firstpagesage.com" },
    ] },

  { kind: "end", title: "siango", eyebrow: "בשלב הבדיקות - הכל פתוח וללא תשלום", subtitle: "siango.app" },
];

const Bullet = ({ txt, accent }: { txt: string; accent: string }) => (
  <li className="flex items-start gap-3 text-base md:text-lg text-white/90 leading-relaxed">
    <span className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
    <span>{txt}</span>
  </li>
);

const Presentation = () => {
  const [i, setI] = useState(0);
  const go = useCallback((d: number) => setI((p) => Math.max(0, Math.min(SLIDES.length - 1, p + d))), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === " ") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const s = SLIDES[i];
  const accent = s.soon ? P : G;

  return (
    <div dir="rtl" style={{ fontFamily: "Heebo, Arial, sans-serif" }} className="min-h-screen bg-[#0B1120] text-white flex flex-col">
      <SEOHead title="מצגת משקיעים | סיאנגו" noindex={true} />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          {s.kind === "cover" || s.kind === "end" ? (
            <div className="text-center">
              {s.eyebrow && <div className="text-sm tracking-widest text-white/45 font-bold mb-5">{s.eyebrow}</div>}
              <div className="text-5xl md:text-6xl font-extrabold tracking-tight" style={{ color: s.kind === "cover" ? G : "#fff" }}>{s.title}</div>
              {s.subtitle && <div className="text-xl md:text-2xl font-bold mt-5" style={{ color: accent }}>{s.subtitle}</div>}
            </div>
          ) : s.kind === "section" ? (
            <div className="pr-6" style={{ borderRight: `4px solid ${accent}` }}>
              <div className="text-sm tracking-widest font-extrabold" style={{ color: accent }}>{s.eyebrow}</div>
              <div className="text-4xl md:text-5xl font-extrabold my-3">{s.title}</div>
              <div className="text-lg md:text-xl text-white/70">{s.subtitle}</div>
            </div>
          ) : s.kind === "table" && s.table ? (
            <div>
              <div className="text-sm tracking-widest font-extrabold mb-1" style={{ color: accent }}>{s.eyebrow}</div>
              <div className="text-2xl md:text-3xl font-extrabold mb-5">{s.title}</div>
              <table className="w-full border-collapse">
                <thead><tr>{s.table.headers.map((h) => (
                  <th key={h} className="text-right p-2 text-sm" style={{ color: accent, borderBottom: `2px solid ${accent}` }}>{h}</th>
                ))}</tr></thead>
                <tbody>{s.table.rows.map((r, ri) => (
                  <tr key={ri}>{r.map((c, ci) => (
                    <td key={ci} className="p-2 text-sm border-b border-white/10" style={{ color: ci === 0 ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.8)", fontWeight: ci === 0 ? 700 : 400 }}>{c}</td>
                  ))}</tr>
                ))}</tbody>
              </table>
              {s.note && <div className="mt-4 text-xs text-white/40 leading-relaxed">{s.note}</div>}
            </div>
          ) : s.kind === "sources" && s.sources ? (
            <div>
              <div className="text-2xl md:text-3xl font-extrabold mb-5">{s.title}</div>
              <ul className="space-y-2">{s.sources.map((src, idx) => (
                <li key={idx} className="text-sm"><span className="text-white/85">{src.label}</span> <span className="text-white/35 text-xs">{src.url}</span></li>
              ))}</ul>
              <div className="mt-5 text-xs text-white/40">כל הנתונים מגובים במקורות. היכן שלא נמצא נתון מהימן - צוין במפורש. אין נתונים מומצאים.</div>
            </div>
          ) : (
            <div>
              <div className="text-sm tracking-widest font-extrabold" style={{ color: accent }}>{s.eyebrow}{s.soon ? " · בקרוב" : ""}</div>
              <div className="text-3xl md:text-4xl font-extrabold mb-6 mt-1">{s.title}</div>
              {s.groups ? (
                <div className="space-y-4">{s.groups.map((g, gi) => (
                  <div key={gi}>
                    <div className="text-sm font-extrabold mb-1.5" style={{ color: accent }}>{g.h}</div>
                    <ul className="space-y-1.5">{g.items.map((it, ii) => <Bullet key={ii} txt={it} accent={accent} />)}</ul>
                  </div>
                ))}</div>
              ) : (
                <ul className="space-y-3">{s.points?.map((p, idx) => <Bullet key={idx} txt={p} accent={accent} />)}</ul>
              )}
              {s.note && <div className="mt-5 pt-3 border-t border-white/10 text-xs text-white/40 leading-relaxed">{s.note}</div>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
        <button onClick={() => go(-1)} disabled={i === 0} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronRight className="w-6 h-6" /></button>
        <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-[60%]">
          {SLIDES.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} className="w-2 h-2 rounded-full transition-colors" style={{ background: idx === i ? G : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
        <button onClick={() => go(1)} disabled={i === SLIDES.length - 1} className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="w-6 h-6" /></button>
      </div>
      <div className="text-center text-xs text-white/30 pb-3">{i + 1} / {SLIDES.length} · חיצים לניווט</div>
    </div>
  );
};

export default Presentation;
