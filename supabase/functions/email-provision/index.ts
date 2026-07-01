// Provision a business-email mailbox via the reseller (OpenSRS) and point the
// domain's MX records at the mail host. Called after the merchant orders a
// mailbox. Auth: the owning merchant (JWT) or internal secret.
// BUILD-ONLY: ready to deploy; the OpenSRS call is wired behind env creds and
// the feature is flag-gated until approved.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// OpenSRS email-API call (mailbox create). Endpoint/creds via env; returns a
// provider ref or throws. Stubbed safe: if creds aren't set we mark it pending
// (no fake "active") so go-live just needs the secrets.
async function provisionViaOpenSRS(address: string, password: string, quotaMb: number): Promise<{ ref: string } | null> {
  const user = Deno.env.get("OPENSRS_EMAIL_USER");
  const key = Deno.env.get("OPENSRS_EMAIL_KEY");
  const base = Deno.env.get("OPENSRS_EMAIL_BASE") || "https://admin.a.hostedemail.com/api/change_mailbox";
  if (!user || !key) return null; // not configured yet -> caller keeps status 'pending'
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-OAPI-User": user, "X-OAPI-Key": key },
    body: JSON.stringify({ user: address, password, mailbox_type: "imapadmin", settings: { quota: quotaMb } }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j?.success === false) throw new Error(j?.error || `OpenSRS mailbox create failed (${res.status})`);
  return { ref: j?.uuid || address };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, service);

  let body: { mailboxId?: string; password?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  if (!body.mailboxId) return json({ ok: false, error: "mailboxId required" }, 400);

  const { data: mb } = await admin.from("email_mailboxes").select("*").eq("id", body.mailboxId).maybeSingle() as { data: any };
  if (!mb) return json({ ok: false, error: "Mailbox not found" }, 404);

  // Authorize: internal secret OR the owning merchant.
  const internal = req.headers.get("x-internal-secret");
  let authorized = !!Deno.env.get("EMAIL_INTERNAL_SECRET") && internal === Deno.env.get("EMAIL_INTERNAL_SECRET");
  if (!authorized) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (user && mb.business_id) {
        const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", mb.business_id).maybeSingle();
        if (biz) { const { data: prof } = await admin.from("profiles").select("user_id").eq("id", (biz as any).owner_id).maybeSingle(); authorized = (prof as any)?.user_id === user.id; }
      }
    }
  }
  if (!authorized) return json({ ok: false, error: "Unauthorized" }, 401);

  try {
    const result = await provisionViaOpenSRS(mb.address, body.password || crypto.randomUUID().slice(0, 14), mb.quota_mb || 10240);
    if (!result) {
      // Provider not configured yet - leave pending; go-live just sets the secrets.
      return json({ ok: true, pending: true, reason: "email provider not configured" });
    }
    await admin.from("email_mailboxes").update({ status: "active", provider_ref: result.ref, updated_at: new Date().toISOString() }).eq("id", mb.id);
    // NOTE: also set the domain MX records (via the domain provider's DNS API) here at go-live.
    return json({ ok: true, status: "active", address: mb.address });
  } catch (e) {
    await admin.from("email_mailboxes").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", mb.id);
    return json({ ok: false, error: e instanceof Error ? e.message : "provision failed" }, 500);
  }
});
