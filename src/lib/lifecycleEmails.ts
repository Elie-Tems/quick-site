// Catalog of merchant-editable TRANSACTIONAL / lifecycle emails (booking confirm,
// cart abandonment, donation thanks, ...). Distinct from the marketing-newsletter
// gallery in emailTemplates.ts. Each entry is the built-in DEFAULT; a merchant can
// disable an email or override any field via the email_templates DB table. The
// notification senders resolve: absent row -> this default; present row -> apply
// enabled + overrides. `module` filters which merchants see it (businessModules.ts).
// {name} is replaced with the customer's name at send time.

import type { ModuleKey } from "@/lib/businessModules";

export interface LifecycleEmailDef {
  key: string;
  label: string;                 // Hebrew, shown in the editor
  module: ModuleKey;             // which vertical it belongs to
  cancellable?: boolean;         // e.g. "appointment cancelled" - a provider may want it off
  defaults: { subject: string; heading: string; body: string; button?: string };
}

export const LIFECYCLE_EMAILS: LifecycleEmailDef[] = [
  // ── Commerce ──
  { key: "order_confirm", label: "אישור הזמנה", module: "commerce",
    defaults: { subject: "אישור הזמנה - תודה על הקנייה!", heading: "ההזמנה שלך התקבלה! 🎉",
      body: "שלום {name}, אנחנו כבר מכינים את ההזמנה. תודה שקנית אצלנו!", button: "מעקב אחר ההזמנה" } },
  { key: "cart_abandon", label: "נטישת עגלה", module: "commerce", cancellable: true,
    defaults: { subject: "השארת משהו בעגלה 🛒", heading: "שכחת משהו? 🛒",
      body: "{name}, שמרנו לך את העגלה - הפריטים עדיין זמינים. נשמח להשלים את ההזמנה.", button: "חזרה לעגלה" } },
  { key: "review_request", label: "בקשת ביקורת", module: "commerce", cancellable: true,
    defaults: { subject: "איך היה? נשמח לשמוע ⭐", heading: "איך הייתה הקנייה? ⭐",
      body: "{name}, תודה שבחרת בנו! דקה מזמנך תעזור לנו ולעוד לקוחות.", button: "דרג/י אותנו" } },

  // ── Booking (services) ──
  { key: "booking_confirm", label: "אישור תור", module: "booking",
    defaults: { subject: "התור שלך נקבע", heading: "התור שלך נקבע! 🎉",
      body: "שלום {name}, נשמח לראותך. נשלח תזכורת יום לפני.", button: "הוספה ליומן" } },
  { key: "booking_reminder", label: "תזכורת תור", module: "booking", cancellable: true,
    defaults: { subject: "תזכורת: יש לך תור מחר", heading: "תזכורת: תור מחר",
      body: "מחכים לך 💚 אם צריך לבטל, אפשר עדיין דרך הקישור בהזמנה.", button: "" } },
  { key: "booking_cancel", label: "ביטול תור", module: "booking", cancellable: true,
    defaults: { subject: "התור בוטל - נשמח לקבוע חדש", heading: "התור בוטל",
      body: "שלום {name}, התור בוטל. מקדמה ששולמה תוחזר תוך 3-5 ימי עסקים. נשמח לראותך בקרוב.", button: "קביעת תור חדש" } },

  // ── Listings (real estate / vehicles) ──
  { key: "lead_reply", label: "אישור פנייה ללקוח", module: "listings",
    defaults: { subject: "קיבלנו את פנייתך - נחזור אליך בהקדם", heading: "קיבלנו את פנייתך ✓",
      body: "שלום {name}, תודה שפנית. נציג יחזור אליך תוך יום עסקים.", button: "" } },

  // ── Donations (nonprofit) ──
  { key: "donation_thanks", label: "תודה על תרומה", module: "donations",
    defaults: { subject: "תודה על תרומתך 💚", heading: "תודה מכל הלב 🙏",
      body: "{name} יקר/ה, תרומתך עוזרת לנו לשנות חיים. תודה שאת/ה איתנו.", button: "" } },
  { key: "donation_recurring", label: "חיוב תרומה חוזרת", module: "donations", cancellable: true,
    defaults: { subject: "תרומתך החודשית התקבלה 💚", heading: "החיוב החודשי התקבל",
      body: "{name}, תרומתך החודשית חויבה בהצלחה. תודה שאת/ה איתנו לאורך זמן 🙏", button: "" } },
];

export const lifecycleEmailsForModules = (modules: ModuleKey[]): LifecycleEmailDef[] =>
  LIFECYCLE_EMAILS.filter((t) => modules.includes(t.module));
