import { PaymentProvider } from "./provider.ts";
import { payplus } from "./payplus.ts";
import { icount } from "./icount.ts";

// Register every live adapter here. Adding a provider = import its adapter and
// add one line. The generic edge functions resolve the adapter by the business's
// payment_provider value.
const PROVIDERS: Record<string, PaymentProvider> = {
  payplus,
  icount,     // storefront: merchant's own iCount account; IPN verified via doc/search+doc/info
  // cardcom,   ← add when validated against a real test account
  // meshulam,
  // tranzila,
};

export function getProvider(id: string | null | undefined): PaymentProvider | null {
  return PROVIDERS[(id || "payplus").toLowerCase()] ?? null;
}
