/**
 * Israeli e-commerce email sequence definitions (provider-agnostic).
 *
 * Each sequence is data: ordered steps with a delay (from the trigger event), a
 * Hebrew subject (kept ~40-50 chars), and a body builder that returns a full
 * compliant RTL email via renderEmail(). Timings follow israeli-email-sequences.
 *
 * The platform's sending engine (added later with an ESP) iterates these steps,
 * skipping Shabbat/holidays and respecting consent + unsubscribe.
 */

import { renderEmail, h1, p, emailButton, ils, ltr, type EmailSender } from "./rtlEmail";

export interface SequenceContext {
  firstName?: string;
  storeName: string;
  storeUrl: string;
  cartUrl?: string;
  productName?: string;
  cartTotal?: number;
  couponCode?: string;
  couponPercent?: number;
}

export interface SequenceStep {
  id: string;
  /** Hours after the trigger to send this step. */
  delayHours: number;
  subject: (ctx: SequenceContext) => string;
  body: (ctx: SequenceContext, sender: EmailSender) => string;
}

export interface EmailSequence {
  id: string;
  name: string;
  audience: "customer" | "merchant";
  trigger: string;
  steps: SequenceStep[];
}

const hi = (ctx: SequenceContext) => (ctx.firstName ? `היי ${ctx.firstName},` : "היי,");

/** Cart abandonment — 3 emails: 1h reminder, 24h urgency, 72h discount. */
export const cartAbandonment: EmailSequence = {
  id: "cart-abandonment",
  name: "עגלה נטושה",
  audience: "customer",
  trigger: "cart_abandoned",
  steps: [
    {
      id: "reminder",
      delayHours: 1,
      subject: (c) => `שכחת משהו בעגלה ב${c.storeName}? 🛒`,
      body: (c, s) =>
        renderEmail({
          sender: s,
          previewText: "המוצרים שלך עדיין מחכים",
          bodyHtml:
            h1("שכחת משהו? 🛒") +
            p(`${hi(c)} שמנו לב שהשארת מוצרים בעגלה ב${c.storeName} — הם עדיין שמורים לך.`) +
            (c.cartTotal ? p(`סה״כ בעגלה: ${ils(c.cartTotal)}`) : "") +
            emailButton("חזרה לעגלה", c.cartUrl || c.storeUrl, s.brandColor),
        }),
    },
    {
      id: "urgency",
      delayHours: 24,
      subject: (c) => `המוצרים שלך ב${c.storeName} כמעט אזלו`,
      body: (c, s) =>
        renderEmail({
          sender: s,
          previewText: "אל תפספס — השלם את ההזמנה",
          bodyHtml:
            h1("עוד לא השלמת את ההזמנה") +
            p(`${hi(c)} לקוחות רבים כבר רכשו השבוע ב${c.storeName}. המלאי מוגבל — שווה להשלים עכשיו.`) +
            emailButton("להשלמת ההזמנה", c.cartUrl || c.storeUrl, s.brandColor),
        }),
    },
    {
      id: "discount",
      delayHours: 72,
      subject: (c) => `מתנה קטנה: ${ltr(`${c.couponPercent ?? 10}%`)} הנחה 🎁`,
      body: (c, s) =>
        renderEmail({
          sender: s,
          previewText: "קוד הנחה אישי בתוקף מוגבל",
          bodyHtml:
            h1("שמרנו לך הנחה 🎁") +
            p(`${hi(c)} כדי לסיים את מה שהתחלת, הנה ${ltr(`${c.couponPercent ?? 10}%`)} הנחה על ההזמנה.`) +
            (c.couponCode ? p(`קוד הקופון: ${ltr(c.couponCode)}`) : "") +
            emailButton("ממש את ההנחה", c.cartUrl || c.storeUrl, s.brandColor),
        }),
    },
  ],
};

/** Welcome — 5 emails over 10 days. */
export const welcome: EmailSequence = {
  id: "welcome",
  name: "ברוכים הבאים",
  audience: "customer",
  trigger: "subscribed",
  steps: [
    {
      id: "intro",
      delayHours: 0,
      subject: (c) => `ברוכים הבאים ל${c.storeName}! 👋`,
      body: (c, s) =>
        renderEmail({
          sender: s,
          previewText: "נעים להכיר",
          bodyHtml:
            h1(`ברוכים הבאים ל${c.storeName}!`) +
            p(`${hi(c)} שמחים שהצטרפת. כאן תמצא את המוצרים שלנו והעדכונים החמים ביותר.`) +
            emailButton("לחנות שלנו", c.storeUrl, s.brandColor),
        }),
    },
    {
      id: "value",
      delayHours: 48,
      subject: () => `איך מפיקים את המקסימום מאיתנו`,
      body: (c, s) =>
        renderEmail({
          sender: s,
          bodyHtml: h1("כמה דברים שכדאי לדעת") + p(`${hi(c)} ריכזנו עבורך את הדברים השווים ביותר ב${c.storeName}.`) + emailButton("גלה עוד", c.storeUrl, s.brandColor),
        }),
    },
    {
      id: "social-proof",
      delayHours: 96,
      subject: (c) => `למה לקוחות אוהבים את ${c.storeName}`,
      body: (c, s) =>
        renderEmail({ sender: s, bodyHtml: h1("לקוחות מספרים") + p("הצטרפת לקהילה של לקוחות מרוצים. הנה מה שהם אומרים עלינו.") + emailButton("לחנות", c.storeUrl, s.brandColor) }),
    },
    {
      id: "showcase",
      delayHours: 168,
      subject: () => `המוצרים המובילים שלנו`,
      body: (c, s) =>
        renderEmail({ sender: s, bodyHtml: h1("המובילים שלנו") + p("ריכזנו את המוצרים הכי נמכרים — שווה הצצה.") + emailButton("לצפייה במוצרים", c.storeUrl, s.brandColor) }),
    },
    {
      id: "offer",
      delayHours: 240,
      subject: (c) => `הטבת הצטרפות בתוקף מוגבל 🎁`,
      body: (c, s) =>
        renderEmail({
          sender: s,
          previewText: "הטבה אישית בשבילך",
          bodyHtml:
            h1("הטבת הצטרפות 🎁") +
            p(`${hi(c)} כתודה על ההצטרפות — הטבה אישית בתוקף מוגבל.` + (c.couponCode ? ` קוד: ${ltr(c.couponCode)}` : "")) +
            emailButton("ממש עכשיו", c.storeUrl, s.brandColor),
        }),
    },
  ],
};

/** Post-purchase — 4 emails: thank-you, how-to, review, replenish. */
export const postPurchase: EmailSequence = {
  id: "post-purchase",
  name: "אחרי רכישה",
  audience: "customer",
  trigger: "order_completed",
  steps: [
    {
      id: "thank-you",
      delayHours: 24,
      subject: (c) => `תודה על ההזמנה מ${c.storeName}! 🙏`,
      body: (c, s) =>
        renderEmail({ sender: s, previewText: "ההזמנה שלך התקבלה", bodyHtml: h1("תודה על ההזמנה! 🙏") + p(`${hi(c)} ההזמנה שלך התקבלה ואנחנו כבר מטפלים בה. נעדכן אותך בהמשך.`) + emailButton("למעקב אחר ההזמנה", c.storeUrl, s.brandColor) }),
    },
    {
      id: "review",
      delayHours: 168,
      subject: (c) => `איך היה? נשמח לחוות דעתך`,
      body: (c, s) =>
        renderEmail({ sender: s, bodyHtml: h1("איך היה? 🌟") + p(`${hi(c)} נשמח אם תשתף אותנו בחוות דעתך — זה עוזר לנו ולשאר הלקוחות.`) + emailButton("השאר ביקורת", c.storeUrl, s.brandColor) }),
    },
    {
      id: "replenish",
      delayHours: 720,
      subject: () => `אולי הגיע הזמן לחדש?`,
      body: (c, s) =>
        renderEmail({ sender: s, bodyHtml: h1("הגיע הזמן לחדש?") + p(`${hi(c)} עברו כמה שבועות מההזמנה האחרונה. אולי כדאי לחדש?`) + emailButton("לחנות", c.storeUrl, s.brandColor) }),
    },
  ],
};

export const SEQUENCES: EmailSequence[] = [cartAbandonment, welcome, postPurchase];
