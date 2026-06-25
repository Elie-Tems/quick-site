import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NANO_API_KEY = Deno.env.get("NANO_BANANA_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!NANO_API_KEY) {
      throw new Error("NANO_BANANA_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
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

    const { productName, productDescription, businessCategory, brandStyle, primaryColor, businessId, customPrompt } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If a businessId is supplied, the caller must own that business.
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

    // Check if business targets religious audience
    let isReligiousAudience = false;
    if (businessId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('is_religious_audience')
        .eq('id', businessId)
        .single();
      
      isReligiousAudience = business?.is_religious_audience || false;
    }

    // Build a context-aware prompt for the product image
    const categoryContext = businessCategory ? `for a ${businessCategory} business` : "";
    const styleContext = brandStyle ? `in a ${brandStyle} style` : "";
    const colorContext = primaryColor ? `with ${primaryColor} as accent color hints` : "";
    
    let prompt = `Commercial e-commerce product photography ${categoryContext}.

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

    // Add custom prompt if provided
    if (customPrompt && customPrompt.trim()) {
      prompt += `\n\nADDITIONAL REQUIREMENTS: ${customPrompt.trim()}`;
    }

    // Add religious audience restrictions if applicable
    if (isReligiousAudience) {
      prompt += `\n\nIMPORTANT: The image is intended for a Haredi (ultra-Orthodox Jewish) audience. Do not generate women, immodest clothing, revealing images, or suggestive content. Use only modest and appropriate visuals such as landscapes, products, buildings, men in modest attire, or neutral graphic elements.`;
    }

    console.log("Generating product image with Nano Banana for:", productName);

    // Call Nano Banana (text-to-image), with ONE automatic retry on a transient
    // failure (API error / timeout) so a single hiccup doesn't fail generation.
    // Per-attempt budget bounded (35 x 1.5s ~= 52s) so two attempts fit the limit.
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
        console.error("Nano Banana product API error:", response.status, errorText);
        if (response.status === 401 || response.status === 402) {
          throw Object.assign(
            new Error(response.status === 401
              ? "שגיאת אימות Nano Banana - בדוק את ה-API Key"
              : "אין מספיק קרדיטים במנוע התמונות."),
            { noRetry: true },
          );
        }
        throw new Error(`Nano Banana product API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Nano Banana product raw response:", JSON.stringify(data));
      if (typeof data.code !== "undefined" && data.code !== 0) {
        throw new Error(`Nano Banana product error code=${data.code}, message=${data.message || "unknown"}`);
      }
      const taskId = data?.data?.id;
      if (!taskId) {
        throw new Error(`Nano Banana product did not return task ID. Raw response: ${JSON.stringify(data)}`);
      }

      const maxAttempts = 35;
      const delayMs = 1500;
      let lastStatus: string | undefined;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await fetch("https://nanobananapro.cloud/api/v1/image/nano-banana/result", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${NANO_API_KEY}` },
          body: JSON.stringify({ taskId }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Nano Banana product result error:", res.status, text);
          throw new Error(`Nano Banana product result failed: ${res.status} - ${text}`);
        }
        const json = await res.json();
        const status = json?.data?.status as string | undefined;
        const results = json?.data?.results;
        lastStatus = status;
        console.log("Nano Banana product poll:", { attempt, status, hasResults: !!results?.length });
        if (status === "succeeded" && results && results.length > 0 && results[0].url) {
          return results[0].url as string;
        }
        if (status === "failed") {
          throw new Error(json?.data?.failure_reason || json?.data?.error || "Nano Banana product generation failed");
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      throw new Error(`Nano Banana product generation timed out. Last known status: ${lastStatus ?? "unknown"}`);
    };

    let imageDataUrl: string | null = null;
    let genError: any = null;
    for (let tryNum = 1; tryNum <= 2; tryNum++) {
      try {
        imageDataUrl = await generateOnce();
        if (tryNum > 1) console.log("Nano Banana product succeeded on retry");
        break;
      } catch (e: any) {
        genError = e;
        if (e?.noRetry || tryNum === 2) break;
        console.warn(`Nano Banana product attempt ${tryNum} failed, retrying:`, e?.message || e);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    if (!imageDataUrl) {
      throw genError ?? new Error("Nano Banana product generation failed");
    }

    // Download the image from Nano Banana
    const imageResponse = await fetch(imageDataUrl);
    const imageBlob = await imageResponse.blob();
    const bytes = new Uint8Array(await imageBlob.arrayBuffer());
    const imageType = "png";
    
    // Upload to Supabase storage (using supabase client from line 29)
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileName = `products/${timestamp}-${randomId}.${imageType}`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(fileName, bytes, {
        contentType: `image/${imageType}`,
        upsert: false
      });
    
    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to save image: " + uploadError.message);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('business-assets')
      .getPublicUrl(fileName);
    
    const publicUrl = urlData.publicUrl;
    console.log("Image uploaded successfully:", publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        message: "Product image generated and saved successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating product image:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
