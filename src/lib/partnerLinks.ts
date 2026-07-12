// Affiliate signup links for our payment/billing partners. When a merchant opens
// an account through these, the partner attributes it to us (and we log the
// referral on our side). Cardcom has no self-signup link (a rep onboards directly),
// so its url stays null and the card becomes a "get an offer" contact button.
export interface PartnerLink {
  id: string;
  name: string;
  url: string | null; // affiliate URL; null = no self-signup link (rep contact)
  blurb: string;
  domain: string; // for the brand logo (loaded in the browser at runtime)
  category: "סליקה" | "חשבוניות"; // what the service actually is (iCount is NOT sliqa)
  highlight?: boolean; // preferred partner (shown first / emphasized)
}

export const PARTNER_LINKS: PartnerLink[] = [
  {
    id: "cardcom",
    name: "Cardcom",
    url: null,
    domain: "cardcom.co.il",
    category: "סליקה",
    blurb: "סליקת אשראי מתקדמת בתנאים מועדפים. נציג Cardcom ייצור איתך קשר להקמה - בלי התעסקות מצדך.",
    highlight: true,
  },
  {
    id: "hyp",
    name: "HYP (היפ)",
    url: "https://links.hyp.co.il/4xV3lEE",
    domain: "hyp.co.il",
    category: "סליקה",
    blurb: "פתרון סליקה מלא, אפליקציה לניהול וחשבוניות אוטומטיות. בתנאים מועדפים.",
    highlight: true,
  },
  {
    id: "icount",
    name: "iCount",
    url: "https://www.icount.co.il/r?aff=471310",
    domain: "icount.co.il",
    category: "חשבוניות",
    blurb: "חשבוניות והנהלת חשבונות אוטומטית - ישירות מהמערכת.",
  },
];

// The PayPlus affiliate signup link lives in usePayplus.ts (PAYPLUS_SIGNUP_URL),
// embedded as step 1 of the PayPlus connect flow (PayplusConnectForm).

// Brand logo for a provider domain. Uses Google's favicon service so the real
// company mark loads in the visitor's browser (no asset files to host). Swap to
// committed /assets logos later if we want crisp full-wordmark versions.
export const providerLogo = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
