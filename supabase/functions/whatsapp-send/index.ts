// Sends a single WhatsApp message for a business (order notifications, shipping
// updates, appointment reminders). Called server-side by triggers (with the
// internal secret) or by the merchant (JWT). Looks up the business's connected
// sender, sends via Twilio, logs to whatsapp_messages.
// BUILD-ONLY: not deployed until approved.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { twilioCreds, sendWhatsAppText, sendWhatsAppTemplate } from "../_shared/whatsapp/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, service);

  let body: {
    businessId?: string; to?: string; body?: string; mediaUrl?: string;
    contentSid?: string; variables?: Record<string, string>; category?: string;
  };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  if (!body.businessId || !body.to) return json({ ok: false, error: "businessId + to required" }, 400);

  // Authorize: internal secret (server triggers) OR the owning merchant's JWT.
  const internal = req.headers.get("x-internal-secret");
  const expected = Deno.env.get("WHATSAPP_INTERNAL_SECRET");
  let authorized = !!expected && internal === expected;
  if (!authorized) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", body.businessId).maybeSingle();
        if (biz) {
          const { data: prof } = await admin.from("profiles").select("user_id").eq("id", biz.owner_id).maybeSingle();
          authorized = prof?.user_id === user.id;
        }
      }
    }
  }
  if (!authorized) return json({ ok: false, error: "Unauthorized" }, 401);

  // The business must have a connected WhatsApp sender.
  const { data: acct } = await admin
    .from("whatsapp_accounts").select("phone_number, status").eq("business_id", body.businessId).maybeSingle();
  const from = acct?.phone_number || Deno.env.get("TWILIO_WHATSAPP_FROM");
  if (!from || (acct && acct.status !== "connected")) {
    return json({ ok: false, error: "WhatsApp not connected for this business" }, 409);
  }

  const creds = twilioCreds();
  if (!creds) {
    // Not configured yet (pre-go-live): log as queued, don't fail the caller.
    await admin.from("whatsapp_messages").insert({
      business_id: body.businessId, contact_phone: body.to, direction: "out",
      body: body.body || null, status: "queued", category: body.category || "utility",
    });
    return json({ ok: true, skipped: true, reason: "twilio not configured" });
  }

  const result = body.contentSid
    ? await sendWhatsAppTemplate(creds, from, body.to, body.contentSid, body.variables)
    : await sendWhatsAppText(creds, from, body.to, body.body || "", body.mediaUrl);

  await admin.from("whatsapp_messages").insert({
    business_id: body.businessId,
    contact_phone: body.to,
    direction: "out",
    body: body.body || null,
    template_name: body.contentSid || null,
    status: result.ok ? (result.status || "sent") : "failed",
    category: body.category || "utility",
    provider_sid: result.sid || null,
    error: result.ok ? null : result.error || null,
  });

  return json({ ok: result.ok, sid: result.sid, status: result.status, error: result.error });
});
