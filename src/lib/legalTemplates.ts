/**
 * Default Hebrew legal-document templates for customer stores.
 *
 * IMPORTANT: this content is a STARTING TEMPLATE only, not legal advice. The
 * store owner is responsible for reviewing it with a lawyer. The mandatory
 * disclaimer below is locked in the editor and cannot be removed.
 *
 * Placeholders {{businessName}} / {{businessEmail}} / {{businessPhone}} /
 * {{businessAddress}} are filled from the business details via
 * injectBusinessDetails().
 */

export interface LegalSection {
  id: string;
  heading: string;
  body: string;
  /** Locked sections (the disclaimer) cannot be deleted or edited. */
  locked?: boolean;
}

export type LegalDocType = "terms" | "privacy";

// Non-removable liability disclaimer shown at the top of every legal document.
export const LEGAL_DISCLAIMER =
  "מסמך זה ניתן כתבנית והצעה בלבד ואינו מהווה ייעוץ משפטי. האחריות המשפטית לבדיקת המסמך, " +
  "להתאמתו לעסק ולדרישות החוק מוטלת על בעל האתר בלבד. מומלץ להיוועץ בעורך דין לפני הפרסום.";

const TERMS_SECTIONS: Omit<LegalSection, "id">[] = [
  {
    heading: "כללי",
    body:
      "תקנון זה מסדיר את תנאי השימוש באתר {{businessName}} (\"האתר\"). השימוש באתר ובשירותיו מהווה " +
      "הסכמה מצדכם לכל התנאים המפורטים בתקנון זה. אנא קראו אותו בעיון לפני ביצוע רכישה.",
  },
  {
    heading: "השימוש באתר",
    body:
      "האתר מיועד לשימוש אישי ולא מסחרי. המשתמש מתחייב להשתמש באתר בהתאם לחוק ולא לבצע כל פעולה " +
      "העלולה לפגוע באתר, במשתמשים אחרים או בצדדים שלישיים.",
  },
  {
    heading: "הזמנות ותשלומים",
    body:
      "המחירים באתר נקובים בש\"ח וכוללים מע\"מ אלא אם צוין אחרת. השלמת הזמנה מהווה אישור לרכישה " +
      "בכפוף לאישור חברת האשראי/הסליקה. התשלום מתבצע באמצעי תשלום מאובטח, ופרטי האשראי אינם נשמרים " +
      "בשרתי האתר. {{businessName}} רשאי לבטל הזמנה במקרה של טעות במחיר, חשד להונאה או חוסר במלאי, " +
      "ובמקרה כזה יוחזר לרוכש מלוא הסכום ששולם.",
  },
  {
    heading: "מדיניות משלוחים",
    body:
      "זמני ועלויות המשלוח יפורטו בעת ביצוע ההזמנה. זמני האספקה הם משוערים ועשויים להשתנות בהתאם " +
      "לאזור החלוקה ולגורמים שאינם בשליטת העסק.",
  },
  {
    heading: "מדיניות החזרות, ביטולים והחזרים כספיים",
    body:
      "ביטול עסקה והחזרת מוצרים יתבצעו בהתאם לחוק הגנת הצרכן, התשמ\"א-1981, ולתקנות ביטול עסקה. " +
      "ניתן לבטל עסקה ולקבל החזר כספי בתוך 14 ימים ממועד קבלת המוצר, בכפוף לתנאי החוק. ההחזר הכספי " +
      "יבוצע לאמצעי התשלום שבו בוצעה הרכישה. דמי ביטול (אם יחולו) ייגבו בהתאם לחוק. לבירור זכאות " +
      "להחזר או החלפה ניתן לפנות לכתובת {{businessEmail}}.",
  },
  {
    heading: "אחריות ושירות",
    body:
      "האחריות על המוצרים תינתן בהתאם לתנאי היצרן/הספק ולדין החל. {{businessName}} יפעל לטיפול " +
      "בפניות שירות בזמן סביר.",
  },
  {
    heading: "קניין רוחני",
    body:
      "כל הזכויות בתכני האתר, לרבות טקסטים, תמונות, לוגו ועיצוב, שמורות ל-{{businessName}}. אין " +
      "להעתיק, לשכפל או לעשות שימוש מסחרי בתכנים ללא אישור בכתב.",
  },
  {
    heading: "שינויים בתקנון",
    body:
      "{{businessName}} רשאי לעדכן תקנון זה מעת לעת. הנוסח המעודכן יחול ממועד פרסומו באתר.",
  },
  {
    heading: "יצירת קשר",
    body:
      "לכל שאלה או בקשה ניתן לפנות אל {{businessName}} בדוא\"ל {{businessEmail}} או בטלפון {{businessPhone}}.",
  },
];

const PRIVACY_SECTIONS: Omit<LegalSection, "id">[] = [
  {
    heading: "כללי",
    body:
      "מדיניות פרטיות זו מתארת כיצד {{businessName}} (\"אנחנו\") אוסף, משתמש ושומר על המידע של " +
      "המשתמשים באתר. אנו מכבדים את פרטיותכם ופועלים בהתאם לחוק הגנת הפרטיות, התשמ\"א-1981.",
  },
  {
    heading: "איסוף מידע",
    body:
      "אנו אוספים מידע שאתם מוסרים מרצונכם (כגון שם, טלפון, דוא\"ל וכתובת למשלוח) וכן מידע טכני " +
      "הנאסף אוטומטית בעת השימוש באתר (כגון כתובת IP ונתוני גלישה).",
  },
  {
    heading: "שימוש במידע",
    body:
      "המידע משמש לצורך עיבוד הזמנות, מתן שירות, יצירת קשר, שיפור האתר, ובכפוף להסכמתכם — לצרכים " +
      "שיווקיים.",
  },
  {
    heading: "שיתוף מידע עם צדדים שלישיים",
    body:
      "איננו מוכרים את המידע שלכם. ייתכן שיתוף מידע עם נותני שירות הכרחיים (כגון חברות סליקה ומשלוח) " +
      "אך ורק לצורך מתן השירות, או כנדרש על פי דין.",
  },
  {
    heading: "עוגיות (Cookies)",
    body:
      "האתר עושה שימוש בעוגיות לצורך תפעול תקין, שיפור חוויית המשתמש וניתוח שימוש. ניתן לנהל את " +
      "הגדרות העוגיות דרך הדפדפן.",
  },
  {
    heading: "אבטחת מידע",
    body:
      "אנו נוקטים באמצעים מקובלים לאבטחת המידע, אך לא ניתן להבטיח הגנה מוחלטת מפני גישה בלתי מורשית.",
  },
  {
    heading: "זכויות המשתמש",
    body:
      "בהתאם לדין, עומדת לכם הזכות לעיין במידע שנאסף עליכם, לבקש את תיקונו או מחיקתו. לבקשות מסוג זה " +
      "ניתן לפנות אל {{businessEmail}}.",
  },
  {
    heading: "בקשות מחיקת נתונים",
    body:
      "ניתן לבקש את מחיקת המידע האישי שלכם ממאגרי המידע שלנו בפנייה לכתובת {{businessEmail}}. נטפל " +
      "בבקשה בתוך זמן סביר ובכפוף לחובות שמירת מידע על פי דין.",
  },
  {
    heading: "שמירת נתונים",
    body:
      "אנו שומרים את המידע למשך הזמן הנדרש לצורך מתן השירות ולעמידה בדרישות חוקיות, ולאחר מכן נמחק " +
      "או ננטרל אותו.",
  },
  {
    heading: "יצירת קשר",
    body:
      "בכל שאלה בנושא פרטיות ניתן לפנות אל {{businessName}} בדוא\"ל {{businessEmail}} או בטלפון {{businessPhone}}.",
  },
];

let idCounter = 0;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${idCounter++}`;

/** Build a fresh document (disclaimer locked at top + template sections with ids). */
export function buildDefaultDocument(type: LegalDocType): LegalSection[] {
  const sections = type === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const disclaimer: LegalSection = {
    id: makeId("disclaimer"),
    heading: "הצהרת אחריות",
    body: LEGAL_DISCLAIMER,
    locked: true,
  };
  return [disclaimer, ...sections.map((s) => ({ ...s, id: makeId(type) }))];
}

/** Replace {{placeholders}} with business details for display. */
export function injectBusinessDetails(
  text: string,
  details: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null },
): string {
  return text
    .replace(/\{\{businessName\}\}/g, details.name || "העסק")
    .replace(/\{\{businessEmail\}\}/g, details.email || "—")
    .replace(/\{\{businessPhone\}\}/g, details.phone || "—")
    .replace(/\{\{businessAddress\}\}/g, details.address || "—");
}

export const LEGAL_DOC_TITLES: Record<LegalDocType, string> = {
  terms: "תקנון",
  privacy: "מדיניות פרטיות",
};
