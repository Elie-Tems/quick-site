// Buy a ready WhatsApp number for a merchant via the Twilio Numbers API (a paid
// add-on revenue line, ~100% markup). Two modes:
//   { mode:"search" }        -> list available Israeli mobile numbers
//   { mode:"buy", number }   -> purchase it + attach to the business's WABA
// Note (go-live): Israeli (+972) mobile numbers require a Twilio regulatory
// bundle (business address docs). The bundle id goes in TWILIO_IL_BUNDLE_SID.
// Auth: the owning merchant (JWT). BUILD-ONLY: ready, not deployed/published.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { twilioCreds } from "../_shared/whatsapp/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TW = "https://api.twilio.com/2010-04-01";
const authHeaders = (sid: string, token: string) => ({ Authorization: "Basic " + btoa(`${sid}:${token}`) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ ok: false, error: "Invalid session" }, 401);

  let body: { mode?: string; businessId?: string; number?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const creds = twilioCreds();
  if (!creds) return json({ ok: true, pending: true, reason: "twilio not configured" });

  const country = "IL";
  try {
    if (body.mode === "buy" && body.number) {
      const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      // verify ownership
      const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", body.businessId).maybeSingle();
      const { data: prof } = biz ? await admin.from("profiles").select("user_id").eq("id", (biz as any).owner_id).maybeSingle() : { data: null } as any;
      if (!prof || (prof as any).user_id !== user.id) return json({ ok: false, error: "Forbidden" }, 403);

      const params: Record<string, string> = { PhoneNumber: body.number };
      const bundle = Deno.env.get("TWILIO_IL_BUNDLE_SID");
      if (bundle) params.BundleSid = bundle;
      const res = await fetch(`${TW}/Accounts/${creds.accountSid}/IncomingPhoneNumbers.json`, {
        method: "POST", headers: { ...authHeaders(creds.accountSid, creds.authToken), "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return json({ ok: false, error: j?.message || `buy failed (${res.status})` }, 502);
      await admin.from("whatsapp_accounts").upsert({ business_id: body.businessId, provider: "twilio", phone_number: body.number, status: "pending", provider_sid: j?.sid, updated_at: new Date().toISOString() }, { onConflict: "business_id" });
      return json({ ok: true, number: body.number, sid: j?.sid });
    }

    // default: search available IL mobile numbers
    const res = await fetch(`${TW}/Accounts/${creds.accountSid}/AvailablePhoneNumbers/${country}/Mobile.json?SmsEnabled=true&PageSize=10`, { headers: authHeaders(creds.accountSid, creds.authToken) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return json({ ok: false, error: j?.message || `search failed (${res.status})` }, 502);
    const numbers = (j?.available_phone_numbers || []).map((n: any) => ({ number: n.phone_number, friendly: n.friendly_name }));
    return json({ ok: true, numbers });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "error" }, 500);
  }
});
