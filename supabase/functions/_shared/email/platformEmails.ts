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

// Public, logged-out, one-click unsubscribe (Chok HaSpam). The recipient email
// is embedded so the link removes them on load - no login, no typing.
export function siangoSender(opts: { siteUrl?: string; recipientEmail?: string } = {}): EmailSender {
  const site = (opts.siteUrl || "https://siango.app").replace(/\/$/, "");
  const unsubscribeUrl = opts.recipientEmail
    ? `${site}/unsubscribe?email=${encodeURIComponent(opts.recipientEmail)}`
    : `${site}/unsubscribe`;
  return {
    businessName: "Siango",
    email: SUPPORT_EMAIL,
    address: LEGAL_NAME,
    brandColor: BRAND,
    logoUrl: "https://siango.app/logo-light-bg1.png",
    unsubscribeUrl,
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
  /** New-lead notification fields (newLeadMerchant). */
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  leadTitle?: string;
  leadMessage?: string;
  /** Recipient address - embedded in the one-click unsubscribe link. */
  recipientEmail?: string;
  /** Recipient language (defaults "he"). Only localized templates honour it. */
  lang?: EmailLang;
}

export interface BuiltEmail { subject: string; html: string; }

const hi = (c: PlatformCtx) => (c.firstName ? `היי ${c.firstName}! ` : "היי! ");
const dash = (c: PlatformCtx) => c.dashboardUrl || "https://siango.app/dashboard";
const biz = (c: PlatformCtx) => c.businessName || "העסק שלכם";

// Language-aware greeting + business-name fallback for localized templates.
const GREET: Record<EmailLang, (n?: string) => string> = {
  he: (n) => (n ? `היי ${n}! ` : "היי! "),
  en: (n) => (n ? `Hi ${n}! ` : "Hi! "),
  ar: (n) => (n ? `مرحبًا ${n}! ` : "مرحبًا! "),
  fr: (n) => (n ? `Bonjour ${n} ! ` : "Bonjour ! "),
  ru: (n) => (n ? `Привет, ${n}! ` : "Привет! "),
};
const hiL = (c: PlatformCtx, lang: EmailLang) => GREET[lang](c.firstName);
const BIZ_FALLBACK: Record<EmailLang, string> = {
  he: "העסק שלכם", en: "your business", ar: "نشاطك", fr: "votre entreprise", ru: "вашего бизнеса",
};
const bizL = (c: PlatformCtx, lang: EmailLang) => c.businessName || BIZ_FALLBACK[lang];

/** 1. Welcome after sign-up. Localized (he/en/ar/fr/ru); defaults to Hebrew. */
export const accountWelcome = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const nm = c.firstName;
  const T = {
    he: {
      subject: "ברוכים הבאים לסיאנגו! 🎉 בואו נבנה את האתר שלכם",
      preview: "נרשמתם בהצלחה. הצעד הבא: לבנות את האתר ב-3 צעדים פשוטים.",
      h1: "ברוכים הבאים לסיאנגו! 🎉",
      p1: `${nm ? `היי ${nm}! ` : "היי! "}נרשמתם בהצלחה - איזה כיף שאתם כאן. עכשיו נבנה יחד את אתר המכירות שלכם, בלי ידע טכני ובלי כאב ראש.`,
      p2: "הנה כל מה שצריך, ב-3 צעדים פשוטים:",
      steps: "1. מזינים שם העסק ולוגו &nbsp;·&nbsp; 2. בוחרים עיצוב וצבעים &nbsp;·&nbsp; 3. מוסיפים מוצרים. וזהו - האתר מוכן לעלות לאוויר.",
      p3: "מוכנים? לחצו כאן ונתחיל לבנות (לוקח כמה דקות):",
      btn: "בואו נבנה את האתר 🚀",
    },
    en: {
      subject: "Welcome to Siango! 🎉 Let's build your website",
      preview: "You're signed up. Next step: build your site in 3 simple steps.",
      h1: "Welcome to Siango! 🎉",
      p1: `${nm ? `Hi ${nm}! ` : "Hi! "}You're all signed up - so glad you're here. Let's build your online store together, with no technical skills and no headache.`,
      p2: "Here's everything you need, in 3 simple steps:",
      steps: "1. Add your business name and logo &nbsp;·&nbsp; 2. Pick a design and colors &nbsp;·&nbsp; 3. Add products. That's it - your site is ready to go live.",
      p3: "Ready? Click here and let's start building (it takes a few minutes):",
      btn: "Let's build my site 🚀",
    },
    ar: {
      subject: "مرحبًا بك في Siango! 🎉 لنبنِ موقعك",
      preview: "تم تسجيلك بنجاح. الخطوة التالية: ابنِ موقعك في 3 خطوات بسيطة.",
      h1: "مرحبًا بك في Siango! 🎉",
      p1: `${nm ? `مرحبًا ${nm}! ` : "مرحبًا! "}تم تسجيلك بنجاح - سعداء بوجودك. لنبنِ متجرك الإلكتروني معًا، بدون أي خبرة تقنية وبدون تعقيد.`,
      p2: "إليك كل ما تحتاجه، في 3 خطوات بسيطة:",
      steps: "1. أدخل اسم نشاطك وشعارك &nbsp;·&nbsp; 2. اختر تصميمًا وألوانًا &nbsp;·&nbsp; 3. أضف المنتجات. وهذا كل شيء - موقعك جاهز للنشر.",
      p3: "جاهز؟ اضغط هنا ولنبدأ البناء (يستغرق دقائق):",
      btn: "لنبنِ موقعي 🚀",
    },
    fr: {
      subject: "Bienvenue sur Siango ! 🎉 Créons votre site",
      preview: "Votre inscription est faite. Prochaine étape : créez votre site en 3 étapes simples.",
      h1: "Bienvenue sur Siango ! 🎉",
      p1: `${nm ? `Bonjour ${nm} ! ` : "Bonjour ! "}Votre inscription est terminée - ravis de vous compter parmi nous. Créons ensemble votre boutique en ligne, sans compétences techniques et sans prise de tête.`,
      p2: "Voici tout ce qu'il vous faut, en 3 étapes simples :",
      steps: "1. Ajoutez le nom et le logo de votre entreprise &nbsp;·&nbsp; 2. Choisissez un design et des couleurs &nbsp;·&nbsp; 3. Ajoutez vos produits. Et voilà - votre site est prêt à être publié.",
      p3: "Prêt ? Cliquez ici et commençons (cela prend quelques minutes) :",
      btn: "Créer mon site 🚀",
    },
    ru: {
      subject: "Добро пожаловать в Siango! 🎉 Давайте создадим ваш сайт",
      preview: "Регистрация завершена. Следующий шаг: создайте сайт за 3 простых шага.",
      h1: "Добро пожаловать в Siango! 🎉",
      p1: `${nm ? `Привет, ${nm}! ` : "Привет! "}Регистрация завершена - рады, что вы с нами. Давайте вместе создадим ваш интернет-магазин, без технических навыков и без лишних хлопот.`,
      p2: "Вот всё, что нужно, в 3 простых шага:",
      steps: "1. Укажите название бизнеса и логотип &nbsp;·&nbsp; 2. Выберите дизайн и цвета &nbsp;·&nbsp; 3. Добавьте товары. Вот и всё - сайт готов к публикации.",
      p3: "Готовы? Нажмите здесь, и начнём (это займёт несколько минут):",
      btn: "Создать мой сайт 🚀",
    },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c),
      previewText: T.preview,
      lang,
      dir,
      bodyHtml:
        h1(T.h1) + p(T.p1) + p(T.p2) + emailHighlight(T.steps) + p(T.p3) +
        emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** 2. Started onboarding, didn't finish (24h). Localized; defaults to Hebrew. */
export const onboardingAbandoned1 = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const nm = c.firstName;
  const bn = c.businessName;
  const T = {
    he: {
      subject: "האתר שלכם מנמנם ומחכה לכם 😴",
      preview: "ההתקדמות נשמרה - לא צריך להתחיל מהתחלה",
      h1: "אז... החיים קרו ☕",
      p1: `${nm ? `היי ${nm}! ` : "היי! "}התחלתם לבנות אתר, ואז כנראה צלצל הטלפון / הילדים קראו / נגמר הקפה - אנחנו מבינים לגמרי.`,
      p2: `החדשות הטובות: האתר של ${bn || "העסק שלכם"} יושב בדיוק איפה שהשארתם אותו, שמור ומסודר. אפילו לא צריך להתחיל מהתחלה (פיו! 😅).`,
      hl: "⏱️ זה לוקח עוד כ-5 דקות לסיים. פחות זמן מאשר למצוא מה לראות בנטפליקס.",
      btn: "ממשיכים מאיפה שעצרנו",
    },
    en: {
      subject: "Your website is taking a nap, waiting for you 😴",
      preview: "Your progress is saved - no need to start over",
      h1: "So... life happened ☕",
      p1: `${nm ? `Hi ${nm}! ` : "Hi! "}You started building your site, and then the phone rang / the kids called / the coffee ran out - we totally get it.`,
      p2: `The good news: the ${bn || "your business"} website is sitting exactly where you left it, saved and sound. No need to start over (phew! 😅).`,
      hl: "⏱️ It takes about 5 more minutes to finish. Less time than picking something to watch on Netflix.",
      btn: "Pick up where I left off",
    },
    ar: {
      subject: "موقعك ينتظرك 😴",
      preview: "تم حفظ تقدمك - لا داعي للبدء من جديد",
      h1: "إذن... الحياة شغلتك ☕",
      p1: `${nm ? `مرحبًا ${nm}! ` : "مرحبًا! "}بدأت ببناء موقعك، ثم رنّ الهاتف / ناداك الأطفال / نفد القهوة - نتفهم ذلك تمامًا.`,
      p2: `الخبر الجيد: موقع ${bn || "عملك"} محفوظ تمامًا حيث تركته. لا داعي للبدء من جديد (يا للراحة! 😅).`,
      hl: "⏱️ يستغرق الأمر حوالي 5 دقائق لإكماله. أقل من الوقت الذي تقضيه في اختيار فيلم.",
      btn: "أكمل من حيث توقفت",
    },
    fr: {
      subject: "Votre site fait la sieste en vous attendant 😴",
      preview: "Votre progression est sauvegardée - inutile de recommencer",
      h1: "Alors... la vie vous a rattrapé ☕",
      p1: `${nm ? `Bonjour ${nm} ! ` : "Bonjour ! "}Vous avez commencé à créer votre site, puis le téléphone a sonné / les enfants ont appelé / le café s'est terminé - on comprend très bien.`,
      p2: `La bonne nouvelle : le site de ${bn || "votre entreprise"} est exactement là où vous l'avez laissé, sauvegardé. Pas besoin de tout recommencer (ouf ! 😅).`,
      hl: "⏱️ Il reste environ 5 minutes pour finir. Moins de temps que pour choisir un film sur Netflix.",
      btn: "Reprendre où je me suis arrêté",
    },
    ru: {
      subject: "Ваш сайт дремлет и ждёт вас 😴",
      preview: "Прогресс сохранён - не нужно начинать заново",
      h1: "Что ж... жизнь вмешалась ☕",
      p1: `${nm ? `Привет, ${nm}! ` : "Привет! "}Вы начали создавать сайт, а потом зазвонил телефон / позвали дети / закончился кофе - мы прекрасно понимаем.`,
      p2: `Хорошая новость: сайт ${bn || "вашего бизнеса"} ждёт ровно там, где вы остановились, всё сохранено. Не нужно начинать заново (фух! 😅).`,
      hl: "⏱️ Закончить - это ещё около 5 минут. Меньше, чем выбрать фильм на вечер.",
      btn: "Продолжить с того места",
    },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c),
      previewText: T.preview,
      lang,
      dir,
      bodyHtml: h1(T.h1) + p(T.p1) + p(T.p2) + emailHighlight(T.hl) + emailButton(T.btn, c.continueUrl || dash(c), BRAND),
    }),
  };
};

/** 3. Second reminder (72h). Localized; defaults to Hebrew. */
export const onboardingAbandoned2 = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const nm = c.firstName;
  const mail = ltr(SUPPORT_EMAIL);
  const T = {
    he: {
      subject: "תזכורת אחרונה (מבטיחים שלא ננדנד יותר 🤞)",
      preview: "עוד כמה קליקים והאתר באוויר",
      h1: "נשאר ממש צעד אחד 🙌",
      p1: `${nm ? `היי ${nm}! ` : "היי! "}זו התזכורת האחרונה שלנו - מבטיחים. האתר שלכם כבר 90% מוכן, חבל שיישאר בארון.`,
      p2: `תקועים על משהו? תכתבו לנו ל-${mail} ואנחנו נעזור באהבה (ובלי ז'רגון טכני מעצבן).`,
      btn: "לסיום ההקמה",
    },
    en: {
      subject: "Last reminder (we promise to stop nudging 🤞)",
      preview: "A few more clicks and your site is live",
      h1: "Just one step left 🙌",
      p1: `${nm ? `Hi ${nm}! ` : "Hi! "}This is our last reminder - promise. Your site is already 90% ready; it'd be a shame to leave it in the drawer.`,
      p2: `Stuck on something? Email us at ${mail} and we'll help out (no annoying tech jargon).`,
      btn: "Finish setting up",
    },
    ar: {
      subject: "تذكير أخير (نعدك بألا نزعجك بعد الآن 🤞)",
      preview: "بضع نقرات أخرى وموقعك يصبح مباشرًا",
      h1: "بقيت خطوة واحدة فقط 🙌",
      p1: `${nm ? `مرحبًا ${nm}! ` : "مرحبًا! "}هذا تذكيرنا الأخير - نعدك. موقعك جاهز بنسبة 90%؛ من الجميل ألا يبقى في الأدراج.`,
      p2: `هل تواجه صعوبة؟ راسلنا على ${mail} وسنساعدك بكل سرور (بدون مصطلحات تقنية مزعجة).`,
      btn: "إنهاء الإعداد",
    },
    fr: {
      subject: "Dernier rappel (promis, on arrête de vous relancer 🤞)",
      preview: "Encore quelques clics et votre site est en ligne",
      h1: "Il ne reste qu'une étape 🙌",
      p1: `${nm ? `Bonjour ${nm} ! ` : "Bonjour ! "}C'est notre dernier rappel - promis. Votre site est déjà prêt à 90 % ; dommage de le laisser au placard.`,
      p2: `Un blocage ? Écrivez-nous à ${mail} et on vous aide avec plaisir (sans jargon technique pénible).`,
      btn: "Terminer la configuration",
    },
    ru: {
      subject: "Последнее напоминание (обещаем больше не беспокоить 🤞)",
      preview: "Ещё пара кликов - и сайт онлайн",
      h1: "Остался всего один шаг 🙌",
      p1: `${nm ? `Привет, ${nm}! ` : "Привет! "}Это наше последнее напоминание - обещаем. Сайт готов на 90%; жаль оставлять его в столе.`,
      p2: `Что-то не получается? Напишите нам на ${mail}, и мы с радостью поможем (без занудного техжаргона).`,
      btn: "Завершить настройку",
    },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c),
      previewText: T.preview,
      lang,
      dir,
      bodyHtml: h1(T.h1) + p(T.p1) + p(T.p2) + emailButton(T.btn, c.continueUrl || dash(c), BRAND),
    }),
  };
};

/**
 * Publish payment failed / abandoned. Sent when a merchant started the publish
 * checkout but the payment never completed (a few hours later, still pending).
 * Reassures no charge went through and nudges them to finish. Localized.
 */
export const publishPaymentFailed = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const nm = c.firstName;
  const bn = bizL(c, lang);
  const url = c.continueUrl || dash(c);
  const T = {
    he: {
      subject: "כמעט פרסמת! החנות שלך מחכה 🛒",
      preview: "התשלום לא הושלם - החנות מוכנה, עוד קליק אחד",
      h1: "נשאר רק צעד אחד 🙌",
      p1: `${nm ? `היי ${nm}! ` : "היי! "}ניסית לפרסם את החנות של ${bn}, אבל נראה שהתשלום לא הושלם. שום דבר לא נגבה ממך - החנות שמורה ומוכנה בדיוק איפה שהשארת אותה.`,
      hl: "עוד קליק אחד והחנות באוויר. אפשר לנסות שוב בכל אמצעי תשלום.",
      p2: `נתקלת בבעיה בתשלום? כתבו לנו ל-${ltr(SUPPORT_EMAIL)} ונעזור לסיים ביחד.`,
      btn: "להשלמת הפרסום",
    },
    en: {
      subject: "Almost there! Your store is waiting 🛒",
      preview: "Payment didn't go through - your store is ready, one click away",
      h1: "Just one step left 🙌",
      p1: `${nm ? `Hi ${nm}! ` : "Hi! "}You started publishing the ${bn} store, but the payment didn't complete. Nothing was charged - your store is saved exactly where you left it.`,
      hl: "One more click and your store is live. You can retry with any payment method.",
      p2: `Ran into a payment issue? Email us at ${ltr(SUPPORT_EMAIL)} and we'll help you finish.`,
      btn: "Finish publishing",
    },
    ar: {
      subject: "اقتربت! متجرك في الانتظار 🛒",
      preview: "لم تكتمل عملية الدفع - متجرك جاهز بنقرة واحدة",
      h1: "بقيت خطوة واحدة 🙌",
      p1: `${nm ? `مرحبًا ${nm}! ` : "مرحبًا! "}بدأت نشر متجر ${bn}، لكن الدفع لم يكتمل. لم يتم خصم أي مبلغ - متجرك محفوظ تمامًا حيث تركته.`,
      hl: "نقرة واحدة أخرى ويصبح متجرك مباشرًا. يمكنك المحاولة بأي وسيلة دفع.",
      p2: `واجهت مشكلة في الدفع؟ راسلنا على ${ltr(SUPPORT_EMAIL)} وسنساعدك على الإنهاء.`,
      btn: "إكمال النشر",
    },
    fr: {
      subject: "Presque fini ! Votre boutique vous attend 🛒",
      preview: "Le paiement n'a pas abouti - votre boutique est prête, à un clic",
      h1: "Il ne reste qu'une étape 🙌",
      p1: `${nm ? `Bonjour ${nm} ! ` : "Bonjour ! "}Vous avez commencé à publier la boutique ${bn}, mais le paiement n'a pas abouti. Rien n'a été débité - votre boutique est enregistrée là où vous l'avez laissée.`,
      hl: "Encore un clic et votre boutique est en ligne. Vous pouvez réessayer avec tout moyen de paiement.",
      p2: `Un souci de paiement ? Écrivez-nous à ${ltr(SUPPORT_EMAIL)} et on vous aide à finir.`,
      btn: "Terminer la publication",
    },
    ru: {
      subject: "Почти готово! Ваш магазин ждёт 🛒",
      preview: "Оплата не прошла - магазин готов, остался один клик",
      h1: "Остался всего один шаг 🙌",
      p1: `${nm ? `Привет, ${nm}! ` : "Привет! "}Вы начали публикацию магазина ${bn}, но оплата не завершилась. Ничего не списано - магазин сохранён там, где вы остановились.`,
      hl: "Ещё один клик - и магазин онлайн. Можно повторить с любым способом оплаты.",
      p2: `Проблема с оплатой? Напишите нам на ${ltr(SUPPORT_EMAIL)}, и мы поможем завершить.`,
      btn: "Завершить публикацию",
    },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c),
      previewText: T.preview,
      lang,
      dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + p(T.p2) + emailButton(T.btn, url, BRAND),
    }),
  };
};

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
      sender: siangoSender(c),
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
export const paymentReceipt = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const amt = c.amountIls ? ils(c.amountIls) : "";
  const T = {
    he: { subject: "התשלום עבר חלק ✅ (תודה!)", preview: "הכל מסודר, האתר ממשיך לדהור", h1: "קיבלנו, תודה! ✅",
      p1: `${hiL(c, lang)}התשלום החודשי${amt ? ` בסך ${amt}` : ""} עבר בהצלחה, והאתר של ${bizL(c, lang)} ממשיך לדהור קדימה בלי הפרעות.`,
      hl: "📄 שומרים את המייל הזה כאישור. רוצים חשבונית מסודרת? היא ממש כאן למטה.", btn: "צפייה בחשבונית" },
    en: { subject: "Payment received ✅ (thank you!)", preview: "All set - your site keeps running", h1: "Got it, thank you! ✅",
      p1: `${hiL(c, lang)}Your monthly payment${amt ? ` of ${amt}` : ""} went through, and ${bizL(c, lang)}'s site keeps running without interruption.`,
      hl: "📄 Keep this email as your receipt. Want a formal invoice? It's right below.", btn: "View invoice" },
    ar: { subject: "تم استلام الدفعة ✅ (شكرًا!)", preview: "كل شيء جاهز - موقعك يعمل", h1: "تم، شكرًا لك! ✅",
      p1: `${hiL(c, lang)}تمت دفعتك الشهرية${amt ? ` بمبلغ ${amt}` : ""} بنجاح، وموقع ${bizL(c, lang)} يواصل العمل دون انقطاع.`,
      hl: "📄 احتفظ بهذا البريد كإيصال. تريد فاتورة رسمية؟ إنها أدناه.", btn: "عرض الفاتورة" },
    fr: { subject: "Paiement reçu ✅ (merci !)", preview: "Tout est réglé - votre site continue", h1: "C'est bon, merci ! ✅",
      p1: `${hiL(c, lang)}Votre paiement mensuel${amt ? ` de ${amt}` : ""} a été effectué, et le site de ${bizL(c, lang)} continue de fonctionner sans interruption.`,
      hl: "📄 Conservez cet e-mail comme reçu. Besoin d'une facture ? Elle est juste en dessous.", btn: "Voir la facture" },
    ru: { subject: "Платёж получен ✅ (спасибо!)", preview: "Всё в порядке - сайт работает", h1: "Готово, спасибо! ✅",
      p1: `${hiL(c, lang)}Ваш ежемесячный платёж${amt ? ` на сумму ${amt}` : ""} прошёл успешно, и сайт ${bizL(c, lang)} продолжает работать без перебоев.`,
      hl: "📄 Сохраните это письмо как квитанцию. Нужен счёт? Он ниже.", btn: "Посмотреть счёт" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + (c.invoiceUrl ? emailButton(T.btn, c.invoiceUrl, BRAND) : ""),
    }),
  };
};

/** 6. Charge failed (day 0). */
export const paymentFailed = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const amt = c.amountIls ? ils(c.amountIls) : "";
  const T = {
    he: { subject: "אופס - הכרטיס אמר 'לא היום' 💳", preview: "רגע קטן של עדכון וחוזרים לעניינים", h1: "החיוב לא עבר 💳",
      p1: `${hiL(c, lang)}ניסינו לחייב את אמצעי התשלום${amt ? ` בסך ${amt}` : ""} - והוא קצת התעקש. קורה לכולם (כרטיס שפג, מסגרת, או סתם יום קשה לבנק 🙂).`,
      hl: "✅ האתר שלכם עדיין פעיל ועובד כרגיל. רק צריך לעדכן אמצעי תשלום כדי שיישאר ככה.", btn: "עדכון אמצעי תשלום" },
    en: { subject: "Oops - the card said 'not today' 💳", preview: "A quick update and we're back on track", h1: "The charge didn't go through 💳",
      p1: `${hiL(c, lang)}We tried to charge your payment method${amt ? ` for ${amt}` : ""} - and it pushed back a little. Happens to everyone (expired card, limit, or just a rough day for the bank 🙂).`,
      hl: "✅ Your site is still live and working as usual. Just update your payment method to keep it that way.", btn: "Update payment method" },
    ar: { subject: "عذرًا - البطاقة قالت 'ليس اليوم' 💳", preview: "تحديث سريع ونعود للعمل", h1: "لم تتم عملية الدفع 💳",
      p1: `${hiL(c, lang)}حاولنا خصم وسيلة الدفع${amt ? ` بمبلغ ${amt}` : ""} - لكنها لم تنجح. يحدث للجميع (بطاقة منتهية، حد ائتماني، أو يوم صعب للبنك 🙂).`,
      hl: "✅ موقعك لا يزال يعمل كالمعتاد. فقط حدّث وسيلة الدفع ليبقى كذلك.", btn: "تحديث وسيلة الدفع" },
    fr: { subject: "Oups - la carte a dit 'pas aujourd'hui' 💳", preview: "Une petite mise à jour et on repart", h1: "Le paiement n'est pas passé 💳",
      p1: `${hiL(c, lang)}Nous avons tenté de débiter votre moyen de paiement${amt ? ` de ${amt}` : ""} - sans succès. Ça arrive à tout le monde (carte expirée, plafond, ou juste une mauvaise journée pour la banque 🙂).`,
      hl: "✅ Votre site est toujours en ligne et fonctionne normalement. Mettez simplement à jour votre moyen de paiement.", btn: "Mettre à jour le paiement" },
    ru: { subject: "Упс - карта сказала «не сегодня» 💳", preview: "Небольшое обновление - и мы снова в деле", h1: "Платёж не прошёл 💳",
      p1: `${hiL(c, lang)}Мы попытались списать оплату${amt ? ` на сумму ${amt}` : ""} - но не вышло. Бывает у всех (истёкшая карта, лимит или просто трудный день у банка 🙂).`,
      hl: "✅ Ваш сайт по-прежнему работает как обычно. Просто обновите способ оплаты, чтобы так и осталось.", btn: "Обновить способ оплаты" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** 7. Dunning reminder (days 3 & 7). */
export const paymentReminder = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const T = {
    he: { subject: "תזכורת קטנה - התשלום עוד ממתין 🙏", preview: "כדי שהאתר יישאר באוויר", h1: "רק תזכורת ידידותית 🙏",
      p1: `${hiL(c, lang)}עדיין לא הצלחנו לחייב את המנוי. לא נעים לנו לנדנד, אבל לא נעים לנו עוד יותר אם האתר של ${bizL(c, lang)} יושהה.`,
      hl: "⏸️ אם התשלום לא יוסדר בימים הקרובים, האתר יושהה זמנית (אבל לא נמחק - אפשר תמיד להחזיר).", btn: "להסדרת התשלום עכשיו" },
    en: { subject: "A small reminder - payment still pending 🙏", preview: "To keep your site online", h1: "Just a friendly reminder 🙏",
      p1: `${hiL(c, lang)}We still haven't been able to charge your subscription. We don't like nagging - but we'd like it even less if ${bizL(c, lang)}'s site got suspended.`,
      hl: "⏸️ If payment isn't sorted in the coming days, the site will be temporarily suspended (but not deleted - it can always be restored).", btn: "Sort out payment now" },
    ar: { subject: "تذكير بسيط - الدفعة ما زالت معلّقة 🙏", preview: "لإبقاء موقعك على الإنترنت", h1: "مجرد تذكير ودّي 🙏",
      p1: `${hiL(c, lang)}لم نتمكن بعد من تحصيل الاشتراك. لا نحب الإلحاح - لكننا لا نريد أن يُعلّق موقع ${bizL(c, lang)}.`,
      hl: "⏸️ إذا لم تتم تسوية الدفع خلال الأيام القادمة، سيُعلّق الموقع مؤقتًا (لكن لن يُحذف - يمكن دائمًا استعادته).", btn: "سوِّ الدفع الآن" },
    fr: { subject: "Petit rappel - paiement en attente 🙏", preview: "Pour garder votre site en ligne", h1: "Juste un rappel amical 🙏",
      p1: `${hiL(c, lang)}Nous n'avons pas encore pu débiter votre abonnement. On n'aime pas insister - mais on aimerait encore moins que le site de ${bizL(c, lang)} soit suspendu.`,
      hl: "⏸️ Si le paiement n'est pas réglé dans les prochains jours, le site sera temporairement suspendu (mais pas supprimé - toujours restaurable).", btn: "Régler le paiement" },
    ru: { subject: "Небольшое напоминание - платёж ожидается 🙏", preview: "Чтобы сайт оставался онлайн", h1: "Просто дружеское напоминание 🙏",
      p1: `${hiL(c, lang)}Нам пока не удалось списать оплату подписки. Не любим напоминать - но ещё меньше хотим, чтобы сайт ${bizL(c, lang)} приостановили.`,
      hl: "⏸️ Если оплата не будет улажена в ближайшие дни, сайт временно приостановят (но не удалят - всегда можно восстановить).", btn: "Оплатить сейчас" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** 8. Site frozen (day 10). */
export const siteFrozen = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const T = {
    he: { subject: "האתר שלכם לקח פסק זמן ⏸️", preview: "הוא לא נעלם - רק ממתין לכם", h1: "האתר הושהה זמנית ⏸️",
      p1: `${hiL(c, lang)}מאחר שהתשלום לא הוסדר, האתר של ${bizL(c, lang)} הושהה ואינו זמין כרגע ללקוחות. אבל אל דאגה - הוא לא נעלם לשום מקום, כל התכנים והנתונים שמורים.`,
      hl: "⚡ רגע של הסדרת תשלום - והאתר קופץ בחזרה לחיים, בדיוק כמו שהיה.", btn: "החזרת האתר לפעילות" },
    en: { subject: "Your site took a time-out ⏸️", preview: "It's not gone - just waiting for you", h1: "Your site is temporarily suspended ⏸️",
      p1: `${hiL(c, lang)}Since payment wasn't sorted, ${bizL(c, lang)}'s site has been suspended and isn't available to customers right now. But don't worry - it's not gone anywhere, all content and data are saved.`,
      hl: "⚡ One moment to sort out payment - and the site jumps right back to life, exactly as it was.", btn: "Reactivate the site" },
    ar: { subject: "موقعك أخذ استراحة ⏸️", preview: "لم يختفِ - إنه ينتظرك فقط", h1: "تم تعليق موقعك مؤقتًا ⏸️",
      p1: `${hiL(c, lang)}بما أن الدفع لم يتم، تم تعليق موقع ${bizL(c, lang)} وهو غير متاح للعملاء حاليًا. لكن لا تقلق - لم يختفِ، وكل المحتوى والبيانات محفوظة.`,
      hl: "⚡ لحظة لتسوية الدفع - ويعود الموقع للحياة تمامًا كما كان.", btn: "إعادة تفعيل الموقع" },
    fr: { subject: "Votre site a fait une pause ⏸️", preview: "Il n'a pas disparu - il vous attend", h1: "Votre site est temporairement suspendu ⏸️",
      p1: `${hiL(c, lang)}Le paiement n'ayant pas été réglé, le site de ${bizL(c, lang)} a été suspendu et n'est pas disponible pour les clients. Pas d'inquiétude - il n'a pas disparu, tout le contenu et les données sont sauvegardés.`,
      hl: "⚡ Un instant pour régler le paiement - et le site revient à la vie, exactement comme avant.", btn: "Réactiver le site" },
    ru: { subject: "Ваш сайт взял паузу ⏸️", preview: "Он не исчез - просто ждёт вас", h1: "Ваш сайт временно приостановлен ⏸️",
      p1: `${hiL(c, lang)}Поскольку оплата не была улажена, сайт ${bizL(c, lang)} приостановлен и сейчас недоступен клиентам. Но не волнуйтесь - он никуда не делся, весь контент и данные сохранены.`,
      hl: "⚡ Момент на оплату - и сайт снова оживает, точно таким, каким был.", btn: "Восстановить сайт" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** 9. Pre-deletion warning. (Serious, clear - no jokes about data loss.) */
export const deletionWarning = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const days = c.daysLeft ?? 14;
  const when = c.deleteDate ? ltr(c.deleteDate) : "";
  const T = {
    he: { subject: `חשוב: הנתונים יימחקו בעוד ${days} ימים`, preview: "פעולה אחרונה לשמירת האתר והנתונים", h1: "שימו לב - האתר עומד להימחק",
      p1: `${hiL(c, lang)}האתר של ${bizL(c, lang)} מושהה זה זמן מה עקב אי-תשלום. אנחנו לא רוצים שתאבדו את העבודה שהשקעתם.`,
      hl: `⚠️ אם התשלום לא יוסדר עד ${when || `${days} ימים`}, האתר, התכנים והנתונים יימחקו לצמיתות ולא ניתן יהיה לשחזרם.`,
      p2: "עדיין אפשר להציל הכל - פשוט מסדירים את התשלום והאתר חוזר לפעול.", btn: "הצלת האתר - להסדרת התשלום" },
    en: { subject: `Important: your data will be deleted in ${days} days`, preview: "A final action to save your site and data", h1: "Please note - your site is about to be deleted",
      p1: `${hiL(c, lang)}${bizL(c, lang)}'s site has been suspended for a while due to non-payment. We don't want you to lose the work you put in.`,
      hl: `⚠️ If payment isn't sorted by ${when || `${days} days`}, the site, content and data will be permanently deleted and cannot be recovered.`,
      p2: "You can still save everything - just settle the payment and the site is back.", btn: "Save the site - settle payment" },
    ar: { subject: `مهم: ستُحذف بياناتك خلال ${days} يومًا`, preview: "إجراء أخير لحفظ موقعك وبياناتك", h1: "انتبه - موقعك على وشك الحذف",
      p1: `${hiL(c, lang)}موقع ${bizL(c, lang)} معلّق منذ فترة بسبب عدم الدفع. لا نريدك أن تفقد العمل الذي بذلته.`,
      hl: `⚠️ إذا لم تتم تسوية الدفع بحلول ${when || `${days} يومًا`}، سيُحذف الموقع والمحتوى والبيانات نهائيًا دون إمكانية الاسترجاع.`,
      p2: "لا يزال بإمكانك إنقاذ كل شيء - فقط سوِّ الدفع ويعود الموقع.", btn: "أنقذ الموقع - سوِّ الدفع" },
    fr: { subject: `Important : vos données seront supprimées dans ${days} jours`, preview: "Une dernière action pour sauver votre site", h1: "Attention - votre site va être supprimé",
      p1: `${hiL(c, lang)}Le site de ${bizL(c, lang)} est suspendu depuis un moment pour non-paiement. Nous ne voulons pas que vous perdiez votre travail.`,
      hl: `⚠️ Si le paiement n'est pas réglé d'ici ${when || `${days} jours`}, le site, le contenu et les données seront définitivement supprimés, sans récupération possible.`,
      p2: "Vous pouvez encore tout sauver - réglez simplement le paiement et le site revient.", btn: "Sauver le site - régler" },
    ru: { subject: `Важно: ваши данные будут удалены через ${days} дн.`, preview: "Последнее действие, чтобы сохранить сайт", h1: "Внимание - сайт скоро будет удалён",
      p1: `${hiL(c, lang)}Сайт ${bizL(c, lang)} уже некоторое время приостановлен из-за неоплаты. Мы не хотим, чтобы вы потеряли свою работу.`,
      hl: `⚠️ Если оплата не будет улажена до ${when || `${days} дн.`}, сайт, контент и данные будут удалены навсегда без возможности восстановления.`,
      p2: "Ещё можно всё спасти - просто оплатите, и сайт вернётся.", btn: "Спасти сайт - оплатить" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + p(T.p2) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** 10. Final deletion notice. */
export const siteDeleted = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const T = {
    he: { subject: "האתר והנתונים נמחקו", preview: "תמיד אפשר להתחיל מחדש", h1: "האתר נמחק",
      p1: `${hiL(c, lang)}בהתאם לתנאי השימוש, האתר של ${bizL(c, lang)} והנתונים נמחקו עקב אי-תשלום ממושך.`,
      p2: "חבל שנפרדנו ככה - אבל הדלת תמיד פתוחה. אם תרצו לחזור, נשמח לבנות איתכם אתר חדש מאפס, מתי שתרצו. 🙏", btn: "פתיחת אתר חדש" },
    en: { subject: "Your site and data have been deleted", preview: "You can always start again", h1: "Your site has been deleted",
      p1: `${hiL(c, lang)}In line with our terms, ${bizL(c, lang)}'s site and data were deleted due to prolonged non-payment.`,
      p2: "Sad to part this way - but the door is always open. If you'd like to come back, we'll happily build a new site with you from scratch, whenever you want. 🙏", btn: "Start a new site" },
    ar: { subject: "تم حذف موقعك وبياناتك", preview: "يمكنك دائمًا البدء من جديد", h1: "تم حذف موقعك",
      p1: `${hiL(c, lang)}وفقًا لشروط الاستخدام، تم حذف موقع ${bizL(c, lang)} وبياناته بسبب عدم الدفع لفترة طويلة.`,
      p2: "مؤسف أن نفترق هكذا - لكن الباب مفتوح دائمًا. إن أردت العودة، يسعدنا بناء موقع جديد معك من الصفر، متى شئت. 🙏", btn: "ابدأ موقعًا جديدًا" },
    fr: { subject: "Votre site et vos données ont été supprimés", preview: "Vous pouvez toujours recommencer", h1: "Votre site a été supprimé",
      p1: `${hiL(c, lang)}Conformément à nos conditions, le site de ${bizL(c, lang)} et ses données ont été supprimés pour non-paiement prolongé.`,
      p2: "Dommage de se quitter ainsi - mais la porte reste ouverte. Si vous souhaitez revenir, nous serons ravis de reconstruire un site avec vous, quand vous voudrez. 🙏", btn: "Créer un nouveau site" },
    ru: { subject: "Ваш сайт и данные удалены", preview: "Вы всегда можете начать заново", h1: "Ваш сайт удалён",
      p1: `${hiL(c, lang)}Согласно условиям использования, сайт ${bizL(c, lang)} и его данные были удалены из-за длительной неоплаты.`,
      p2: "Жаль расставаться так - но дверь всегда открыта. Если захотите вернуться, с радостью построим новый сайт с нуля, когда пожелаете. 🙏", btn: "Создать новый сайт" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + p(T.p2) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** 11. Site reactivated after payment. */
export const siteReactivated = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const T = {
    he: { subject: "חזרנו לאוויר! 🎉 האתר שוב פעיל", preview: "הכל חזר לעבוד במצב רוח מצוין", h1: "האתר שוב באוויר! 🎉",
      p1: `${hiL(c, lang)}התשלום הוסדר והאתר של ${bizL(c, lang)} חזר לפעול כרגיל - ובמצב רוח מצוין. תודה שחזרתם! 💚`, btn: "צפייה באתר" },
    en: { subject: "We're back online! 🎉 Your site is live again", preview: "Everything's working, in a great mood", h1: "Your site is live again! 🎉",
      p1: `${hiL(c, lang)}Payment is sorted and ${bizL(c, lang)}'s site is back to normal - and in a great mood. Thanks for coming back! 💚`, btn: "View the site" },
    ar: { subject: "عدنا للعمل! 🎉 موقعك يعمل من جديد", preview: "كل شيء يعمل بمزاج رائع", h1: "موقعك يعمل من جديد! 🎉",
      p1: `${hiL(c, lang)}تمت تسوية الدفع وعاد موقع ${bizL(c, lang)} للعمل كالمعتاد - وبمزاج رائع. شكرًا لعودتك! 💚`, btn: "عرض الموقع" },
    fr: { subject: "De retour en ligne ! 🎉 Votre site est réactivé", preview: "Tout refonctionne, de bonne humeur", h1: "Votre site est de nouveau en ligne ! 🎉",
      p1: `${hiL(c, lang)}Le paiement est réglé et le site de ${bizL(c, lang)} fonctionne à nouveau normalement - et de très bonne humeur. Merci d'être revenu ! 💚`, btn: "Voir le site" },
    ru: { subject: "Снова онлайн! 🎉 Ваш сайт опять работает", preview: "Всё работает, в отличном настроении", h1: "Ваш сайт снова онлайн! 🎉",
      p1: `${hiL(c, lang)}Оплата улажена, и сайт ${bizL(c, lang)} снова работает как обычно - и в отличном настроении. Спасибо, что вернулись! 💚`, btn: "Посмотреть сайт" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailButton(T.btn, c.siteUrl || dash(c), BRAND),
    }),
  };
};

/** 12. Subscription cancelled confirmation. */
export const subscriptionCancelled = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const fd = c.freezeDate ? ltr(c.freezeDate) : "";
  const T = {
    he: { subject: "המנוי בוטל - נתראה (בתקווה) בקרוב 👋", preview: "פרטי הביטול בפנים", h1: "המנוי בוטל 👋",
      p1: `${hiL(c, lang)}קלטנו את בקשת הביטול.${fd ? ` האתר יישאר פעיל עד ${fd}, אז יש עוד זמן להתחרט 😉.` : ""}`,
      p2: "היה לנו כיף לארח אתכם. אם אי פעם תרצו לחזור - אנחנו כאן, והכפתור למטה תמיד עובד.", btn: "חידוש מנוי" },
    en: { subject: "Subscription cancelled - see you (hopefully) soon 👋", preview: "Cancellation details inside", h1: "Subscription cancelled 👋",
      p1: `${hiL(c, lang)}We've received your cancellation request.${fd ? ` The site stays active until ${fd}, so there's still time to change your mind 😉.` : ""}`,
      p2: "It was fun having you. If you ever want to come back - we're here, and the button below always works.", btn: "Renew subscription" },
    ar: { subject: "تم إلغاء الاشتراك - نراك (نأمل) قريبًا 👋", preview: "تفاصيل الإلغاء بالداخل", h1: "تم إلغاء الاشتراك 👋",
      p1: `${hiL(c, lang)}استلمنا طلب الإلغاء.${fd ? ` يبقى الموقع فعّالًا حتى ${fd}، فما زال هناك وقت لتغيير رأيك 😉.` : ""}`,
      p2: "سعدنا باستضافتك. إن أردت العودة يومًا - نحن هنا، والزر بالأسفل يعمل دائمًا.", btn: "تجديد الاشتراك" },
    fr: { subject: "Abonnement annulé - à bientôt (on l'espère) 👋", preview: "Détails de l'annulation à l'intérieur", h1: "Abonnement annulé 👋",
      p1: `${hiL(c, lang)}Nous avons bien reçu votre demande d'annulation.${fd ? ` Le site reste actif jusqu'au ${fd}, il reste donc du temps pour changer d'avis 😉.` : ""}`,
      p2: "C'était un plaisir de vous accueillir. Si vous voulez revenir un jour - nous sommes là, et le bouton ci-dessous fonctionne toujours.", btn: "Renouveler l'abonnement" },
    ru: { subject: "Подписка отменена - до встречи (надеемся) скоро 👋", preview: "Детали отмены внутри", h1: "Подписка отменена 👋",
      p1: `${hiL(c, lang)}Мы получили запрос на отмену.${fd ? ` Сайт остаётся активным до ${fd}, так что ещё есть время передумать 😉.` : ""}`,
      p2: "Нам было приятно вас принимать. Если однажды захотите вернуться - мы здесь, и кнопка ниже всегда работает.", btn: "Продлить подписку" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + p(T.p2) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** 13. New order notification to the MERCHANT. */
export const newOrderMerchant = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const amt = c.amountIls ? ils(c.amountIls) : "";
  const b = bizL(c, lang);
  const T = {
    he: { subject: amt ? `💰 הידד! נכנסה הזמנה על ${amt}` : "💰 הידד! נכנסה הזמנה חדשה", preview: amt ? `${amt} בדרך אליכם` : "הרגע של ריקוד קטן בכיסא",
      h1: amt ? `${amt} בדרך אליכם! 🎉` : "הזמנה חדשה נחתה! 🎉",
      p1: `${hiL(c, lang)}מישהו בדיוק קנה אצלכם${amt ? ` בסך ${amt}` : ""} ב-${b}. זה הרגע שבו מותר לעשות ריקוד קטן בכיסא - מגיע לכם. 💃`,
      hl: "📦 כל הפרטים (מה הוזמן, פרטי הלקוח, כתובת) מחכים לכם בדשבורד.", btn: "לצפייה בהזמנה" },
    en: { subject: amt ? `💰 Woohoo! An order for ${amt} came in` : "💰 Woohoo! A new order came in", preview: amt ? `${amt} on its way to you` : "Time for a little chair dance",
      h1: amt ? `${amt} on its way to you! 🎉` : "A new order landed! 🎉",
      p1: `${hiL(c, lang)}Someone just bought from you${amt ? ` for ${amt}` : ""} at ${b}. This is the moment for a little chair dance - you've earned it. 💃`,
      hl: "📦 All the details (what was ordered, customer info, address) are waiting in your dashboard.", btn: "View the order" },
    ar: { subject: amt ? `💰 مرحى! وصل طلب بقيمة ${amt}` : "💰 مرحى! وصل طلب جديد", preview: amt ? `${amt} في طريقها إليك` : "حان وقت رقصة صغيرة",
      h1: amt ? `${amt} في طريقها إليك! 🎉` : "وصل طلب جديد! 🎉",
      p1: `${hiL(c, lang)}اشترى أحدهم منك للتو${amt ? ` بمبلغ ${amt}` : ""} في ${b}. هذه لحظة تستحق رقصة صغيرة - تستحقها. 💃`,
      hl: "📦 كل التفاصيل (ما تم طلبه، بيانات العميل، العنوان) بانتظارك في لوحة التحكم.", btn: "عرض الطلب" },
    fr: { subject: amt ? `💰 Youpi ! Une commande de ${amt} est arrivée` : "💰 Youpi ! Une nouvelle commande", preview: amt ? `${amt} en route vers vous` : "Le moment d'une petite danse",
      h1: amt ? `${amt} en route vers vous ! 🎉` : "Une nouvelle commande ! 🎉",
      p1: `${hiL(c, lang)}Quelqu'un vient d'acheter chez vous${amt ? ` pour ${amt}` : ""} sur ${b}. C'est le moment d'une petite danse sur la chaise - vous l'avez mérité. 💃`,
      hl: "📦 Tous les détails (commande, infos client, adresse) vous attendent dans le tableau de bord.", btn: "Voir la commande" },
    ru: { subject: amt ? `💰 Ура! Поступил заказ на ${amt}` : "💰 Ура! Поступил новый заказ", preview: amt ? `${amt} уже в пути к вам` : "Время для маленького танца",
      h1: amt ? `${amt} уже в пути к вам! 🎉` : "Поступил новый заказ! 🎉",
      p1: `${hiL(c, lang)}Кто-то только что купил у вас${amt ? ` на ${amt}` : ""} в ${b}. Самое время для маленького танца на стуле - вы это заслужили. 💃`,
      hl: "📦 Все детали (что заказано, данные клиента, адрес) ждут вас в панели управления.", btn: "Посмотреть заказ" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** New lead captured from a storefront form -> notify the MERCHANT (Siango sender).
 *  Same branded template as the other platform emails. Lead values are escaped. */
export const newLeadMerchant = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const b = bizL(c, lang);
  const escv = (s?: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const L = {
    he: { name: "שם", phone: "טלפון", email: "אימייל", interest: "מתעניין ב", msg: "הודעה" },
    en: { name: "Name", phone: "Phone", email: "Email", interest: "Interested in", msg: "Message" },
    ar: { name: "الاسم", phone: "الهاتف", email: "البريد", interest: "مهتم بـ", msg: "رسالة" },
    fr: { name: "Nom", phone: "Téléphone", email: "E-mail", interest: "Intéressé par", msg: "Message" },
    ru: { name: "Имя", phone: "Телефон", email: "Email", interest: "Интересует", msg: "Сообщение" },
  }[lang];
  const line = (label: string, val?: string, isLtr = false) =>
    val ? `<b>${label}:</b> ${isLtr ? ltr(escv(val)) : escv(val)}<br>` : "";
  const details =
    line(L.name, c.leadName) + line(L.phone, c.leadPhone, true) + line(L.email, c.leadEmail, true) +
    line(L.interest, c.leadTitle) + line(L.msg, c.leadMessage);
  const T = {
    he: { subject: `📥 ליד חדש${c.leadTitle ? ` - ${c.leadTitle}` : ""}!`, preview: "מישהו השאיר פרטים באתר שלכם",
      h1: "ליד חדש מחכה לך! 📥", p1: `${hiL(c, lang)}מישהו השאיר פרטים ב-${b}${c.leadTitle ? ` לגבי ${c.leadTitle}` : ""}. כדאי לחזור אליו מהר - לידים חמים מתקררים. 🔥`, btn: "לצפייה בלוח הלידים" },
    en: { subject: `📥 New lead${c.leadTitle ? ` - ${c.leadTitle}` : ""}!`, preview: "Someone left their details on your site",
      h1: "A new lead is waiting! 📥", p1: `${hiL(c, lang)}Someone left their details at ${b}${c.leadTitle ? ` about ${c.leadTitle}` : ""}. Best to get back to them fast - hot leads cool off. 🔥`, btn: "View your leads" },
    ar: { subject: `📥 عميل محتمل جديد${c.leadTitle ? ` - ${c.leadTitle}` : ""}!`, preview: "ترك أحدهم بياناته على موقعك",
      h1: "عميل محتمل جديد بانتظارك! 📥", p1: `${hiL(c, lang)}ترك أحدهم بياناته في ${b}${c.leadTitle ? ` بخصوص ${c.leadTitle}` : ""}. من الأفضل التواصل معه بسرعة. 🔥`, btn: "عرض العملاء المحتملين" },
    fr: { subject: `📥 Nouveau prospect${c.leadTitle ? ` - ${c.leadTitle}` : ""} !`, preview: "Quelqu'un a laissé ses coordonnées sur votre site",
      h1: "Un nouveau prospect vous attend ! 📥", p1: `${hiL(c, lang)}Quelqu'un a laissé ses coordonnées sur ${b}${c.leadTitle ? ` à propos de ${c.leadTitle}` : ""}. Mieux vaut le rappeler vite. 🔥`, btn: "Voir les prospects" },
    ru: { subject: `📥 Новый лид${c.leadTitle ? ` - ${c.leadTitle}` : ""}!`, preview: "Кто-то оставил свои данные на вашем сайте",
      h1: "Вас ждёт новый лид! 📥", p1: `${hiL(c, lang)}Кто-то оставил свои данные на ${b}${c.leadTitle ? ` по поводу ${c.leadTitle}` : ""}. Лучше связаться быстрее. 🔥`, btn: "Посмотреть лиды" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(details, BRAND, dir) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** Customer-facing order confirmation (transactional). sender = the MERCHANT.
 *  Localized to the shopper's language (defaults to Hebrew). */
export const orderConfirmationCustomer = (
  merchant: EmailSender,
  args: {
    firstName?: string;
    storeName: string;
    orderTotal?: number;
    storeUrl: string;
    items?: { name: string; quantity: number; price: number }[];
    orderNumber?: string;
    lang?: EmailLang;
  },
): BuiltEmail => {
  const lang = args.lang || "he";
  const dir = dirForLang(lang);
  const nm = args.firstName;
  const store = args.storeName;
  const onum = args.orderNumber ? ltr(args.orderNumber) : "";
  const T = {
    he: {
      subject: `יש! ההזמנה שלך מ${store} התקבלה 🎉`, preview: "תודה רבה! הנה כל הפרטים", h1: "ההזמנה התקבלה! 🎉",
      p1: `${nm ? `היי ${nm}! ` : "היי! "}תודה רבה על הרכישה ב${store} - בחירה מצוינת, אם יורשה לנו לומר 😉. קיבלנו את ההזמנה${onum ? ` (מספר ${onum})` : ""} וכבר מתחילים לטפל בה.`,
      p2: "הנה מה שהזמנת:", p3: "נעדכן אותך בכל שלב. יש שאלה? פשוט השב/י למייל הזה - אנחנו אנשים אמיתיים ונשמח לעזור. 🙏", btn: "חזרה לחנות",
    },
    en: {
      subject: `Yes! Your order from ${store} is confirmed 🎉`, preview: "Thank you! Here are all the details", h1: "Order confirmed! 🎉",
      p1: `${nm ? `Hi ${nm}! ` : "Hi! "}Thank you for your purchase at ${store} - great choice, if we may say so 😉. We've received your order${onum ? ` (no. ${onum})` : ""} and we're already on it.`,
      p2: "Here's what you ordered:", p3: "We'll keep you posted at every step. A question? Just reply to this email - we're real people and happy to help. 🙏", btn: "Back to store",
    },
    ar: {
      subject: `رائع! تم تأكيد طلبك من ${store} 🎉`, preview: "شكرًا لك! إليك كل التفاصيل", h1: "تم تأكيد الطلب! 🎉",
      p1: `${nm ? `مرحبًا ${nm}! ` : "مرحبًا! "}شكرًا لشرائك من ${store} - اختيار رائع، إن جاز لنا القول 😉. لقد استلمنا طلبك${onum ? ` (رقم ${onum})` : ""} وبدأنا العمل عليه.`,
      p2: "إليك ما طلبته:", p3: "سنبقيك على اطلاع في كل خطوة. سؤال؟ فقط ردّ على هذا البريد - نحن أشخاص حقيقيون ويسعدنا المساعدة. 🙏", btn: "العودة إلى المتجر",
    },
    fr: {
      subject: `Super ! Votre commande de ${store} est confirmée 🎉`, preview: "Merci ! Voici tous les détails", h1: "Commande confirmée ! 🎉",
      p1: `${nm ? `Bonjour ${nm} ! ` : "Bonjour ! "}Merci pour votre achat chez ${store} - excellent choix, si nous pouvons nous permettre 😉. Nous avons bien reçu votre commande${onum ? ` (n° ${onum})` : ""} et nous nous en occupons déjà.`,
      p2: "Voici ce que vous avez commandé :", p3: "Nous vous tiendrons informé à chaque étape. Une question ? Répondez simplement à cet e-mail - nous sommes de vraies personnes, ravies d'aider. 🙏", btn: "Retour à la boutique",
    },
    ru: {
      subject: `Ура! Ваш заказ из ${store} подтверждён 🎉`, preview: "Спасибо! Вот все детали", h1: "Заказ подтверждён! 🎉",
      p1: `${nm ? `Привет, ${nm}! ` : "Привет! "}Спасибо за покупку в ${store} - отличный выбор, если позволите 😉. Мы получили ваш заказ${onum ? ` (№ ${onum})` : ""} и уже занимаемся им.`,
      p2: "Вот что вы заказали:", p3: "Будем держать вас в курсе на каждом шаге. Вопрос? Просто ответьте на это письмо - мы живые люди и рады помочь. 🙏", btn: "Вернуться в магазин",
    },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: merchant,
      previewText: T.preview,
      lang,
      dir,
      bodyHtml:
        h1(T.h1) + p(T.p1) + p(T.p2) +
        (args.items && args.items.length ? emailItemsTable(args.items, args.orderTotal) : "") +
        p(T.p3) + emailButton(T.btn, args.storeUrl, merchant.brandColor || BRAND),
    }),
  };
};

/** Customer-facing order STATUS update (transactional). sender = the MERCHANT.
 *  Sent when the merchant marks an order completed / cancelled in the dashboard.
 *  Hebrew / RTL, merchant-branded. Compliant footer (Chok HaSpam) via renderEmail:
 *  one-click unsubscribe embeds the recipient address, exactly like the order
 *  confirmation email. */
export const orderStatusCustomer = (args: {
  businessName: string;
  /** 'completed' | 'cancelled'. Anything else is treated as 'completed'. */
  status: string;
  orderTotal?: number;
  storeUrl?: string;
  brandColor?: string;
  logoUrl?: string;
  /** Merchant contact - shown in the footer and used as reply-to upstream. */
  email?: string;
  /** Shopper's first name for a warmer greeting (optional). */
  firstName?: string;
  /** Recipient address - embedded in the one-click unsubscribe link. */
  recipientEmail?: string;
}): BuiltEmail => {
  const store = args.businessName || "החנות";
  const storeUrl = (args.storeUrl || "https://siango.app").replace(/\/$/, "");
  const brand = args.brandColor || BRAND;
  const amt = args.orderTotal ? ils(args.orderTotal) : "";
  const nm = args.firstName;
  const greet = nm ? `היי ${nm}! ` : "היי! ";
  const cancelled = args.status === "cancelled";

  const sender: EmailSender = {
    businessName: store,
    email: args.email,
    brandColor: brand,
    logoUrl: args.logoUrl,
    unsubscribeUrl: args.recipientEmail
      ? `${storeUrl}/unsubscribe?email=${encodeURIComponent(args.recipientEmail)}`
      : `${storeUrl}/unsubscribe`,
  };

  const T = cancelled
    ? {
        subject: `עדכון על ההזמנה שלך מ${store} - ההזמנה בוטלה`,
        preview: "פרטים על ביטול ההזמנה",
        h1: "ההזמנה בוטלה",
        p1: `${greet}רצינו לעדכן שההזמנה שלך ב${store}${amt ? ` בסך ${amt}` : ""} בוטלה. אם כבר בוצע חיוב, הזיכוי יוחזר לאמצעי התשלום שלך בהתאם לנהלי חברת האשראי.`,
        hl: "❓ ביטלת בטעות, או שיש לך שאלה על ההזמנה? פשוט השב/י למייל הזה - נשמח לעזור.",
        btn: "חזרה לחנות",
      }
    : {
        subject: `ההזמנה שלך מ${store} הושלמה 🎉`,
        preview: "ההזמנה הושלמה - תודה שקנית אצלנו!",
        h1: "ההזמנה הושלמה! 🎉",
        p1: `${greet}יש חדשות טובות - ההזמנה שלך ב${store}${amt ? ` בסך ${amt}` : ""} טופלה והושלמה. תודה רבה שקנית אצלנו! 🙏`,
        hl: "📦 קיבלת את ההזמנה או שיש לך שאלה? פשוט השב/י למייל הזה - אנחנו כאן בשבילך.",
        btn: "חזרה לחנות",
      };

  return {
    subject: T.subject,
    html: renderEmail({
      sender,
      previewText: T.preview,
      lang: "he",
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl, brand) + emailButton(T.btn, storeUrl, brand),
    }),
  };
};

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
      sender: siangoSender(c),
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
export const domainExpiryReminder = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const dn = ltr(c.domainName || "");
  const days = c.daysLeft;
  const T = {
    he: { subject: `הדומיין ${c.domainName || "שלך"} מתקרב לתפוגה ⏰`, preview: "עוד זמן קצר לחידוש - שלא תאבדו את הכתובת", h1: "הדומיין שלך מתקרב לתפוגה ⏰",
      p1: `${hiL(c, lang)}הדומיין <b>${dn}</b>${days != null ? ` יפוג בעוד ${days} ימים` : " עומד לפוג בקרוב"}. כדי שהאתר והמייל ימשיכו לעבוד - צריך לחדש אותו.`,
      hl: "💡 אם החידוש האוטומטי פעיל - לא צריך לעשות כלום, נטפל בזה.", btn: "לחידוש הדומיין" },
    en: { subject: `Your domain ${c.domainName || ""} is expiring soon ⏰`, preview: "Renew soon so you don't lose your address", h1: "Your domain is expiring soon ⏰",
      p1: `${hiL(c, lang)}Your domain <b>${dn}</b>${days != null ? ` expires in ${days} days` : " is expiring soon"}. To keep the site and email working - it needs to be renewed.`,
      hl: "💡 If auto-renew is on - you don't need to do anything, we'll handle it.", btn: "Renew the domain" },
    ar: { subject: `نطاقك ${c.domainName || ""} يقترب من الانتهاء ⏰`, preview: "جدّد قريبًا حتى لا تفقد عنوانك", h1: "نطاقك يقترب من الانتهاء ⏰",
      p1: `${hiL(c, lang)}نطاقك <b>${dn}</b>${days != null ? ` سينتهي خلال ${days} يومًا` : " سينتهي قريبًا"}. لكي يستمر الموقع والبريد بالعمل - يجب تجديده.`,
      hl: "💡 إذا كان التجديد التلقائي مفعّلًا - لا داعي لفعل شيء، سنتولى الأمر.", btn: "تجديد النطاق" },
    fr: { subject: `Votre domaine ${c.domainName || ""} expire bientôt ⏰`, preview: "Renouvelez vite pour ne pas perdre votre adresse", h1: "Votre domaine expire bientôt ⏰",
      p1: `${hiL(c, lang)}Votre domaine <b>${dn}</b>${days != null ? ` expire dans ${days} jours` : " expire bientôt"}. Pour que le site et l'e-mail continuent de fonctionner - il faut le renouveler.`,
      hl: "💡 Si le renouvellement automatique est activé - rien à faire, on s'en occupe.", btn: "Renouveler le domaine" },
    ru: { subject: `Домен ${c.domainName || ""} скоро истекает ⏰`, preview: "Продлите, чтобы не потерять адрес", h1: "Ваш домен скоро истекает ⏰",
      p1: `${hiL(c, lang)}Ваш домен <b>${dn}</b>${days != null ? ` истекает через ${days} дн.` : " скоро истекает"}. Чтобы сайт и почта продолжали работать - его нужно продлить.`,
      hl: "💡 Если включено автопродление - ничего делать не нужно, мы всё сделаем.", btn: "Продлить домен" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + emailButton(T.btn, dash(c), BRAND),
    }),
  };
};

/** Domain about to be lost (renewal/payment failed). */
export const domainExpiringUnpaid = (c: PlatformCtx): BuiltEmail => {
  const lang = c.lang || "he";
  const dir = dirForLang(lang);
  const dn = ltr(c.domainName || "");
  const exp = c.expiryDate ? ltr(c.expiryDate) : "";
  const T = {
    he: { subject: `🔴 שימו לב: הדומיין ${c.domainName || "שלך"} עומד לרדת`, preview: "פעולה אחרונה כדי לא לאבד את הדומיין", h1: "הדומיין שלך בסכנת אובדן 🔴",
      p1: `${hiL(c, lang)}לא הצלחנו לחדש את הדומיין <b>${dn}</b>${exp ? ` (פג ב-${exp})` : ""}. אם לא יחודש בקרוב - הוא ישוחרר, וייתכן שלא נוכל להחזיר אותו.`,
      hl: "⚠️ דומיין שאבד עלול להילקח על ידי מישהו אחר. עדכנו אמצעי תשלום או חדשו ידנית כדי לשמור עליו.", btn: "להצלת הדומיין" },
    en: { subject: `🔴 Heads up: your domain ${c.domainName || ""} is about to be lost`, preview: "A final step to avoid losing your domain", h1: "Your domain is at risk 🔴",
      p1: `${hiL(c, lang)}We couldn't renew the domain <b>${dn}</b>${exp ? ` (expired ${exp})` : ""}. If it isn't renewed soon it will be released, and we may not be able to get it back.`,
      hl: "⚠️ A lost domain can be taken by someone else. Update your payment method or renew manually to keep it.", btn: "Save the domain" },
    ar: { subject: `🔴 تنبيه: نطاقك ${c.domainName || ""} على وشك الضياع`, preview: "خطوة أخيرة لتجنب فقدان نطاقك", h1: "نطاقك في خطر 🔴",
      p1: `${hiL(c, lang)}لم نتمكن من تجديد النطاق <b>${dn}</b>${exp ? ` (انتهى في ${exp})` : ""}. إن لم يُجدَّد قريبًا فسيتم تحريره، وقد لا نتمكن من استعادته.`,
      hl: "⚠️ النطاق المفقود قد يأخذه شخص آخر. حدّث وسيلة الدفع أو جدّد يدويًا للحفاظ عليه.", btn: "أنقذ النطاق" },
    fr: { subject: `🔴 Attention : votre domaine ${c.domainName || ""} va être perdu`, preview: "Une dernière étape pour ne pas perdre votre domaine", h1: "Votre domaine est en danger 🔴",
      p1: `${hiL(c, lang)}Nous n'avons pas pu renouveler le domaine <b>${dn}</b>${exp ? ` (expiré le ${exp})` : ""}. S'il n'est pas renouvelé bientôt, il sera libéré, et nous ne pourrons peut-être pas le récupérer.`,
      hl: "⚠️ Un domaine perdu peut être pris par quelqu'un d'autre. Mettez à jour le paiement ou renouvelez manuellement pour le garder.", btn: "Sauver le domaine" },
    ru: { subject: `🔴 Внимание: домен ${c.domainName || ""} скоро будет потерян`, preview: "Последний шаг, чтобы не потерять домен", h1: "Ваш домен под угрозой 🔴",
      p1: `${hiL(c, lang)}Не удалось продлить домен <b>${dn}</b>${exp ? ` (истёк ${exp})` : ""}. Если его не продлить в ближайшее время, он будет освобождён, и мы можем не суметь его вернуть.`,
      hl: "⚠️ Потерянный домен может занять кто-то другой. Обновите способ оплаты или продлите вручную, чтобы сохранить его.", btn: "Спасти домен" },
  }[lang];
  return {
    subject: T.subject,
    html: renderEmail({
      sender: siangoSender(c), previewText: T.preview, lang, dir,
      bodyHtml: h1(T.h1) + p(T.p1) + emailHighlight(T.hl) + emailButton(T.btn, dash(c), "#b91c1c"),
    }),
  };
};

/** INTERNAL admin alert: a paid domain order could not be registered (e.g. empty
 *  reseller balance). The customer already paid - needs urgent manual handling. */
export const domainFundsAlert = (c: PlatformCtx & { reason?: string }): BuiltEmail => ({
  subject: `🔴 דחוף: רכישת דומיין נכשלה - ${c.domainName || ""}`,
  html: renderEmail({
    sender: siangoSender(c),
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
    sender: siangoSender(c),
    previewText: "כדאי לטעון יתרה כדי לא לחסום רכישות דומיין",
    bodyHtml:
      h1("יתרת Openprovider נמוכה ⚠️") +
      p(`היתרה בחשבון ה-reseller ירדה ל-<b>${(c as any).currency || "USD"} ${(c as any).balance ?? "?"}</b>.`) +
      emailHighlight("כשאין יתרה - רכישות דומיין של לקוחות ייכשלו אחרי שהם כבר שילמו. כדאי לטעון יתרה עכשיו."),
  }),
});

export const PLATFORM_EMAILS = {
  accountWelcome, onboardingAbandoned1, onboardingAbandoned2, siteReady,
  publishPaymentFailed,
  paymentReceipt, paymentFailed, paymentReminder, siteFrozen,
  deletionWarning, siteDeleted, siteReactivated, subscriptionCancelled,
  newOrderMerchant, newLeadMerchant, domainPurchased, domainExpiryReminder, domainExpiringUnpaid,
  domainFundsAlert, domainLowBalance,
} as const;
