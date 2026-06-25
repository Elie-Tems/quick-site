// Daily domain lifecycle emails. Run by pg_cron. Finds domains nearing expiry
// (30d / 7d) and expired-unpaid ones, emails the merchant once per stage via
// Resend, and flips the per-stage flag so we never spam. No-ops when there are
// no due domains. Reads recipient from the linked business.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { domainExpiryReminder, domainExpiringUnpaid } from "../_shared/email/platformEmails.ts";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DomainRow {
  id: string;
  domain: string;
  expires_at: string | null;
  businesses?: { email?: string | null; name?: string | null } | null;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("he-IL") : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();
  let sent = 0;

  const process = async (
    rows: DomainRow[],
    flag: "reminder_30_sent" | "reminder_7_sent" | "expiry_unpaid_sent",
    build: (d: DomainRow) => { subject: string; html: string },
  ) => {
    for (const d of rows) {
      const to = d.businesses?.email;
      if (to) {
        const { subject, html } = build(d);
        await sendViaResend({ to, subject, html, fromName: "Siango" });
        sent++;
      }
      await sb.from("domains").update({ [flag]: true }).eq("id", d.id);
    }
  };

  try {
    const sel = "id, domain, expires_at, businesses(email, name)";

    // 30-day reminder: expiring within 30 days (but more than 7), not yet sent.
    const { data: d30 } = await sb.from("domains").select(sel)
      .eq("status", "active").eq("reminder_30_sent", false)
      .gt("expires_at", inDays(7)).lte("expires_at", inDays(30));
    await process((d30 || []) as DomainRow[], "reminder_30_sent", (d) =>
      domainExpiryReminder({ businessName: d.businesses?.name || undefined, domainName: d.domain, daysLeft: 30 }));

    // 7-day reminder: expiring within 7 days, not yet sent.
    const { data: d7 } = await sb.from("domains").select(sel)
      .eq("status", "active").eq("reminder_7_sent", false)
      .gt("expires_at", now.toISOString()).lte("expires_at", inDays(7));
    await process((d7 || []) as DomainRow[], "reminder_7_sent", (d) =>
      domainExpiryReminder({ businessName: d.businesses?.name || undefined, domainName: d.domain, daysLeft: 7 }));

    // Expired + unpaid: past expiry, not yet warned.
    const { data: dex } = await sb.from("domains").select(sel)
      .eq("expiry_unpaid_sent", false).lt("expires_at", now.toISOString());
    await process((dex || []) as DomainRow[], "expiry_unpaid_sent", (d) =>
      domainExpiringUnpaid({ businessName: d.businesses?.name || undefined, domainName: d.domain, expiryDate: fmtDate(d.expires_at) }));

    return new Response(JSON.stringify({ ok: true, emailed: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
