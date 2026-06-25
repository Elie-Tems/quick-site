// Uptime monitor: pings the public site and emails the admins when it goes
// DOWN (and again when it RECOVERS). Emails only on state CHANGE - never spams.
// Meant to be called every few minutes by pg_cron. State is one row in
// public.system_status. No-ops the email gracefully if RESEND_API_KEY is unset.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_RECIPIENTS = ["moti4384@gmail.com", "furmand713@gmail.com"];
const SITE_URL = "https://siango.app/";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Probe the site (HEAD-like GET, short timeout).
  let isUp = false;
  let detail = "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(SITE_URL, { signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    isUp = res.ok; // 2xx
    detail = `HTTP ${res.status}`;
  } catch (e) {
    isUp = false;
    detail = e instanceof Error ? e.message : "fetch failed";
  }

  const now = new Date().toISOString();

  // Read previous state.
  const { data: prev } = await supabase
    .from("system_status")
    .select("is_up")
    .eq("id", 1)
    .maybeSingle();
  const wasUp = prev?.is_up ?? true;

  // Email only when the state flips.
  let emailed = false;
  if (wasUp && !isUp) {
    await sendViaResend({
      to: ALERT_RECIPIENTS,
      subject: "🔴 siango.app נפל - האתר לא זמין",
      html: `<div dir="rtl" style="font-family:system-ui,Arial"><h2 style="color:#b91c1c">🔴 האתר לא זמין</h2><p>בדיקת הזמינות נכשלה: <b>${detail}</b></p><p>${now}</p><p>נבדק שוב אוטומטית בעוד כמה דקות.</p></div>`,
      fromName: "Siango Alerts",
    });
    emailed = true;
  } else if (!wasUp && isUp) {
    await sendViaResend({
      to: ALERT_RECIPIENTS,
      subject: "✅ siango.app חזר לפעול",
      html: `<div dir="rtl" style="font-family:system-ui,Arial"><h2 style="color:#16a34a">✅ האתר חזר לאוויר</h2><p>הזמינות שוחזרה (${detail}).</p><p>${now}</p></div>`,
      fromName: "Siango Alerts",
    });
    emailed = true;
  }

  // Persist current state.
  await supabase
    .from("system_status")
    .upsert({ id: 1, is_up: isUp, last_checked: now, ...(wasUp !== isUp ? { last_changed: now } : {}) });

  return new Response(JSON.stringify({ ok: true, isUp, detail, emailed }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
