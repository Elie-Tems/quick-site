// Public: capture a lead from a storefront form (real-estate/car "contact agent",
// nonprofit interest, etc.) into the CRM. Creates/updates the contact and drops a
// card into the business's default pipeline (first stage). No direct anon table
// writes - this service-role function is the only path, rate-limited like
// orders-create. verify_jwt = false.
//
// Merchant "new lead" notification email is deferred until the vertical emails
// are approved.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
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

  // Lead-spam guard: cap rapid repeat leads from the same phone per business.
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

  // Drop into the default pipeline (first stage), if the business has one.
  const { data: pipes } = await admin.from("pipelines")
    .select("id, stages").eq("business_id", businessId)
    .order("is_default", { ascending: false }).limit(1);
  const pipeline = pipes?.[0];
  if (pipeline) {
    const stages = (pipeline.stages as { key: string }[]) ?? [];
    const firstStage = stages[0]?.key ?? "new";
    await admin.from("pipeline_cards").insert({
      business_id: businessId, pipeline_id: pipeline.id, contact_id: contact.id,
      stage_key: firstStage, title: title || name, value: value ?? null, details: details ?? {},
    });
  }

  return json({ ok: true, contactId: contact.id });
});
