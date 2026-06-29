// Cron: abandoned-cart reminders. Service-role, CRON_SECRET-guarded. For carts
// older than 1h that aren't recovered/reminded: mark recovered if a matching
// order arrived; otherwise send a reminder ONLY IF (a) the owner enabled the
// abandoned_cart automation AND (b) the email is an active, consenting contact
// AND (c) not globally unsubscribed (Israeli spam law - opt-in only).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";

const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h

  const { data: carts } = await admin.from("mkt_abandoned_carts").select("*")
    .eq("recovered", false).is("reminded_at", null).lt("created_at", cutoff).limit(50);
  if (!carts?.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { "Content-Type": "application/json" } });

  let sent = 0;
  for (const cart of carts) {
    // Recovered? a matching order after the cart was created.
    const { data: order } = await admin.from("orders").select("id")
      .eq("business_id", cart.business_id).eq("customer_email", cart.email)
      .gte("created_at", cart.created_at).neq("status", "cancelled").limit(1).maybeSingle();
    if (order) { await admin.from("mkt_abandoned_carts").update({ recovered: true }).eq("id", cart.id); continue; }

    // Compliance gates: automation enabled + consenting active contact + not unsubscribed.
    const { data: auto } = await admin.from("mkt_automations").select("enabled").eq("owner_id", cart.owner_id).eq("type", "abandoned_cart").maybeSingle();
    if (!auto?.enabled) continue;
    const { data: contact } = await admin.from("mkt_contacts").select("id").eq("owner_id", cart.owner_id).eq("email", cart.email).eq("status", "active").maybeSingle();
    if (!contact) continue;
    const { data: unsub } = await admin.from("email_unsubscribes").select("email").eq("email", cart.email).maybeSingle();
    if (unsub) continue;

    const { data: biz } = await admin.from("businesses").select("name, slug").eq("id", cart.business_id).single();
    const storeUrl = `${siteUrl}/store/${biz?.slug || ""}`;
    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;background:#eef0f2;font-family:Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f2;padding:18px 0"><tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
        <tr><td style="background:#0E9F6E;color:#fff;padding:24px 16px;text-align:center;font-weight:700;font-size:18px">${esc(biz?.name || "")}</td></tr>
        <tr><td style="padding:18px;color:#333;font-size:15px;line-height:1.7">שכחת משהו בעגלה? 🛒<br/>הפריטים שבחרת עדיין ממתינים לך. <a href="${esc(storeUrl)}" style="color:#0E9F6E">חזרה להשלמת ההזמנה</a></td></tr>
        <tr><td style="background:#f6f7f8;padding:14px 16px;text-align:center"><div style="font-size:11px;color:#888"><b>פרסומת</b> · ${esc(biz?.name || "")}</div><div style="font-size:11px;margin-top:3px"><a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(cart.email)}" style="color:#0E9F6E">להסרה מרשימת התפוצה</a></div></td></tr>
      </table></td></tr></table></body></html>`;
    const res = await sendViaResend({ to: cart.email, subject: `שכחת פריטים בעגלה - ${biz?.name || ""}`, html, fromName: biz?.name || "סיאנגו" });
    await admin.from("mkt_abandoned_carts").update({ reminded_at: new Date().toISOString() }).eq("id", cart.id);
    if (res.ok) sent++;
  }
  return new Response(JSON.stringify({ ok: true, sent }), { headers: { "Content-Type": "application/json" } });
});
