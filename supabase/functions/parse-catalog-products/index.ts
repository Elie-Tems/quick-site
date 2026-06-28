import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { safeFetch } from "../_shared/ssrfGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text, url } = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("Missing OPENAI_API_KEY");

    let sourceText = text as string;
    const imageMarkers = new Set<string>(); // absolute image URLs seen on the page

    if (url && !text) {
      let res: Response;
      try {
        // safeFetch blocks SSRF (internal/loopback/metadata hosts) and re-checks redirects.
        res = await safeFetch(url as string, {
          // Real browser UA - many sites block obvious bot user-agents.
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "he,en;q=0.9",
          },
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        return new Response(
          JSON.stringify({ error: "unreachable", products: [], message: "לא הצלחנו לגשת לאתר. נסו קובץ או הוספה ידנית." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `http_${res.status}`, products: [], message: "האתר חסם את הקריאה. נסו קובץ או הוספה ידנית." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const html = await res.text();
      const pageUrl = url as string;
      const toAbs = (src: string): string | null => {
        try { return new URL(src, pageUrl).href; } catch { return null; }
      };
      // Replace each <img> with an inline [IMG:absolute-url] marker BEFORE
      // stripping tags, so the image sits next to the product it belongs to and
      // GPT can associate them. Skip data URIs, logos/icons/sprites/svg.
      const withImgMarkers = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<img\b[^>]*>/gi, (tag) => {
          const m = tag.match(/\b(?:data-src|data-original|data-lazy-src|data-lazy|src)\s*=\s*["']([^"']+)["']/i);
          if (!m) return " ";
          const abs = toAbs(m[1]);
          if (!abs || abs.startsWith("data:")) return " ";
          if (/sprite|logo|icon|favicon|placeholder|blank|spacer|loading|1x1|\.svg(\?|$)/i.test(abs)) return " ";
          imageMarkers.add(abs);
          return ` [IMG:${abs}] `;
        });
      sourceText = withImgMarkers
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 12000);
    }

    if (!sourceText || sourceText.trim().length < 10) {
      return new Response(JSON.stringify({ products: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'You are a product data extractor. Extract product listings from the given text (it may be jumbled from a PDF, especially Hebrew/RTL). The text may contain image markers like [IMG:https://...] positioned right next to the product they belong to. Return ONLY a JSON object with a "products" array. Each product: { "name": string (required), "price": number (required, in ILS if not specified), "description": string (optional, 1 sentence max), "image": string (optional - copy the full https URL from the [IMG:...] marker that is nearest to / belongs to this product; omit if unsure) }. PRICE RULES: the price is a plausible retail amount, usually next to ₪ / ש"ח / "שקל" or a decimal like 12.90. DO NOT treat catalog item codes, SKUs, barcodes (long digit runs), phone numbers, years, quantities, weights, or page numbers as the price. If you cannot confidently identify a real price for a product, OMIT that product entirely rather than guessing. Return at most 100 products.',
          },
          {
            role: "user",
            content: `Extract products from this catalog text:\n\n${sourceText}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      }),
    });

    const gptData = await response.json();
    const content = gptData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty GPT response");

    const parsed = JSON.parse(content);
    const rawProducts = Array.isArray(parsed.products) ? parsed.products : [];
    // Only trust an image if GPT actually copied one of the URLs we saw on the
    // page (guards against hallucinated/edited URLs).
    const products = rawProducts.map((p: any) => {
      const img = typeof p.image === "string" ? p.image.trim() : "";
      return imageMarkers.has(img) ? p : { ...p, image: undefined };
    });

    return new Response(JSON.stringify({ products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("parse-catalog-products error:", e);
    return new Response(JSON.stringify({ error: e.message, products: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
