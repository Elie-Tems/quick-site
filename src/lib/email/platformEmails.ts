/**
 * Platform → merchant lifecycle emails (sender = Siango), plus the customer
 * order-confirmation (sender = the merchant). Service/transactional messages
 * (permitted under Chok HaSpam). RTL + sender identification per the
 * israeli-email-sequences guidance. Tone: warm, playful, with humor on the
 * upbeat emails; clear and respectful on billing/deletion ones.
 */

import {
  renderEmail, h1, p, emailButton, emailItemsTable, emailHighlight, ils, ltr, type EmailSender,
} from "./rtlEmail";

const BRAND = "#3B976C";
const SUPPORT_EMAIL = "office@siango.app";
const LEGAL_NAME = 'ארפור טכנולוגיות בע"מ, ח.פ. 517331708';

export function siangoSender(dashboardUrl = "https://siango.app/dashboard"): EmailSender {
  return {
    businessName: "Siango",
    email: SUPPORT_EMAIL,
    address: LEGAL_NAME,
    brandColor: BRAND,
    logoUrl: "https://siango.app/logo-light-bg1.png",
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

const hi = (c: PlatformCtx) => (c.firstName ? `היי ${c.firstName}! ` : "היי! ");
const dash = (c: PlatformCtx) => c.dashboardUrl || "https://siango.app/dashboard";
const biz = (c: PlatformCtx) => c.businessName || "העסק שלכם";

/** 1. Welcome after sign-up. */
export const accountWelcome = (c: PlatformCtx): BuiltEmail => ({
  subject: "ברוכים הבאים לסיאנגו! 🎉 בואו נבנה את האתר שלכם",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "נרשמתם בהצלחה. הצעד הבא: לבנות את האתר ב-3 צעדים פשוטים.",
    bodyHtml:
      h1("ברוכים הבאים לסיאנגו! 🎉") +
      p(`${hi(c)}נרשמתם בהצלחה - איזה כיף שאתם כאן. עכשיו נבנה יחד את אתר המכירות שלכם, בלי ידע טכני ובלי כאב ראש.`) +
      p("הנה כל מה שצריך, ב-3 צעדים פשוטים:") +
      emailHighlight("1. מזינים שם העסק ולוגו &nbsp;·&nbsp; 2. בוחרים עיצוב וצבעים &nbsp;·&nbsp; 3. מוסיפים מוצרים. וזהו - האתר מוכן לעלות לאוויר.") +
      p("מוכנים? לחצו כאן ונתחיל לבנות (לוקח כמה דקות):") +
      emailButton("בואו נבנה את האתר 🚀", dash(c), BRAND),
  }),
});

/** 2. Started onboarding, didn't finish (24h). */
export const onboardingAbandoned1 = (c: PlatformCtx): BuiltEmail => ({
  subject: "האתר שלכם מנמנם ומחכה לכם 😴",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "ההתקדמות נשמרה - לא צריך להתחיל מהתחלה",
    bodyHtml:
      h1("אז... החיים קרו ☕") +
      p(`${hi(c)}התחלתם לבנות אתר, ואז כנראה צלצל הטלפון / הילדים קראו / נגמר הקפה - אנחנו מבינים לגמרי.`) +
      p(`החדשות הטובות: האתר של ${biz(c)} יושב בדיוק איפה שהשארתם אותו, שמור ומסודר. אפילו לא צריך להתחיל מהתחלה (פיו! 😅).`) +
      emailHighlight("⏱️ זה לוקח עוד כ-5 דקות לסיים. פחות זמן מאשר למצוא מה לראות בנטפליקס.") +
      emailButton("ממשיכים מאיפה שעצרנו", c.continueUrl || dash(c), BRAND),
  }),
});

/** 3. Second reminder (72h). */
export const onboardingAbandoned2 = (c: PlatformCtx): BuiltEmail => ({
  subject: "תזכורת אחרונה (מבטיחים שלא ננדנד יותר 🤞)",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "עוד כמה קליקים והאתר באוויר",
    bodyHtml:
      h1("נשאר ממש צעד אחד 🙌") +
      p(`${hi(c)}זו התזכורת האחרונה שלנו - מבטיחים. האתר שלכם כבר 90% מוכן, חבל שיישאר בארון.`) +
      p(`תקועים על משהו? תכתבו לנו ל-${ltr(SUPPORT_EMAIL)} ואנחנו נעזור באהבה (ובלי ז'רגון טכני מעצבן).`) +
      emailButton("לסיום ההקמה", c.continueUrl || dash(c), BRAND),
  }),
});

/** 4. Site is live. */
export const siteReady = (c: PlatformCtx): BuiltEmail => ({
  subject: "🎉 רשמית! האתר שלכם עלה לאוויר",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "הגיע הזמן להתרברב בוואטסאפ המשפחתי",
    bodyHtml:
      h1("זהו, אתם באוויר! 🎉🚀") +
      p(`${hi(c)}האתר של ${biz(c)} עלה רשמית והוא כבר מתאמן על קבלת לקוחות. הרגע הזה שבו עסק קטן הופך לעסק עם אתר - נהנים ממנו!`) +
      (c.siteUrl ? emailHighlight(`🔗 כתובת האתר שלכם:<br><b>${ltr(c.siteUrl)}</b>`) : "") +
      p("מה עכשיו? משתפים את הקישור בכל מקום - וואטסאפ, אינסטגרם, אצל הדודה בקבוצה. כל שיתוף = עוד לקוח פוטנציאלי. 😉") +
      emailButton("לצפייה באתר החי 👀", c.siteUrl || dash(c), BRAND) +
      emailButton("לדשבורד הניהול", dash(c), "#555555"),
  }),
});

/** 5. Subscription charge succeeded (receipt). */
export const paymentReceipt = (c: PlatformCtx): BuiltEmail => ({
  subject: "התשלום עבר חלק ✅ (תודה!)",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "הכל מסודר, האתר ממשיך לדהור",
    bodyHtml:
      h1("קיבלנו, תודה! ✅") +
      p(`${hi(c)}התשלום החודשי${c.amountIls ? ` בסך ${ils(c.amountIls)}` : ""} עבר בהצלחה, והאתר של ${biz(c)} ממשיך לדהור קדימה בלי הפרעות.`) +
      emailHighlight("📄 שומרים את המייל הזה כאישור. רוצים חשבונית מסודרת? היא ממש כאן למטה.") +
      (c.invoiceUrl ? emailButton("צפייה בחשבונית", c.invoiceUrl, BRAND) : ""),
  }),
});

/** 6. Charge failed (day 0). */
export const paymentFailed = (c: PlatformCtx): BuiltEmail => ({
  subject: "אופס - הכרטיס אמר 'לא היום' 💳",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "רגע קטן של עדכון וחוזרים לעניינים",
    bodyHtml:
      h1("החיוב לא עבר 💳") +
      p(`${hi(c)}ניסינו לחייב את אמצעי התשלום${c.amountIls ? ` בסך ${ils(c.amountIls)}` : ""} - והוא קצת התעקש. קורה לכולם (כרטיס שפג, מסגרת, או סתם יום קשה לבנק 🙂).`) +
      emailHighlight("✅ האתר שלכם עדיין פעיל ועובד כרגיל. רק צריך לעדכן אמצעי תשלום כדי שיישאר ככה.") +
      emailButton("עדכון אמצעי תשלום", dash(c), BRAND),
  }),
});

/** 7. Dunning reminder (days 3 & 7). */
export const paymentReminder = (c: PlatformCtx): BuiltEmail => ({
  subject: "תזכורת קטנה - התשלום עוד ממתין 🙏",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "כדי שהאתר יישאר באוויר",
    bodyHtml:
      h1("רק תזכורת ידידותית 🙏") +
      p(`${hi(c)}עדיין לא הצלחנו לחייב את המנוי. לא נעים לנו לנדנד, אבל לא נעים לנו עוד יותר אם האתר של ${biz(c)} יושהה.`) +
      emailHighlight("⏸️ אם התשלום לא יוסדר בימים הקרובים, האתר יושהה זמנית (אבל לא נמחק - אפשר תמיד להחזיר).") +
      emailButton("להסדרת התשלום עכשיו", dash(c), BRAND),
  }),
});

/** 8. Site frozen (day 10). */
export const siteFrozen = (c: PlatformCtx): BuiltEmail => ({
  subject: "האתר שלכם לקח פסק זמן ⏸️",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "הוא לא נעלם - רק ממתין לכם",
    bodyHtml:
      h1("האתר הושהה זמנית ⏸️") +
      p(`${hi(c)}מאחר שהתשלום לא הוסדר, האתר של ${biz(c)} הושהה ואינו זמין כרגע ללקוחות. אבל אל דאגה - הוא לא נעלם לשום מקום, כל התכנים והנתונים שמורים.`) +
      emailHighlight("⚡ רגע של הסדרת תשלום - והאתר קופץ בחזרה לחיים, בדיוק כמו שהיה.") +
      emailButton("החזרת האתר לפעילות", dash(c), BRAND),
  }),
});

/** 9. Pre-deletion warning. (Serious, clear - no jokes about data loss.) */
export const deletionWarning = (c: PlatformCtx): BuiltEmail => ({
  subject: `חשוב: הנתונים יימחקו בעוד ${c.daysLeft ?? 14} ימים`,
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "פעולה אחרונה לשמירת האתר והנתונים",
    bodyHtml:
      h1("שימו לב - האתר עומד להימחק") +
      p(`${hi(c)}האתר של ${biz(c)} מושהה זה זמן מה עקב אי-תשלום. אנחנו לא רוצים שתאבדו את העבודה שהשקעתם.`) +
      emailHighlight(`⚠️ אם התשלום לא יוסדר עד ${c.deleteDate ? ltr(c.deleteDate) : `${c.daysLeft ?? 14} ימים`}, האתר, התכנים והנתונים יימחקו לצמיתות ולא ניתן יהיה לשחזרם.`) +
      p("עדיין אפשר להציל הכל - פשוט מסדירים את התשלום והאתר חוזר לפעול.") +
      emailButton("הצלת האתר - להסדרת התשלום", dash(c), BRAND),
  }),
});

/** 10. Final deletion notice. */
export const siteDeleted = (c: PlatformCtx): BuiltEmail => ({
  subject: "האתר והנתונים נמחקו",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "תמיד אפשר להתחיל מחדש",
    bodyHtml:
      h1("האתר נמחק") +
      p(`${hi(c)}בהתאם לתנאי השימוש, האתר של ${biz(c)} והנתונים נמחקו עקב אי-תשלום ממושך.`) +
      p("חבל שנפרדנו ככה - אבל הדלת תמיד פתוחה. אם תרצו לחזור, נשמח לבנות איתכם אתר חדש מאפס, מתי שתרצו. 🙏") +
      emailButton("פתיחת אתר חדש", dash(c), BRAND),
  }),
});

/** 11. Site reactivated after payment. */
export const siteReactivated = (c: PlatformCtx): BuiltEmail => ({
  subject: "חזרנו לאוויר! 🎉 האתר שוב פעיל",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "הכל חזר לעבוד במצב רוח מצוין",
    bodyHtml:
      h1("האתר שוב באוויר! 🎉") +
      p(`${hi(c)}התשלום הוסדר והאתר של ${biz(c)} חזר לפעול כרגיל - ובמצב רוח מצוין. תודה שחזרתם! 💚`) +
      emailButton("צפייה באתר", c.siteUrl || dash(c), BRAND),
  }),
});

/** 12. Subscription cancelled confirmation. */
export const subscriptionCancelled = (c: PlatformCtx): BuiltEmail => ({
  subject: "המנוי בוטל - נתראה (בתקווה) בקרוב 👋",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "פרטי הביטול בפנים",
    bodyHtml:
      h1("המנוי בוטל 👋") +
      p(`${hi(c)}קלטנו את בקשת הביטול.${c.freezeDate ? ` האתר יישאר פעיל עד ${ltr(c.freezeDate)}, אז יש עוד זמן להתחרט 😉.` : ""}`) +
      p("היה לנו כיף לארח אתכם. אם אי פעם תרצו לחזור - אנחנו כאן, והכפתור למטה תמיד עובד.") +
      emailButton("חידוש מנוי", dash(c), BRAND),
  }),
});

/** 13. New order notification to the MERCHANT. */
export const newOrderMerchant = (c: PlatformCtx): BuiltEmail => ({
  subject: "צ'אצ'ינג! 🛍️ קיבלתם הזמנה חדשה",
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "הרגע של ריקוד קטן בכיסא",
    bodyHtml:
      h1("הזמנה חדשה נחתה! 🛍️🎉") +
      p(`${hi(c)}מישהו בדיוק קנה אצלכם${c.amountIls ? ` בסך ${ils(c.amountIls)}` : ""} ב-${biz(c)}. זה הרגע שבו מותר לעשות ריקוד קטן בכיסא - מגיע לכם. 💃`) +
      emailHighlight("📦 כל הפרטים (מה הוזמן, פרטי הלקוח, כתובת) מחכים לכם בדשבורד.") +
      emailButton("לצפייה בהזמנה", dash(c), BRAND),
  }),
});

/** Customer-facing order confirmation (transactional). sender = the MERCHANT. */
export const orderConfirmationCustomer = (
  merchant: EmailSender,
  args: {
    firstName?: string;
    storeName: string;
    orderTotal?: number;
    storeUrl: string;
    items?: { name: string; quantity: number; price: number }[];
    orderNumber?: string;
  },
): BuiltEmail => ({
  subject: `יש! ההזמנה שלך מ${args.storeName} התקבלה 🎉`,
  html: renderEmail({
    sender: merchant,
    previewText: "תודה רבה! הנה כל הפרטים",
    bodyHtml:
      h1("ההזמנה התקבלה! 🎉") +
      p(`${args.firstName ? `היי ${args.firstName}! ` : "היי! "}תודה רבה על הרכישה ב${args.storeName} - בחירה מצוינת, אם יורשה לנו לומר 😉. קיבלנו את ההזמנה${args.orderNumber ? ` (מספר ${ltr(args.orderNumber)})` : ""} וכבר מתחילים לטפל בה.`) +
      p("הנה מה שהזמנת:") +
      (args.items && args.items.length ? emailItemsTable(args.items, args.orderTotal) : "") +
      p("נעדכן אותך בכל שלב. יש שאלה? פשוט השב/י למייל הזה - אנחנו אנשים אמיתיים ונשמח לעזור. 🙏") +
      emailButton("חזרה לחנות", args.storeUrl, merchant.brandColor || BRAND),
  }),
});

export const PLATFORM_EMAILS = {
  accountWelcome, onboardingAbandoned1, onboardingAbandoned2, siteReady,
  paymentReceipt, paymentFailed, paymentReminder, siteFrozen,
  deletionWarning, siteDeleted, siteReactivated, subscriptionCancelled,
  newOrderMerchant,
} as const;
