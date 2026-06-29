// Public newsletter signup from a storefront. Adds the visitor to the store
// owner's mkt_contacts (explicit opt-in -> consent recorded), and if the owner
// enabled the "welcome" automation, sends a welcome email (compliant: the person
// just opted in). verify_jwt=false (public). Basic abuse guards: email shape +
// dedup. Rate-limiting is a follow-up.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { businessId?: string; email?: string; name?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const email = (body.email || "").trim().toLowerCase();
  if (!body.businessId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: biz } = await admin.from("businesses").select("id, user_id, name, slug").eq("id", body.businessId).single();
  if (!biz?.user_id) return json({ error: "store not found" }, 404);

  // Already unsubscribed globally? respect it.
  const { data: unsub } = await admin.from("email_unsubscribes").select("email").eq("email", email).maybeSingle();
  if (unsub) return json({ ok: true, note: "previously unsubscribed" });

  const now = new Date().toISOString();
  await admin.from("mkt_contacts").upsert({
    owner_id: biz.user_id, business_id: biz.id, email, name: (body.name || "").trim() || null,
    status: "active", source: "form", consent_at: now,
  }, { onConflict: "owner_id,email", ignoreDuplicates: false });

  // Welcome automation (opt-in by the merchant).
  const { data: welcome } = await admin.from("mkt_automations")
    .select("enabled").eq("owner_id", biz.user_id).eq("type", "welcome").maybeSingle();

  if (welcome?.enabled) {
    const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
    const storeUrl = `${siteUrl}/store/${biz.slug}`;
    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;background:#eef0f2;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f2;padding:18px 0"><tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
        <tr><td style="background:#0E9F6E;color:#fff;padding:26px 16px;text-align:center;font-weight:700;font-size:20px">${esc(biz.name || "")}</td></tr>
        <tr><td style="padding:18px 18px;color:#333;font-size:15px;line-height:1.7">תודה שנרשמת לעדכונים שלנו! 🎉<br/>נעדכן אותך במבצעים ובחדשות. <a href="${esc(storeUrl)}" style="color:#0E9F6E">לחנות שלנו</a></td></tr>
        <tr><td style="background:#f6f7f8;padding:14px 16px;text-align:center"><div style="font-size:11px;color:#888"><b>פרסומת</b> · ${esc(biz.name || "")}</div><div style="font-size:11px;margin-top:3px"><a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#0E9F6E">להסרה מרשימת התפוצה</a></div></td></tr>
      </table></td></tr></table></body></html>`;
    await sendViaResend({ to: email, subject: `ברוכים הבאים ל${biz.name || "חנות"}`, html, fromName: biz.name || "סיאנגו" });
  }

  return json({ ok: true });
});
