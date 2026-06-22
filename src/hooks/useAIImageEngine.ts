import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AI_CREDIT_PACKAGES } from "@/lib/pricingConfig";

interface AICredits {
  id: string;
  business_id: string;
  credits_remaining: number;
  total_credits_purchased: number;
  free_credits_granted: boolean;
}

interface AIImageJob {
  id: string;
  business_id: string;
  product_id: string | null;
  original_image_url: string;
  generated_image_url?: string | null;
  product_type: string;
  style_type: string;
  status: string;
  error_message: string | null;
  credits_used: number;
  created_at: string;
}

interface AIGeneratedImage {
  id: string;
  job_id: string;
  image_url: string;
  is_selected: boolean;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  label: string;
  recommended?: boolean;
}

// Re-export for backward compatibility
export const CREDIT_PACKAGES = AI_CREDIT_PACKAGES;

export const useAICredits = (businessId?: string) => {
  return useQuery({
    queryKey: ["ai-credits", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await supabase
        .from("ai_credits")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      if (error) throw error;
      return data as AICredits | null;
    },
    enabled: !!businessId,
  });
};

// Grant 2 free trial credits (only once per tenant)
export const useGrantFreeCredits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessId: string) => {
      const { data, error } = await supabase
        .rpc("grant_free_ai_credits", { p_business_id: businessId });

      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (granted, businessId) => {
      queryClient.invalidateQueries({ queryKey: ["ai-credits", businessId] });
      if (granted) {
        toast({
          title: "קיבלת 2 קרדיטים חינם! 🎁",
          description: "נסה את מנוע שדרוג התמונות בחינם",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAIImageJobs = (businessId?: string) => {
  return useQuery({
    queryKey: ["ai-image-jobs", businessId],
    queryFn: async () => {
      if (!businessId) {
        console.log("useAIImageJobs - no businessId");
        return [];
      }
      
      console.log("useAIImageJobs - fetching for businessId:", businessId);
      
      const { data, error } = await supabase
        .from("ai_image_jobs")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      console.log("useAIImageJobs - data:", data);
      console.log("useAIImageJobs - error:", error);

      if (error) throw error;
      return data as AIImageJob[];
    },
    enabled: !!businessId,
  });
};

export const useAIGeneratedImages = (jobId?: string) => {
  return useQuery({
    queryKey: ["ai-generated-images", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      
      const { data, error } = await supabase
        .from("ai_generated_images")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AIGeneratedImage[];
    },
    enabled: !!jobId,
  });
};

export const useGenerateStyledImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      productId,
      productName,
      productType,
      styleType,
      originalImageUrl,
      customPrompt,
    }: {
      businessId: string;
      productId?: string;
      productName: string;
      productType: "fashion" | "general";
      styleType: string;
      originalImageUrl: string;
      customPrompt?: string;
    }) => {
      // Check credits first
      const { data: credits } = await supabase
        .from("ai_credits")
        .select("credits_remaining")
        .eq("business_id", businessId)
        .maybeSingle();

      if (!credits || credits.credits_remaining < 1) {
        throw new Error("אין לך מספיק קרדיטים. רכוש קרדיטים נוספים.");
      }

      // Create job record
      const { data: job, error: jobError } = await supabase
        .from("ai_image_jobs")
        .insert({
          business_id: businessId,
          product_id: productId || null,
          original_image_url: originalImageUrl,
          product_type: productType,
          style_type: styleType,
          status: "pending",
          credits_used: 1,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Consume credit
      const { data: creditResult, error: creditError } = await supabase
        .rpc("consume_ai_credits", { p_business_id: businessId, p_amount: 1 });

      if (creditError || !creditResult) {
        // Rollback job
        await supabase.from("ai_image_jobs").delete().eq("id", job.id);
        throw new Error("שגיאה בניכוי קרדיטים");
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke("generate-styled-product-image", {
        body: {
          jobId: job.id,
          businessId,
          productName,
          productType,
          styleType,
          originalImageUrl,
          customPrompt,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-credits", variables.businessId] });
      queryClient.invalidateQueries({ queryKey: ["ai-image-jobs", variables.businessId] });
      toast({
        title: "התמונה נוצרה בהצלחה! ✨",
        description: "התמונה המשודרגת נשמרה בגלריה",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה ביצירת התמונה",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useSelectGeneratedImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageId,
      productId,
    }: {
      imageId: string;
      productId: string;
      jobId: string;
    }) => {
      // Get the image URL
      const { data: image, error: imageError } = await supabase
        .from("ai_generated_images")
        .select("image_url")
        .eq("id", imageId)
        .single();

      if (imageError) throw imageError;

      // Update product with new image
      const { error: productError } = await supabase
        .from("products")
        .update({ image_url: image.image_url })
        .eq("id", productId);

      if (productError) throw productError;

      // Mark image as selected
      await supabase
        .from("ai_generated_images")
        .update({ is_selected: true })
        .eq("id", imageId);

      return image.image_url;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-generated-images", variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "התמונה הוחלפה בהצלחה!",
        description: "התמונה החדשה נשמרה למוצר",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בשמירת התמונה",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
