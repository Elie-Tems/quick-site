// Receives a client-side error report and emails the admins (Moti + Daniel)
// via Resend, so production problems are noticed immediately. No-ops gracefully
// if RESEND_API_KEY is not set. Callable by anyone (anon key) - it only sends a
// fixed internal alert, never reflects attacker-controlled recipients.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Internal alert recipients (the two admins). Never taken from the request body.
const ALERT_RECIPIENTS = ["moti4384@gmail.com", "furmand713@gmail.com"];

const clip = (v: unknown, n = 4000) => String(v ?? "").slice(0, n);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const message = clip(body.message, 500);
    if (!message) {
      return new Response(JSON.stringify({ ok: false, error: "message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const kind = clip(body.kind, 60) || "error";
    const url = clip(body.url, 500);
    const context = clip(body.context, 500);
    const userAgent = clip(body.userAgent, 300);
    const stack = clip(body.stack, 6000);

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:640px;direction:rtl">
        <h2 style="color:#b91c1c;margin:0 0 12px">🚨 שגיאה ב-Siango (פרודקשן)</h2>
        <table style="font-size:14px;border-collapse:collapse">
          <tr><td style="padding:4px 8px;color:#666">סוג</td><td style="padding:4px 8px">${esc(kind)}</td></tr>
          <tr><td style="padding:4px 8px;color:#666">הודעה</td><td style="padding:4px 8px"><b>${esc(message)}</b></td></tr>
          <tr><td style="padding:4px 8px;color:#666">כתובת</td><td style="padding:4px 8px">${esc(url)}</td></tr>
          <tr><td style="padding:4px 8px;color:#666">הקשר</td><td style="padding:4px 8px">${esc(context)}</td></tr>
          <tr><td style="padding:4px 8px;color:#666">דפדפן</td><td style="padding:4px 8px">${esc(userAgent)}</td></tr>
        </table>
        ${stack ? `<pre style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;direction:ltr;font-size:12px;overflow:auto">${esc(stack)}</pre>` : ""}
        <p style="color:#999;font-size:12px">${new Date().toISOString()}</p>
      </div>`;

    const result = await sendViaResend({
      to: ALERT_RECIPIENTS,
      subject: `🚨 Siango error: ${message.slice(0, 80)}`,
      html,
      fromName: "Siango Alerts",
    });

    return new Response(JSON.stringify(result), {
      status: result.ok || result.skipped ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
