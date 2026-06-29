// Render an email campaign's blocks to HTML, apply per-contact merge fields, add
// the locked compliance footer (פרסומת + sender + one-click unsubscribe), and
// send via Resend (behind the shared provider helper). Build-only: invoked from
// the email-marketing preview. Supports a single test send, or send to all the
// owner's active (non-unsubscribed) contacts. Segment/condition targeting is
// applied in a later iteration; the UI already captures it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

interface Block { type: string; props: Record<string, any>; }

function renderBlock(b: Block): string {
  const p = b.props || {};
  switch (b.type) {
    case "banner":
      return `<tr><td style="background:${esc(p.bg || "#0E9F6E")};color:#fff;padding:28px 16px;text-align:center;font-weight:700;font-size:18px">${esc(p.title || "")}</td></tr>`;
    case "text":
      return `<tr><td style="padding:10px 16px;text-align:${esc(p.align || "right")};font-size:${Number(p.size) || 15}px;color:${esc(p.color || "#333")};line-height:1.6">${esc(p.text || "")}</td></tr>`;
    case "button":
      return `<tr><td style="padding:12px 16px;text-align:${esc(p.align || "center")}"><a href="${esc(p.url || "#")}" style="display:inline-block;background:${esc(p.color || "#0E9F6E")};color:#fff;font-weight:700;border-radius:6px;padding:10px 26px;font-size:14px;text-decoration:none">${esc(p.text || "")}</a></td></tr>`;
    case "image":
      return p.url ? `<tr><td><img src="${esc(p.url)}" alt="${esc(p.alt || "")}" style="width:100%;display:block"/></td></tr>` : "";
    case "divider":
      return `<tr><td style="padding:6px 16px"><div style="border-top:1px solid #e5e7eb"></div></td></tr>`;
    case "spacer":
      return `<tr><td style="height:${Number(p.height) || 24}px"></td></tr>`;
    default:
      return "";
  }
}

function renderEmail(blocks: Block[], merge: Record<string, string>, footer: string): string {
  let body = (blocks || []).map(renderBlock).join("");
  // merge fields {{key}}
  body = body.replace(/\{\{\s*([\w֐-׿]+)\s*\}\}/g, (_m, k) => esc(merge[k] ?? ""));
  return `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;background:#eef0f2;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f2;padding:18px 0"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
  ${body}
  ${footer}
  </table></td></tr></table></body></html>`;
}

function complianceFooter(fromName: string, address: string, unsubUrl: string): string {
  return `<tr><td style="background:#f6f7f8;padding:14px 16px;text-align:center">
    <div style="font-size:11px;color:#888;line-height:1.6"><b>פרסומת</b> · ${esc(fromName)} · ${esc(address)}</div>
    <div style="font-size:11px;margin-top:3px"><a href="${esc(unsubUrl)}" style="color:#0E9F6E">להסרה מרשימת התפוצה</a></div>
  </td></tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Invalid session" }, 401);

  let body: { campaign?: any; campaignId?: string; testTo?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const admin = createClient(SUPABASE_URL, SERVICE);

  // Load campaign: from DB by id (owner-checked) or inline (build-only test).
  let campaign = body.campaign;
  if (body.campaignId) {
    const { data } = await admin.from("mkt_campaigns").select("*").eq("id", body.campaignId).eq("owner_id", user.id).maybeSingle();
    if (!data) return json({ error: "campaign not found" }, 404);
    campaign = data;
  }
  if (!campaign) return json({ error: "no campaign" }, 400);

  const fromName = campaign.from_name || "סיאנגו";
  const subject = campaign.subject || "(ללא נושא)";
  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");

  const buildHtml = (contact: { name?: string; email: string }) => {
    const unsubUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(contact.email)}`;
    const footer = complianceFooter(fromName, campaign.reply_to || "office@siango.app", unsubUrl);
    return renderEmail(campaign.blocks || [], { "שם": contact.name || "", "שם_העסק": fromName }, footer);
  };

  // Test send.
  if (body.testTo) {
    const res = await sendViaResend({ to: body.testTo, subject: `[בדיקה] ${subject}`, html: buildHtml({ email: body.testTo }), fromName });
    return json({ ok: res.ok, mode: "test", error: res.error });
  }

  // Real send to all active, non-unsubscribed contacts of this owner.
  const { data: contacts } = await admin.from("mkt_contacts")
    .select("id, email, name").eq("owner_id", user.id).eq("status", "active").not("email", "is", null);
  if (!contacts?.length) return json({ ok: true, sent: 0, note: "no active contacts" });

  // Suppress globally-unsubscribed addresses (shared list).
  const { data: unsub } = await admin.from("email_unsubscribes").select("email");
  const blocked = new Set((unsub || []).map((u: any) => String(u.email).toLowerCase()));

  let sent = 0;
  for (const c of contacts) {
    if (!c.email || blocked.has(String(c.email).toLowerCase())) continue;
    const res = await sendViaResend({ to: c.email, subject, html: buildHtml(c), fromName });
    if (res.ok) {
      sent++;
      await admin.from("mkt_campaign_events").insert({ campaign_id: campaign.id ?? null, contact_id: c.id, type: "sent" });
    }
  }
  if (campaign.id) await admin.from("mkt_campaigns").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", campaign.id);
  return json({ ok: true, sent });
});
