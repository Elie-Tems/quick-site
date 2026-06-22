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
    female_model: "Commercial fashion e-commerce photography. Clothing on realistic female model. Neutral pose, non-distracting model. No facial expressions, no dramatic styling. Focus on the garment, not the model. Clean white studio background. Catalog look, not advertising. Suitable for online store listing.",
    male_model: "Commercial fashion e-commerce photography. Clothing on realistic male model. Neutral stance, non-distracting model. No facial expressions, no dramatic styling. Focus on the garment, not the model. White or very light background. Catalog look, not advertising. Suitable for online store listing.",
    mannequin: "Commercial fashion product photography. Clothing displayed on mannequin. Even lighting, realistic fabric folds. Clean white background. Focus on the garment details. Catalog style, e-commerce ready. No dramatic effects.",
    studio_flat: "Commercial fashion product photography. Flat-lay or hanging presentation. Clean studio setup. White background. Even lighting. Focus on garment details and fabric texture. Catalog style, suitable for e-commerce listing.",
  },
  general: {
    white_studio: "Clean, trustworthy e-commerce product photo. Pure white studio background. Soft shadows under product. Sharp focus. Single product only, centered, neutral angle, realistic scale. No clutter, no distractions. Commercial catalog style.",
    solid_white: "Professional e-commerce product photography. Solid white background. Minimalistic composition. Soft diffused lighting. Single product, centered, neutral angle. Clean and trustworthy. No clutter.",
    solid_gray: "Professional e-commerce product photography. Solid neutral gray background. Minimalistic composition. Soft even lighting. Single product, centered, neutral angle. Clean and trustworthy catalog style.",
    solid_blue: "Professional e-commerce product photography. Solid light blue background. Minimalistic composition. Soft studio lighting. Single product, centered, neutral angle. Modern clean aesthetic.",
    solid_black: "Professional e-commerce product photography. Solid black background. Dramatic but clean studio lighting. Single product, centered. Premium luxury feel. No clutter, realistic scale.",
    environment: "Clean lifestyle product photography. Simple neutral environment scene. No people, no distractions. Natural lighting. Single product as focal point. Clean modern setting. Trustworthy e-commerce style.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, businessId, productName, productType, styleType, originalImageUrl, customPrompt }: RequestBody = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    
    console.log("✅ OPENAI_API_KEY is configured:", OPENAI_API_KEY ? "Yes (length: " + OPENAI_API_KEY.length + ")" : "No");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse style type (may include skin tone like "female_model:dark")
    const [baseStyle, skinTone] = styleType.split(":");
    
    // Get style prompt
    let stylePrompt = STYLE_PROMPTS[productType]?.[baseStyle] || STYLE_PROMPTS.general.white_studio;
    
    // Add skin tone description if provided and it's a model style
    if (skinTone && SKIN_TONE_DESCRIPTIONS[skinTone] && (baseStyle === "female_model" || baseStyle === "male_model")) {
      stylePrompt = stylePrompt.replace("realistic female model", `realistic female model ${SKIN_TONE_DESCRIPTIONS[skinTone]}`);
      stylePrompt = stylePrompt.replace("realistic male model", `realistic male model ${SKIN_TONE_DESCRIPTIONS[skinTone]}`);
    }

    // Build the full prompt with strict e-commerce rules
    const fullPrompt = `Transform this product image: ${stylePrompt}

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

    console.log("Generating styled image with OpenAI DALL-E 3, prompt:", fullPrompt);

    // Call OpenAI DALL-E 3 for image generation
    // Note: Using generations instead of edits because edits requires a mask image
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenAI API error:", response.status, errorText);
      console.error("Response headers:", JSON.stringify([...response.headers.entries()]));
      
      if (response.status === 401) {
        throw new Error("שגיאת אימות OpenAI - בדוק את ה-API Key");
      }
      if (response.status === 429) {
        throw new Error("הגעת למגבלת הבקשות. נסה שוב מאוחר יותר.");
      }
      if (response.status === 402) {
        throw new Error("נדרש תשלום. הוסף קרדיטים לחשבון.");
      }
      throw new Error(`AI generation failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedImageUrl = data.data?.[0]?.url;

    if (!generatedImageUrl) {
      throw new Error("No image URL returned from OpenAI");
    }

    // Download the generated image from OpenAI
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
        updated_at: new Date().toISOString() 
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
            updated_at: new Date().toISOString() 
          })
          .eq("id", jobId);
      }
    } catch {}

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "שגיאה ביצירת התמונה" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
