// Ready-made email/newsletter templates. Each is a list of editor blocks the
// merchant can load and then edit freely (like Rav-Messer's template gallery).
// Block shape matches DashboardEmailEditor (type + props); the editor assigns ids.
// Use {{שם}} / {{שם_העסק}} merge tags - they're filled per recipient at send time.
// Deliberately spans sectors (store, non-profit, service, general) - not only retail.

export interface TemplateBlock {
  type: "text" | "button" | "image" | "banner" | "divider" | "spacer" | "columns" | "products" | "video" | "social";
  props: Record<string, unknown>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  accent: string; // brand color used in the template (preview tint)
  blocks: TemplateBlock[];
}

const txt = (text: string, extra: Record<string, unknown> = {}): TemplateBlock => ({
  type: "text", props: { text, align: "right", size: 15, color: "#333333", ...extra },
});
const btn = (text: string, color = "#0E9F6E"): TemplateBlock => ({
  type: "button", props: { text, url: "", color, align: "center" },
});
const banner = (title: string, bg: string): TemplateBlock => ({ type: "banner", props: { title, bg } });
const img = (): TemplateBlock => ({ type: "image", props: { url: "", alt: "תמונה" } });
const gap = (height = 16): TemplateBlock => ({ type: "spacer", props: { height } });
const line = (): TemplateBlock => ({ type: "divider", props: {} });
const products = (count = 3): TemplateBlock => ({ type: "products", props: { count } });
const cols = (count = 3): TemplateBlock => ({ type: "columns", props: { count } });

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ── חנות / מכירות ──────────────────────────────────────────────────────────
  {
    id: "sale", name: "מבצע / סייל", category: "חנות", accent: "#E24B4A",
    blocks: [
      banner("מבצע סוף עונה · עד 50% הנחה", "#E24B4A"),
      txt("שלום {{שם}}, רק לזמן מוגבל - הפריטים הכי מבוקשים במחירים שלא יחזרו."),
      products(3),
      btn("לקנייה עכשיו", "#E24B4A"),
    ],
  },
  {
    id: "new-product", name: "מוצר חדש", category: "חנות", accent: "#111827",
    blocks: [
      banner("חדש בחנות", "#111827"),
      img(),
      txt("הגיע הרגע - המוצר החדש שלנו כבר כאן. ריכזנו עבורך את כל מה שצריך לדעת."),
      btn("לצפייה במוצר", "#111827"),
    ],
  },
  {
    id: "back-in-stock", name: "חזר למלאי", category: "חנות", accent: "#0EA5E9",
    blocks: [
      banner("חזר למלאי", "#0EA5E9"),
      img(),
      txt("חדשות טובות, {{שם}} - הפריט שחיכית לו חזר למלאי. הכמות מוגבלת, אז כדאי להזדרז."),
      btn("להזמנה", "#0EA5E9"),
    ],
  },

  // ── עמותות / מלכ"רים ────────────────────────────────────────────────────────
  {
    id: "donation", name: "בקשת תרומה", category: "עמותות", accent: "#7C3AED",
    blocks: [
      banner("יחד נעשה את ההבדל", "#7C3AED"),
      img(),
      txt("שלום {{שם}}, מאחורי כל תרומה עומד אדם אמיתי שאתם עוזרים לו. גם תרומה קטנה יוצרת שינוי גדול."),
      btn("לתרומה מאובטחת", "#7C3AED"),
      gap(8),
      txt("{{שם_העסק}} · עמותה רשומה. תודה שאתם איתנו.", { align: "center", size: 13, color: "#888888" }),
    ],
  },
  {
    id: "donor-update", name: "עדכון לתורמים", category: "עמותות", accent: "#0E9F6E",
    blocks: [
      banner("מה עשינו עם התרומה שלכם", "#0E9F6E"),
      txt("{{שם}} היקר/ה, רצינו לעדכן אתכם בדיוק לאן הלך הכסף שתרמתם - כי מגיע לכם לדעת."),
      img(),
      txt("בזכותכם הצלחנו להגיע לעוד משפחות החודש. הסיפור המלא מחכה לכם."),
      btn("לקריאת העדכון המלא"),
    ],
  },
  {
    id: "impact-report", name: "דוח השפעה / סיכום שנה", category: "עמותות", accent: "#111827",
    blocks: [
      banner("השנה שלנו במספרים", "#111827"),
      txt("תודה שהייתם חלק מזה, {{שם}}. הנה מה שעשינו יחד השנה:", { align: "center" }),
      cols(3),
      line(),
      txt("ועוד הרבה לפנינו - בזכותכם.", { align: "center" }),
      btn("להמשך התמיכה", "#111827"),
    ],
  },

  // ── נותני שירות / בעלי מקצוע ────────────────────────────────────────────────
  {
    id: "appointment", name: "תזכורת תור", category: "שירות", accent: "#0EA5E9",
    blocks: [
      txt("תזכורת לתור שלך", { align: "center", size: 20, color: "#111827" }),
      txt("שלום {{שם}}, רק תזכורת קטנה לקראת המפגש הקרוב שלנו."),
      line(),
      txt("📅 התאריך · 🕒 השעה · 📍 המיקום", { align: "center", size: 14, color: "#555555" }),
      btn("לאישור או שינוי מועד", "#0EA5E9"),
    ],
  },
  {
    id: "service-update", name: "עדכון ללקוחות", category: "שירות", accent: "#0E9F6E",
    blocks: [
      banner("יש לנו עדכון בשבילכם", "#0E9F6E"),
      txt("שלום {{שם}}, רצינו לשתף אתכם בחדשות חשובות מ-{{שם_העסק}}."),
      txt("כתבו כאן את העדכון - שעות פעילות חדשות, שירות חדש, או כל מה שחשוב שהלקוחות ידעו."),
      btn("לפרטים נוספים"),
    ],
  },

  // ── כללי / תוכן ─────────────────────────────────────────────────────────────
  {
    id: "newsletter", name: "ניוזלטר", category: "כללי", accent: "#0E9F6E",
    blocks: [
      banner("העדכון התקופתי", "#0E9F6E"),
      txt("שלום {{שם}}, ריכזנו עבורך את החדשות, ההשקות והטיפים של התקופה."),
      img(),
      txt("רוצים לקרוא עוד? הכל מחכה לכם אצלנו."),
      btn("קראו עוד"),
      gap(8),
      { type: "social", props: {} },
    ],
  },
  {
    id: "event", name: "הזמנה לאירוע", category: "כללי", accent: "#111827",
    blocks: [
      banner("אתם מוזמנים", "#111827"),
      txt("{{שם}}, יש לנו אירוע מיוחד ונשמח לראות אתכם שם.", { align: "center" }),
      line(),
      txt("📅 התאריך · 🕒 השעה · 📍 המיקום", { align: "center", size: 14, color: "#555555" }),
      btn("אישור הגעה", "#111827"),
    ],
  },
  {
    id: "holiday", name: "ברכת חג", category: "כללי", accent: "#7C3AED",
    blocks: [
      banner("חג שמח!", "#7C3AED"),
      txt("{{שם}} היקר/ה, מכל הצוות של {{שם_העסק}} - חג שמח ומלא אור.", { align: "center" }),
      img(),
      txt("מאחלים לכם חג נעים ושמח."),
      btn("איתנו לחג", "#7C3AED"),
    ],
  },
  {
    id: "plain-letter", name: "מכתב אישי (טקסט בלבד)", category: "כללי", accent: "#6B7280",
    blocks: [
      txt("שלום {{שם}},", { size: 16, color: "#111827" }),
      txt("כתבו כאן את ההודעה שלכם בצורה אישית ופשוטה - בלי עיצוב מורכב, רק מילים מהלב. זה מתאים לעדכון אישי, תודה, או הודעה חשובה."),
      gap(8),
      txt("בברכה,\n{{שם_העסק}}", { size: 15, color: "#333333" }),
    ],
  },

  // ── אוטומציה (מחזור חיים) ───────────────────────────────────────────────────
  {
    id: "welcome", name: "ברוכים הבאים", category: "אוטומציה", accent: "#0E9F6E",
    blocks: [
      banner("ברוכים הבאים!", "#0E9F6E"),
      txt("שמחים שהצטרפת, {{שם}}! הנה הצצה ראשונה למה שמחכה לך אצלנו."),
      img(),
      txt("כמתנת הצטרפות - הטבה מיוחדת שמחכה לך בפעם הראשונה."),
      btn("בואו נתחיל"),
    ],
  },
  {
    id: "abandoned-cart", name: "עגלה נטושה", category: "אוטומציה", accent: "#F59E0B",
    blocks: [
      txt("שכחת משהו? 🛒", { align: "center", size: 20, color: "#111827" }),
      txt("שלום {{שם}}, שמנו לב שהשארת פריטים בעגלה. הם עדיין מחכים לך - אבל לא לעוד הרבה זמן."),
      products(2),
      btn("להשלמת ההזמנה", "#F59E0B"),
    ],
  },
  {
    id: "review-request", name: "בקשת ביקורת", category: "אוטומציה", accent: "#0E9F6E",
    blocks: [
      txt("איך היה? 🌟", { align: "center", size: 20, color: "#111827" }),
      txt("שלום {{שם}}, נשמח מאוד לשמוע מה חשבת. ביקורת קצרה עוזרת לנו (ולעוד אנשים) המון."),
      btn("להשארת ביקורת"),
      gap(8),
      txt("תודה שבחרת ב-{{שם_העסק}}.", { align: "center", size: 13, color: "#888888" }),
    ],
  },
  {
    id: "win-back", name: "התגעגענו (Win-back)", category: "אוטומציה", accent: "#E24B4A",
    blocks: [
      banner("התגעגענו אליך", "#E24B4A"),
      txt("שלום {{שם}}, מזמן לא ראינו אותך - וחבל, כי יש המון דברים חדשים שכדאי לך לגלות."),
      banner("מתנה לחזרה: 15% הנחה · קוד COMEBACK15", "#111827"),
      btn("חזרו אלינו", "#E24B4A"),
    ],
  },
];
