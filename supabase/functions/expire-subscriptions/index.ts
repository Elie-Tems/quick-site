// Scheduled function (run via cron, e.g. daily): takes down stores whose
// cancellation has reached its effective date.
//
// For subscriptions cancelled with cancel_type='end_of_period', the store stays
// live until cancel_at (= the paid-until date). Once that date passes, this job
// sets the owner's business is_published=false. Immediate cancellations are
// handled inline at cancel time, so they're not processed here.
//
// Auth: not a user request — guarded by a shared CRON_SECRET header. Set
// verify_jwt=false for this function in config.toml.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const now = new Date().toISOString();

    // Cancellations whose effective date has passed.
    const { data: subs, error: subErr } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("status", "cancelled")
      .eq("cancel_type", "end_of_period")
      .lte("cancel_at", now);
    if (subErr) throw subErr;

    let processed = 0;
    for (const sub of subs ?? []) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("user_id", sub.user_id)
        .maybeSingle();
      if (!profile) continue;

      const { error: bizErr } = await admin
        .from("businesses")
        .update({ is_published: false })
        .eq("owner_id", profile.id)
        .eq("is_published", true);
      if (!bizErr) processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
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
