// Server-side sender for merchant-editable TRANSACTIONAL / lifecycle emails
// (order confirm, booking confirm/cancel, lead reply, donation thanks, ...).
//
// Mirror of the frontend catalog in src/lib/lifecycleEmails.ts - kept in sync by
// hand because edge functions (Deno) can't import from src. Each key has a built-in
// DEFAULT; a merchant may override any field or disable the email via the
// email_templates table (migration 20260710130000). Resolution:
//   row absent            -> default copy, enabled.
//   row.enabled === false -> SKIP (merchant turned it off).
//   row present           -> override subject/heading/body/button over the default.
//
// {name} is replaced with the customer's name; extra {placeholders} come from `vars`.
// The email is branded with the MERCHANT's name/logo/color (not Siango's) and always
// carries a compliant unsubscribe footer (renderEmail enforces it). Best-effort:
// callers wrap in try/catch so a mail failure never blocks the underlying action.

import { renderEmail, h1, p, emailButton } from "./rtlEmail.ts";
import { sendViaResend, type SendResult } from "./resend.ts";

export interface LifecycleDefault {
  subject: string;
  heading: string;
  body: string;
  button?: string;
}

// Keep these in lockstep with src/lib/lifecycleEmails.ts.
export const LIFECYCLE_DEFAULTS: Record<string, LifecycleDefault> = {
  // Commerce
  order_confirm: { subject: "אישור הזמנה - תודה על הקנייה!", heading: "ההזמנה שלך התקבלה! 🎉",
    body: "שלום {name}, אנחנו כבר מכינים את ההזמנה. תודה שקנית אצלנו!", button: "מעקב אחר ההזמנה" },
  cart_abandon: { subject: "השארת משהו בעגלה 🛒", heading: "שכחת משהו? 🛒",
    body: "{name}, שמרנו לך את העגלה - הפריטים עדיין זמינים. נשמח להשלים את ההזמנה.", button: "חזרה לעגלה" },
  review_request: { subject: "איך היה? נשמח לשמוע ⭐", heading: "איך הייתה הקנייה? ⭐",
    body: "{name}, תודה שבחרת בנו! דקה מזמנך תעזור לנו ולעוד לקוחות.", button: "דרג/י אותנו" },
  // Booking (services)
  booking_confirm: { subject: "התור שלך נקבע", heading: "התור שלך נקבע! 🎉",
    body: "שלום {name}, נשמח לראותך. נשלח תזכורת יום לפני.", button: "הוספה ליומן" },
  booking_reminder: { subject: "תזכורת: יש לך תור מחר", heading: "תזכורת: תור מחר",
    body: "מחכים לך 💚 אם צריך לבטל, אפשר עדיין דרך הקישור בהזמנה.", button: "" },
  booking_cancel: { subject: "התור בוטל - נשמח לקבוע חדש", heading: "התור בוטל",
    body: "שלום {name}, התור בוטל. מקדמה ששולמה תוחזר תוך 3-5 ימי עסקים. נשמח לראותך בקרוב.", button: "קביעת תור חדש" },
  // Listings (real estate / vehicles)
  lead_reply: { subject: "קיבלנו את פנייתך - נחזור אליך בהקדם", heading: "קיבלנו את פנייתך ✓",
    body: "שלום {name}, תודה שפנית. נציג יחזור אליך תוך יום עסקים.", button: "" },
  // Donations (nonprofit)
  donation_thanks: { subject: "תודה על תרומתך 💚", heading: "תודה מכל הלב 🙏",
    body: "{name} יקר/ה, תרומתך עוזרת לנו לשנות חיים. תודה שאת/ה איתנו.", button: "" },
  donation_recurring: { subject: "תרומתך החודשית התקבלה 💚", heading: "החיוב החודשי התקבל",
    body: "{name}, תרומתך החודשית חויבה בהצלחה. תודה שאת/ה איתנו לאורך זמן 🙏", button: "" },
};

interface SendOpts {
  businessId: string;
  key: string;
  to: string;
  name?: string;
  vars?: Record<string, string | number>;
  buttonUrl?: string;   // CTA link; the button renders only if there's both text and a URL
  extraHtml?: string;   // inserted between the body paragraph and the button (e.g. an items table)
}

/** Resolve (default + override), render branded, and send. Returns skipped:true if the
 *  merchant disabled this email, or if the key is unknown / business missing. */
// deno-lint-ignore no-explicit-any
export async function sendLifecycleEmail(admin: any, opts: SendOpts): Promise<SendResult> {
  const def = LIFECYCLE_DEFAULTS[opts.key];
  if (!def) return { ok: false, error: "unknown_lifecycle_key", skipped: true };

  const { data: row } = await admin.from("email_templates")
    .select("enabled, subject, heading, body, button_text")
    .eq("business_id", opts.businessId).eq("template_key", opts.key).maybeSingle();
  if (row && row.enabled === false) return { ok: true, skipped: true };

  const { data: biz } = await admin.from("businesses")
    .select("name, email, slug, primary_color, logo_url").eq("id", opts.businessId).maybeSingle();
  if (!biz) return { ok: false, error: "business_not_found", skipped: true };

  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
  const fill = (s: string): string => {
    let out = (s || "").replace(/\{name\}/g, opts.name || "לקוח יקר");
    for (const [k, v] of Object.entries(opts.vars || {})) out = out.split(`{${k}}`).join(String(v));
    return out;
  };

  const subject = fill(row?.subject ?? def.subject);
  const heading = fill(row?.heading ?? def.heading);
  const bodyText = fill(row?.body ?? def.body);
  const buttonText = fill(row?.button_text ?? def.button ?? "");
  const brand = biz.primary_color || undefined;

  const bodyHtml =
    h1(heading) +
    p(bodyText) +
    (opts.extraHtml || "") +
    (buttonText && opts.buttonUrl ? emailButton(buttonText, opts.buttonUrl, brand || "#2e8b6a") : "");

  const html = renderEmail({
    sender: {
      businessName: biz.name || "החנות",
      email: biz.email || undefined,
      unsubscribeUrl: `${siteUrl}/unsubscribe?email=${encodeURIComponent(opts.to)}`,
      brandColor: brand,
      logoUrl: biz.logo_url || undefined,
    },
    previewText: heading,
    bodyHtml,
    lang: "he",
  });

  // Display name = the merchant's business; From address stays on the verified domain.
  return await sendViaResend({ to: opts.to, subject, html, fromName: biz.name || "Siango" });
}
