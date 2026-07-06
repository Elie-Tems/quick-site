// Scheduled function (hourly cron): abandoned-onboarding recovery.
//
// A user who signs up but never finishes onboarding (onboarding_completed_at is
// NULL) gets a gentle nudge ~24h after sign-up, and a last reminder ~72h after.
// This is DISTINCT from publish-payment-recovery, which nudges merchants who
// already reached the publish/payment step - the two target disjoint sets (a
// pending publish checkout implies onboarding is already complete).
//
// Idempotent: onboarding_nudge_count + onboarding_nudge_sent_at gate re-sends,
// so a profile is never double-nudged and hourly runs are safe.
//
// Sending goes through send-platform-email (service-role bearer) so it inherits
// unsubscribe-suppression + language resolution. Types onboardingAbandoned1/2
// are registered there as MARKETING types (honor opt-outs).
//
// Auth: cron only. Optional x-cron-secret guard (enforced only if CRON_SECRET is
// set), matching the other siango-* crons. Set verify_jwt=false in config.toml.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = "https://siango.app";
const FIRST_HOURS = 24;        // first nudge this long after sign-up
const SECOND_GAP_HOURS = 48;   // second reminder this long after the first email (~72h total)
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

  // Profiles that signed up long enough ago, still haven't finished onboarding,
  // and haven't exhausted their nudges.
  const { data: rows, error } = await admin
    .from("profiles")
    .select("id, user_id, created_at, onboarding_completed_at, onboarding_nudge_count, onboarding_nudge_sent_at")
    .is("onboarding_completed_at", null)
    .lt("created_at", firstCutoff)
    .lt("onboarding_nudge_count", MAX_EMAILS)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("onboarding-abandoned: query failed", error);
    return new Response(JSON.stringify({ error: "query failed" }), { status: 500 });
  }

  let sent = 0, skipped = 0;

  for (const p of rows ?? []) {
    const count = p.onboarding_nudge_count ?? 0;

    // Second reminder only after a gap since the first email.
    if (count >= 1) {
      const lastSent = p.onboarding_nudge_sent_at ? Date.parse(p.onboarding_nudge_sent_at) : 0;
      if (now - lastSent < SECOND_GAP_HOURS * 3600_000) { skipped++; continue; }
    }

    // Recipient email + name/lang from their auth account.
    const { data: u } = await admin.auth.admin.getUserById(p.user_id);
    const email = u?.user?.email;
    if (!email) { skipped++; continue; }
    const meta = (u.user.user_metadata ?? {}) as Record<string, unknown>;
    const firstName =
      (meta.first_name as string) ||
      (typeof meta.full_name === "string" ? meta.full_name.split(" ")[0] : undefined) ||
      undefined;
    const lang = (meta.preferred_language as string) || undefined;

    const type = count === 0 ? "onboardingAbandoned1" : "onboardingAbandoned2";

    // Send via the central platform-email endpoint (suppression + lang + logging).
    let ok = false;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-platform-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          type,
          to: email,
          ctx: {
            firstName,
            continueUrl: `${APP_URL}/onboarding`,
            ...(lang ? { lang } : {}),
          },
        }),
      });
      ok = r.ok;
      if (!ok) console.error("onboarding-abandoned: send-platform-email failed", r.status, await r.text().catch(() => ""));
    } catch (e) {
      console.error("onboarding-abandoned: send error", e);
    }

    // Record the attempt (an unsubscribed recipient returns ok+skipped; we still
    // advance the counter so we don't retry them forever).
    if (ok) {
      await admin
        .from("profiles")
        .update({
          onboarding_nudge_count: count + 1,
          onboarding_nudge_sent_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      sent++;
    } else {
      skipped++;
    }
  }

  console.log(`onboarding-abandoned: scanned ${rows?.length ?? 0}, sent ${sent}, skipped ${skipped}`);
  return new Response(JSON.stringify({ ok: true, scanned: rows?.length ?? 0, sent, skipped }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
