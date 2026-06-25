// Server-side domain pricing - the single source of truth for what a customer
// pays. Mirrors the formula in the domain-search function so the price shown in
// search equals the price charged at purchase. NEVER trust a price sent by the
// client; always recompute here from the reseller cost + admin settings.

export interface DomainPricingSettings {
  margin_percent?: number | null;
  coupon_percent?: number | null;
  usd_to_ils?: number | null;
  max_price_ils?: number | null;
}

export interface PricedDomain {
  costUsd: number;
  costIls: number;
  listIls: number;
  customerIls: number;
}

/** customer = clamp( cost x FX x (1+margin%) x (1-coupon%), [cost x 1.1, max] ), rounded to ₪5. */
export function priceDomain(costUsd: number, cfg: DomainPricingSettings): PricedDomain {
  const margin = Number(cfg?.margin_percent ?? 100);
  const coupon = Number(cfg?.coupon_percent ?? 15);
  const usdToIls = Number(cfg?.usd_to_ils ?? 3.7);
  const maxPrice = Number(cfg?.max_price_ils ?? 135);

  const costIls = costUsd * usdToIls;
  const listIls = Math.ceil((costIls * (1 + margin / 100)) / 5) * 5;
  let customerIls = Math.ceil((listIls * (1 - coupon / 100)) / 5) * 5;
  const floor = Math.ceil((costIls * 1.1) / 5) * 5;
  customerIls = Math.max(Math.min(customerIls, maxPrice), floor);

  return { costUsd, costIls, listIls, customerIls };
}
