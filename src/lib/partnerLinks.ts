// Affiliate signup links for our payment/billing partners. When a merchant
// opens an account through these, the partner attributes it to us (and we log
// the referral on our side). Fill `url` for Cardcom/HYP once their personal
// affiliate links arrive (Cardcom: provided after signing; HYP: from Rachel).
export interface PartnerLink {
  id: string;
  name: string;
  url: string | null; // affiliate URL; null = link not received yet
  blurb: string;
  highlight?: boolean; // preferred partner (shown first / emphasized)
}

export const PARTNER_LINKS: PartnerLink[] = [
  {
    id: "cardcom",
    name: "Cardcom",
    url: null,
    blurb: "סליקת אשראי מתקדמת בתנאים מועדפים. נציג Cardcom ייצור איתך קשר להקמה - בלי התעסקות מצדך.",
    highlight: true,
  },
  {
    id: "hyp",
    name: "HYP (היפ)",
    url: "https://links.hyp.co.il/4xV3lEE",
    blurb: "פתרון סליקה מלא, אפליקציה לניהול וחשבוניות אוטומטיות. בתנאים מועדפים.",
    highlight: true,
  },
  {
    id: "icount",
    name: "iCount",
    url: "https://www.icount.co.il/r?aff=471310",
    blurb: "חשבוניות והנהלת חשבונות אוטומטית - ישירות מהמערכת.",
  },
];

// NOTE: the PayPlus affiliate signup link already lives in usePayplus.ts
// (PAYPLUS_SIGNUP_URL = aff.pays.plus/...) and is embedded as step 1 of the
// PayPlus connect flow (PayplusConnectForm). No separate slot needed here.
