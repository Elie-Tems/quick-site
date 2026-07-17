// Monthly cron: warn merchants whose card expires next month so they can update it
// before the charge fails. Fires at the start of each month (Supabase cron schedule
// in config.toml). Idempotent: a "warning_sent_at" column prevents duplicate emails
// within the same calendar month.
//
// verify_jwt=false — called by cron.

import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const now = new Date();
  // Next month (handles December → January year rollover)
  const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2; // getMonth() is 0-based
  const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();

  // Find all active/past_due subscriptions whose saved card expires next month
  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, user_id, business_id, cc_token_id")
    .eq("billing_provider", "cardcom_token")
    .in("status", ["active", "past_due"])
    .not("cc_token_id", "is", null);

  if (!subs?.length) return json({ ok: true, warned: 0 });

  let warned = 0;
  for (const sub of subs) {
    const { data: tok } = await admin
      .from("billing_tokens")
      .select("cc_exp_month, cc_exp_year, expiry_warning_sent_month")
      .eq("user_id", (sub as any).user_id)
      .eq("cc_token_id", (sub as any).cc_token_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tok) continue;

    const expM = Number((tok as any).cc_exp_month);
    const expY = Number((tok as any).cc_exp_year);
    // Full year (Cardcom may return 2-digit year)
    const fullExpYear = expY < 100 ? 2000 + expY : expY;

    if (expM !== nextMonth || fullExpYear !== nextYear) continue;

    // Already warned this month?
    const warnedMonth = (tok as any).expiry_warning_sent_month as string | null;
    const thisMonthKey = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    if (warnedMonth === thisMonthKey) continue;

    // Get merchant email
    const { data: u } = await admin.auth.admin.getUserById((sub as any).user_id);
    const email = u?.user?.email;
    if (!email) continue;

    const emailResp = await fetch(`${url}/functions/v1/send-platform-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({
        type: "cardExpiringSoon",
        to: email,
        ctx: {
          expMonth: String(nextMonth).padStart(2, "0"),
          expYear: String(nextYear),
          updateUrl: `https://siango.app/dashboard?tab=subscription`,
          recipientEmail: email,
          lang: "he",
        },
      }),
    });

    if (emailResp.ok) {
      // Mark as warned so we don't re-send this month
      await admin.from("billing_tokens")
        .update({ expiry_warning_sent_month: thisMonthKey })
        .eq("user_id", (sub as any).user_id)
        .eq("cc_token_id", (sub as any).cc_token_id);
      warned++;
    }
  }

  return json({ ok: true, warned });
});
