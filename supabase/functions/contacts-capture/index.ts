// Public: capture a lead from a storefront form (real-estate/car "contact agent",
// nonprofit interest, etc.) into the CRM. Creates/updates the contact and drops a
// card into the business's default pipeline (first stage). No direct anon table
// writes - this service-role function is the only path, rate-limited like
// orders-create. verify_jwt = false.
//
// The lead gets an auto-acknowledgement via the merchant-editable "lead_reply"
// lifecycle email (can be disabled/reworded in the dashboard).

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendLifecycleEmail } from "../_shared/email/lifecycle.ts";
import { sendViaResend } from "../_shared/email/resend.ts";
import { consumeRateLimit } from "../_shared/rateLimit.ts";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Unspoofable client IP (Cloudflare-populated); fall back to the last proxy hop.
const clientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "ip";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ReqBody {
  businessId: string;
  name: string; phone: string; email?: string;
  message?: string;
  title?: string;          // "דירת 4 חד' ברמת גן" / "מאזדה 3 2021"
  value?: number;          // asking price of the item of interest
  details?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { businessId, name, phone, email, message, title, value, details } = body;
  if (!businessId || !name?.trim() || !phone?.trim()) {
    return json({ error: "businessId, name and phone are required" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Lead-spam guard 1: per-IP cap. The phone-based check below is bypassable by
  // rotating the phone value, so also throttle by (unspoofable) client IP to stop
  // mass CRM pollution / lead_reply email amplification against a known business.
  if (!(await consumeRateLimit(admin, `lead:ip:${clientIp(req)}`, 20, 3600))) {
    return json({ error: "rate_limited" }, 429);
  }

  // Only accept leads for a real business (avoids polluting the CRM of arbitrary
  // UUIDs and sending lead_reply mail on behalf of a non-existent store).
  const { data: bizRow } = await admin.from("businesses").select("id, business_type, name, email, phone").eq("id", businessId).maybeSingle();
  if (!bizRow) return json({ error: "store not found" }, 404);

  // Lead-spam guard 2: cap rapid repeat leads from the same phone per business.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin.from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId).eq("phone", phone).gte("created_at", since);
  if ((count ?? 0) > 3) return json({ error: "rate_limited" }, 429);

  const dedup = (email || phone || name).trim().toLowerCase();

  const { data: contact, error: cErr } = await admin.from("contacts")
    .upsert({ business_id: businessId, name, phone, email: email || null, source: "lead_form", dedup_key: dedup },
      { onConflict: "business_id,dedup_key" })
    .select("id").single();
  if (cErr) return json({ error: "Could not save contact", detail: cErr.message }, 500);

  // Interaction log entry.
  await admin.from("interactions").insert({
    business_id: businessId, contact_id: contact.id, kind: "note",
    body: message || `פנייה${title ? ` לגבי ${title}` : ""}`, meta: details ?? {},
  });

  // Drop into the default pipeline (create one lazily if missing).
  let { data: pipes } = await admin.from("pipelines")
    .select("id, stages").eq("business_id", businessId)
    .order("is_default", { ascending: false }).limit(1);
  let pipeline = pipes?.[0];

  if (!pipeline) {
    const defaultStages = [
      { key: "new",         label: "חדש" },
      { key: "in_progress", label: "בטיפול" },
      { key: "closed",      label: "סגור" },
    ];
    // vertical is NOT NULL - omitting it makes the insert fail and the lead never
    // reaches the board. Derive it from the business type.
    const { data: created, error: pErr } = await admin.from("pipelines")
      .insert({ business_id: businessId, vertical: bizRow.business_type || "lead", name: "לידים", stages: defaultStages, is_default: true })
      .select("id, stages").single();
    if (pErr) console.warn("default pipeline create failed:", businessId, pErr.message);
    pipeline = created ?? null;
  }

  if (pipeline) {
    const stages = (pipeline.stages as { key: string }[]) ?? [];
    const firstStage = stages[0]?.key ?? "new";
    await admin.from("pipeline_cards").insert({
      business_id: businessId, pipeline_id: pipeline.id, contact_id: contact.id,
      stage_key: firstStage, title: title || name, value: value ?? null, details: details ?? {},
    });
  }

  // Notify the MERCHANT that a lead came in (best-effort). Without this the merchant
  // only sees the lead if they happen to open the board, so a time-sensitive lead is missed.
  if (bizRow.email) {
    try {
      const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
      const rows = [
        ["שם", name], ["טלפון", phone], email ? ["אימייל", email] : null,
        title ? ["מתעניין ב", title] : null, message ? ["הודעה", message] : null,
      ].filter(Boolean).map((r) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc((r as string[])[0])}</td><td style="padding:4px 0;font-weight:600">${esc((r as string[])[1])}</td></tr>`).join("");
      await sendViaResend({
        to: bizRow.email,
        subject: `ליד חדש מהאתר${title ? ` - ${title}` : ""} 📥`,
        fromName: bizRow.name || "Siango",
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#111"><h2 style="margin:0 0 10px">קיבלת ליד חדש מהאתר</h2><table style="border-collapse:collapse">${rows}</table><p style="margin-top:16px"><a href="${siteUrl}/dashboard" style="color:#0b8f6a;font-weight:600">לצפייה וניהול בלוח הלידים ←</a></p></div>`,
      });
    } catch (e) { console.warn("merchant lead notify failed:", contact.id, String(e)); }
  }

  // Auto-acknowledge the lead by email (best-effort; only if they left one).
  if (email?.trim()) {
    try {
      await sendLifecycleEmail(admin, {
        businessId, key: "lead_reply", to: email.trim(), name,
        vars: { title: title || "" },
      });
    } catch (e) { console.warn("lead reply email failed:", contact.id, String(e)); }
  }

  return json({ ok: true, contactId: contact.id });
});
