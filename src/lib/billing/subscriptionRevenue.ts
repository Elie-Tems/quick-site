// Single source of truth for Siango's OWN subscription revenue math.
//
// Before this, usePlatformStats and useMRR each duplicated the "how much does this
// subscription pay us, and does it count" logic with a hardcoded ₪69 fallback - so
// the total-revenue KPI and the MRR chart could quietly diverge. Both now import
// these two functions, so the number is computed in exactly one place.
//
// NOTE: 69 is only a FALLBACK for rows missing monthly_total, and matches current
// pricing. When the authoritative price table is finalized, change it here only.

export const DEFAULT_MONTHLY_PRICE = 69;

interface SubLike {
  monthly_total?: number | null;
  plan_name?: string | null;
  paid_until?: string | null;
  status?: string | null;
}

/** Monthly amount this subscription pays Siango (real value, or the fallback). */
export function subscriptionMonthly(sub: SubLike): number {
  return Number(sub.monthly_total) || DEFAULT_MONTHLY_PRICE;
}

/** True only for subscriptions that are ACTUALLY paid right now (real revenue,
 *  not every signup row) - so the dashboard never shows demo/unpaid money. */
export function isActivePaid(sub: SubLike, now: Date = new Date()): boolean {
  return !!sub.paid_until && new Date(sub.paid_until) > now && sub.status === "active";
}
