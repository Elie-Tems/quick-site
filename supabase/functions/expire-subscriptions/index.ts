// Scheduled function (run via cron, e.g. daily): takes down stores whose
// cancellation has reached its effective date.
//
// For subscriptions cancelled with cancel_type='end_of_period', the store stays
// live until cancel_at (= the paid-until date). Once that date passes, this job
// sets the owner's business is_published=false. Immediate cancellations are
// handled inline at cancel time, so they're not processed here.
//
// Auth: not a user request - guarded by a shared CRON_SECRET header. Set
// verify_jwt=false for this function in config.toml.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ICOUNT_BASE = "https://api.icount.co.il/api/v3.php";
// Call the iCount v3 API (Bearer ICOUNT_API_TOKEN). No-op if the token isn't set.
async function icount(endpoint: string, payload: Record<string, unknown>) {
  const token = Deno.env.get("ICOUNT_API_TOKEN");
  if (!token) return { status: false } as any;
  try {
    const r = await fetch(`${ICOUNT_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return await r.json();
  } catch {
    return { status: false } as any;
  }
}

serve(async (req) => {
  try {
    // Fail closed: this is invoked only by the scheduled cron, which sends the
    // shared x-cron-secret header. Without a configured + matching secret, reject
    // (previously an unset secret skipped the check entirely -> anyone could POST).
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const now = new Date().toISOString();

    // Cancellations whose effective date has passed. Per-site: take down ONLY the
    // specific site whose subscription was cancelled (not every site the owner has).
    const { data: subs, error: subErr } = await admin
      .from("subscriptions")
      .select("business_id")
      .eq("status", "cancelled")
      .eq("cancel_type", "end_of_period")
      .lte("cancel_at", now);
    if (subErr) throw subErr;

    let processed = 0;
    for (const sub of subs ?? []) {
      const businessId = (sub as { business_id?: string }).business_id;
      if (!businessId) continue;
      const { error: bizErr } = await admin
        .from("businesses")
        .update({ is_published: false })
        .eq("id", businessId)
        .eq("is_published", true);
      if (!bizErr) processed++;
    }

    // Reconciliation: for recently-cancelled subscriptions that still carry an
    // iCount hk_id, re-issue hk/cancel (idempotent). This is the safety net for a
    // cancellation that our cancel endpoint thought succeeded but iCount didn't
    // actually stop - so a customer who cancelled can never keep getting charged.
    // Bounded to the last few days so we don't reprocess old cancellations forever.
    let reconciled = 0;
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: cancelledSubs } = await admin
      .from("subscriptions")
      .select("id, icount_hk_id")
      .eq("status", "cancelled")
      .not("icount_hk_id", "is", null)
      .gte("cancel_at", cutoff);
    for (const s of cancelledSubs ?? []) {
      const res = await icount("hk/cancel", { hk_id: (s as any).icount_hk_id });
      if ((res as any)?.status) reconciled++;
    }

    return new Response(JSON.stringify({ ok: true, processed, reconciled }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("expire-subscriptions error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
