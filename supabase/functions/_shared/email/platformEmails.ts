/**
 * Platform → merchant lifecycle emails (sender = Siango), plus the customer
 * order-confirmation (sender = the merchant). Service/transactional messages
 * (permitted under Chok HaSpam). RTL + sender identification per the
 * israeli-email-sequences guidance. Tone: warm, playful, with humor on the
 * upbeat emails; clear and respectful on billing/deletion ones.
 */

import {
  renderEmail, h1, p, emailButton, emailItemsTable, emailHighlight, ils, ltr,
  dirForLang, type EmailSender, type EmailLang,
} from "./rtlEmail.ts";

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
  domainName?: string;
  expiryDate?: string;
  autoRenew?: boolean;
  registrantName?: string;
  siteHost?: string;
  /** Recipient language (defaults "he"). Only localized templates honour it. */
  lang?: EmailLang;
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

/** 4. Site is live. Localized (he/en/ar/fr/ru); defaults to Hebrew. */
export const siteReady = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const nm = c.firstName;
  const bn = c.businessName;
  const site = c.siteUrl;
  const dashUrl = dash(c);
  const T = {
    he: {
      subject: "🎉 רשמית! האתר שלכם עלה לאוויר",
      preview: "הגיע הזמן להתרברב בוואטסאפ המשפחתי",
      h1: "זהו, אתם באוויר! 🎉🚀",
      p1: `${nm ? `היי ${nm}! ` : "היי! "}האתר של ${bn || "העסק שלכם"} עלה רשמית והוא כבר מתאמן על קבלת לקוחות. הרגע הזה שבו עסק קטן הופך לעסק עם אתר - נהנים ממנו!`,
      urlLabel: "🔗 כתובת האתר שלכם:",
      p2: "מה עכשיו? משתפים את הקישור בכל מקום - וואטסאפ, אינסטגרם, אצל הדודה בקבוצה. כל שיתוף = עוד לקוח פוטנציאלי. 😉",
      btnView: "לצפייה באתר החי 👀",
      btnDash: "לדשבורד הניהול",
      referral: "🎁 רוצים חודש שימוש חינם? על כל חבר שמצטרף דרככם והופך למנוי - חודש חינם. ההזמנה מחכה לכם בדשבורד.",
    },
    en: {
      subject: "🎉 You're live! Your website is online",
      preview: "Time to share it with everyone",
      h1: "That's it - you're live! 🎉🚀",
      p1: `${nm ? `Hi ${nm}! ` : "Hi! "}The ${bn || "your business"} website is officially online and ready to welcome customers. That moment when a small business gets its own website - enjoy it!`,
      urlLabel: "🔗 Your website address:",
      p2: "What now? Share the link everywhere - WhatsApp, Instagram, your group chats. Every share = another potential customer. 😉",
      btnView: "View your live site 👀",
      btnDash: "Go to dashboard",
      referral: "🎁 Want a free month? For every friend who joins through you and becomes a subscriber - a month on us. Your invite link is in the dashboard.",
    },
    ar: {
      subject: "🎉 موقعك أصبح مباشرًا الآن!",
      preview: "حان وقت مشاركته مع الجميع",
      h1: "تم - موقعك أصبح مباشرًا! 🎉🚀",
      p1: `${nm ? `مرحبًا ${nm}! ` : "مرحبًا! "}موقع ${bn || "عملك"} أصبح مباشرًا رسميًا وجاهز لاستقبال العملاء. استمتع بهذه اللحظة!`,
      urlLabel: "🔗 عنوان موقعك:",
      p2: "ماذا الآن؟ شارك الرابط في كل مكان - واتساب، إنستغرام، مجموعاتك. كل مشاركة = عميل محتمل آخر. 😉",
      btnView: "عرض موقعك المباشر 👀",
      btnDash: "لوحة التحكم",
      referral: "🎁 تريد شهرًا مجانيًا؟ عن كل صديق ينضم عبرك ويصبح مشتركًا - شهر مجاني. رابط الدعوة في لوحة التحكم.",
    },
    fr: {
      subject: "🎉 C'est en ligne ! Votre site est publié",
      preview: "Il est temps de le partager",
      h1: "Ça y est, vous êtes en ligne ! 🎉🚀",
      p1: `${nm ? `Bonjour ${nm} ! ` : "Bonjour ! "}Le site de ${bn || "votre entreprise"} est officiellement en ligne et prêt à accueillir des clients. Profitez de ce moment !`,
      urlLabel: "🔗 L'adresse de votre site :",
      p2: "Et maintenant ? Partagez le lien partout - WhatsApp, Instagram, vos groupes. Chaque partage = un client potentiel de plus. 😉",
      btnView: "Voir votre site en ligne 👀",
      btnDash: "Tableau de bord",
      referral: "🎁 Envie d'un mois offert ? Pour chaque ami qui s'inscrit via vous et devient abonné - un mois offert. Votre lien d'invitation est dans le tableau de bord.",
    },
    ru: {
      subject: "🎉 Ваш сайт онлайн!",
      preview: "Самое время поделиться им",
      h1: "Готово - вы онлайн! 🎉🚀",
      p1: `${nm ? `Привет, ${nm}! ` : "Привет! "}Сайт ${bn || "вашего бизнеса"} официально опубликован и готов принимать клиентов. Насладитесь этим моментом!`,
      urlLabel: "🔗 Адрес вашего сайта:",
      p2: "Что дальше? Делитесь ссылкой везде - WhatsApp, Instagram, ваши чаты. Каждый репост = ещё один потенциальный клиент. 😉",
      btnView: "Открыть ваш сайт 👀",
      btnDash: "Панель управления",
      referral: "🎁 Хотите бесплатный месяц? За каждого друга, который присоединится по вашей ссылке и оформит подписку - месяц бесплатно. Ссылка-приглашение в панели управления.",
    },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(dashUrl),
      previewText: T.preview,
      lang,
      bodyHtml:
        h1(T.h1, dir) +
        p(T.p1, dir) +
        (site ? emailHighlight(`${T.urlLabel}<br><b>${ltr(site)}</b>`, "#3B976C", dir) : "") +
        p(T.p2, dir) +
        emailButton(T.btnView, site || dashUrl, BRAND) +
        emailButton(T.btnDash, dashUrl, "#555555") +
        emailHighlight(T.referral, "#3B976C", dir),
    }),
  };
};

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

/** Domain registered successfully - ownership + connection guide. Localized. */
export const domainPurchased = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const dn = ltr(c.domainName || "");
  const reg = c.registrantName ? ` (${c.registrantName})` : "";
  const bn = c.businessName;
  const greet = { he: c.firstName ? `היי ${c.firstName}! ` : "היי! ", en: c.firstName ? `Hi ${c.firstName}! ` : "Hi! ", ar: c.firstName ? `مرحبًا ${c.firstName}! ` : "مرحبًا! ", fr: c.firstName ? `Bonjour ${c.firstName} ! ` : "Bonjour ! ", ru: c.firstName ? `Привет, ${c.firstName}! ` : "Привет! " }[lang];
  const host = c.siteHost;
  const date = c.expiryDate ? ltr(c.expiryDate) : "";
  const autoOff = c.autoRenew === false;
  const T = {
    he: {
      subject: `הדומיין ${c.domainName || "שלך"} מוכן! 🎉`,
      preview: "הדומיין נרשם על שמך ומתחבר לאתר",
      h1: "הדומיין שלך נרשם בהצלחה! 🎉",
      p1: `${greet}הדומיין <b>${dn}</b> רשום עכשיו <b>על שמך${reg}</b> - אתם הבעלים הרשומים שלו. בחירה מצוינת לכתובת אמיתית ומקצועית ל${bn || "העסק שלכם"}.`,
      connect: "🔌 <b>מה קורה עכשיו - החיבור לאתר:</b><br/>כיוונּו את הדומיין לאתר שלכם אוטומטית. החיבור ברשת (DNS) יכול לקחת עד 24-48 שעות להתפשט בכל העולם - בזמן הזה ייתכן שהכתובת עדיין לא תיפתח אצל כולם, וזה נורמלי לגמרי. אין צורך לעשות כלום מצדכם.",
      hostLine: host ? `<br/>הכתובת שאליה מחובר הדומיין: <span dir="ltr">${ltr(host)}</span>` : "",
      renew: `📅 <b>חידוש:</b> הדומיין תקף עד <b>${date}</b>. ` + (autoOff ? "בחרתם ללא חידוש אוטומטי - נשלח לכם תזכורת לפני התפוגה כדי שתחליטו אם להאריך. דומיין שלא יחודש ישוחרר וייתכן שלא נוכל להחזיר אותו." : "החידוש האוטומטי פעיל - נחדש מדי שנה כדי שלא תאבדו את הכתובת. אפשר לבטל בכל עת מהדשבורד."),
      pq: "שאלה על הדומיין? פשוט השב/י למייל הזה - אנחנו כאן. 🙏",
      btn: "לניהול הדומיין",
    },
    en: {
      subject: `Your domain ${c.domainName || ""} is ready! 🎉`,
      preview: "Your domain is registered in your name and connecting to your site",
      h1: "Your domain is registered! 🎉",
      p1: `${greet}The domain <b>${dn}</b> is now registered <b>in your name${reg}</b> - you are its registered owner. A great choice for a real, professional address for ${bn || "your business"}.`,
      connect: "🔌 <b>What happens now - connecting to your site:</b><br/>We pointed the domain to your site automatically. DNS propagation can take up to 24-48 hours worldwide - during that time the address may not open for everyone yet, which is completely normal. Nothing to do on your end.",
      hostLine: host ? `<br/>The domain is connected to: <span dir="ltr">${ltr(host)}</span>` : "",
      renew: `📅 <b>Renewal:</b> The domain is valid until <b>${date}</b>. ` + (autoOff ? "You chose no auto-renewal - we'll remind you before it expires so you can decide whether to extend. A domain that isn't renewed is released and may not be recoverable." : "Auto-renewal is on - we'll renew it every year so you don't lose the address. You can cancel anytime from the dashboard."),
      pq: "A question about the domain? Just reply to this email - we're here. 🙏",
      btn: "Manage your domain",
    },
    ar: {
      subject: `نطاقك ${c.domainName || ""} جاهز! 🎉`,
      preview: "تم تسجيل نطاقك باسمك وجارٍ ربطه بموقعك",
      h1: "تم تسجيل نطاقك بنجاح! 🎉",
      p1: `${greet}النطاق <b>${dn}</b> مسجَّل الآن <b>باسمك${reg}</b> - أنت المالك المسجَّل له. اختيار ممتاز لعنوان حقيقي واحترافي لـ${bn || "عملك"}.`,
      connect: "🔌 <b>ماذا يحدث الآن - الربط بموقعك:</b><br/>وجّهنا النطاق إلى موقعك تلقائيًا. قد يستغرق انتشار الـ DNS حتى 24-48 ساعة حول العالم - خلال هذه الفترة قد لا يفتح العنوان لدى الجميع بعد، وهذا أمر طبيعي تمامًا. لا حاجة لأي إجراء من جانبك.",
      hostLine: host ? `<br/>النطاق مرتبط بـ: <span dir="ltr">${ltr(host)}</span>` : "",
      renew: `📅 <b>التجديد:</b> النطاق صالح حتى <b>${date}</b>. ` + (autoOff ? "اخترت عدم التجديد التلقائي - سنذكّرك قبل انتهاء الصلاحية لتقرر التمديد. النطاق غير المجدَّد يُحرَّر وقد لا يمكن استرجاعه." : "التجديد التلقائي مُفعَّل - سنجدده كل عام كي لا تفقد العنوان. يمكنك الإلغاء في أي وقت من لوحة التحكم."),
      pq: "سؤال حول النطاق؟ فقط رُدّ على هذا البريد - نحن هنا. 🙏",
      btn: "إدارة النطاق",
    },
    fr: {
      subject: `Votre domaine ${c.domainName || ""} est prêt ! 🎉`,
      preview: "Votre domaine est enregistré à votre nom et se connecte à votre site",
      h1: "Votre domaine est enregistré ! 🎉",
      p1: `${greet}Le domaine <b>${dn}</b> est désormais enregistré <b>à votre nom${reg}</b> - vous en êtes le propriétaire enregistré. Un excellent choix pour une adresse réelle et professionnelle pour ${bn || "votre entreprise"}.`,
      connect: "🔌 <b>Que se passe-t-il maintenant - la connexion à votre site :</b><br/>Nous avons dirigé le domaine vers votre site automatiquement. La propagation DNS peut prendre jusqu'à 24-48 heures dans le monde - pendant ce temps, l'adresse peut ne pas s'ouvrir pour tout le monde, ce qui est tout à fait normal. Rien à faire de votre côté.",
      hostLine: host ? `<br/>Le domaine est connecté à : <span dir="ltr">${ltr(host)}</span>` : "",
      renew: `📅 <b>Renouvellement :</b> Le domaine est valable jusqu'au <b>${date}</b>. ` + (autoOff ? "Vous avez choisi sans renouvellement automatique - nous vous rappellerons avant l'expiration pour décider de prolonger. Un domaine non renouvelé est libéré et peut être irrécupérable." : "Le renouvellement automatique est activé - nous le renouvellerons chaque année pour ne pas perdre l'adresse. Vous pouvez annuler à tout moment depuis le tableau de bord."),
      pq: "Une question sur le domaine ? Répondez simplement à cet e-mail - nous sommes là. 🙏",
      btn: "Gérer le domaine",
    },
    ru: {
      subject: `Ваш домен ${c.domainName || ""} готов! 🎉`,
      preview: "Домен зарегистрирован на ваше имя и подключается к сайту",
      h1: "Ваш домен зарегистрирован! 🎉",
      p1: `${greet}Домен <b>${dn}</b> теперь зарегистрирован <b>на ваше имя${reg}</b> - вы его зарегистрированный владелец. Отличный выбор для настоящего профессионального адреса для ${bn || "вашего бизнеса"}.`,
      connect: "🔌 <b>Что происходит сейчас - подключение к сайту:</b><br/>Мы автоматически направили домен на ваш сайт. Распространение DNS может занять до 24-48 часов по всему миру - в это время адрес может открываться не у всех, и это совершенно нормально. От вас ничего не требуется.",
      hostLine: host ? `<br/>Домен подключён к: <span dir="ltr">${ltr(host)}</span>` : "",
      renew: `📅 <b>Продление:</b> Домен действителен до <b>${date}</b>. ` + (autoOff ? "Вы выбрали без автопродления - мы напомним перед истечением срока, чтобы вы решили о продлении. Непродлённый домен освобождается, и вернуть его может быть невозможно." : "Автопродление включено - мы будем продлевать его каждый год, чтобы вы не потеряли адрес. Отменить можно в любой момент в панели управления."),
      pq: "Вопрос о домене? Просто ответьте на это письмо - мы на связи. 🙏",
      btn: "Управление доменом",
    },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c.dashboardUrl),
      previewText: T.preview,
      lang,
      bodyHtml:
        h1(T.h1, dir) +
        p(T.p1, dir) +
        emailHighlight(T.connect + T.hostLine, "#3B976C", dir) +
        (c.expiryDate ? emailHighlight(T.renew, "#3B976C", dir) : "") +
        p(T.pq, dir) +
        emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** Domain expiring soon - renewal reminder. */
export const domainExpiryReminder = (c: PlatformCtx): BuiltEmail => ({
  subject: `הדומיין ${c.domainName || "שלך"} מתקרב לתפוגה ⏰`,
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "עוד זמן קצר לחידוש - שלא תאבדו את הכתובת",
    bodyHtml:
      h1("הדומיין שלך מתקרב לתפוגה ⏰") +
      p(`${hi(c)}הדומיין <b>${ltr(c.domainName || "")}</b>${c.daysLeft != null ? ` יפוג בעוד ${c.daysLeft} ימים` : " עומד לפוג בקרוב"}. כדי שהאתר והמייל ימשיכו לעבוד - צריך לחדש אותו.`) +
      emailHighlight("💡 אם החידוש האוטומטי פעיל - לא צריך לעשות כלום, נטפל בזה.") +
      emailButton("לחידוש הדומיין", dash(c), BRAND),
  }),
});

/** Domain about to be lost (renewal/payment failed). */
export const domainExpiringUnpaid = (c: PlatformCtx): BuiltEmail => ({
  subject: `🔴 שימו לב: הדומיין ${c.domainName || "שלך"} עומד לרדת`,
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "פעולה אחרונה כדי לא לאבד את הדומיין",
    bodyHtml:
      h1("הדומיין שלך בסכנת אובדן 🔴") +
      p(`${hi(c)}לא הצלחנו לחדש את הדומיין <b>${ltr(c.domainName || "")}</b>${c.expiryDate ? ` (פג ב-${ltr(c.expiryDate)})` : ""}. אם לא יחודש בקרוב - הוא ישוחרר, וייתכן שלא נוכל להחזיר אותו.`) +
      emailHighlight("⚠️ דומיין שאבד עלול להילקח על ידי מישהו אחר. עדכנו אמצעי תשלום או חדשו ידנית כדי לשמור עליו.") +
      emailButton("להצלת הדומיין", dash(c), "#b91c1c"),
  }),
});

/** INTERNAL admin alert: a paid domain order could not be registered (e.g. empty
 *  reseller balance). The customer already paid - needs urgent manual handling. */
export const domainFundsAlert = (c: PlatformCtx & { reason?: string }): BuiltEmail => ({
  subject: `🔴 דחוף: רכישת דומיין נכשלה - ${c.domainName || ""}`,
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "לקוח שילם אך הרישום נכשל - טיפול ידני מיידי",
    bodyHtml:
      h1("רישום דומיין נכשל אחרי תשלום 🔴") +
      p(`לקוח שילם על הדומיין <b>${ltr(c.domainName || "")}</b>${c.businessName ? ` (עסק: ${c.businessName})` : ""} אך הרישום ב-Openprovider נכשל.`) +
      emailHighlight(`<b>סיבה:</b> ${(c as any).reason || "לא ידועה"}<br/>${c.amountIls != null ? `סכום שנגבה: ${ils(c.amountIls)}<br/>` : ""}פעולה נדרשת: לטעון יתרה ב-Openprovider ולרשום ידנית, או להחזיר ללקוח.`) +
      emailButton("לחשבון Openprovider", "https://rcp.openprovider.eu/", "#b91c1c"),
  }),
});

/** INTERNAL admin alert: Openprovider reseller balance is running low. */
export const domainLowBalance = (c: PlatformCtx & { balance?: number; currency?: string }): BuiltEmail => ({
  subject: `⚠️ יתרת Openprovider נמוכה`,
  html: renderEmail({
    sender: siangoSender(c.dashboardUrl),
    previewText: "כדאי לטעון יתרה כדי לא לחסום רכישות דומיין",
    bodyHtml:
      h1("יתרת Openprovider נמוכה ⚠️") +
      p(`היתרה בחשבון ה-reseller ירדה ל-<b>${(c as any).currency || "USD"} ${(c as any).balance ?? "?"}</b>.`) +
      emailHighlight("כשאין יתרה - רכישות דומיין של לקוחות ייכשלו אחרי שהם כבר שילמו. כדאי לטעון יתרה עכשיו."),
  }),
});

export const PLATFORM_EMAILS = {
  accountWelcome, onboardingAbandoned1, onboardingAbandoned2, siteReady,
  paymentReceipt, paymentFailed, paymentReminder, siteFrozen,
  deletionWarning, siteDeleted, siteReactivated, subscriptionCancelled,
  newOrderMerchant, domainPurchased, domainExpiryReminder, domainExpiringUnpaid,
  domainFundsAlert, domainLowBalance,
} as const;
