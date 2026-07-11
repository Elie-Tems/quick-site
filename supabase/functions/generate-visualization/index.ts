import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_IMAGE_MODEL = "gpt-image-1";

const STYLE_PROMPTS: Record<string, string> = {
  modern:        "contemporary minimalist architecture, clean lines, floor-to-ceiling glass, flat roof, white and grey concrete, high-end real estate render",
  mediterranean: "Mediterranean architecture, terracotta roof tiles, arched windows, warm stone facade, lush greenery, warm sunlight",
  classic:       "classic elegant architecture, symmetrical facade, ornate detailing, stone columns, timeless luxury residential building",
  industrial:    "industrial loft architecture, exposed concrete, large steel-framed windows, raw materials, urban aesthetic",
  luxury:        "ultra-luxury real estate, premium materials, dramatic lighting, landscaped surroundings, architectural masterpiece",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      businessId,
      type = "exterior",      // "exterior" | "interior"
      style = "modern",       // key from STYLE_PROMPTS
      brief = "",             // free text from user
      referenceImageBase64,   // optional base64 PNG/JPG
      referenceImageMime = "image/jpeg",
    } = body;

    if (!businessId) throw new Error("businessId required");

    const viewLabel = type === "interior" ? "interior architectural visualization" : "exterior architectural visualization";
    const styleDesc = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.modern;
    const prompt = [
      `Photorealistic ${viewLabel}.`,
      styleDesc,
      brief ? `Project details: ${brief}` : "",
      "Professional real estate marketing render, high resolution, daylight, ultra-realistic.",
      "No people, no text overlays.",
    ].filter(Boolean).join(" ");

    let imageB64: string;

    if (referenceImageBase64) {
      // img2img: reference drawing → realistic render
      const binaryStr = atob(referenceImageBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const form = new FormData();
      form.append("model", OPENAI_IMAGE_MODEL);
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", "1536x1024");
      form.append("quality", "high");
      form.append("response_format", "b64_json");
      form.append("image", new Blob([bytes], { type: referenceImageMime }), "reference.jpg");

      const resp = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error?.message ?? "OpenAI edits error");
      imageB64 = json.data?.[0]?.b64_json;
    } else {
      // text-to-image
      const resp = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt,
          n: 1,
          size: "1536x1024",
          quality: "high",
          response_format: "b64_json",
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error?.message ?? "OpenAI generation error");
      imageB64 = json.data?.[0]?.b64_json;
    }

    if (!imageB64) throw new Error("No image returned");

    // Upload to Supabase Storage
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const filePath = `${businessId}/visualizations/${Date.now()}.png`;
    const binaryStr = atob(imageB64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const { error: uploadError } = await serviceClient.storage
      .from("business-assets")
      .upload(filePath, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = serviceClient.storage.from("business-assets").getPublicUrl(filePath);

    return new Response(JSON.stringify({ success: true, imageUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
