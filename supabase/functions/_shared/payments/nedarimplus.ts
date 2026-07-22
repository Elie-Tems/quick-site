// Nedarim Plus (נדרים פלוס) - server-side helpers for the iframe integration.
//
// Nedarim Plus is NOT a redirect/hosted-page gateway, so it is intentionally NOT
// in the PaymentProvider registry (which is createPaymentPage-shaped). It works
// through an EMBEDDED IFRAME: the storefront (src/components/storefront/
// NedarimCheckout.tsx + src/lib/nedarim.ts) posts `FinishTransaction2` to the
// iframe and the iframe charges the card. The AUTHORITATIVE "paid" signal is the
// server-to-server CallBack that Nedarim POSTs to our `nedarim-webhook` function;
// this module parses/authenticates that CallBack.
//
// donation-create builds the pending transaction + hands the storefront the mosad,
// ApiValid, our unique token (Param1) and the CallBack URL. See that function.

// Public iframe host (also the only allowed postMessage origin, client-side).
export const NEDARIM_ORIGIN = "https://www.matara.pro";

// Nedarim's CallBack is POSTed from these fixed source IPs (per their API docs).
// The CallBack is NOT digitally signed, so authenticity rests on: (1) source IP,
// (2) our unguessable single-use token echoed in Param1, (3) amount match.
export const NEDARIM_CALLBACK_IPS = ["18.196.146.117", "18.194.219.73"];

export interface NedarimCallback {
  /** Our per-donation token (sent as Param1, echoed back). Null if absent. */
  token: string | null;
  /** Nedarim id: transaction id for a one-time gift, KevaId for a standing order. */
  transactionId: string | null;
  /** Standing-order (הוראת קבע / HK) id when this CallBack is a recurring setup. */
  kevaId: string | null;
  /** true on a real successful charge. Nedarim only POSTs the CallBack on success,
   *  but we still reject an explicit Error status defensively. */
  approved: boolean;
  /** Charged amount when the payload carries it (mosad-level IPN); 0 otherwise. */
  amount: number;
  /** Credit-company approval number (empty = temporary auth, not a real charge).
   *  Absent for a הו"ק setup (no immediate charge) - use kevaId to confirm those. */
  confirmation: string | null;
  lastNum: string | null;
}

// Parse the CallBack JSON. Handles the per-transaction shape (Status/ID/
// Confirmation/LastNum + Param1/Param2), the הו"ק-setup shape (KevaId/Amount/
// NextDate), and the richer mosad-level IPN (TransactionId/Amount/...). Field
// names per the Nedarim Plus API docs.
export function parseNedarimCallback(payload: any): NedarimCallback {
  const p = payload ?? {};
  const token = p.Param1 || p.Param2 || null;
  const kevaId = p.KevaId != null && String(p.KevaId) !== "" ? String(p.KevaId) : null;
  const transactionId = p.ID != null ? String(p.ID)
    : (p.TransactionId != null ? String(p.TransactionId) : kevaId);
  const amountRaw = p.Amount ?? p.amount;
  const amount = amountRaw != null && amountRaw !== "" ? Number(amountRaw) : 0;
  const status = String(p.Status ?? "").toLowerCase();
  const confirmation = p.Confirmation != null && String(p.Confirmation) !== "" ? String(p.Confirmation) : null;
  // Success = not an explicit error. (Nedarim omits Status on the mosad IPN, which
  // is sent only for successful transactions, so "no status" counts as success.)
  const approved = status !== "error";
  return {
    token,
    transactionId,
    kevaId,
    approved,
    amount: Number.isFinite(amount) ? amount : 0,
    confirmation,
    lastNum: p.LastNum != null ? String(p.LastNum) : null,
  };
}

// Extract the caller IP from the request (Supabase/Deno Deploy forwards it).
export function callerIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
