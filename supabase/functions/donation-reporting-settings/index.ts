// Save a nonprofit's תרומות ישראל reporting config: the Section-46 institution
// number, and (encrypted) its iCount API token used to issue donation receipts.
// Merchant JWT (verify_jwt=true): the caller must own the business. Enabling
// reporting requires a 46-number + a token, so a paid donation can be reported.
// Never returns the token back to the client.

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

  let body: { businessId?: string; number46?: string; icountToken?: string; companyId?: string; enabled?: boolean };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const businessId = body.businessId?.trim();
  if (!businessId) return json({ error: "businessId required" }, 400);

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

  // Save/refresh the iCount token (only if a new one was provided).
  if (body.icountToken?.trim()) {
    await admin.from("donation_receipt_credentials").upsert({
      business_id: businessId, provider: "icount",
      api_token_enc: await encryptToken(body.icountToken.trim()),
      company_id: body.companyId?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id" });
  } else if (body.companyId !== undefined) {
    await admin.from("donation_receipt_credentials").update({ company_id: body.companyId?.trim() || null }).eq("business_id", businessId);
  }

  // Reporting can only be ON with a 46-number and a stored token.
  const { data: creds } = await admin.from("donation_receipt_credentials").select("api_token_enc").eq("business_id", businessId).maybeSingle();
  const hasToken = !!creds?.api_token_enc;
  const number46 = body.number46?.trim() || null;
  const enabled = !!body.enabled && !!number46 && hasToken;

  await admin.from("businesses").update({
    nonprofit_46_number: number46,
    donation_receipt_provider: hasToken ? "icount" : null,
    donation_reporting_enabled: enabled,
  }).eq("id", businessId);

  return json({ ok: true, enabled, hasToken, blocked: !!body.enabled && !enabled ? "צריך מספר מוסד 46 + טוקן iCount" : null });
});
