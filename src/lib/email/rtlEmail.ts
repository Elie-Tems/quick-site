/**
 * RTL-safe HTML email builder for the Israeli market.
 *
 * Why a custom builder: Hebrew email must render correctly in Outlook (common in
 * Israeli businesses) and Walla Mail (gmail.co.il) — both behave differently from
 * Gmail. Rules applied here (per israeli-email-sequences guidance):
 *   - dir="rtl" on <html> and on every <table>/<td>.
 *   - Web-safe fonts only (Arial, Tahoma) — Google Fonts don't load in Outlook.
 *   - Numbers / prices / English / phone wrapped in <span dir="ltr"> to avoid reversal.
 *   - MSO conditional comments to fix Outlook table width.
 *   - A LEGALLY-REQUIRED footer (Chok HaSpam): sender identity, physical address,
 *     and a working one-click unsubscribe link. renderEmail() refuses to build
 *     without an unsubscribeUrl.
 *
 * Provider-agnostic: produces an HTML string. The actual send happens in send.ts.
 */

export interface EmailSender {
  /** Display name of the legal sender (the merchant, or "SIANGO"). */
  businessName: string;
  /** Physical address — required by Chok HaSpam in the footer. */
  address?: string;
  /** Contact email shown in the footer. */
  email?: string;
  /** Working one-click unsubscribe URL — REQUIRED. */
  unsubscribeUrl: string;
  /** Brand color for buttons/accents (defaults to refined emerald). */
  brandColor?: string;
}

/** Wrap numbers, prices, phone numbers and English text so they don't reverse in RTL. */
export const ltr = (s: string | number): string =>
  `<span dir="ltr" style="unicode-bidi:embed;">${s}</span>`;

/** Format an ILS price safely for RTL emails, e.g. ₪149. */
export const ils = (amount: number): string => ltr(`₪${amount.toLocaleString("he-IL")}`);

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A primary CTA button that renders in Outlook too (VML fallback omitted for brevity, bulletproof-ish). */
export function emailButton(text: string, url: string, color = "#2e8b6a"): string {
  return (
    `<table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" style="margin:20px auto;">` +
    `<tr><td dir="rtl" align="center" bgcolor="${color}" style="border-radius:8px;">` +
    `<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:Arial,Tahoma,sans-serif;` +
    `font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(text)}</a>` +
    `</td></tr></table>`
  );
}

/** Section heading + paragraph helpers (inline-styled for email clients). */
export const h1 = (text: string): string =>
  `<h1 dir="rtl" style="margin:0 0 12px;font-family:Arial,Tahoma,sans-serif;font-size:24px;color:#111111;text-align:right;">${esc(text)}</h1>`;

export const p = (html: string): string =>
  `<p dir="rtl" style="margin:0 0 14px;font-family:Arial,Tahoma,sans-serif;font-size:16px;line-height:1.7;color:#333333;text-align:right;">${html}</p>`;

interface RenderArgs {
  sender: EmailSender;
  /** Hidden preview/preheader text shown in the inbox list. */
  previewText?: string;
  /** Inner body HTML (use h1/p/emailButton helpers). */
  bodyHtml: string;
}

/** Build the full, compliant RTL email document. Throws if no unsubscribe URL. */
export function renderEmail({ sender, previewText = "", bodyHtml }: RenderArgs): string {
  if (!sender.unsubscribeUrl) {
    throw new Error("renderEmail: unsubscribeUrl is required (Chok HaSpam compliance).");
  }
  const brand = sender.brandColor || "#2e8b6a";

  const footer =
    `<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0">` +
    `<tr><td dir="rtl" style="padding:20px 24px;font-family:Arial,Tahoma,sans-serif;font-size:12px;line-height:1.6;color:#888888;text-align:right;border-top:1px solid #eeeeee;">` +
    `<div style="font-weight:bold;color:#555555;">${esc(sender.businessName)}</div>` +
    (sender.address ? `<div>${esc(sender.address)}</div>` : "") +
    (sender.email ? `<div>${ltr(esc(sender.email))}</div>` : "") +
    `<div style="margin-top:10px;">` +
    `קיבלת מייל זה כי נרשמת / ביצעת רכישה אצל ${esc(sender.businessName)}. ` +
    `<a href="${esc(sender.unsubscribeUrl)}" target="_blank" style="color:${brand};text-decoration:underline;">להסרה מרשימת התפוצה</a>.` +
    `</div>` +
    `</td></tr></table>`;

  return (
    `<!DOCTYPE html><html dir="rtl" lang="he"><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="X-UA-Compatible" content="IE=edge">` +
    `<title>${esc(sender.businessName)}</title></head>` +
    `<body dir="rtl" style="margin:0;padding:0;background:#f4f4f5;">` +
    (previewText
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(previewText)}</div>`
      : "") +
    `<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">` +
    `<tr><td dir="rtl" align="center" style="padding:24px 12px;">` +
    `<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->` +
    `<table role="presentation" dir="rtl" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">` +
    `<tr><td dir="rtl" style="padding:28px 24px;">${bodyHtml}</td></tr>` +
    `<tr><td>${footer}</td></tr>` +
    `</table>` +
    `<!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table></body></html>`
  );
}
