/**
 * Chok HaSpam (Amendment 40) + Privacy Protection Law (Amendment 13) building
 * blocks. The MERCHANT is the legal sender/controller for store-customer email;
 * the platform's job is to make compliance easy and provable.
 *
 * Core duties this supports:
 *  - Explicit OPT-IN consent (not opt-out) before commercial email.
 *  - Provable consent record (timestamp, source, IP).
 *  - מאגר מידע disclosure at collection time (who collects, why, who receives).
 *  - Working unsubscribe, honored within 2 business days.
 *  - Access/erasure requests handled within 30 days (Amendment 13).
 */

/** A provable consent record — store one per opt-in (Chok HaSpam evidence). */
export interface ConsentRecord {
  email: string;
  businessId: string;
  /** Where consent was given, e.g. "checkout" | "newsletter_form" | "popup". */
  source: string;
  consentedAt: string; // ISO timestamp
  ipAddress?: string;
  /** The exact disclosure text the user agreed to (snapshot for evidence). */
  disclosureText: string;
}

/** Default opt-in checkbox label shown at collection (merchant name injected). */
export const consentLabel = (businessName: string): string =>
  `אני מאשר/ת לקבל מ${businessName} עדכונים והצעות בדוא"ל. ניתן להסיר בכל עת.`;

/** מאגר מידע disclosure shown near the opt-in (Amendment 13 — collection notice). */
export const databaseDisclosure = (businessName: string): string =>
  `הפרטים שתמסור יישמרו במאגר המידע של ${businessName} וישמשו ליצירת קשר, מתן שירות ושליחת עדכונים שיווקיים ` +
  `(בכפוף להסכמתך). באפשרותך לעיין בפרטיך, לתקנם או לבקש את מחיקתם בכל עת.`;

/** Build the merchant's unsubscribe URL for a given recipient token. */
export const buildUnsubscribeUrl = (siteUrl: string, slug: string, token: string): string =>
  `${siteUrl.replace(/\/$/, "")}/store/${slug}/unsubscribe?t=${encodeURIComponent(token)}`;

/** Compliance checklist — surface in the merchant UI before enabling campaigns. */
export const COMPLIANCE_CHECKLIST: { id: string; label: string }[] = [
  { id: "optin", label: "איסוף נמענים בהסכמה מפורשת (opt-in) בלבד" },
  { id: "disclosure", label: 'הצגת הודעת "מאגר מידע" בעת איסוף הפרטים' },
  { id: "unsubscribe", label: "קישור הסרה תקין בכל מייל, מטופל תוך יומיים" },
  { id: "sender", label: "זיהוי השולח + כתובת פיזית בתחתית המייל" },
  { id: "rights", label: "טיפול בבקשות עיון/מחיקה תוך 30 יום (תיקון 13)" },
];
