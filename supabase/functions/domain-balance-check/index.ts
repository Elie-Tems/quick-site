// Daily Openprovider balance monitor (pg_cron). Reads the reseller balance,
// stores a snapshot in domain_provider_status (admin dashboard reads it via RLS),
// and emails the admin when the balance drops below the threshold - once per
// crossing (the flag resets when the balance recovers), so we don't nag daily.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLATFORM_EMAILS } from "../_shared/email/platformEmails.ts";
import { sendViaResend } from "../_shared/email/resend.ts";
import { opGetBalance } from "../_shared/domains/openprovider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin alerts go to both founders (same list as report-error / uptime-check).
const ALERT_RECIPIENTS = ["moti4384@gmail.com", "furmand713@gmail.com"];
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const threshold = Number(Deno.env.get("DOMAIN_LOW_BALANCE_USD") || "20");

  try {
    const bal = await opGetBalance();
    if (!bal.ok || !bal.data) return json({ ok: false, error: bal.error || "balance failed" }, 502);

    const { balance, currency } = bal.data;
    const { data: prev } = await admin
      .from("domain_provider_status").select("low_balance_alert_sent").eq("provider", "openprovider").maybeSingle();
    const alreadyAlerted = (prev as any)?.low_balance_alert_sent === true;

    const low = balance < threshold;
    // Alert once when we cross below; reset the flag when we recover.
    const sendAlert = low && !alreadyAlerted;

    await admin.from("domain_provider_status").upsert({
      provider: "openprovider",
      balance,
      currency,
      low_balance_alert_sent: low ? true : false,
      checked_at: new Date().toISOString(),
    });

    if (sendAlert) {
      const mail = PLATFORM_EMAILS.domainLowBalance({ balance, currency });
      await sendViaResend({ to: ALERT_RECIPIENTS, subject: mail.subject, html: mail.html, fromName: "Siango" });
    }

    return json({ ok: true, balance, currency, low, alerted: sendAlert });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "error" }, 500);
  }
});
