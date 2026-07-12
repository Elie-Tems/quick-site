// Live data for a synagogue's display screen + storefront: the gabbai's fixed
// prayer times + sponsor + announcements, PLUS today's halachic zmanim and the
// Hebrew date, computed live from the free Hebcal API (same source the existing
// shabbat-status function uses). Public (verify_jwt = false) - reads only
// non-sensitive info. Returns HH:MM strings ready to render.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } });

// Default location: Jerusalem (most shuls are in Israel; overridden by settings).
const DEFAULT_LAT = 31.778, DEFAULT_LON = 35.235;
const hhmm = (iso?: string): string | null => (iso && iso.length >= 16 ? iso.slice(11, 16) : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = new URL(req.url);
  let slug = url.searchParams.get("slug");
  let businessId = url.searchParams.get("businessId");
  if (!slug && !businessId && req.method === "POST") {
    try { const b = await req.json(); slug = b?.slug ?? null; businessId = b?.businessId ?? null; } catch { /* ignore */ }
  }
  if (!slug && !businessId) return json({ error: "slug or businessId required" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let q = admin.from("businesses").select("id, name, slug").limit(1);
  q = businessId ? q.eq("id", businessId) : q.eq("slug", slug);
  const { data: biz } = await q.maybeSingle();
  if (!biz) return json({ error: "not found" }, 404);

  const { data: s } = await admin.from("synagogue_settings").select("*").eq("business_id", biz.id).maybeSingle();
  const lat = Number(s?.latitude) || DEFAULT_LAT;
  const lon = Number(s?.longitude) || DEFAULT_LON;

  const now = new Date();
  const gy = now.getFullYear(), gm = now.getMonth() + 1, gd = now.getDate();
  const dateStr = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;

  // Zmanim + Hebrew date from Hebcal (best-effort; the screen still renders without).
  let zmanim: Record<string, string | null> = {};
  let hebrewDate: string | null = null;
  let parsha: string | null = null;
  try {
    const zRes = await fetch(`https://www.hebcal.com/zmanim?cfg=json&latitude=${lat}&longitude=${lon}&date=${dateStr}`);
    if (zRes.ok) {
      const t = (await zRes.json())?.times ?? {};
      zmanim = {
        alotHaShachar: hhmm(t.alotHaShachar),
        sunrise: hhmm(t.sunrise),
        sofZmanShma: hhmm(t.sofZmanShma),
        sofZmanTfilla: hhmm(t.sofZmanTfilla),
        chatzot: hhmm(t.chatzot),
        minchaGedola: hhmm(t.minchaGedola),
        plagHaMincha: hhmm(t.plagHaMincha),
        sunset: hhmm(t.sunset),
        tzeit: hhmm(t.tzeit85deg ?? t.tzeit7083deg ?? t.tzeit42min),
      };
    }
  } catch (_e) { /* ignore - screen degrades gracefully */ }
  try {
    const hRes = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${gy}&gm=${gm}&gd=${gd}&g2h=1&strict=1`);
    if (hRes.ok) { const h = await hRes.json(); hebrewDate = h?.hebrew ?? null; parsha = (h?.events ?? []).find((e: string) => e?.startsWith("Parashat")) ?? null; }
  } catch (_e) { /* ignore */ }

  return json({
    name: biz.name,
    slug: biz.slug,
    city: s?.city ?? null,
    nusach: s?.nusach ?? null,
    hebrewDate,
    parsha,
    zmanim,
    prayerTimes: s?.prayer_times ?? {},
    parnas: s?.parnas ?? null,
    announcements: s?.announcements ?? null,
  });
});
