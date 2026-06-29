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

// PayPlus is the primary in-app checkout (merchants connect their own account in
// the PayPlus card). For a merchant who does NOT have a PayPlus account yet, this
// is our affiliate signup link so a new account is attributed to us. Set the URL
// once PayPlus provides it; the "open a new PayPlus account" link in the payments
// screen shows only when it's set, and a click is logged to partner_referrals.
export const PAYPLUS_AFFILIATE_URL: string | null = null;
