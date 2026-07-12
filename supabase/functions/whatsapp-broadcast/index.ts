// Sends a broadcast campaign to a filtered, OPT-IN audience (Chok HaSpam + Meta
// compliance). Only contacts with opted_in=true receive marketing. Rate-limited.
// Called by the merchant (JWT) or a scheduler (internal secret).
// BUILD-ONLY: ready to deploy but not activated until Moti approves.
import { createClient } from "npm:@supabase/supabase-js@2";
import { twilioCreds, sendWhatsAppTemplate } from "../_shared/whatsapp/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Constant-time string compare for the internal shared secret.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, service);

  let body: { campaignId?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  if (!body.campaignId) return json({ ok: false, error: "campaignId required" }, 400);

  const { data: campaign } = await admin
    .from("whatsapp_campaigns").select("*").eq("id", body.campaignId).maybeSingle();
  if (!campaign) return json({ ok: false, error: "Campaign not found" }, 404);
  const businessId = campaign.business_id as string;

  // Authorize: internal secret OR the owning merchant.
  const internal = req.headers.get("x-internal-secret");
  const expected = Deno.env.get("WHATSAPP_INTERNAL_SECRET");
  let authorized = !!expected && safeEqual(internal ?? "", expected);
  if (!authorized) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", businessId).maybeSingle();
        if (biz) {
          const { data: prof } = await admin.from("profiles").select("user_id").eq("id", biz.owner_id).maybeSingle();
          authorized = prof?.user_id === user.id;
        }
      }
    }
  }
  if (!authorized) return json({ ok: false, error: "Unauthorized" }, 401);
  if (campaign.status === "sending" || campaign.status === "sent") {
    return json({ ok: true, duplicate: true, status: campaign.status });
  }

  // Sender + template.
  const { data: acct } = await admin.from("whatsapp_accounts").select("phone_number, status").eq("business_id", businessId).maybeSingle();
  const from = acct?.phone_number || Deno.env.get("TWILIO_WHATSAPP_FROM");
  if (!from) return json({ ok: false, error: "WhatsApp not connected" }, 409);

  let contentSid: string | null = null;
  if (campaign.template_id) {
    const { data: tpl } = await admin.from("whatsapp_templates").select("meta_template_id, status").eq("id", campaign.template_id).maybeSingle();
    if (tpl?.status === "approved") contentSid = tpl.meta_template_id;
  }

  // OPT-IN audience only, optionally filtered by tag.
  let q = admin.from("whatsapp_contacts").select("phone").eq("business_id", businessId).eq("opted_in", true);
  if (campaign.audience_tag) q = q.contains("tags", [campaign.audience_tag]);
  const { data: contacts } = await q.limit(5000);
  const audience = (contacts || []) as Array<{ phone: string }>;

  await admin.from("whatsapp_campaigns").update({ status: "sending", total_count: audience.length, updated_at: new Date().toISOString() }).eq("id", campaign.id);

  const creds = twilioCreds();
  if (!creds || !contentSid) {
    // Pre-go-live or template not approved: mark queued, don't actually send.
    await admin.from("whatsapp_campaigns").update({ status: "draft", updated_at: new Date().toISOString() }).eq("id", campaign.id);
    return json({ ok: true, skipped: true, reason: !creds ? "twilio not configured" : "template not approved", audience: audience.length });
  }

  let sent = 0;
  for (const c of audience) {
    const r = await sendWhatsAppTemplate(creds, from, c.phone, contentSid);
    await admin.from("whatsapp_messages").insert({
      business_id: businessId, campaign_id: campaign.id, contact_phone: c.phone, direction: "out",
      template_name: contentSid, status: r.ok ? (r.status || "sent") : "failed", category: "marketing",
      provider_sid: r.sid || null, error: r.ok ? null : r.error || null,
    });
    if (r.ok) sent++;
    await sleep(120); // gentle rate limit
  }

  await admin.from("whatsapp_campaigns").update({ status: "sent", sent_count: sent, updated_at: new Date().toISOString() }).eq("id", campaign.id);
  return json({ ok: true, sent, audience: audience.length });
});
