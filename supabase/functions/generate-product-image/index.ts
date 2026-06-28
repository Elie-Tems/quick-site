import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Primary path: OpenAI gpt-image-1. SYNCHRONOUS - the image comes back in the
// response as base64, no task queue / polling (vs ~70s on the old reseller).
// Also supports EDITING (img2img) via the /images/edits endpoint: pass the
// current image + a change instruction. If OpenAI fails we fall back to the old
// nano-banana flow so generation never hard-breaks.
const OPENAI_IMAGE_MODEL = "gpt-image-1";
const OPENAI_IMAGE_QUALITY = "medium"; // low | medium | high - balance speed/quality

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NANO_API_KEY = Deno.env.get("NANO_BANANA_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }
    if (!OPENAI_API_KEY && !NANO_API_KEY) {
      throw new Error("No image generation provider configured");
    }

    // Require an authenticated user - this endpoint calls a paid image API.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      productName, productDescription, businessCategory, brandStyle, primaryColor,
      businessId, customPrompt,
      // Edit mode: supply the current image + a change instruction.
      baseImageUrl, editInstruction,
    } = await req.json();

    const isEdit = !!(baseImageUrl && editInstruction && String(editInstruction).trim());

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If a businessId is supplied, the caller must own that business.
    if (businessId) {
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      const { data: ownedBusiness } = profile
        ? await supabase.from("businesses").select("id")
            .eq("id", businessId).eq("owner_id", profile.id).maybeSingle()
        : { data: null };
      if (!ownedBusiness) {
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if business targets religious audience
    let isReligiousAudience = false;
    if (businessId) {
      const { data: business } = await supabase
        .from("businesses").select("is_religious_audience").eq("id", businessId).single();
      isReligiousAudience = business?.is_religious_audience || false;
    }

    const categoryContext = businessCategory ? `for a ${businessCategory} business` : "";

    // Build the prompt. In edit mode the instruction leads; otherwise it's a
    // full product-photo brief.
    let prompt: string;
    if (isEdit) {
      prompt = `Edit this product photo as instructed, keeping it a clean, commercial,
catalog-ready e-commerce product photo (single product, neutral background, no text/logos/watermarks).

EDIT INSTRUCTION: ${String(editInstruction).trim()}`;
    } else {
      prompt = `Commercial e-commerce product photography ${categoryContext}.

Product: ${productName}
${productDescription ? `Description: ${productDescription}` : ""}

STYLE REQUIREMENTS:
- Commercial, catalog-ready photography style
- Neutral, even lighting with soft shadows
- Sharp focus throughout
- Realistic proportions and scale
- Single product only, centered in frame
- Clean, minimal background (white, light gray, or subtle gradient)
- Professional studio photography aesthetic
- 1:1 square aspect ratio

STRICTLY FORBIDDEN (image is invalid if present):
- NO text, words, letters, or numbers
- NO logos or brand names
- NO watermarks or signatures
- NO artistic or abstract effects
- NO dramatic angles or unusual perspectives
- NO multiple products or props

Generate a clean, professional e-commerce product photo suitable for an online catalog.`;
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\nADDITIONAL REQUIREMENTS: ${customPrompt.trim()}`;
      }
    }
    if (isReligiousAudience) {
      prompt += `\n\nIMPORTANT: The image is intended for a Haredi (ultra-Orthodox Jewish) audience. Do not generate women, immodest clothing, revealing images, or suggestive content. Use only modest and appropriate visuals such as landscapes, products, buildings, men in modest attire, or neutral graphic elements.`;
    }

    // ── Primary synchronous path: OpenAI gpt-image-1 ──
    // Returns a base64 data URL (or null on any failure, so we can fall back).
    // Generation -> /images/generations; edit (img2img) -> /images/edits with
    // the current image attached.
    const generateViaOpenAI = async (): Promise<string | null> => {
      if (!OPENAI_API_KEY) return null;
      try {
        let resp: Response;
        if (isEdit) {
          const baseResp = await fetch(baseImageUrl);
          if (!baseResp.ok) return null;
          const baseBlob = await baseResp.blob();
          const form = new FormData();
          form.append("model", OPENAI_IMAGE_MODEL);
          form.append("prompt", prompt);
          form.append("size", "1024x1024");
          form.append("quality", OPENAI_IMAGE_QUALITY);
          form.append("image", new File([baseBlob], "base.png", { type: baseBlob.type || "image/png" }));
          resp = await fetch("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: form,
          });
        } else {
          resp = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: OPENAI_IMAGE_MODEL,
              prompt,
              size: "1024x1024",
              quality: OPENAI_IMAGE_QUALITY,
              n: 1,
            }),
          });
        }
        if (!resp.ok) {
          console.error("OpenAI image error:", resp.status, await resp.text());
          return null;
        }
        const data = await resp.json();
        const b64 = data?.data?.[0]?.b64_json;
        return typeof b64 === "string" && b64.length > 0 ? `data:image/png;base64,${b64}` : null;
      } catch (e) {
        console.error("OpenAI image exception:", e);
        return null;
      }
    };

    // ── Fallback: old reseller nano-banana (async + polling). Text-to-image
    // only; for an edit we just regenerate from the instruction. ──
    const generateViaNano = async (): Promise<string | null> => {
      if (!NANO_API_KEY) return null;
      const generateOnce = async (): Promise<string> => {
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("model", "nano-banana-2");
        formData.append("mode", "text-to-image");
        formData.append("aspectRatio", "1:1");
        formData.append("imageSize", "1K");
        formData.append("outputFormat", "png");
        const response = await fetch("https://nanobananapro.cloud/api/v1/image/nano-banana", {
          method: "POST",
          headers: { Authorization: `Bearer ${NANO_API_KEY}` },
          body: formData,
        });
        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 401 || response.status === 402) {
            throw Object.assign(
              new Error(response.status === 401
                ? "שגיאת אימות מנוע התמונות"
                : "אין מספיק קרדיטים במנוע התמונות."),
              { noRetry: true },
            );
          }
          throw new Error(`Nano Banana error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        if (typeof data.code !== "undefined" && data.code !== 0) {
          throw new Error(`Nano Banana error code=${data.code}, message=${data.message || "unknown"}`);
        }
        const taskId = data?.data?.id;
        if (!taskId) throw new Error("Nano Banana did not return a task ID");
        const maxAttempts = 35, delayMs = 1500;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const res = await fetch("https://nanobananapro.cloud/api/v1/image/nano-banana/result", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${NANO_API_KEY}` },
            body: JSON.stringify({ taskId }),
          });
          if (!res.ok) throw new Error(`Nano Banana result failed: ${res.status}`);
          const json = await res.json();
          const status = json?.data?.status as string | undefined;
          const results = json?.data?.results;
          if (status === "succeeded" && results?.length && results[0].url) return results[0].url;
          if (status === "failed") throw new Error(json?.data?.failure_reason || "generation failed");
          await new Promise((r) => setTimeout(r, delayMs));
        }
        throw new Error("Nano Banana generation timed out");
      };
      try {
        return await generateOnce();
      } catch (e: any) {
        if (e?.noRetry) throw e;
        try { return await generateOnce(); } catch { return null; }
      }
    };

    // Gateway first (fast), then fall back.
    let imageSrc = await generateViaOpenAI();
    if (!imageSrc) {
      console.warn("OpenAI image unavailable, falling back to nano-banana");
      imageSrc = await generateViaNano();
    }
    if (!imageSrc) {
      throw new Error("יצירת התמונה נכשלה. נסו שוב בעוד רגע.");
    }

    // Normalise to bytes: data URL (gateway) -> decode base64; https URL (nano) -> fetch.
    let bytes: Uint8Array;
    if (imageSrc.startsWith("data:")) {
      const base64 = imageSrc.split(",")[1] ?? "";
      bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    } else {
      const imageResponse = await fetch(imageSrc);
      bytes = new Uint8Array(await imageResponse.arrayBuffer());
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `products/${timestamp}-${randomId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("business-assets")
      .upload(fileName, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to save image: " + uploadError.message);
    }

    const { data: urlData } = supabase.storage.from("business-assets").getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: urlData.publicUrl,
        message: "Product image generated and saved successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating product image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
