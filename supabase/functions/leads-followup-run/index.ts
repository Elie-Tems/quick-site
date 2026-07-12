// Daily lead follow-up digest. For each business that has OPEN pipeline cards whose
// follow_up_at is due (today or overdue), email the merchant a short "leads to get
// back to" list with a link to the CRM. The merchant clears a lead's reminder when
// handled (follow_up_at -> null), so the digest naturally shrinks.
//
// Cron-only: invoke from pg_cron with the x-cron-secret header (optional guard).
// No customer data leaves the platform - this is a Siango -> merchant ops notice.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Optional shared-secret guard (matches the other crons).
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: cors });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");

  // Everything due through the end of today (UTC end-of-day covers the Israeli day).
  const end = new Date(); end.setUTCHours(23, 59, 59, 999);

  const { data: cards, error } = await admin.from("pipeline_cards")
    .select("id, business_id, title, follow_up_at")
    .eq("status", "open")
    .not("follow_up_at", "is", null)
    .lte("follow_up_at", end.toISOString());
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  // Group due cards by business.
  const byBiz = new Map<string, { title: string; follow_up_at: string }[]>();
  for (const c of cards ?? []) {
    const arr = byBiz.get(c.business_id) ?? [];
    arr.push({ title: c.title || "ליד", follow_up_at: c.follow_up_at as string });
    byBiz.set(c.business_id, arr);
  }
  if (byBiz.size === 0) return new Response(JSON.stringify({ ok: true, businesses: 0, emailed: 0 }), { headers: cors });

  const bizIds = [...byBiz.keys()];
  const { data: bizes } = await admin.from("businesses").select("id, name, email").in("id", bizIds);

  const startToday = new Date(); startToday.setUTCHours(0, 0, 0, 0);
  const dayLabel = (iso: string): string => {
    const days = Math.round((new Date(iso).getTime() - startToday.getTime()) / 86_400_000);
    if (days < 0) return `באיחור ${Math.abs(days)} ימים`;
    if (days === 0) return "היום";
    return `בעוד ${days} ימים`;
  };

  let emailed = 0;
  for (const biz of bizes ?? []) {
    const email = (biz as any).email as string | null;
    if (!email) continue;
    const list = (byBiz.get(biz.id) ?? []).sort((a, b) => a.follow_up_at.localeCompare(b.follow_up_at));

    const rows = list.slice(0, 15).map((l) =>
      `<tr><td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:14px;color:#222;text-align:right">${esc(l.title)}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;color:#a5601f;text-align:left;white-space:nowrap">${esc(dayLabel(l.follow_up_at))}</td></tr>`
    ).join("");
    const more = list.length > 15 ? `<p style="font-family:Arial,sans-serif;font-size:13px;color:#888;text-align:right">ועוד ${list.length - 15}...</p>` : "";

    const html =
      `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;background:#f4f4f5;padding:24px">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">` +
      `<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden">` +
      `<tr><td style="background:#2e8b6a;height:6px"></td></tr>` +
      `<tr><td style="padding:24px 26px">` +
      `<h1 style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:22px;color:#111;text-align:right">יש לך ${list.length} לידים לחזור אליהם 🔔</h1>` +
      `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;color:#444;text-align:right">אלה הלידים שסימנת לחזור אליהם עד היום:</p>` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;border-collapse:separate;overflow:hidden">${rows}</table>${more}` +
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px auto 0"><tr><td bgcolor="#2e8b6a" style="border-radius:8px">` +
      `<a href="${siteUrl}/dashboard" style="display:inline-block;padding:12px 26px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#fff;text-decoration:none">פתיחת הלידים</a>` +
      `</td></tr></table>` +
      `</td></tr>` +
      `<tr><td style="padding:16px 26px;border-top:1px solid #eee;font-family:Arial,sans-serif;font-size:12px;color:#999;text-align:right">${esc((biz as any).name || "")} · סיאנגו. אפשר לכבות תזכורות ליד בדשבורד.</td></tr>` +
      `</table></td></tr></table></body></html>`;

    const res = await sendViaResend({ to: email, subject: `🔔 ${list.length} לידים לחזור אליהם היום`, html, fromName: "Siango" });
    if (res.ok || res.skipped) emailed++;
  }

  return new Response(JSON.stringify({ ok: true, businesses: byBiz.size, emailed }), { headers: cors });
});
