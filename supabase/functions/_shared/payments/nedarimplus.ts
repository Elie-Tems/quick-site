// Nedarim Plus (נדרים פלוס) integration - SCAFFOLD, not yet wired live.
//
// Why it's separate from the PaymentProvider registry: Nedarim Plus is NOT a
// redirect/hosted-page gateway like PayPlus. It works through an EMBEDDED IFRAME
// (matara.pro/nedarimplus): the storefront embeds their iframe, calls
// PostNedarim('FinishTransaction', {...}) to charge, and reads the result via a
// window 'message' event (ReadPostMessage). Saving a card / recurring (הוראת קבע)
// needs an `ApiValid` value issued by Nedarim Plus per mosad. So it doesn't fit the
// server-side createPaymentPage() shape and is intentionally left OUT of registry.ts
// until a real nonprofit connects and we run a live test charge.
//
// This module captures the request/response shapes + payload builders from their
// public API docs (matara.pro/nedarimplus/ApiDocumentation.html) so the client-side
// iframe wiring + a verify step can be built on top once we have test credentials.
// MONEY CODE: nothing here is proven against production yet - do not enable blindly.

/** Per-mosad credentials the nonprofit gets from Nedarim Plus. */
export interface NedarimCredentials {
  mosadId: string;          // מספר מוסד
  apiValid?: string;        // required to save a card / set up הוראת קבע (issued by Nedarim Plus)
  terminal?: string;        // מסוף / group, if the mosad uses more than one
}

export type NedarimTransactionType = "Ragil" | "HK"; // רגיל = one-time, HK = הוראת קבע (recurring)

export interface NedarimChargeInput {
  amount: number;           // in ILS
  transactionType: NedarimTransactionType;
  payments?: number;        // number of installments (תשלומים), default 1
  donor: { name: string; email?: string; phone?: string; idNumber?: string };
  comment?: string;         // e.g. campaign / dedication text
  saveCard?: boolean;       // store the token for future הוראת קבע charges (needs apiValid)
}

// Fields the iframe's PostNedarim('FinishTransaction', payload) expects. Names follow
// the Nedarim Plus DebitIframe docs; CONFIRM against the live account before enabling.
export function buildIframePayload(creds: NedarimCredentials, o: NedarimChargeInput): Record<string, unknown> {
  return {
    Mosad: creds.mosadId,
    ApiValid: creds.apiValid ?? "",
    PaymentType: o.transactionType,          // "Ragil" | "HK"
    Amount: o.amount,
    Tashlumim: o.payments ?? 1,
    Zeout: o.donor.idNumber ?? "",           // ת"ז - needed for tax-credit reporting
    FirstName: o.donor.name,
    Email: o.donor.email ?? "",
    Phone: o.donor.phone ?? "",
    Groip: creds.terminal ?? "",
    Comment: o.comment ?? "",
    // A token/הוראת-קבע charge (recurring engine) uses the saved-card flow (ApiValid).
    Tokef: o.saveCard ? "1" : "",
  };
}

/** Shape of the message posted back by the iframe (ReadPostMessage). */
export interface NedarimTransactionResponse {
  Status: "OK" | "Error" | string;
  TransactionId?: string;
  Token?: string;           // saved-card token for future הוראת קבע charges
  Message?: string;
}

export function parseTransactionResponse(raw: any): { ok: boolean; transactionId?: string; token?: string; error?: string } {
  const r = (raw ?? {}) as NedarimTransactionResponse;
  const ok = r.Status === "OK" && !!r.TransactionId;
  return { ok, transactionId: r.TransactionId, token: r.Token, error: ok ? undefined : (r.Message || "nedarim_error") };
}

// Public iframe origin - used both to embed and to validate the postMessage source.
export const NEDARIM_IFRAME_ORIGIN = "https://www.matara.pro";

// NOTE: recurring (הוראת קבע) with Nedarim Plus can run on THEIR side once a card is
// saved (PaymentType 'HK'), so the monthly charge doesn't need our own cron - the
// platform bills and sends an IPN. Wire the IPN handler when enabling. Until then this
// module is inert and the provider shows "בקרוב" in the UI.
