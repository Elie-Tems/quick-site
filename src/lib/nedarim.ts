// Nedarim Plus (נדרים פלוס) - client-side iframe helpers.
//
// Nedarim Plus is NOT a redirect gateway. The storefront embeds their iframe
// (matara.pro/nedarimplus/iframe/), the donor types the card INSIDE the iframe,
// and our page drives the charge via postMessage: we send `FinishTransaction2`
// with the transaction data, the iframe charges, and posts back a
// `TransactionResponse`. See src/components/storefront/NedarimCheckout.tsx.
//
// MONEY CODE: the authoritative "paid" signal is the server-to-server CallBack
// that Nedarim POSTs to our `nedarim-webhook` function - never the client
// TransactionResponse (which a hostile browser could fake). The page result is
// UX only; NedarimCheckout confirms via our own server before thanking the donor.

// Public iframe host. Used to build the src AND to validate the postMessage
// event.origin, so we ignore messages from any other frame.
export const NEDARIM_ORIGIN = "https://www.matara.pro";

export interface NedarimIframeParams {
  mosad: string;        // מספר מוסד (7 digits)
  apiValid: string;     // ApiValid - public, safe in the browser
  amount: number;       // ILS
  token: string;        // our unique per-donation reference (echoed in the CallBack as Param1)
  callbackUrl: string;  // our nedarim-webhook URL (server-to-server IPN)
  callbackMailError?: string; // dev alert address if the CallBack POST fails
  donor: { name?: string; email?: string; phone?: string; idNumber?: string };
  category?: string;    // Groupe (campaign / dedication)
  comment?: string;
  recurring?: boolean;  // true = הוראת קבע (HK); false = one-time (Ragil)
  months?: number;      // HK: number of monthly charges (empty = unlimited)
}

// The iframe URL. `Picture=Hide` drops Nedarim's own security badges (we show our
// own). Hebrew by default; no extra flags so the mosad's configured cards show.
export function nedarimIframeSrc(): string {
  return `${NEDARIM_ORIGIN}/nedarimplus/iframe/`;
}

// Build the FinishTransaction2 Value. Nedarim requires EVERY field to be present,
// even when empty - so we always send the full shape. Field names are the exact
// ones from their API docs (Groupe, not "Groip").
export function buildFinishTransaction2(p: NedarimIframeParams): Record<string, string> {
  const recurring = !!p.recurring;
  return {
    Mosad: String(p.mosad || ""),
    ApiValid: String(p.apiValid || ""),
    PaymentType: recurring ? "HK" : "Ragil",
    Currency: "1", // 1 = ILS
    Zeout: p.donor.idNumber || "",
    FirstName: p.donor.name || "",
    LastName: "",
    Street: "",
    City: "",
    Phone: (p.donor.phone || "").replace(/\D/g, ""),
    Mail: p.donor.email || "",
    Amount: String(p.amount),
    // Ragil: number of installments (1+). HK: number of monthly charges (empty = unlimited).
    Tashlumim: recurring ? (p.months ? String(p.months) : "") : "1",
    Day: "",
    Groupe: p.category || "",
    Comment: p.comment || "",
    Param1: p.token, // echoed back to our CallBack so the webhook matches this donation
    Param2: "",
    ForceUpdateMatching: "",
    ThirdPartyReceipt: "",
    CallBack: p.callbackUrl,
    CallBackMailError: p.callbackMailError || "",
    Tokef: "",
  };
}

export interface NedarimResult {
  ok: boolean;
  transactionId?: string; // Nedarim transaction / הוראת קבע id
  confirmation?: string;  // credit-company approval number (empty = temporary auth)
  lastNum?: string;       // last 4 digits
  error?: string;
}

// Parse an iframe `TransactionResponse` (Value). Fields: Status, Message, ID,
// Confirmation, LastNum. Client-side only - the real confirmation is our webhook.
export function parseNedarimResponse(value: any): NedarimResult {
  const v = value ?? {};
  const ok = v.Status === "OK";
  return {
    ok,
    transactionId: v.ID != null ? String(v.ID) : undefined,
    confirmation: v.Confirmation != null ? String(v.Confirmation) : undefined,
    lastNum: v.LastNum != null ? String(v.LastNum) : undefined,
    error: ok ? undefined : (v.Message || "nedarim_error"),
  };
}
