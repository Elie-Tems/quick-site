// Public: record/refresh an abandoned-cart candidate when a storefront visitor
// reaches checkout (email entered) but hasn't completed the order. The
// email-abandoned-run cron later sends a reminder (only to consenting contacts).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { businessId?: string; email?: string; name?: string; items?: unknown; total?: number };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const email = (body.email || "").trim().toLowerCase();
  if (!body.businessId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: biz } = await admin.from("businesses").select("id, user_id").eq("id", body.businessId).single();
  if (!biz?.user_id) return json({ error: "store not found" }, 404);

  await admin.from("mkt_abandoned_carts").upsert({
    owner_id: biz.user_id, business_id: biz.id, email, name: (body.name || "").trim() || null,
    items: body.items ?? [], total: typeof body.total === "number" ? body.total : null,
    recovered: false, updated_at: new Date().toISOString(),
  }, { onConflict: "business_id,email" });

  return json({ ok: true });
});
