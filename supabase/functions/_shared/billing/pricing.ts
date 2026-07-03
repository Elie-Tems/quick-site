// Server-side price computation for subscription charges. The charged amount is
// ALWAYS derived here from the plan's base price + a validated coupon - never
// from client input. Shared by the checkout (first charge) and the monthly cron.

export type DiscountType = "percent" | "fixed";
export type CouponDuration = "first_month" | "forever";

export interface CouponInfo {
  discount_type: DiscountType;
  discount_value: number;
  duration: CouponDuration;
}

/**
 * Amount to charge for a given cycle (0 = first/setup charge).
 * - no coupon: base every cycle
 * - forever coupon: discount every cycle
 * - first_month coupon: discount only on cycle 0, full price afterwards
 * Result is clamped to >= 0 and rounded to agorot.
 */
export function chargeAmount(baseIls: number, coupon: CouponInfo | null, cycleIndex: number): number {
  let amount = baseIls;
  const applies = coupon && (coupon.duration === "forever" || cycleIndex === 0);
  if (coupon && applies) {
    if (coupon.discount_type === "percent") {
      amount = baseIls * (1 - Math.max(0, Math.min(100, coupon.discount_value)) / 100);
    } else {
      amount = baseIls - Math.max(0, coupon.discount_value);
    }
  }
  amount = Math.max(0, amount);
  return Math.round(amount * 100) / 100;
}

/**
 * Hard sanity ceiling for any single charge. Even a compromised code path can
 * never charge more than the plan's base price (+ a tiny rounding tolerance).
 * A charge computed above this is rejected before hitting iCount.
 */
export function withinChargeCeiling(amountIls: number, baseIls: number): boolean {
  return amountIls >= 0 && amountIls <= baseIls + 0.5;
}
