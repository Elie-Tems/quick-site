/**
 * Platform → merchant lifecycle emails (sender = Siango), plus the customer
 * order-confirmation (sender = the merchant). These are SERVICE/transactional
 * messages (account, billing, site lifecycle) — not marketing — so they are
 * permitted under Chok HaSpam; we still identify the sender and follow the RTL
 * rules from the israeli-email-sequences guidance (dir=rtl, web-safe fonts,
 * dir=ltr around links/numbers, sender block in the footer).
 */

import { renderEmail, h1, p, emailButton, ils, ltr, type EmailSender } from "./rtlEmail";

const BRAND = "#3B976C";
const SUPPORT_EMAIL = "office@siango.app";
const LEGAL_NAME = 'ארפור טכנולוגיות בע"מ, ח.פ. 517331708';

/** Siango as the sender. unsubscribeUrl points to the account email-settings page. */
export function siangoSender(dashboardUrl = "https://siango.app/dashboard"): EmailSender {
  return {
    businessName: "סיאנגו",
    email: SUPPORT_EMAIL,
    address: LEGAL_NAME,
    brandColor: BRAND,
    unsubscribeUrl: `${dashboardUrl}?settings=notifications`,
  };
}

export interface PlatformCtx {
  firstName?: string;
  businessName?: string;
  siteUrl?: string;
  dashboardUrl?: string;
  continueUrl?: string;
  amountIls?: number;
  invoiceUrl?: string;
  freezeDate?: string;
  deleteDate?: string;
  daysLeft?: number;
}

export interface BuiltEmail { subject: string; html: string; }

const hi = (c: PlatformCtx) => (c.firstName ? `היי ${c.firstName},` : "היי,");
const dash = (c: PlatformCtx) => c.dashboardUrl || "https://siango.app/dashboard";

/** 1. Welcome after sign-up. */
export const accountWelcome = (c: PlatformCtx): BuiltEmail => ({
  subject: "ברוכים הבאים לסיאנגו! 👋",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "מתחילים לבנות את האתר",
    bodyHtml:
      h1("ברוכים הבאים לסיאנגו!") +
      p(`${hi(c)} שמחים שהצטרפת. תוך כמה דקות יש לך אתר מכירות מוכן.`) +
      emailButton("בנו את האתר שלכם", dash(c), BRAND),
  }),
});

/** 2. Started onboarding, didn't finish (24h). */
export const onboardingAbandoned1 = (c: PlatformCtx): BuiltEmail => ({
  subject: "כמעט סיימתם — נשאר רק להשלים את האתר",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "האתר שלכם מחכה",
    bodyHtml:
      h1("כמעט שם 🙌") +
      p(`${hi(c)} התחלתם לבנות אתר בסיאנגו אבל לא סיימתם. שמרנו לכם את ההתקדמות — אפשר להמשיך מאיפה שעצרתם.`) +
      emailButton("להמשך הבנייה", c.continueUrl || dash(c), BRAND),
  }),
});

/** 3. Second reminder (72h). */
export const onboardingAbandoned2 = (c: PlatformCtx): BuiltEmail => ({
  subject: "תזכורת אחרונה — האתר שלכם כמעט מוכן",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "עוד כמה דקות והאתר באוויר",
    bodyHtml:
      h1("נשאר רק צעד אחד") +
      p(`${hi(c)} זו תזכורת אחרונה — האתר שלכם מחכה להשלמה. אם צריך עזרה, אנחנו כאן ב-${ltr(SUPPORT_EMAIL)}.`) +
      emailButton("לסיום ההקמה", c.continueUrl || dash(c), BRAND),
  }),
});

/** 4. Site is live. */
export const siteReady = (c: PlatformCtx): BuiltEmail => ({
  subject: "האתר שלכם באוויר! 🎉",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "האתר פורסם בהצלחה",
    bodyHtml:
      h1("האתר באוויר! 🎉") +
      p(`${hi(c)} האתר של ${c.businessName || "העסק שלכם"} פורסם ומוכן לקבל לקוחות.`) +
      (c.siteUrl ? p(`כתובת האתר: ${ltr(c.siteUrl)}`) : "") +
      emailButton("צפייה באתר", c.siteUrl || dash(c), BRAND) +
      emailButton("לדשבורד הניהול", dash(c), "#555555"),
  }),
});

/** 5. Subscription charge succeeded (receipt). */
export const paymentReceipt = (c: PlatformCtx): BuiltEmail => ({
  subject: "קבלה — התשלום החודשי התקבל",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "אישור תשלום",
    bodyHtml:
      h1("תודה על התשלום") +
      p(`${hi(c)} קיבלנו את התשלום החודשי${c.amountIls ? ` בסך ${ils(c.amountIls)}` : ""}. האתר ממשיך לפעול כרגיל.`) +
      (c.invoiceUrl ? emailButton("צפייה בחשבונית", c.invoiceUrl, BRAND) : ""),
  }),
});

/** 6. Charge failed (day 0). */
export const paymentFailed = (c: PlatformCtx): BuiltEmail => ({
  subject: "לא הצלחנו לחייב — נדרש עדכון אמצעי תשלום",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "פעולה נדרשת כדי לשמור על האתר פעיל",
    bodyHtml:
      h1("התשלום לא עבר") +
      p(`${hi(c)} ניסינו לחייב את אמצעי התשלום${c.amountIls ? ` בסך ${ils(c.amountIls)}` : ""} ולא הצלחנו. האתר עדיין פעיל — נא לעדכן את אמצעי התשלום כדי להמשיך.`) +
      emailButton("עדכון אמצעי תשלום", dash(c), BRAND),
  }),
});

/** 7. Dunning reminder (days 3 & 7). */
export const paymentReminder = (c: PlatformCtx): BuiltEmail => ({
  subject: "תזכורת: התשלום עדיין לא הוסדר",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "האתר עלול להיות מושהה",
    bodyHtml:
      h1("צריך לעדכן תשלום") +
      p(`${hi(c)} התשלום עדיין לא הוסדר. אם לא יוסדר בימים הקרובים, האתר יושהה זמנית עד להסדרה.`) +
      emailButton("להסדרת התשלום", dash(c), BRAND),
  }),
});

/** 8. Site frozen (day 10). */
export const siteFrozen = (c: PlatformCtx): BuiltEmail => ({
  subject: "האתר הושהה עקב אי-תשלום",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "אפשר להחזיר את האתר מיד עם התשלום",
    bodyHtml:
      h1("האתר הושהה זמנית") +
      p(`${hi(c)} מאחר שהתשלום לא הוסדר, האתר הושהה ואינו זמין כרגע ללקוחות. ברגע שתסדירו את התשלום — האתר יחזור לפעול מיד.`) +
      emailButton("החזרת האתר לפעילות", dash(c), BRAND),
  }),
});

/** 9. Pre-deletion warning. */
export const deletionWarning = (c: PlatformCtx): BuiltEmail => ({
  subject: `אזהרה: הנתונים יימחקו בעוד ${c.daysLeft ?? 14} ימים`,
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "פעולה אחרונה לשמירת האתר",
    bodyHtml:
      h1("הנתונים עומדים להימחק") +
      p(`${hi(c)} האתר מושהה זה זמן מה. אם התשלום לא יוסדר עד ${c.deleteDate ? ltr(c.deleteDate) : `${c.daysLeft ?? 14} ימים`}, האתר והנתונים יימחקו לצמיתות.`) +
      emailButton("שמירת האתר — להסדרת התשלום", dash(c), BRAND),
  }),
});

/** 10. Final deletion notice. */
export const siteDeleted = (c: PlatformCtx): BuiltEmail => ({
  subject: "האתר והנתונים נמחקו",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "אישור מחיקה",
    bodyHtml:
      h1("האתר נמחק") +
      p(`${hi(c)} בהתאם לתנאי השימוש, האתר והנתונים נמחקו עקב אי-תשלום ממושך. תמיד אפשר להתחיל מחדש — נשמח לראותכם שוב.`) +
      emailButton("פתיחת אתר חדש", dash(c), BRAND),
  }),
});

/** 11. Site reactivated after payment. */
export const siteReactivated = (c: PlatformCtx): BuiltEmail => ({
  subject: "האתר חזר לפעילות ✅",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "הכל חזר לעבוד",
    bodyHtml:
      h1("האתר שוב באוויר ✅") +
      p(`${hi(c)} התשלום הוסדר והאתר חזר לפעול כרגיל. תודה!`) +
      emailButton("צפייה באתר", c.siteUrl || dash(c), BRAND),
  }),
});

/** 12. Subscription cancelled confirmation. */
export const subscriptionCancelled = (c: PlatformCtx): BuiltEmail => ({
  subject: "המנוי בוטל — אישור",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "פרטי הביטול",
    bodyHtml:
      h1("המנוי בוטל") +
      p(`${hi(c)} ביטול המנוי נקלט.${c.freezeDate ? ` האתר יישאר פעיל עד ${ltr(c.freezeDate)}.` : ""} אפשר לחדש בכל עת מהדשבורד.`) +
      emailButton("חידוש מנוי", dash(c), BRAND),
  }),
});

/** 13. New order notification to the MERCHANT. */
export const newOrderMerchant = (c: PlatformCtx): BuiltEmail => ({
  subject: "התקבלה הזמנה חדשה באתר שלכם 🛍️",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "פרטי ההזמנה בדשבורד",
    bodyHtml:
      h1("הזמנה חדשה! 🛍️") +
      p(`${hi(c)} התקבלה הזמנה חדשה${c.amountIls ? ` בסך ${ils(c.amountIls)}` : ""} באתר של ${c.businessName || "העסק שלכם"}. הפרטים המלאים מחכים בדשבורד.`) +
      emailButton("צפייה בהזמנה", dash(c), BRAND),
  }),
});

/**
 * Customer-facing order confirmation (transactional). sender = the MERCHANT, so
 * the merchant identity appears in the footer. Pass a merchant EmailSender.
 */
export const orderConfirmationCustomer = (
  merchant: EmailSender,
  args: { firstName?: string; storeName: string; orderTotal?: number; storeUrl: string },
): BuiltEmail => ({
  subject: `אישור הזמנה מ${args.storeName}`,
  html: renderEmail({
    sender: merchant,
    previewText: "ההזמנה שלך התקבלה",
    bodyHtml:
      h1("ההזמנה התקבלה ✅") +
      p(`${args.firstName ? `היי ${args.firstName},` : "היי,"} תודה על ההזמנה מ${args.storeName}.${args.orderTotal ? ` סכום ההזמנה: ${ils(args.orderTotal)}.` : ""} ניצור קשר בהקדם להמשך.`) +
      emailButton("חזרה לחנות", args.storeUrl, merchant.brandColor || BRAND),
  }),
});

/** All platform→merchant emails, for iteration/preview. */
export const PLATFORM_EMAILS = {
  accountWelcome, onboardingAbandoned1, onboardingAbandoned2, siteReady,
  paymentReceipt, paymentFailed, paymentReminder, siteFrozen,
  deletionWarning, siteDeleted, siteReactivated, subscriptionCancelled,
  newOrderMerchant,
} as const;
