/**
 * RTL-safe HTML email builder for the Israeli market.
 *
 * Why a custom builder: Hebrew email must render correctly in Outlook (common in
 * Israeli businesses) and Walla Mail (gmail.co.il) - both behave differently from
 * Gmail. Rules applied here (per israeli-email-sequences guidance):
 *   - dir="rtl" on <html> and on every <table>/<td>.
 *   - Web-safe fonts only (Arial, Tahoma) - Google Fonts don't load in Outlook.
 *   - Numbers / prices / English / phone wrapped in <span dir="ltr"> to avoid reversal.
 *   - MSO conditional comments to fix Outlook table width.
 *   - A LEGALLY-REQUIRED footer (Chok HaSpam): sender identity, physical address,
 *     and a working one-click unsubscribe link. renderEmail() refuses to build
 *     without an unsubscribeUrl.
 *
 * Provider-agnostic: produces an HTML string. The actual send happens in send.ts.
 */

/** Text direction. Hebrew + Arabic are RTL; English/Russian/French are LTR. */
export type Dir = "rtl" | "ltr";
export const alignFor = (dir: Dir): string => (dir === "rtl" ? "right" : "left");
export const startBorderFor = (dir: Dir): string => (dir === "rtl" ? "right" : "left");

export interface EmailSender {
  /** Display name of the legal sender (the merchant, or "SIANGO"). */
  businessName: string;
  /** Physical address - required by Chok HaSpam in the footer. */
  address?: string;
  /** Contact email shown in the footer. */
  email?: string;
  /** Working one-click unsubscribe URL - REQUIRED. */
  unsubscribeUrl: string;
  /** Brand color for buttons/accents (defaults to refined emerald). */
  brandColor?: string;
  /** Logo shown in the email header (must look good on a white card). */
  logoUrl?: string;
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

/** Section heading + paragraph helpers (inline-styled for email clients).
 *  `dir` defaults to "rtl" so all existing Hebrew callers are unchanged. */
export const h1 = (text: string, dir: Dir = "rtl"): string =>
  `<h1 dir="${dir}" style="margin:0 0 12px;font-family:Arial,Tahoma,sans-serif;font-size:24px;color:#111111;text-align:${alignFor(dir)};">${esc(text)}</h1>`;

export const p = (html: string, dir: Dir = "rtl"): string =>
  `<p dir="${dir}" style="margin:0 0 14px;font-family:Arial,Tahoma,sans-serif;font-size:16px;line-height:1.7;color:#333333;text-align:${alignFor(dir)};">${html}</p>`;

/** Colored callout box for emphasis (adds life/color to the email body). */
export const emailHighlight = (html: string, color = "#3B976C", dir: Dir = "rtl"): string =>
  `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">` +
  `<tr><td dir="${dir}" style="background:#eafaf3;border-${startBorderFor(dir)}:4px solid ${color};border-radius:8px;padding:14px 16px;` +
  `font-family:Arial,Tahoma,sans-serif;font-size:15px;line-height:1.8;color:#1f5c46;text-align:${alignFor(dir)};">${html}</td></tr></table>`;

/** Itemized order table (product, qty, line total) + a bold total row. */
export function emailItemsTable(
  items: { name: string; quantity: number; price: number }[],
  total?: number,
): string {
  const td = "font-family:Arial,Tahoma,sans-serif;font-size:14px;color:#333333;padding:10px 12px;border-bottom:1px solid #eeeeee;";
  const rows = items
    .map(
      (it) =>
        `<tr><td dir="rtl" style="${td}text-align:right;">${esc(it.name)} ${ltr("× " + it.quantity)}</td>` +
        `<td dir="rtl" style="${td}text-align:left;white-space:nowrap;">${ils(it.price * it.quantity)}</td></tr>`,
    )
    .join("");
  const sum = total ?? items.reduce((s, it) => s + it.price * it.quantity, 0);
  return (
    `<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border:1px solid #eeeeee;border-radius:8px;border-collapse:separate;overflow:hidden;">` +
    `<tr><td dir="rtl" style="font-family:Arial,Tahoma,sans-serif;font-size:12px;font-weight:bold;color:#888888;padding:10px 12px;background:#fafafa;text-align:right;">פריט</td>` +
    `<td dir="rtl" style="font-family:Arial,Tahoma,sans-serif;font-size:12px;font-weight:bold;color:#888888;padding:10px 12px;background:#fafafa;text-align:left;">סכום</td></tr>` +
    rows +
    `<tr><td dir="rtl" style="font-family:Arial,Tahoma,sans-serif;font-size:15px;font-weight:bold;color:#111111;padding:12px;text-align:right;">סה״כ</td>` +
    `<td dir="rtl" style="font-family:Arial,Tahoma,sans-serif;font-size:15px;font-weight:bold;color:#111111;padding:12px;text-align:left;white-space:nowrap;">${ils(sum)}</td></tr>` +
    `</table>`
  );
}

interface RenderArgs {
  sender: EmailSender;
  /** Hidden preview/preheader text shown in the inbox list. */
  previewText?: string;
  /** Inner body HTML (use h1/p/emailButton helpers). */
  bodyHtml: string;
  /** Document language (defaults "he"). Determines text direction + footer text. */
  lang?: EmailLang;
}

export type EmailLang = "he" | "en" | "ar" | "fr" | "ru";

/** RTL languages; the rest render LTR. */
export const dirForLang = (lang: EmailLang): Dir => (lang === "he" || lang === "ar" ? "rtl" : "ltr");

// Footer text (Chok HaSpam: sender identity + unsubscribe) per language. {x} = sender name.
const FOOTER_REASON: Record<EmailLang, string> = {
  he: "קיבלת מייל זה כי נרשמת / ביצעת רכישה אצל {x}.",
  en: "You received this email because you signed up or made a purchase at {x}.",
  ar: "لقد تلقيت هذا البريد لأنك سجّلت أو أجريت عملية شراء لدى {x}.",
  fr: "Vous recevez cet e-mail car vous vous êtes inscrit(e) ou avez effectué un achat chez {x}.",
  ru: "Вы получили это письмо, потому что зарегистрировались или совершили покупку в {x}.",
};
const FOOTER_UNSUB: Record<EmailLang, string> = {
  he: "להסרה מרשימת התפוצה",
  en: "Unsubscribe",
  ar: "إلغاء الاشتراك",
  fr: "Se désabonner",
  ru: "Отписаться",
};

/** Build the full, compliant email document. Throws if no unsubscribe URL.
 *  Defaults to Hebrew/RTL, so existing callers are byte-for-byte unchanged. */
export function renderEmail({ sender, previewText = "", bodyHtml, lang = "he" }: RenderArgs): string {
  if (!sender.unsubscribeUrl) {
    throw new Error("renderEmail: unsubscribeUrl is required (Chok HaSpam compliance).");
  }
  const brand = sender.brandColor || "#2e8b6a";
  const dir = dirForLang(lang);
  const align = alignFor(dir);
  const reason = FOOTER_REASON[lang].replace("{x}", esc(sender.businessName));

  const footer =
    `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0">` +
    `<tr><td dir="${dir}" style="padding:20px 24px;font-family:Arial,Tahoma,sans-serif;font-size:12px;line-height:1.6;color:#888888;text-align:${align};border-top:1px solid #eeeeee;">` +
    `<div style="font-weight:bold;color:#555555;">${esc(sender.businessName)}</div>` +
    (sender.address ? `<div>${esc(sender.address)}</div>` : "") +
    (sender.email ? `<div>${ltr(esc(sender.email))}</div>` : "") +
    `<div style="margin-top:10px;">` +
    `${reason} ` +
    `<a href="${esc(sender.unsubscribeUrl)}" target="_blank" style="color:${brand};text-decoration:underline;">${FOOTER_UNSUB[lang]}</a>.` +
    `</div>` +
    `</td></tr></table>`;

  return (
    `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta http-equiv="X-UA-Compatible" content="IE=edge">` +
    `<title>${esc(sender.businessName)}</title></head>` +
    `<body dir="${dir}" style="margin:0;padding:0;background:#f4f4f5;">` +
    (previewText
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(previewText)}</div>`
      : "") +
    `<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">` +
    `<tr><td dir="${dir}" align="center" style="padding:24px 12px;">` +
    `<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->` +
    `<table role="presentation" dir="${dir}" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">` +
    `<tr><td style="background:${brand};font-size:0;line-height:0;height:6px;">&nbsp;</td></tr>` +
    (sender.logoUrl
      ? `<tr><td dir="${dir}" align="center" style="padding:26px 24px 6px;"><img src="${esc(sender.logoUrl)}" alt="${esc(sender.businessName)}" height="38" style="height:38px;width:auto;display:inline-block;border:0;"></td></tr>`
      : "") +
    `<tr><td dir="${dir}" style="padding:24px 28px 28px;">${bodyHtml}</td></tr>` +
    `<tr><td>${footer}</td></tr>` +
    `</table>` +
    `<!--[if mso]></td></tr></table><![endif]-->` +
    `</td></tr></table></body></html>`
  );
}
