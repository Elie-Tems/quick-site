import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  jobId: string;
  businessId: string;
  productName: string;
  productType: "fashion" | "general";
  styleType: string;
  originalImageUrl: string;
  customPrompt?: string;
}

const SKIN_TONE_DESCRIPTIONS: Record<string, string> = {
  light: "with light/fair skin tone",
  medium: "with medium skin tone",
  olive: "with olive/Mediterranean skin tone",
  tan: "with tan/bronze skin tone",
  dark: "with dark/deep skin tone",
};

const STYLE_PROMPTS: Record<string, Record<string, string>> = {
  fashion: {
    female_model:
      "Commercial fashion e-commerce photography. Clothing on realistic female model. Neutral pose, non-distracting model. No facial expressions, no dramatic styling. Focus on the garment, not the model. Clean white studio background. Catalog look, not advertising. Suitable for online store listing.",
    male_model:
      "Commercial fashion e-commerce photography. Clothing on realistic male model. Neutral stance, non-distracting model. No facial expressions, no dramatic styling. Focus on the garment, not the model. White or very light background. Catalog look, not advertising. Suitable for online store listing.",
    mannequin:
      "Commercial fashion product photography. Clothing displayed on mannequin. Even lighting, realistic fabric folds. Clean white background. Focus on the garment details. Catalog style, e-commerce ready. No dramatic effects.",
    studio_flat:
      "Commercial fashion product photography. Flat-lay or hanging presentation. Clean studio setup. White background. Even lighting. Focus on garment details and fabric texture. Catalog style, suitable for e-commerce listing.",
  },
  general: {
    white_studio:
      "Clean, trustworthy e-commerce product photo. Pure white studio background. Soft shadows under product. Sharp focus. Single product only, centered, neutral angle, realistic scale. No clutter, no distractions. Commercial catalog style.",
    solid_white:
      "Professional e-commerce product photography. Solid white background. Minimalistic composition. Soft diffused lighting. Single product, centered, neutral angle. Clean and trustworthy. No clutter.",
    solid_gray:
      "Professional e-commerce product photography. Solid neutral gray background. Minimalistic composition. Soft even lighting. Single product, centered, neutral angle. Clean and trustworthy catalog style.",
    solid_blue:
      "Professional e-commerce product photography. Solid light blue background. Minimalistic composition. Soft studio lighting. Single product, centered, neutral angle. Modern clean aesthetic.",
    solid_black:
      "Professional e-commerce product photography. Solid black background. Dramatic but clean studio lighting. Single product, centered. Premium luxury feel. No clutter, realistic scale.",
    environment:
      "Clean lifestyle product photography. Simple neutral environment scene. No people, no distractions. Natural lighting. Single product as focal point. Clean modern setting. Trustworthy e-commerce style.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NANO_API_KEY = Deno.env.get("NANO_BANANA_API_KEY");
    if (!NANO_API_KEY) {
      throw new Error("NANO_BANANA_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Require an authenticated user - this endpoint calls a paid image API
    // and fetches a remote image server-side.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
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
      jobId,
      businessId,
      productName,
      productType,
      styleType,
      originalImageUrl,
      customPrompt,
    }: RequestBody = await req.json();

    const supabase = createClient(supabaseUrl, supabaseKey);

    // The caller must own the business this job belongs to.
    if (businessId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: ownedBusiness } = profile
        ? await supabase
            .from("businesses")
            .select("id")
            .eq("id", businessId)
            .eq("owner_id", profile.id)
            .maybeSingle()
        : { data: null };
      if (!ownedBusiness) {
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // SSRF guard: only allow fetching the original image from our own
    // Supabase Storage. Never let a caller point this at an arbitrary host.
    if (originalImageUrl && !originalImageUrl.startsWith(`${supabaseUrl}/storage/`)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid image source" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if business targets religious audience
    const { data: business } = await supabase
      .from('businesses')
      .select('is_religious_audience')
      .eq('id', businessId)
      .single();
    
    const isReligiousAudience = business?.is_religious_audience || false;

    // Parse style type (may include skin tone like "female_model:dark")
    const [baseStyle, skinTone] = styleType.split(":");

    // Get style prompt (supports both preset styles and custom prompt)
    let stylePrompt: string;

    if (baseStyle === "custom_prompt" && customPrompt && customPrompt.trim().length > 0) {
      stylePrompt = customPrompt;
    } else {
      stylePrompt = STYLE_PROMPTS[productType]?.[baseStyle] || STYLE_PROMPTS.general.white_studio;

      // Add skin tone description if provided and it's a model style
      if (
        skinTone &&
        SKIN_TONE_DESCRIPTIONS[skinTone] &&
        (baseStyle === "female_model" || baseStyle === "male_model")
      ) {
        stylePrompt = stylePrompt.replace(
          "realistic female model",
          `realistic female model ${SKIN_TONE_DESCRIPTIONS[skinTone]}`,
        );
        stylePrompt = stylePrompt.replace(
          "realistic male model",
          `realistic male model ${SKIN_TONE_DESCRIPTIONS[skinTone]}`,
        );
      }
    }

    // Build the full prompt with strict e-commerce rules
    let fullPrompt = `Transform this product image: ${stylePrompt}

Product: ${productName}

RULES:
- Keep the original product exactly as shown
- Only change background and presentation
- One product only, centered
- Neutral angle, realistic scale
- Must look like real product photo from online store

STRICTLY FORBIDDEN:
- No text, logos, watermarks, signatures
- No artistic effects
- No dramatic angles
- No multiple products`;

    // Add religious audience restrictions if applicable
    if (isReligiousAudience) {
      fullPrompt += `\n\nIMPORTANT: The image is intended for a Haredi (ultra-Orthodox Jewish) audience. Do not generate women, immodest clothing, revealing images, or suggestive content. Use only modest and appropriate visuals such as landscapes, products, buildings, men in modest attire, or neutral graphic elements.`;
    }

    console.log("Generating styled image with Nano Banana, prompt:", fullPrompt);

    // Prepare multipart/form-data request for Nano Banana (image-to-image)
    const formData = new FormData();
    formData.append("prompt", fullPrompt);
    formData.append("model", "nano-banana-2");
    formData.append("mode", "image-to-image");
    formData.append("aspectRatio", "auto");
    formData.append("imageSize", "1K");
    formData.append("outputFormat", "png");
    formData.append("imageUrl", originalImageUrl);

    const nanoResponse = await fetch("https://nanobananapro.cloud/api/v1/image/nano-banana", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NANO_API_KEY}`,
      },
      body: formData,
    });

    if (!nanoResponse.ok) {
      const errorText = await nanoResponse.text();
      console.error("Nano Banana API error:", nanoResponse.status, errorText);

      if (nanoResponse.status === 401) {
        throw new Error("שגיאת אימות Nano Banana - בדוק את ה-API Key");
      }
      if (nanoResponse.status === 402) {
        throw new Error("אין מספיק קרדיטים ב-Nano Banana");
      }

      throw new Error(`Nano Banana generation failed: ${nanoResponse.status} - ${errorText}`);
    }

    const nanoData = await nanoResponse.json();
    console.log("Nano Banana raw response:", JSON.stringify(nanoData));

    const taskId = nanoData?.data?.id;

    // אם ה‑API מחזיר קוד שגיאה לוגי (גם אם HTTP 200)
    if (typeof nanoData.code !== "undefined" && nanoData.code !== 0) {
      throw new Error(
        `Nano Banana error code=${nanoData.code}, message=${nanoData.message || "unknown"}`
      );
    }

    if (!taskId) {
      throw new Error(
        `Nano Banana did not return task ID. Raw response: ${JSON.stringify(nanoData)}`
      );
    }

    // Poll Nano Banana for the result (can take some time on free/slow tiers)
    const maxAttempts = 40;
    const delayMs = 2000;
    let generatedImageUrl: string | null = null;
    let lastStatus: string | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await fetch("https://nanobananapro.cloud/api/v1/image/nano-banana/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${NANO_API_KEY}`,
        },
        body: JSON.stringify({ taskId }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Nano Banana result error:", res.status, text);
        throw new Error(`Nano Banana result failed: ${res.status} - ${text}`);
      }

      const json = await res.json();
      const status = json?.data?.status as string | undefined;
      const results = json?.data?.results;

      lastStatus = status;
      console.log("Nano Banana poll:", { attempt, status, hasResults: !!results?.length });

      if (status === "succeeded" && results && results.length > 0 && results[0].url) {
        generatedImageUrl = results[0].url as string;
        break;
      }

      if (status === "failed") {
        const failureReason =
          json?.data?.failure_reason || json?.data?.error || "Nano Banana generation failed";
        throw new Error(failureReason);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (!generatedImageUrl) {
      throw new Error(
        `Nano Banana generation timed out. Last known status: ${lastStatus ?? "unknown"}`
      );
    }

    // Download the generated image
    const imageResponse = await fetch(generatedImageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());

    // Upload to storage
    const fileName = `ai-styled/${businessId}/${jobId}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("business-assets")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload generated image");
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("business-assets")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    // Save generated image record
    await supabase.from("ai_generated_images").insert({
      job_id: jobId,
      image_url: publicUrl,
      is_selected: false,
    });

    // Update job status to completed and save generated image URL
    await supabase
      .from("ai_image_jobs")
      .update({
        status: "completed",
        generated_image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating styled image:", error);

    // Try to update job status to failed
    try {
      const { jobId } = await req.clone().json();
      if (jobId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from("ai_image_jobs")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    } catch {}

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "שגיאה ביצירת התמונה",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});