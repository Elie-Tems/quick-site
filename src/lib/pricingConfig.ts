// Pricing configuration for the platform
// All prices include VAT

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
    price: 69,
    label: "₪69",
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
  price: number; // monthly, ILS, incl. VAT
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
      "חיבור דומיין אישי משלכם (לדוגמה shop.yourbrand.co.il) במקום כתובת תחת quick-site.app — תוספת חודשית.",
    available: false, // pending the custom-domain feature build
  },
];

export const CUSTOM_DOMAIN_ADDON = ADD_ONS.find((a) => a.id === "custom-domain")!;

// Usage warning thresholds
export const IMAGE_WARNING_THRESHOLD = 80; // Show warning at 80% usage
export const IMAGE_BLOCK_THRESHOLD = 100; // Block at 100% usage
