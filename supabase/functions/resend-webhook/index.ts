// Resend webhook -> updates the platform_email_log audit trail as emails are
// delivered / opened / bounced / complained. Configure this URL in Resend
// (Webhooks), optionally with ?secret=<RESEND_WEBHOOK_SECRET>.
//
// Auth: if RESEND_WEBHOOK_SECRET is set we require ?secret= to match; otherwise
// we fail-open (the payload only flips a delivery status, no sensitive data).
// verify_jwt=false in config.toml.

import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Resend event type -> (log status, timestamp column to stamp).
const EVENT_MAP: Record<string, { status: string; col?: string }> = {
  "email.sent": { status: "sent" },
  "email.delivered": { status: "delivered", col: "delivered_at" },
  "email.opened": { status: "opened", col: "opened_at" },
  "email.bounced": { status: "bounced", col: "bounced_at" },
  "email.complained": { status: "complained" },
  "email.delivery_delayed": { status: "delayed" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
  if (secret) {
    const given = new URL(req.url).searchParams.get("secret") ?? "";
    if (!safeEqual(given, secret)) return json({ error: "unauthorized" }, 401);
  }

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { return json({ error: "bad body" }, 400); }

  const type = String(payload["type"] ?? "");
  const data = (payload["data"] ?? {}) as Record<string, unknown>;
  // Resend puts the message id under email_id (sometimes id).
  const providerId = String(data["email_id"] ?? data["id"] ?? "");
  const map = EVENT_MAP[type];
  if (!map || !providerId) return json({ ok: true, ignored: true });

  // Never regress the status ranking (opened > delivered > sent). We only bump up.
  const RANK: Record<string, number> = {
    sent: 1, delayed: 1, delivered: 2, opened: 3, bounced: 2, complained: 2, failed: 0,
  };

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date().toISOString();

  const { data: rows } = await admin
    .from("platform_email_log").select("id, status").eq("provider_id", providerId).limit(1);
  const row = rows?.[0] as { id: string; status: string } | undefined;
  if (!row) return json({ ok: true, unmatched: true });

  const update: Record<string, unknown> = {};
  if ((RANK[map.status] ?? 0) >= (RANK[row.status] ?? 0)) update.status = map.status;
  if (map.col) update[map.col] = now;
  if (Object.keys(update).length) {
    await admin.from("platform_email_log").update(update).eq("id", row.id);
  }

  return json({ ok: true });
});
