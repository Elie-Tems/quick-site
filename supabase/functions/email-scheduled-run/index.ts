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

// Resolve the campaign owner's store (id + slug) so the unsubscribe link is
// store-scoped (StoreUnsubscribe) and suppression stays store-scoped, instead of
// hitting the platform-wide page/list. Prefers the campaign's explicit
// business_id; else auth-user -> profile -> business (businesses.owner_id is a
// profiles.id, not an auth uid). Returns null for a standalone ESP owner.
async function resolveOwnerBusiness(admin: any, ownerAuthId: string, campaignBusinessId?: string | null): Promise<{ id: string; slug: string } | null> {
  if (campaignBusinessId) {
    const { data } = await admin.from("businesses").select("id, slug").eq("id", campaignBusinessId).maybeSingle();
    if (data?.slug) return data as { id: string; slug: string };
  }
  const { data: prof } = await admin.from("profiles").select("id").eq("user_id", ownerAuthId).maybeSingle();
  if (!prof?.id) return null;
  const { data: biz } = await admin.from("businesses").select("id, slug").eq("owner_id", prof.id).limit(1).maybeSingle();
  return biz?.slug ? (biz as { id: string; slug: string }) : null;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // siteUrl (Pages host) is ONLY for the user-facing unsubscribe page.
  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
  // BUG #25: tracking endpoints live on the Supabase functions host, not Pages.
  const trackBase = `${SUPABASE_URL}/functions/v1`;
  const now = new Date().toISOString();

  const { data: due } = await admin.from("mkt_campaigns").select("*")
    .eq("status", "scheduled").lte("scheduled_at", now).limit(20);
  if (!due?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "Content-Type": "application/json" } });

  let processed = 0, totalSent = 0;
  for (const c of due) {
    await admin.from("mkt_campaigns").update({ status: "sending" }).eq("id", c.id);
    // BUG #47: per-campaign store scope. Suppress only this store's opt-outs plus
    // platform-wide rows (business_id IS NULL) - never other merchants'. The old
    // single global fetch over-suppressed across merchants.
    const ownerBiz = await resolveOwnerBusiness(admin, c.owner_id, c.business_id);
    let unsubQ = admin.from("email_unsubscribes").select("email");
    unsubQ = ownerBiz?.id ? unsubQ.or(`business_id.eq.${ownerBiz.id},business_id.is.null`) : unsubQ.is("business_id", null);
    const { data: unsub } = await unsubQ;
    const blocked = new Set((unsub || []).map((u: any) => String(u.email).toLowerCase()));
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
      // BUG #47: store-scoped unsubscribe (StoreUnsubscribe), not the platform page.
      const unsubUrl = ownerBiz?.slug
        ? `${siteUrl}/store/${ownerBiz.slug}/unsubscribe?email=${encodeURIComponent(ct.email)}`
        : `${siteUrl}/unsubscribe?email=${encodeURIComponent(ct.email)}`;
      const footer = `<tr><td style="background:#f6f7f8;padding:14px 16px;text-align:center"><div style="font-size:11px;color:#888"><b>פרסומת</b> · ${esc(c.from_name || "")} · ${esc(c.reply_to || "")}</div><div style="font-size:11px;margin-top:3px"><a href="${unsubUrl}" style="color:#0E9F6E">להסרה מרשימת התפוצה</a></div></td></tr>`;
      let html = renderEmail(c.blocks || [], { "שם": ct.name || "", "שם_העסק": c.from_name || "" }, footer);
      // tracking: wrap links + open pixel (BUG #25 - Supabase functions host)
      html = html.replace(/href="(https?:\/\/[^"]+)"/g, (m, url) =>
        (url.includes("/unsubscribe") || url.includes("/email-track-")) ? m
          : `href="${trackBase}/email-track-click?c=${c.id}&e=${ct.id}&u=${encodeURIComponent(url)}"`);
      html = html.replace("</table></td></tr></table></body>",
        `<tr><td><img src="${trackBase}/email-track-open?c=${c.id}&e=${ct.id}" width="1" height="1" style="display:block;border:0" alt=""/></td></tr></table></td></tr></table></body>`);
      const res = await sendViaResend({ to: ct.email, subject: c.subject || "(ללא נושא)", html, fromName: c.from_name || "סיאנגו", replyTo: c.reply_to || undefined });
      if (res.ok) { sent++; await admin.from("mkt_campaign_events").insert({ campaign_id: c.id, contact_id: ct.id, type: "sent" }); }
    }
    await admin.from("mkt_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", c.id);
    processed++; totalSent += sent;
  }
  return new Response(JSON.stringify({ ok: true, processed, totalSent }), { headers: { "Content-Type": "application/json" } });
});
