// Scheduled function (hourly cron): abandoned publish-checkout recovery.
//
// A merchant who starts the publish payment but never completes it leaves a
// `pending` publish_checkout_sessions row and an unpublished store. This treats
// it like an abandoned cart: a few hours later we email a gentle recovery nudge,
// and a second reminder ~a day later. Idempotent - recovery_email_count +
// recovery_email_sent_at gate re-sends, so a row is never double-nudged.
//
// Sending goes through send-platform-email (service-role bearer) so it inherits
// the unsubscribe-suppression + language resolution. Type "publishPaymentFailed"
// is registered there as a MARKETING type (honors opt-outs).
//
// Auth: cron only. Optional x-cron-secret guard (enforced only if CRON_SECRET is
// set), matching the other siango-* crons. Set verify_jwt=false in config.toml.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = "https://siango.app";
const FIRST_HOURS = 3;   // first nudge: this long after the checkout was started
const SECOND_GAP_HOURS = 21; // second reminder: this long after the first email
const MAX_EMAILS = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const now = Date.now();
  const firstCutoff = new Date(now - FIRST_HOURS * 3600_000).toISOString();

  // Pending checkouts old enough for a first nudge, not yet exhausted.
  const { data: sessions, error } = await admin
    .from("publish_checkout_sessions")
    .select("id, user_id, business_id, status, created_at, recovery_email_count, recovery_email_sent_at")
    .eq("status", "pending")
    .lt("created_at", firstCutoff)
    .lt("recovery_email_count", MAX_EMAILS)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("recovery: query failed", error);
    return new Response(JSON.stringify({ error: "query failed" }), { status: 500 });
  }

  let sent = 0, skipped = 0;

  for (const s of sessions ?? []) {
    // Second reminder only after a gap since the first email.
    if ((s.recovery_email_count ?? 0) >= 1) {
      const lastSent = s.recovery_email_sent_at ? Date.parse(s.recovery_email_sent_at) : 0;
      if (now - lastSent < SECOND_GAP_HOURS * 3600_000) { skipped++; continue; }
    }

    // Only nudge if the store is genuinely still unpublished (they may have paid
    // via another session, or the business was deleted).
    const { data: biz } = await admin
      .from("businesses")
      .select("id, name, is_published")
      .eq("id", s.business_id)
      .maybeSingle();
    if (!biz || (biz as any).is_published) { skipped++; continue; }

    // Recipient email + name/lang from their auth account.
    const { data: u } = await admin.auth.admin.getUserById(s.user_id);
    const email = u?.user?.email;
    if (!email) { skipped++; continue; }
    const meta = (u.user.user_metadata ?? {}) as Record<string, unknown>;
    const firstName =
      (meta.first_name as string) ||
      (typeof meta.full_name === "string" ? meta.full_name.split(" ")[0] : undefined) ||
      undefined;
    const lang = (meta.preferred_language as string) || undefined;

    // Send via the central platform-email endpoint (suppression + lang for free).
    let ok = false;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-platform-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          type: "publishPaymentFailed",
          to: email,
          ctx: {
            firstName,
            businessName: (biz as any).name,
            continueUrl: `${APP_URL}/publish-payment?businessId=${(biz as any).id}`,
            ...(lang ? { lang } : {}),
          },
        }),
      });
      ok = r.ok;
      if (!ok) console.error("recovery: send-platform-email failed", r.status, await r.text().catch(() => ""));
    } catch (e) {
      console.error("recovery: send error", e);
    }

    // Record the attempt regardless (an unsubscribed recipient returns ok+skipped;
    // we still advance the counter so we don't retry them forever).
    if (ok) {
      const nowIso = new Date().toISOString();
      await admin
        .from("publish_checkout_sessions")
        .update({
          recovery_email_count: (s.recovery_email_count ?? 0) + 1,
          recovery_email_sent_at: nowIso,
          ...((s.recovery_email_count ?? 0) === 0 ? { abandoned_at: nowIso } : {}),
        })
        .eq("id", s.id);
      sent++;
    } else {
      skipped++;
    }
  }

  console.log(`publish-payment-recovery: scanned ${sessions?.length ?? 0}, sent ${sent}, skipped ${skipped}`);
  return new Response(JSON.stringify({ ok: true, scanned: sessions?.length ?? 0, sent, skipped }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
