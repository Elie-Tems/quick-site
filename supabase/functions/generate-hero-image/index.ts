import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CRITICAL: All prompts explicitly specify NO TEXT to ensure pure imagery
const NO_TEXT_INSTRUCTION = "CRITICAL: Do NOT include ANY text, letters, words, signs, labels, watermarks, or typography in the image. The image must be purely visual with absolutely no text elements whatsoever.";

// Category to prompt mapping for generating relevant hero images
const categoryPrompts: Record<string, string> = {
  bakery: `A warm, inviting bakery interior with fresh artisan breads, croissants, and pastries displayed beautifully. Golden morning light streaming through the window, rustic wooden shelves, professional food photography style. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  restaurant: `An elegant restaurant interior with beautifully plated gourmet dishes on white tablecloths, ambient lighting, fine dining atmosphere. Professional food and interior photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  cafe: `A cozy modern cafe with espresso machines, latte art being poured, exposed brick walls, comfortable seating. Warm natural light, hipster aesthetic. Professional photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  clothing: `A stylish fashion boutique with elegant clothing displays, modern minimalist design, soft lighting, mannequins with trendy outfits. High-end retail photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  jewelry: `An elegant jewelry store display with sparkling diamonds, gold necklaces, and luxury watches on velvet cushions. Dramatic lighting, luxurious atmosphere. Professional product photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  electronics: `A modern electronics store with sleek smartphones, laptops, and gadgets on minimalist white displays. Clean, tech-forward aesthetic with blue accent lighting. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  beauty: `A luxurious beauty salon or cosmetics display with makeup products, skincare bottles, flowers, and soft pink lighting. Elegant feminine aesthetic. Professional beauty photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  fitness: `A modern fitness gym with premium equipment, motivational atmosphere, dynamic lighting. Athletic and energetic vibe. Professional sports photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  automotive: `A premium car showroom with a luxury vehicle, polished floors reflecting bright showroom lights. Professional automotive photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  pets: `A charming pet store with adorable puppies and kittens, colorful pet toys and accessories. Warm, friendly atmosphere. Professional pet photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  flowers: `A beautiful flower shop with vibrant bouquets of roses, tulips, and exotic flowers. Romantic atmosphere with natural light. Professional floral photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  books: `A cozy bookstore with wooden shelves full of books, reading nooks, warm lighting. Intellectual and inviting atmosphere. Professional interior photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  home: `A stylish home decor store with modern furniture, decorative items, and plants. Scandinavian design aesthetic. Professional interior photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  grocery: `A fresh grocery market with colorful fruits and vegetables, artisan products, warm lighting. Farm-to-table aesthetic. Professional food photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
  other: `A modern, professional storefront with clean design, welcoming atmosphere, and premium aesthetic. Professional commercial photography. Ultra high resolution. ${NO_TEXT_INSTRUCTION}`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Track credit deduction so a failed/timed-out generation can refund it.
  let creditBusinessId: string | null = null;
  let creditWasDeducted = false;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Require an authenticated user. This endpoint calls a paid image API and
    // grants free credits, so it must never be reachable anonymously.
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

    const { category, businessName, businessId, bannerStyle, brandData, customPrompt } = await req.json();

    if (!category) {
      return new Response(
        JSON.stringify({ success: false, error: "Category is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const NANO_API_KEY = Deno.env.get("NANO_BANANA_API_KEY");
    if (!NANO_API_KEY) {
      throw new Error("NANO_BANANA_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If a businessId is supplied, the caller must own that business.
    // businesses.owner_id references profiles.id (not auth.uid), so resolve
    // the caller's profile first, then match it against the business owner.
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

    console.log(`Generating hero image for category: ${category}, business: ${businessName}, style: ${bannerStyle}, hasBrandData: ${!!brandData}`);

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

    // Check and deduct credits if businessId provided
    let jobId: string | null = null;
    
    if (businessId) {
      console.log('=== CREDITS CHECK START ===');
      console.log('Business ID:', businessId);
      
      // Check available credits
      let { data: creditsData, error: creditsError } = await supabase
        .from('ai_credits')
        .select('*')
        .eq('business_id', businessId)
        .single();

      console.log('Credits query result:', { creditsData, creditsError });

      // If no credits record exists (PGRST116 = no rows returned), create one with free credits
      if (creditsError && creditsError.code === 'PGRST116') {
        console.log('No credits record found, creating one with free credits');
        const FREE_AI_CREDITS = 50;
        
        const { data: newCreditsData, error: createError } = await supabase
          .from('ai_credits')
          .insert({
            business_id: businessId,
            credits_remaining: FREE_AI_CREDITS,
            total_credits_purchased: 0,
            free_credits_granted: true,
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create credits record:', createError);
          throw new Error('Failed to initialize credits');
        }

        creditsData = newCreditsData;
        console.log(`Created credits record with ${FREE_AI_CREDITS} free credits`);
      } else if (creditsError) {
        throw new Error('Failed to check credits');
      }

      const totalCredits = creditsData?.credits_remaining || 0;
      
      console.log('Credits calculation:', {
        credits_remaining: creditsData?.credits_remaining,
        totalCredits: totalCredits,
        hasEnough: totalCredits >= 1
      });
      
      if (totalCredits < 1) {
        console.log('ERROR: Insufficient credits!');
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient credits' }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log('Credits check PASSED, proceeding with image generation');

      // Deduct 1 credit
      const newCreditsRemaining = Math.max(0, (creditsData?.credits_remaining || 0) - 1);

      const { error: updateCreditsError } = await supabase
        .from('ai_credits')
        .update({
          credits_remaining: newCreditsRemaining,
        })
        .eq('business_id', businessId);

      if (updateCreditsError) {
        console.error('Failed to update credits:', updateCreditsError);
        throw new Error('Failed to deduct credits');
      }

      console.log(`Credits deducted. Remaining: ${newCreditsRemaining}`);
      creditBusinessId = businessId;
      creditWasDeducted = true;

      // Create job record with pending status
      const { data: jobData, error: jobError } = await supabase
        .from('ai_image_jobs')
        .insert({
          business_id: businessId,
          product_id: null,
          original_image_url: '',
          product_type: 'hero-image',
          style_type: category,
          status: 'processing',
          credits_used: 1,
        })
        .select()
        .single();

      if (jobError) {
        console.error('Failed to create job record:', jobError);
        // Continue anyway - don't fail the whole operation
      } else {
        jobId = jobData.id;
        console.log(`Created job record: ${jobId}`);
      }
    }

    // Banner style modifiers
    const styleModifiers: Record<string, string> = {
      'products-only': 'Focus ONLY on products, items, and objects. DO NOT include any people, humans, faces, hands, or body parts. Show only products and merchandise.',
      'atmosphere': 'Focus on the interior space, architecture, and ambiance. DO NOT include any people, humans, faces, hands, or body parts. Show only the environment and atmosphere.',
      'with-people': 'Include people naturally interacting with the space - customers, staff, or visitors enjoying the environment.',
      'abstract': 'Create an abstract, artistic interpretation with geometric shapes, gradients, and modern graphic design elements. Avoid realistic photography - use artistic and abstract visual style.',
    };

    const styleModifier = styleModifiers[bannerStyle || 'products-only'] || styleModifiers['products-only'];

    // Build brand-aware prompt - use colors and style from brand, but scene from category
    let brandContext = "";
    
    if (brandData) {
      const { primaryColor, colorPalette, brandStyle } = brandData;
      // Note: We intentionally do NOT use businessDescription here because it may conflict with the selected category
      // The user chose a specific category, so we use that for the scene, but apply brand colors/style
      
      // Build STRONG color instruction - these colors MUST dominate the image
      const colors = colorPalette && colorPalette.length > 0 
        ? [primaryColor, ...colorPalette].filter(Boolean).slice(0, 4)
        : [primaryColor].filter(Boolean);
      
      if (colors.length > 0) {
        // Make colors the PRIMARY focus of the image - be direct and imperative
        brandContext = `COLOR SCHEME: Use ${colors[0]} as the dominant color for lighting, backgrounds and key elements. Accent colors: ${colors.slice(1).join(', ')}.`;
      }
      
      // Add brand style context
      const styleDescriptions: Record<string, string> = {
        'modern': 'Modern, clean aesthetic.',
        'minimal': 'Minimalist aesthetic with white space.',
        'bold': 'Bold, vibrant aesthetic with strong contrasts.',
        'elegant': 'Luxurious, elegant aesthetic with refined details.',
      };
      
      if (brandStyle && styleDescriptions[brandStyle]) {
        brandContext += ` ${styleDescriptions[brandStyle]}`;
      }
      
      console.log("Brand context added to prompt:", brandContext);
    }

    // Get the prompt for this category - always enforce no text
    const basePrompt = categoryPrompts[category] || categoryPrompts.other;
    
    // Combine: scene from category + colors from brand
    let prompt = brandContext 
      ? `Generate an image: ${basePrompt} ${styleModifier} ${brandContext} ABSOLUTELY NO TEXT OR WRITING IN THE IMAGE.`
      : `${basePrompt} ${styleModifier} Style should match a business in the ${category} industry. ABSOLUTELY NO TEXT OR WRITING IN THE IMAGE.`;

    // Add custom prompt if provided
    if (customPrompt && customPrompt.trim()) {
      prompt += `\n\nADDITIONAL REQUIREMENTS: ${customPrompt.trim()}`;
    }

    // Add religious audience restrictions if applicable
    if (isReligiousAudience) {
      prompt += `\n\nIMPORTANT: The image is intended for a Haredi (ultra-Orthodox Jewish) audience. Do not generate women, immodest clothing, revealing images, or suggestive content. Use only modest and appropriate visuals such as landscapes, products, buildings, men in modest attire, or neutral graphic elements.`;
    }

    // Generate image using Nano Banana (text-to-image)
    console.log("Generating hero image with Nano Banana");

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", "nano-banana-2");
    formData.append("mode", "text-to-image");
    formData.append("aspectRatio", "16:9");
    formData.append("imageSize", "1K");
    formData.append("outputFormat", "png");

    const nanoResponse = await fetch("https://nanobananapro.cloud/api/v1/image/nano-banana", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NANO_API_KEY}`,
      },
      body: formData,
    });

    if (!nanoResponse.ok) {
      const errorText = await nanoResponse.text();
      console.error("Nano Banana hero API error:", nanoResponse.status, errorText);

      if (nanoResponse.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: "שגיאת אימות Nano Banana - בדוק את ה-API Key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (nanoResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "אין מספיק קרדיטים במנוע התמונות" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Nano Banana hero generation failed: ${nanoResponse.status} - ${errorText}`);
    }

    const nanoData = await nanoResponse.json();
    console.log("Nano Banana hero raw response:", JSON.stringify(nanoData));

    if (typeof nanoData.code !== "undefined" && nanoData.code !== 0) {
      throw new Error(
        `Nano Banana hero error code=${nanoData.code}, message=${nanoData.message || "unknown"}`
      );
    }

    const taskId = nanoData?.data?.id;
    if (!taskId) {
      throw new Error(
        `Nano Banana hero did not return task ID. Raw response: ${JSON.stringify(nanoData)}`
      );
    }

    // Poll Nano Banana for hero result.
    // Poll faster (1.2s) so a finished image is detected sooner - the previous
    // 2s cadence added up to ~2s of dead wait after the image was already ready.
    // maxAttempts raised to keep roughly the same overall timeout (~80s).
    const maxAttempts = 66;
    const delayMs = 1200;
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
        console.error("Nano Banana hero result error:", res.status, text);
        throw new Error(`Nano Banana hero result failed: ${res.status} - ${text}`);
      }

      const json = await res.json();
      const status = json?.data?.status as string | undefined;
      const results = json?.data?.results;

      lastStatus = status;
      console.log("Nano Banana hero poll:", { attempt, status, hasResults: !!results?.length });

      if (status === "succeeded" && results && results.length > 0 && results[0].url) {
        generatedImageUrl = results[0].url as string;
        break;
      }

      if (status === "failed") {
        const failureReason =
          json?.data?.failure_reason || json?.data?.error || "Nano Banana hero generation failed";
        throw new Error(failureReason);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (!generatedImageUrl) {
      throw new Error(
        `Nano Banana hero generation timed out. Last known status: ${lastStatus ?? "unknown"}`
      );
    }

    // Download the image from Nano Banana
    const imageResponse = await fetch(generatedImageUrl);
    const imageBlob = await imageResponse.blob();
    const bytes = new Uint8Array(await imageBlob.arrayBuffer());
    const imageType = "png";

    // If no businessId provided, return the generated image URL directly
    // This is used during onboarding before the business is created
    if (!businessId) {
      console.log("No businessId - returning hero image URL directly from Nano Banana");
      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl: generatedImageUrl // Return the generated URL directly
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload to Supabase Storage (only if businessId provided)
    // Use timestamp to avoid browser caching issues
    const timestamp = Date.now();
    const filePath = `${businessId}/branding/hero-ai-${timestamp}.${imageType}`;
    
    const { error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(filePath, bytes, {
        contentType: `image/${imageType}`,
        upsert: false, // Don't upsert - create new file each time
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload image");
    }

    // Get public URL with cache busting
    const { data: urlData } = supabase.storage
      .from('business-assets')
      .getPublicUrl(filePath);

    const heroImageUrl = `${urlData.publicUrl}?t=${timestamp}`;
    console.log("Hero image uploaded:", heroImageUrl);

    // Update the business record with the hero image URL
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ hero_image_url: heroImageUrl })
      .eq('id', businessId);

    if (updateError) {
      console.error("Update error:", updateError);
      // Don't throw - the image was still generated
    }

    // Update job record to completed with generated image URL
    if (jobId) {
      const { error: jobUpdateError } = await supabase
        .from('ai_image_jobs')
        .update({
          status: 'completed',
          generated_image_url: heroImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (jobUpdateError) {
        console.error('Failed to update job record:', jobUpdateError);
      } else {
        console.log(`Job ${jobId} marked as completed`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: heroImageUrl 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating hero image:", error);

    // Refund the credit if one was already deducted - a failed or timed-out
    // generation must never cost the merchant a credit.
    try {
      if (creditWasDeducted && creditBusinessId) {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: c } = await sb.from("ai_credits").select("credits_remaining").eq("business_id", creditBusinessId).single();
          if (c) {
            await sb.from("ai_credits").update({ credits_remaining: (c.credits_remaining || 0) + 1 }).eq("business_id", creditBusinessId);
            console.log("Refunded 1 credit after failed hero generation");
          }
        }
      }
    } catch (refundErr) {
      console.error("Failed to refund credit:", refundErr);
    }

    // Try to update job status to failed if we have a jobId
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { jobId } = await req.clone().json();
        
        if (jobId) {
          await supabase
            .from('ai_image_jobs')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);
        }
      }
    } catch (updateError) {
      console.error('Failed to update job status to failed:', updateError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate hero image" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
