// Ready-made email/newsletter templates. Each is a list of editor blocks the
// merchant can load and then edit freely (like Rav-Messer's template gallery).
// Block shape matches DashboardEmailEditor (type + props); the editor assigns ids.
// Use {{שם}} / {{שם_העסק}} merge tags - they're filled per recipient at send time.

export interface TemplateBlock {
  type: "text" | "button" | "image" | "banner" | "divider" | "spacer" | "columns" | "products";
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

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "newsletter", name: "ניוזלטר שבועי", category: "תוכן", accent: "#0E9F6E",
    blocks: [
      banner("העדכון השבועי", "#0E9F6E"),
      txt("שלום {{שם}}, ריכזנו עבורך את החדשות, ההשקות והטיפים של השבוע."),
      img(),
      txt("רוצים לקרוא עוד? הכל מחכה לכם באתר."),
      btn("קראו עוד"),
    ],
  },
  {
    id: "sale", name: "מבצע / סייל", category: "מכירות", accent: "#E24B4A",
    blocks: [
      banner("מבצע סוף עונה · עד 50% הנחה", "#E24B4A"),
      txt("שלום {{שם}}, רק לזמן מוגבל - הפריטים הכי מבוקשים במחירים שלא יחזרו."),
      products(3),
      btn("לקנייה עכשיו", "#E24B4A"),
    ],
  },
  {
    id: "welcome", name: "ברוכים הבאים", category: "אוטומציה", accent: "#0E9F6E",
    blocks: [
      banner("ברוכים הבאים!", "#0E9F6E"),
      txt("שמחים שהצטרפת, {{שם}}! הנה הצצה ראשונה למה שמחכה לך אצלנו."),
      img(),
      txt("כמתנת הצטרפות - 10% הנחה על ההזמנה הראשונה עם הקוד WELCOME10."),
      btn("התחילו לקנות"),
    ],
  },
  {
    id: "new-product", name: "מוצר חדש", category: "מכירות", accent: "#111827",
    blocks: [
      banner("חדש בחנות", "#111827"),
      img(),
      txt("הגיע הרגע - המוצר החדש שלנו כבר כאן. ריכזנו עבורך את כל מה שצריך לדעת."),
      btn("לצפייה במוצר", "#111827"),
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
    id: "holiday", name: "ברכת חג", category: "תוכן", accent: "#7C3AED",
    blocks: [
      banner("חג שמח!", "#7C3AED"),
      txt("{{שם}} היקר/ה, מכל הצוות של {{שם_העסק}} - חג שמח ומלא אור."),
      img(),
      txt("לכבוד החג הכנו לך הטבה מיוחדת שמחכה באתר."),
      btn("להטבת החג", "#7C3AED"),
    ],
  },
  {
    id: "back-in-stock", name: "חזר למלאי", category: "מכירות", accent: "#0EA5E9",
    blocks: [
      banner("חזר למלאי", "#0EA5E9"),
      img(),
      txt("חדשות טובות, {{שם}} - הפריט שחיכית לו חזר למלאי. הכמות מוגבלת, אז כדאי להזדרז."),
      btn("להזמנה", "#0EA5E9"),
    ],
  },
  {
    id: "review-request", name: "בקשת ביקורת", category: "אוטומציה", accent: "#0E9F6E",
    blocks: [
      txt("איך היה? 🌟", { align: "center", size: 20, color: "#111827" }),
      txt("שלום {{שם}}, נשמח מאוד לשמוע מה חשבת על ההזמנה האחרונה שלך. ביקורת קצרה עוזרת לנו (ולעוד לקוחות) המון."),
      btn("להשארת ביקורת"),
      gap(8),
      txt("תודה שבחרת ב-{{שם_העסק}}.", { align: "center", size: 13, color: "#888888" }),
    ],
  },
  {
    id: "event", name: "הזמנה לאירוע", category: "תוכן", accent: "#111827",
    blocks: [
      banner("אתם מוזמנים", "#111827"),
      txt("{{שם}}, יש לנו אירוע מיוחד ונשמח לראות אותך שם.", { align: "center" }),
      line(),
      txt("📅 התאריך · 🕒 השעה · 📍 המיקום", { align: "center", size: 14, color: "#555555" }),
      btn("אישור הגעה", "#111827"),
    ],
  },
  {
    id: "win-back", name: "התגעגענו (Win-back)", category: "אוטומציה", accent: "#E24B4A",
    blocks: [
      banner("התגעגענו אליך", "#E24B4A"),
      txt("שלום {{שם}}, מזמן לא ראינו אותך - וחבל, כי יש המון דברים חדשים שכדאי לך לגלות."),
      banner("מתנה לחזרה: 15% הנחה · קוד COMEBACK15", "#111827"),
      btn("חזרו לקנות", "#E24B4A"),
    ],
  },
];
