/**
 * Business modules - the single source of truth for "which capabilities does a
 * business of a given type get". This is the keystone of the multi-vertical
 * product: onboarding saves `business_type` (see migration 20260707120000), and
 * everything downstream (dashboard tabs, storefront sections, API access, the
 * default storefront layout) asks this module which features are enabled.
 *
 * Pure logic, no React/UI deps - safe to import anywhere (frontend + edge fns).
 */

export type BusinessType = "products" | "services" | "realestate" | "nonprofit" | "synagogue" | "vacation";

export type ModuleKey = "commerce" | "booking" | "listings" | "donations" | "synagogue";

export interface ModuleDef {
  key: ModuleKey;
  label: string; // Hebrew
  description: string;
  /** The customer-facing "transaction" this module produces. */
  transaction: "order" | "booking" | "lead" | "donation";
}

export const MODULES: Record<ModuleKey, ModuleDef> = {
  commerce: { key: "commerce", label: "מכירת מוצרים", description: "קטלוג, עגלה, הזמנות וסליקה", transaction: "order" },
  booking: { key: "booking", label: "תורים ויומן", description: "הזמנת תור/תאריך, יומן וסנכרון יומנים", transaction: "booking" },
  listings: { key: "listings", label: "לוח ולידים", description: "נכסים/פריטים עם סינון ולכידת לידים", transaction: "lead" },
  donations: { key: "donations", label: "תרומות", description: "תרומה חד-פעמית/חוזרת וקמפיינים", transaction: "donation" },
  synagogue: { key: "synagogue", label: "בית כנסת", description: "עליות ונדרים, מקומות, זמני תפילה", transaction: "donation" },
};

/**
 * Default modules unlocked per business type. Intentionally allows combining:
 * a service provider also gets `commerce` because the service sites we shipped
 * sell products (creams, gift cards) alongside bookings.
 */
export const DEFAULT_MODULES: Record<BusinessType, ModuleKey[]> = {
  products: ["commerce"],
  services: ["booking", "commerce"],
  realestate: ["listings"],
  nonprofit: ["donations"],
  // A synagogue is a nonprofit that also runs synagogue ops (עליות/נדרים, מקומות,
  // זמני תפילה) - so it keeps donations + adds the synagogue module.
  synagogue: ["donations", "synagogue"],
  vacation: ["commerce"],
};

/** Capabilities every business has regardless of type. */
export const CORE_CAPABILITIES = ["branding", "dashboard", "marketing", "domain", "analytics"] as const;

/** Storefront layout each type defaults to (feeds StoreFront's layout switch). */
export const DEFAULT_LAYOUT: Record<BusinessType, "classic" | "service" | "property" | "market"> = {
  products: "classic",
  services: "service",
  realestate: "property",
  nonprofit: "service",
  synagogue: "service",
  vacation: "service",
};

/** Minimal shape read off a `businesses` row. */
export interface BusinessLike {
  business_type?: BusinessType | string | null;
  /** Future per-business override (not yet a column) - honored if present. */
  enabled_modules?: string[] | null;
}

const TYPES: readonly BusinessType[] = ["products", "services", "realestate", "nonprofit", "synagogue", "vacation"];

/** Normalize a raw business_type value to a valid type, defaulting to products (legacy rows). */
export function getBusinessType(b: BusinessLike | null | undefined): BusinessType {
  const t = b?.business_type;
  return TYPES.includes(t as BusinessType) ? (t as BusinessType) : "products";
}

/** The modules a business currently has: explicit override wins, else the type default. */
export function getEnabledModules(b: BusinessLike | null | undefined): ModuleKey[] {
  const override = b?.enabled_modules?.filter((m): m is ModuleKey => Object.prototype.hasOwnProperty.call(MODULES, m));
  if (override && override.length) return override;
  return DEFAULT_MODULES[getBusinessType(b)];
}

export function hasModule(b: BusinessLike | null | undefined, key: ModuleKey): boolean {
  return getEnabledModules(b).includes(key);
}

/** The default storefront layout for a business (before any manual template choice). */
export function getDefaultLayout(b: BusinessLike | null | undefined) {
  return DEFAULT_LAYOUT[getBusinessType(b)];
}
