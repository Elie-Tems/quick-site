// Daily business digest (Siango health) - emailed to the founders at ~01:30 IL.
// Data-focused (numbers first, minimal design). Triggered by a pg_cron job that
// POSTs here with the x-cron-secret header. Also runnable manually with the same
// secret. Metrics cover the last 24h.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";

const RECIPIENTS = ["moti4384@gmail.com", "furmand713@gmail.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const ILS = (n: number) => "₪" + Math.round(n).toLocaleString("en-US");

async function countSince(admin: any, table: string, col: string, sinceIso: string, extra?: (q: any) => any) {
  let q = admin.from(table).select("*", { count: "exact", head: true }).gte(col, sinceIso);
  if (extra) q = extra(q);
  const { count } = await q;
  return count || 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Only the cron (or a holder of the secret) may trigger this.
  const secret = Deno.env.get("DIGEST_CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // --- Acquisition (last 24h) ---
  const newSignups = await countSince(admin, "profiles", "created_at", since);
  const newStores = await countSince(admin, "businesses", "created_at", since);

  // --- Revenue / billing (last 24h) ---
  // Publish + add-on payments captured via iCount publish_checkout_sessions.
  const { data: paidSessions } = await admin
    .from("publish_checkout_sessions")
    .select("amount_ils, status, updated_at")
    .gte("updated_at", since)
    .in("status", ["paid", "completed"]);
  const charsCleared = paidSessions?.length || 0;
  const revenue = (paidSessions || []).reduce((s: number, r: any) => s + (Number(r.amount_ils) || 0), 0);
  const declines = await countSince(admin, "publish_checkout_sessions", "updated_at", since, (q) =>
    q.in("status", ["failed", "declined", "error"]),
  );

  // --- Stock / base numbers ---
  const nowIso = new Date().toISOString();
  const { count: activeSubs } = await admin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .gt("paid_until", nowIso);
  const { count: publishedStores } = await admin
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true);

  // --- Merchant activity (their customers' orders, last 24h) ---
  const { data: orders } = await admin
    .from("orders")
    .select("total_price")
    .gte("created_at", since);
  const ordersCount = orders?.length || 0;
  const gmv = (orders || []).reduce((s: number, r: any) => s + (Number(r.total_price) || 0), 0);

  const row = (label: string, val: string) =>
    `<tr><td style="padding:8px 14px;border-bottom:1px solid #eee;color:#444;">${label}</td>` +
    `<td style="padding:8px 14px;border-bottom:1px solid #eee;font-weight:700;text-align:left;font-family:monospace;">${val}</td></tr>`;

  const html =
    `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">` +
    `<h2 style="margin:0 0 4px;">דוח יומי - Siango</h2>` +
    `<p style="color:#888;margin:0 0 16px;font-size:13px;">24 השעות האחרונות · ${new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</p>` +
    `<table style="width:100%;border-collapse:collapse;font-size:15px;">` +
    `<tr><td colspan="2" style="padding:10px 14px;background:#f0f7f3;font-weight:700;">📈 גיוס</td></tr>` +
    row("נרשמו חדשים", String(newSignups)) +
    row("חנויות חדשות", String(newStores)) +
    `<tr><td colspan="2" style="padding:10px 14px;background:#f0f7f3;font-weight:700;">💰 כסף</td></tr>` +
    row("חיובים שנסלקו", String(charsCleared)) +
    row("סירובים", String(declines)) +
    row("הכנסה (סליקות)", ILS(revenue)) +
    `<tr><td colspan="2" style="padding:10px 14px;background:#f0f7f3;font-weight:700;">📊 מצב כללי</td></tr>` +
    row("מנויים פעילים", String(activeSubs || 0)) +
    row("חנויות מפורסמות", String(publishedStores || 0)) +
    row("הזמנות בחנויות (24ש')", String(ordersCount)) +
    row("מחזור בחנויות (GMV)", ILS(gmv)) +
    `</table>` +
    `<p style="color:#aaa;font-size:11px;margin-top:16px;">מדדי "חיובים/סירובים" יתמלאו כשהסליקה החוזרת (הו"ק) תופעל. דוח אוטומטי.</p>` +
    `</div>`;

  const subject = `דוח יומי Siango · ${newSignups} נרשמו · ${charsCleared} סליקות · ${ILS(revenue)}`;

  const results = [];
  for (const to of RECIPIENTS) {
    results.push(await sendViaResend({ to, subject, html, fromName: "Siango" }));
  }

  return new Response(JSON.stringify({ ok: true, sent: results.length, since }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
