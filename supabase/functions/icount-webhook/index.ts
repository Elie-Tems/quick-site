import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Constant-time string comparison (avoids leaking the secret via timing).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Pull the paid amount (ILS) out of an iCount notification. iCount payloads vary,
// so we probe the common field names and recurse into a nested data/body object.
function extractPaidAmount(payload: Record<string, unknown>): number | null {
  const keys = [
    "sum", "total", "totalsum", "total_sum", "doctotal", "doc_total",
    "grand_total", "amount", "paymentsum", "payment_sum", "paid", "price",
  ];
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseFloat(v.replace(/[^\d.]/g, ""));
      if (isFinite(n) && n > 0) return n;
    }
  }
  const nested = payload["data"] ?? payload["body"];
  if (nested && typeof nested === "object" && nested !== null) {
    return extractPaidAmount(nested as Record<string, unknown>);
  }
  return null;
}

function extractBusinessId(payload: Record<string, unknown>): string | null {
  const direct = [
    "business_id",
    "businessId",
    "bid",
    "reference",
    "custom_reference",
    "userdata",
    "user_data",
  ];
  for (const k of direct) {
    const v = payload[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  const nested = payload["data"] ?? payload["body"];
  if (nested && typeof nested === "object" && nested !== null) {
    return extractBusinessId(nested as Record<string, unknown>);
  }
  return null;
}

// A recurring (הוראת קבע) setup returns iCount's hk_id in the IPN. Probe common
// key names + a nested data/body object.
function extractHkId(payload: Record<string, unknown>): string | null {
  for (const k of ["hk_id", "hkid", "hk", "recurring_id", "hkId"]) {
    const v = payload[k];
    if (typeof v === "number" && isFinite(v)) return String(v);
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  const nested = payload["data"] ?? payload["body"];
  if (nested && typeof nested === "object" && nested !== null) {
    return extractHkId(nested as Record<string, unknown>);
  }
  return null;
}

// Pull the payer's email out of an iCount notification. Used as a last-resort
// way to match a payment to its checkout session (by publish_checkout_sessions
// .email) when iCount doesn't echo our session_token/business_id.
function extractEmail(payload: Record<string, unknown>): string | null {
  for (const k of ["email", "client_email", "customer_email", "payer_email", "mail", "client_mail"]) {
    const v = payload[k];
    if (typeof v === "string" && /@/.test(v)) return v.trim().toLowerCase();
  }
  const nested = payload["data"] ?? payload["body"] ?? payload["client"];
  if (nested && typeof nested === "object" && nested !== null) {
    return extractEmail(nested as Record<string, unknown>);
  }
  return null;
}

async function handleVerifiedRequestByToken(
  supabase: ReturnType<typeof createClient>,
  sessionToken: string,
  externalId: string | null,
  paidAmount: number | null,
  hkId: string | null = null
) {
  const { data: session, error: findErr } = await supabase
    .from("publish_checkout_sessions")
    .select("id, business_id, status, amount_ils")
    .eq("session_token", sessionToken)
    .maybeSingle();

  if (findErr || !session) {
    console.error("Session not found for token:", sessionToken, findErr);
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Amount verification: the payment must cover the session's expected fee.
  // Without this, anyone who learns the webhook secret could mark a session
  // "paid" (and auto-publish) for free, or for an arbitrary underpaid amount.
  // Fail closed: if the payload carries no parseable amount we reject too, so a
  // mismatch surfaces during iCount integration testing rather than silently
  // letting unverified payments through. A small rounding tolerance is allowed.
  const expected = typeof session.amount_ils === "number" ? session.amount_ils : null;
  if (expected != null && expected > 0) {
    if (paidAmount == null) {
      console.error(`icount-webhook: no parseable amount in payload (expected ${expected})`);
      return new Response(JSON.stringify({ error: "amount_unverifiable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (paidAmount + 0.5 < expected) {
      console.error(`icount-webhook: amount mismatch - paid ${paidAmount}, expected ${expected}`);
      return new Response(JSON.stringify({ error: "amount_mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // If already paid, just acknowledge (idempotent)
  if (session.status === "paid" || session.status === "completed") {
    console.log(`Payment already verified for business ${session.business_id}`);
    return new Response(JSON.stringify({ ok: true, duplicate: true, status: session.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();

  const { error: sessErr } = await supabase
    .from("publish_checkout_sessions")
    .update({
      status: "paid",
      payment_verified_at: now,
      external_transaction_id: externalId,
      updated_at: now,
    })
    .eq("id", session.id);

  if (sessErr) {
    console.error(sessErr);
    return new Response(JSON.stringify({ error: "Failed to update session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Payment verified for business ${session.business_id}. Auto-publishing site...`);

  // Auto-publish the site after payment verification. NOTE: use only columns that
  // exist on `businesses` (is_published + updated_at). An earlier version also set
  // `published_at`, which does NOT exist -> every webhook publish failed with
  // "column published_at does not exist", so paid publishing never actually
  // published even when the payment matched. Mirror finalize-publish's update.
  const { error: publishErr } = await supabase
    .from("businesses")
    .update({
      is_published: true,
      updated_at: now
    })
    .eq("id", session.business_id);

  if (publishErr) {
    console.error("Failed to publish business:", publishErr);
    return new Response(JSON.stringify({ error: "Payment verified but publish failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update session to completed
  await supabase
    .from("publish_checkout_sessions")
    .update({ status: "completed", updated_at: now })
    .eq("id", session.id);

  console.log(`Business ${session.business_id} published successfully after payment`);

  // If this was a recurring (הוראת קבע) setup, iCount sends an hk_id. Store it on
  // the merchant's subscription (upsert by user_id) so a future cancellation can
  // call hk/cancel and actually stop the charging. Also (re)activates + extends
  // paid_until on each successful cycle. Best-effort - never fail the publish.
  if (hkId) {
    try {
      const { data: biz } = await supabase.from("businesses").select("owner_id").eq("id", session.business_id).maybeSingle();
      const ownerId = (biz as any)?.owner_id;
      if (ownerId) {
        const { data: prof } = await supabase.from("profiles").select("user_id").eq("id", ownerId).maybeSingle();
        const uid = (prof as any)?.user_id;
        if (uid) {
          const paidUntil = new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString();
          await supabase.from("subscriptions").upsert(
            { user_id: uid, status: "active", icount_hk_id: hkId, paid_until: paidUntil, cancel_type: null, cancel_at: null, updated_at: now },
            { onConflict: "user_id" },
          );
          console.log(`Subscription upserted for user ${uid} with hk_id ${hkId}`);
        }
      }
    } catch (e) {
      console.warn("subscription upsert (hk_id) failed:", e);
    }
  }

  return new Response(JSON.stringify({ ok: true, business_id: session.business_id, status: "completed", published: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleVerifiedRequest(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  externalId: string | null,
  paidAmount: number | null
) {
  // Find the latest pending session for this business
  const { data: sessions, error: findErr } = await supabase
    .from("publish_checkout_sessions")
    .select("session_token")
    .eq("business_id", businessId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  const sessionToken = sessions?.[0]?.session_token;

  if (findErr || !sessionToken) {
    console.error("Session not found for business_id:", businessId, findErr);
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return handleVerifiedRequestByToken(supabase, sessionToken, externalId, paidAmount);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = Deno.env.get("ICOUNT_WEBHOOK_SECRET") ?? "";
  if (!secret) {
    console.error("ICOUNT_WEBHOOK_SECRET is not set");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // iCount's IPN posts to a URL and cannot attach a custom auth header, so also
  // accept the shared secret from the webhook URL query (?secret=...). req.url is
  // intentionally never logged (see the comment above the fields log) so the
  // secret isn't leaked. Header still works for any caller that can set it.
  const urlForSecret = new URL(req.url);
  const headerSecret =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    urlForSecret.searchParams.get("secret") ??
    urlForSecret.searchParams.get("webhook_secret") ??
    "";

  if (req.method === "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!safeEqual(headerSecret, secret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      payload = (await req.json()) as Record<string, unknown>;
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params.entries()) {
        payload[k] = v;
      }
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text) as Record<string, unknown>;
      } catch {
        const params = new URLSearchParams(text);
        for (const [k, v] of params.entries()) {
          payload[k] = v;
        }
      }
    }
  } catch (e) {
    console.error("icount-webhook parse error", e);
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log only the payload field names for debugging. Never log the full
  // payload or req.url - they can contain the webhook secret (query param)
  // and customer payment details.
  console.log("icount-webhook received fields:", Object.keys(payload).join(", "));

  // Try to extract session_token and business_id from URL query params first
  const url = new URL(req.url);
  let sessionToken = url.searchParams.get("session_token") || null;
  const businessIdFromUrl = url.searchParams.get("business_id") || null;

  console.log("URL params - session_token:", sessionToken, "business_id:", businessIdFromUrl);

  // If we have business_id from URL but no session_token, find the session
  if (!sessionToken && businessIdFromUrl) {
    const { data: sessions } = await supabase
      .from("publish_checkout_sessions")
      .select("session_token")
      .eq("business_id", businessIdFromUrl)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    sessionToken = sessions?.[0]?.session_token || null;
    console.log("Found session by business_id from URL:", sessionToken);
  }

  // If still no session, try business_id from the payload...
  if (!sessionToken) {
    const businessId = extractBusinessId(payload);
    if (businessId) {
      const { data: sessions } = await supabase
        .from("publish_checkout_sessions")
        .select("session_token")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
      sessionToken = sessions?.[0]?.session_token || null;
    }
  }

  // ...and as a last resort, match by the payer's email. iCount sometimes does
  // not echo our session_token/business_id in the IPN; the email is always
  // present, so this keeps publishing reliable regardless of iCount's config.
  if (!sessionToken) {
    const email = extractEmail(payload);
    if (email) {
      const { data: sessions } = await supabase
        .from("publish_checkout_sessions")
        .select("session_token")
        .eq("status", "pending")
        .ilike("email", email)
        .order("created_at", { ascending: false })
        .limit(1);
      sessionToken = sessions?.[0]?.session_token || null;
      if (sessionToken) console.log("icount-webhook: matched session by payer email");
    }
  }

  if (!sessionToken) {
    console.warn("icount-webhook: could not match payment to any pending session", Object.keys(payload).join(","));
    return new Response(JSON.stringify({ error: "No pending session found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const externalId =
    (typeof payload["transaction_id"] === "string" && payload["transaction_id"]) ||
    (typeof payload["tran_id"] === "string" && payload["tran_id"]) ||
    (typeof payload["id"] === "string" && payload["id"]) ||
    null;

  const paidAmount = extractPaidAmount(payload);
  const hkId = extractHkId(payload);

  return handleVerifiedRequestByToken(supabase, sessionToken, externalId, paidAmount, hkId);
});
