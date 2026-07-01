// Cron: send scheduled email campaigns whose time has arrived. Service-role,
// guarded by CRON_SECRET (fail-closed when set). For each due campaign it renders
// the blocks, applies merge fields + the locked compliance footer, and sends to
// the owner's active, non-unsubscribed contacts via Resend; then marks it sent.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";

const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

function renderBlock(b: any): string {
  const p = b?.props || {};
  switch (b?.type) {
    case "banner": return `<tr><td style="background:${esc(p.bg || "#0E9F6E")};color:#fff;padding:28px 16px;text-align:center;font-weight:700;font-size:18px">${esc(p.title || "")}</td></tr>`;
    case "text": return `<tr><td style="padding:10px 16px;text-align:${esc(p.align || "right")};font-size:${Number(p.size) || 15}px;color:${esc(p.color || "#333")};line-height:1.6">${esc(p.text || "")}</td></tr>`;
    case "button": return `<tr><td style="padding:12px 16px;text-align:${esc(p.align || "center")}"><a href="${esc(p.url || "#")}" style="display:inline-block;background:${esc(p.color || "#0E9F6E")};color:#fff;font-weight:700;border-radius:6px;padding:10px 26px;font-size:14px;text-decoration:none">${esc(p.text || "")}</a></td></tr>`;
    case "image": return p.url ? `<tr><td><img src="${esc(p.url)}" style="width:100%;display:block"/></td></tr>` : "";
    case "divider": return `<tr><td style="padding:6px 16px"><div style="border-top:1px solid #e5e7eb"></div></td></tr>`;
    case "spacer": return `<tr><td style="height:${Number(p.height) || 24}px"></td></tr>`;
    default: return "";
  }
}

function renderEmail(blocks: any[], merge: Record<string, string>, footer: string): string {
  let body = (blocks || []).map(renderBlock).join("");
  body = body.replace(/\{\{\s*([\w֐-׿]+)\s*\}\}/g, (_m, k) => esc(merge[k] ?? ""));
  return `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;background:#eef0f2;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f2;padding:18px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden">${body}${footer}</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
  const now = new Date().toISOString();

  const { data: due } = await admin.from("mkt_campaigns").select("*")
    .eq("status", "scheduled").lte("scheduled_at", now).limit(20);
  if (!due?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "Content-Type": "application/json" } });

  const { data: unsub } = await admin.from("email_unsubscribes").select("email");
  const blocked = new Set((unsub || []).map((u: any) => String(u.email).toLowerCase()));

  let processed = 0, totalSent = 0;
  for (const c of due) {
    await admin.from("mkt_campaigns").update({ status: "sending" }).eq("id", c.id);
    const incTags: string[] = Array.isArray(c.conditions?.includeTags) ? c.conditions.includeTags : [];
    const excTags: string[] = Array.isArray(c.conditions?.excludeTags) ? c.conditions.excludeTags : [];
    let cq = admin.from("mkt_contacts")
      .select("id, email, name, tags").eq("owner_id", c.owner_id).eq("status", "active").not("email", "is", null);
    if (incTags.length) cq = cq.overlaps("tags", incTags);
    let { data: contacts } = await cq;
    if (excTags.length) contacts = (contacts || []).filter((ct: any) => !(ct.tags || []).some((t: string) => excTags.includes(t)));
    let sent = 0;
    for (const ct of contacts || []) {
      if (!ct.email || blocked.has(String(ct.email).toLowerCase())) continue;
      const footer = `<tr><td style="background:#f6f7f8;padding:14px 16px;text-align:center"><div style="font-size:11px;color:#888"><b>פרסומת</b> · ${esc(c.from_name || "")} · ${esc(c.reply_to || "")}</div><div style="font-size:11px;margin-top:3px"><a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(ct.email)}" style="color:#0E9F6E">להסרה מרשימת התפוצה</a></div></td></tr>`;
      let html = renderEmail(c.blocks || [], { "שם": ct.name || "", "שם_העסק": c.from_name || "" }, footer);
      // tracking: wrap links + open pixel
      html = html.replace(/href="(https?:\/\/[^"]+)"/g, (m, url) =>
        (url.includes("/unsubscribe") || url.includes("/email-track-")) ? m
          : `href="${siteUrl}/functions/v1/email-track-click?c=${c.id}&e=${ct.id}&u=${encodeURIComponent(url)}"`);
      html = html.replace("</table></td></tr></table></body>",
        `<tr><td><img src="${siteUrl}/functions/v1/email-track-open?c=${c.id}&e=${ct.id}" width="1" height="1" style="display:block;border:0" alt=""/></td></tr></table></td></tr></table></body>`);
      const res = await sendViaResend({ to: ct.email, subject: c.subject || "(ללא נושא)", html, fromName: c.from_name || "סיאנגו", replyTo: c.reply_to || undefined });
      if (res.ok) { sent++; await admin.from("mkt_campaign_events").insert({ campaign_id: c.id, contact_id: ct.id, type: "sent" }); }
    }
    await admin.from("mkt_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", c.id);
    processed++; totalSent += sent;
  }
  return new Response(JSON.stringify({ ok: true, processed, totalSent }), { headers: { "Content-Type": "application/json" } });
});
