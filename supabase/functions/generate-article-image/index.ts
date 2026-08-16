import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { consumeRateLimit } from "../_shared/rateLimit.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let userId: string;
    try { userId = await requireAuth(req); } catch (res) { return res as Response; }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await consumeRateLimit(supabase, `articleimg:user:${userId}`, 20, 3600))) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, businessName, businessType } = await req.json();
    if (!title?.trim()) throw new Error("title required");

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("Missing OPENAI_API_KEY");

    const typeContext: Record<string, string> = {
      products: "retail or e-commerce",
      services: "professional services",
      realestate: "real estate",
      nonprofit: "nonprofit or charity",
      synagogue: "community or religious",
      kolel: "education or study",
      vacation: "travel or hospitality",
    };
    const context = typeContext[businessType as string] || "small business";

    const prompt = `Editorial blog header image for an article titled: "${title}".
Style: clean, modern, professional ${context} photography or illustration.
Mood: trustworthy, warm, inviting.
Composition: wide landscape (16:9 feel), suitable as a blog post cover image.
NO text, letters, words, logos, watermarks, or numbers of any kind.
High quality, soft natural lighting, aesthetically pleasing.`;

    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1536x1024",
        quality: "medium",
        n: 1,
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI image error ${resp.status}: ${await resp.text()}`);

    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned from OpenAI");

    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const fileName = `articles/${ts}-${rand}.png`;

    const { error: uploadError } = await supabase.storage
      .from("business-assets")
      .upload(fileName, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) throw new Error("Upload failed: " + uploadError.message);

    const { data: urlData } = supabase.storage.from("business-assets").getPublicUrl(fileName);

    return new Response(JSON.stringify({ imageUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-article-image error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
