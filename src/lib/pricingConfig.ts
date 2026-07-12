// Pricing configuration for the platform.
// The base publish subscription (PLANS[0] / BASE_PLAN, ₪79/month) is a flat,
// VAT-INCLUSIVE price - shown and charged as-is, no VAT added on top, no
// "כולל מע"מ" label needed. VAT_SUFFIX/withVat below are for the OTHER
// products (add-ons, AI credits) that are still priced pre-VAT with VAT added
// at checkout - do not apply them to the base publish price.

/** Append next to a displayed PRE-VAT price (add-ons, AI credits), e.g. `₪14 {VAT_SUFFIX}`. */
export const VAT_SUFFIX = '+ מע"מ';
/** Full disclosure line for pages that list pre-VAT prices (add-ons, AI credits). */
export const VAT_DISCLOSURE = 'המחירים אינם כוללים מע"מ. מע"מ כחוק יתווסף בעת התשלום.';
/** Build a price label with the VAT suffix, e.g. withVat("₪14") => "₪14 + מע\"מ". */
export const withVat = (label: string): string => `${label} ${VAT_SUFFIX}`;

/** Current statutory VAT rate in Israel (18% since Jan 2025). */
export const VAT_RATE = 0.18;
/** Gross (VAT-inclusive) amount for a pre-VAT price, rounded to agorot. */
export const withVatTotal = (netIls: number): number =>
  Math.round(netIls * (1 + VAT_RATE) * 100) / 100;

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  label: string;
  productLimit: number;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    id: "classic",
    name: "חבילה קלאסית",
    price: 79,
    label: "₪79",
    productLimit: 50,
    features: [
      "עד 50 מוצרים",
      "הזמנות ללא הגבלה",
      "התממשקות עם חברת הסליקה (אופציונלי)",
    ],
    highlighted: true,
  },
  {
    id: "pro",
    name: "חבילת פרו",
    price: 89,
    label: "₪89",
    productLimit: 100,
    features: [
      "עד 100 מוצרים",
      "אודות באתר",
      "הזמנות ללא הגבלה",
      "התממשקות עם חברת הסליקה (אופציונלי)",
    ],
  },
  {
    id: "pro-plus",
    name: "חבילת פרו +",
    price: 99,
    label: "₪99",
    productLimit: 200,
    features: [
      "עד 200 מוצרים",
      "אודות באתר",
      "הזמנות ללא הגבלה",
      "התממשקות עם חברת הסליקה (אופציונלי)",
    ],
  },
  {
    id: "premium",
    name: "חבילת פרמיום",
    price: 149,
    label: "₪149",
    productLimit: 500,
    features: [
      "עד 500 מוצרים",
      "אודות באתר",
      "הזמנות ללא הגבלה",
      "התממשקות עם חברת הסליקה (אופציונלי)",
    ],
  },
];

// Legacy - keeping for backward compatibility
export const BASE_PLAN = PLANS[0];

export interface AICreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  label: string;
  recommended?: boolean;
}

export const AI_CREDIT_PACKAGES: AICreditPackage[] = [
  { id: "starter", name: "Starter", credits: 100, price: 80, label: "₪80" },
  { id: "business", name: "Business", credits: 200, price: 150, label: "₪150", recommended: true },
  { id: "pro", name: "Pro", credits: 500, price: 300, label: "₪300" },
];

export const FREE_AI_CREDITS = 10;

// Paid add-ons (charged on top of the plan). Centralized here so the price
// lives in one place once the matching feature ships.
export interface AddOnConfig {
  id: string;
  name: string;
  price: number; // monthly, ILS, pre-VAT (VAT added on top)
  label: string;
  description: string;
  available: boolean; // false = feature not live yet (don't surface to customers)
}

export const ADD_ONS: AddOnConfig[] = [
  {
    id: "custom-domain",
    name: "דומיין אישי",
    price: 19.9,
    label: "₪19.9",
    description:
      "חיבור דומיין אישי משלכם (לדוגמה shop.yourbrand.co.il) במקום כתובת תחת siango.app - תוספת חודשית.",
    available: false, // pending the custom-domain feature build
  },
];

export const CUSTOM_DOMAIN_ADDON = ADD_ONS.find((a) => a.id === "custom-domain")!;

// Usage warning thresholds
export const IMAGE_WARNING_THRESHOLD = 80; // Show warning at 80% usage
export const IMAGE_BLOCK_THRESHOLD = 100; // Block at 100% usage
