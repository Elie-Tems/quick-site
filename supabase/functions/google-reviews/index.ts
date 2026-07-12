// Google Business reviews add-on. verify_jwt = true (the logged-in merchant).
// Uses ONE Siango Google Maps API key (GOOGLE_MAPS_API_KEY secret) - merchants
// never enter a key; they just pick their business by name. Two actions:
//   - "search":  text query -> candidate businesses (name/address/rating/place_id)
//   - "refresh": fetch the caller's saved place_id details -> cache on the row
// The public storefront reads the cached reviews directly (no per-visitor API call).
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PLACES = "https://places.googleapis.com/v1";

async function searchPlaces(query: string, key: string) {
  const r = await fetch(`${PLACES}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "he", regionCode: "IL" }),
  });
  const data = await r.json();
  const places = Array.isArray(data?.places) ? data.places : [];
  return places.slice(0, 6).map((p: any) => ({
    placeId: p.id,
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    rating: p.rating ?? null,
    total: p.userRatingCount ?? 0,
  }));
}

async function placeDetails(placeId: string, key: string) {
  const r = await fetch(`${PLACES}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,googleMapsUri,reviews",
    },
  });
  const p = await r.json();
  if (!p || p.error) return null;
  return {
    name: p.displayName?.text || "",
    rating: p.rating ?? null,
    total: p.userRatingCount ?? 0,
    mapsUri: p.googleMapsUri || "",
    reviews: (Array.isArray(p.reviews) ? p.reviews : []).slice(0, 6).map((rv: any) => ({
      author: rv.authorAttribution?.displayName || "",
      photo: rv.authorAttribution?.photoUri || "",
      rating: rv.rating ?? null,
      text: rv.text?.text || rv.originalText?.text || "",
      when: rv.relativePublishTimeDescription || "",
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) return json({ ok: true, configured: false });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ ok: false, error: "Invalid session" }, 401);

  let body: { action?: string; query?: string; placeId?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  // Configuration probe (no paid gate): lets the dashboard check whether the
  // Google key is set BEFORE letting a merchant pay for the reviews add-on, so
  // nobody is charged for a feature that can't deliver. If the key were missing
  // we'd already have returned configured:false above.
  if (body.action === "status") return json({ ok: true, configured: true });

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: biz } = await admin
    .from("businesses")
    .select("id, reviews_paid, google_place_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!biz) return json({ ok: false, error: "No business" }, 404);
  if (!(biz as any).reviews_paid) return json({ ok: false, error: "not_paid" }, 402);

  // Cost guard: the search/refresh actions hit the paid Google Places API, so cap
  // them per merchant to prevent a paid account from burning the shared quota.
  if (body.action === "search" || body.action === "refresh") {
    if (!(await consumeRateLimit(admin, `greviews:${user.id}`, 60, 3600))) {
      return json({ ok: false, error: "rate_limited" }, 429);
    }
  }

  try {
    if (body.action === "search") {
      const q = (body.query || "").trim();
      if (!q) return json({ ok: false, error: "empty_query" }, 400);
      return json({ ok: true, configured: true, results: await searchPlaces(q, key) });
    }

    if (body.action === "refresh") {
      const placeId = (body.placeId || (biz as any).google_place_id || "").trim();
      if (!placeId) return json({ ok: false, error: "no_place" }, 400);
      const details = await placeDetails(placeId, key);
      if (!details) return json({ ok: false, error: "place_not_found" }, 404);
      const cache = { rating: details.rating, total: details.total, mapsUri: details.mapsUri, reviews: details.reviews };
      await admin
        .from("businesses")
        .update({
          google_place_id: placeId,
          google_business_name: details.name,
          google_reviews_cache: cache,
          google_reviews_cached_at: new Date().toISOString(),
        } as any)
        .eq("id", (biz as any).id);
      return json({ ok: true, configured: true, business_name: details.name, cache });
    }

    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "error" }, 502);
  }
});
