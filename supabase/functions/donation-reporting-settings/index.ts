// Save a nonprofit's תרומות ישראל reporting config: the Section-46 institution
// number, the chosen receipt provider, and (encrypted) its API token.
// Provider-agnostic: every Israeli receipt provider (iCount / Morning / ריווחית /
// SUMIT...) implements the same Tax Authority "מודל תרומות" API. Today we automate
// iCount end-to-end; the others (and "self") run in RECORD mode - Siango stores the
// donor's ID and the nonprofit issues the allocation-numbered receipt in its own
// system (already connected to the Tax Authority). Merchant JWT (verify_jwt=true):
// the caller must own the business. Never returns the token back to the client.

// Providers we can auto-issue for today. Others are stored but run in record mode.
const AUTO_PROVIDERS = new Set(["icount"]);
const KNOWN_PROVIDERS = new Set(["icount", "morning", "rivhit", "sumit", "self"]);

import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptToken } from "../_shared/calendar/crypto.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  let body: { businessId?: string; number46?: string; provider?: string; apiToken?: string; icountToken?: string; companyId?: string; enabled?: boolean };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const businessId = body.businessId?.trim();
  if (!businessId) return json({ error: "businessId required" }, 400);
  const provider = KNOWN_PROVIDERS.has((body.provider || "").trim()) ? body.provider!.trim() : "icount";
  const isAuto = AUTO_PROVIDERS.has(provider);
  const apiToken = (body.apiToken ?? body.icountToken)?.trim(); // icountToken kept for back-compat

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  const admin = createClient(url, svc);
  const { data: biz } = await admin.from("businesses").select("id, owner_id").eq("id", businessId).maybeSingle();
  if (!biz) return json({ error: "business not found" }, 404);
  const { data: prof } = await admin.from("profiles").select("user_id").eq("id", (biz as any).owner_id).maybeSingle();
  if ((prof as any)?.user_id !== user.id) return json({ error: "forbidden" }, 403);

  // Save/refresh the provider's API token (only if a new one was provided). Only
  // meaningful for auto-providers; a record-mode provider never needs a token.
  if (apiToken) {
    await admin.from("donation_receipt_credentials").upsert({
      business_id: businessId, provider,
      api_token_enc: await encryptToken(apiToken),
      company_id: body.companyId?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id" });
  } else if (body.companyId !== undefined) {
    await admin.from("donation_receipt_credentials").update({ company_id: body.companyId?.trim() || null }).eq("business_id", businessId);
  }

  // Enable rules: an auto-provider (iCount) needs a 46-number + a stored token so
  // Siango can issue the receipt. A record-mode provider (Morning/ריווחית/SUMIT/
  // self) needs only the 46-number - Siango records the donor ID and the nonprofit
  // issues the allocation-numbered receipt in its own system.
  const { data: creds } = await admin.from("donation_receipt_credentials").select("api_token_enc").eq("business_id", businessId).maybeSingle();
  const hasToken = !!creds?.api_token_enc;
  const number46 = body.number46?.trim() || null;
  const enabled = !!body.enabled && !!number46 && (isAuto ? hasToken : true);

  await admin.from("businesses").update({
    nonprofit_46_number: number46,
    donation_receipt_provider: number46 ? provider : null,
    donation_reporting_enabled: enabled,
  }).eq("id", businessId);

  const blocked = !!body.enabled && !enabled
    ? (!number46 ? "צריך מספר מוסד (46)" : (isAuto ? "צריך טוקן API של iCount" : "צריך מספר מוסד (46)"))
    : null;
  return json({ ok: true, enabled, hasToken, provider, mode: isAuto ? "auto" : "record", blocked });
});
