// Manage a workspace's email automations (opt-in). GET returns the owner's
// automations (seeding the standard set on first call); POST {type, enabled}
// toggles one. Owner-scoped via the user's JWT + RLS. The trigger EXECUTION
// (welcome / drip / abandoned cart) is handled by separate runner functions;
// this is the merchant's on/off control.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STANDARD: { type: string; label: string; desc: string }[] = [
  { type: "welcome", label: "ברכת הצטרפות", desc: "מייל אוטומטי לאיש קשר חדש" },
  { type: "abandoned_cart", label: "שחזור עגלה נטושה", desc: "תזכורת אחרי שעה + 24 שעות" },
  { type: "birthday", label: "יום הולדת", desc: "הטבה אוטומטית ביום ההולדת" },
  { type: "drip", label: "רצף onboarding (drip)", desc: "סדרת מיילים על פני שבוע" },
  { type: "review", label: "בקשת ביקורת אחרי קנייה", desc: "מייל 3 ימים אחרי משלוח" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: "Invalid session" }, 401);

  if (req.method === "GET") {
    const { data: rows } = await client.from("mkt_automations").select("type, enabled").eq("owner_id", user.id);
    const map = new Map((rows || []).map((r: any) => [r.type, r.enabled]));
    // Seed any missing standard automations (disabled by default).
    const missing = STANDARD.filter((s) => !map.has(s.type)).map((s) => ({ owner_id: user.id, type: s.type, enabled: false }));
    if (missing.length) await client.from("mkt_automations").insert(missing);
    return json({ automations: STANDARD.map((s) => ({ ...s, enabled: map.get(s.type) ?? false })) });
  }

  if (req.method === "POST") {
    let body: { type?: string; enabled?: boolean };
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    if (!body.type || typeof body.enabled !== "boolean") return json({ error: "type + enabled required" }, 400);
    const { error } = await client.from("mkt_automations")
      .upsert({ owner_id: user.id, type: body.type, enabled: body.enabled }, { onConflict: "owner_id,type" } as any);
    if (error) {
      // Fallback if no unique constraint: update-or-insert manually.
      await client.from("mkt_automations").update({ enabled: body.enabled }).eq("owner_id", user.id).eq("type", body.type);
    }
    return json({ ok: true });
  }

  return json({ error: "method" }, 405);
});
