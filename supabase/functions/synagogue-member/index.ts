// Member self-service lookup for the shul site: given a published synagogue's slug
// + the member's phone, return that member's OPEN pledges (aliyot/nedarim) so they
// can pay. Low-sensitivity data (name + aliyah + amount), phone-gated. Public
// (verify_jwt = false). Rate-limited to stop enumeration.

import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const clientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "ip";
const normPhone = (p: string) => p.replace(/[^0-9]/g, "").replace(/^972/, "0");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { slug?: string; phone?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const slug = body.slug?.trim();
  const phone = body.phone?.trim();
  if (!slug || !phone || normPhone(phone).length < 9) return json({ error: "slug + phone required" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Throttle by IP to prevent scanning phone numbers.
  if (!(await consumeRateLimit(admin, `shul-member:${clientIp(req)}`, 30, 3600))) return json({ error: "rate_limited" }, 429);

  const { data: biz } = await admin.from("businesses").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (!biz) return json({ error: "not found" }, 404);

  const target = normPhone(phone);
  const { data: pledges } = await admin.from("synagogue_pledges")
    .select("id, member_name, pledge_type, label, amount, status, created_at")
    .eq("business_id", biz.id).eq("status", "open").order("created_at", { ascending: false });

  // Match on normalized phone (stored raw); done in code so formatting differences don't matter.
  const { data: withPhone } = await admin.from("synagogue_pledges")
    .select("id, member_phone").eq("business_id", biz.id).eq("status", "open");
  const mine = new Set((withPhone ?? []).filter((p) => p.member_phone && normPhone(p.member_phone) === target).map((p) => p.id));

  const open = (pledges ?? []).filter((p) => mine.has(p.id));
  return json({
    businessId: biz.id, name: biz.name, slug: biz.slug,
    pledges: open, total: open.reduce((s, p) => s + Number(p.amount), 0),
  });
});
