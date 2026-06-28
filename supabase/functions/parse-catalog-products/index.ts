import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

    if (url && !text) {
      const res = await fetch(url as string, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; CatalogBot/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      sourceText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
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
              'You are a product data extractor. Extract product listings from the given text. Return ONLY a JSON object with a "products" array. Each product: { "name": string (required), "price": number (required, in ILS if not specified), "description": string (optional, 1 sentence max) }. If price is unclear, omit the product. Return at most 100 products.',
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
    const products = Array.isArray(parsed.products) ? parsed.products : [];

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
