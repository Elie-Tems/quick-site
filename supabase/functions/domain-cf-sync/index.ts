// Daily cron: keeps Cloudflare custom-hostname connection state in sync so a
// merchant's purchased domain never needs a manual "connect" step.
//
// 1. Retries cfAddCustomHostname for any active domain that never got a
//    hostname_id (register.ts's best-effort call failed, or the Cloudflare
//    secrets weren't set yet when it registered).
// 2. Polls cfGetCustomHostnameStatus for any domain still short of
//    ssl_status='active' and records the latest state.
// 3. Alerts the admins once as the account approaches Cloudflare's 100 free
//    custom-hostname threshold (dedup via system_alerts_sent).
//
// Cron-only (optional CRON_SECRET). verify_jwt=false in config.toml. Entirely
// dormant (no-op) until CLOUDFLARE_API_TOKEN/CLOUDFLARE_ZONE_ID are set -
// cfAddCustomHostname/cfGetCustomHostnameStatus return configured:false.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { cfAddCustomHostname, cfGetCustomHostnameStatus } from "../_shared/domains/cloudflare.ts";

const ADMIN_EMAILS = ["moti4384@gmail.com", "furmand713@gmail.com"];
const FREE_HOSTNAME_LIMIT = 100;
const ALERT_THRESHOLDS = [80, 90, 95, 99, 100];

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && !safeEqual(req.headers.get("x-cron-secret") ?? "", cronSecret)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const nowIso = new Date().toISOString();
  let connected = 0, polled = 0, becameActive = 0;

  // 1. Retry: active domains that never got a Cloudflare hostname registered.
  const { data: missing } = await admin.from("domains")
    .select("id, domain").eq("status", "active").is("cf_hostname_id", null).limit(100);
  for (const d of (missing ?? []) as { id: string; domain: string }[]) {
    const res = await cfAddCustomHostname(d.domain);
    if (!res.configured) break; // not set up yet - stop, nothing else will work either
    if (res.ok && res.data) {
      await admin.from("domains").update({
        cf_hostname_id: res.data.id, cf_ssl_status: res.data.sslStatus, cf_checked_at: nowIso,
      }).eq("id", d.id);
      connected++;
    }
  }

  // 2. Poll SSL status for hostnames not yet active.
  const { data: pending } = await admin.from("domains")
    .select("id, domain, cf_ssl_status").not("cf_hostname_id", "is", null)
    .neq("cf_ssl_status", "active").limit(200);
  for (const d of (pending ?? []) as { id: string; domain: string; cf_ssl_status: string | null }[]) {
    const res = await cfGetCustomHostnameStatus(d.domain);
    if (!res.configured) break;
    polled++;
    if (res.ok && res.data) {
      if (res.data.sslStatus === "active" && d.cf_ssl_status !== "active") becameActive++;
      await admin.from("domains").update({ cf_ssl_status: res.data.sslStatus, cf_checked_at: nowIso }).eq("id", d.id);
    }
  }

  // 3. Approaching-limit alert (counts hostnames actually registered with Cloudflare).
  const { count } = await admin.from("domains").select("id", { count: "exact", head: true }).not("cf_hostname_id", "is", null);
  const total = count ?? 0;
  const crossed = ALERT_THRESHOLDS.filter((t) => total >= t);
  const highestCrossed = crossed.length ? crossed[crossed.length - 1] : null;
  if (highestCrossed) {
    const alertKey = `cf-hostname-threshold-${highestCrossed}`;
    const { data: already } = await admin.from("system_alerts_sent").select("key").eq("key", alertKey).maybeSingle();
    if (!already) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#ea580c">מתקרבים למכסת הדומיינים החינמית ב-Cloudflare</h2>
          <p style="font-size:15px;line-height:1.7">יש כרגע <b>${total}</b> דומיינים מחוברים דרך Cloudflare for SaaS, מתוך ${FREE_HOSTNAME_LIMIT} החינמיים. מעבר לזה, Cloudflare גובה $0.10 לדומיין בחודש.</p>
          <p style="font-size:13px;color:#999">התראה אוטומטית - נשלחת פעם אחת לכל סף (80/90/95/99/100).</p>
        </div>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: "Siango <billing@send.siango.app>", to: ADMIN_EMAILS, subject: `⚠️ ${total}/${FREE_HOSTNAME_LIMIT} דומיינים מחוברים ב-Cloudflare`, html }),
        }).catch((e) => console.warn("cf threshold alert email failed:", e));
      }
      await admin.from("system_alerts_sent").insert({ key: alertKey }).select().maybeSingle();
    }
  }

  console.log(`domain-cf-sync: connected ${connected}, polled ${polled}, becameActive ${becameActive}, totalHostnames ${total}`);
  return new Response(JSON.stringify({ ok: true, connected, polled, becameActive, totalHostnames: total }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
