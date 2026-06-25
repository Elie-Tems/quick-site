// Domain availability + pricing search for the Siango Domain Marketplace.
// Provider-agnostic by design: today it talks to Openprovider; swapping to
// OpenSRS/Cloudflare later means only replacing the `checkOpenprovider` impl.
//
// Auth: Openprovider's API uses the account username + password to mint a token
// (stored as Supabase secrets OPENPROVIDER_USERNAME / OPENPROVIDER_PASSWORD).
// Pricing: we show the reseller cost AND a suggested customer price (markup),
// so the merchant always sees a profitable price. Tune MARKUP / USD_TO_ILS.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OP_BASE = "https://api.openprovider.eu/v1beta";
// Extensions we offer first (Israel-focused). .co.il first - most merchants want it.
const EXTENSIONS = ["co.il", "com", "co", "net", "online", "shop"];

async function openproviderToken(): Promise<string> {
  const username = Deno.env.get("OPENPROVIDER_USERNAME");
  const password = Deno.env.get("OPENPROVIDER_PASSWORD");
  if (!username || !password) {
    throw new Error("OPENPROVIDER credentials not set");
  }
  const res = await fetch(`${OP_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const j = await res.json().catch(() => ({}));
  const token = j?.data?.token;
  if (!token) throw new Error(`Openprovider auth failed: ${j?.desc || res.status}`);
  return token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    const name = String(query || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").split(".")[0];
    if (!name || !/^[a-z0-9-]{1,63}$/.test(name)) {
      return new Response(JSON.stringify({ ok: false, error: "שם דומיין לא תקין" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await openproviderToken();

    const res = await fetch(`${OP_BASE}/domains/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        domains: EXTENSIONS.map((ext) => ({ name, extension: ext })),
        with_price: true,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Openprovider check failed: ${j?.desc || res.status}`);
    }

    // Admin-managed pricing (margin % + coupon %), read server-side.
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await sb
      .from("domain_settings")
      .select("margin_percent, coupon_percent, usd_to_ils")
      .eq("id", 1)
      .maybeSingle();
    const margin = Number(cfg?.margin_percent ?? 100);
    const coupon = Number(cfg?.coupon_percent ?? 15);
    const usdToIls = Number(cfg?.usd_to_ils ?? 3.7);
    const maxPrice = Number(cfg?.max_price_ils ?? 135);

    const rows = (j?.data?.results || []) as Array<{
      domain?: string;
      status?: string;
      price?: { reseller?: { price?: number; currency?: string } } | number;
    }>;

    const results = rows.map((r) => {
      const domain = r.domain || "";
      const available = r.status === "free";
      // Openprovider returns nested reseller price; fall back gracefully.
      const costUsd =
        typeof r.price === "number"
          ? r.price
          : r.price?.reseller?.price ?? null;
      // List price = cost x FX x (1+margin); customer price = list x (1-coupon). Rounded to ₪5.
      const costIls = costUsd != null ? costUsd * usdToIls : null;
      const listIls = costUsd != null ? Math.ceil((costUsd * usdToIls * (1 + margin / 100)) / 5) * 5 : null;
      let customerIls = listIls != null ? Math.ceil((listIls * (1 - coupon / 100)) / 5) * 5 : null;
      // Cap at max_price_ils, but never below cost +10% (don't sell at a loss - matters for pricey TLDs like .co.il).
      if (customerIls != null && costIls != null) {
        const floor = Math.ceil((costIls * 1.1) / 5) * 5;
        customerIls = Math.max(Math.min(customerIls, maxPrice), floor);
      }
      return { domain, available, costUsd, listIls, customerIls };
    });

    return new Response(JSON.stringify({ ok: true, query: name, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
