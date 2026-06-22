import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IMAGE_WARNING_THRESHOLD, IMAGE_BLOCK_THRESHOLD } from "@/lib/pricingConfig";

interface BusinessUsage {
  id: string;
  business_id: string;
  stored_images_count: number;
  products_count: number;
  created_at: string;
  updated_at: string;
}

interface UsageStatus {
  usage: BusinessUsage | null;
  imageLimit: number;
  productLimit: number;
  imageUsagePercent: number;
  productUsagePercent: number;
  showImageWarning: boolean;
  imageUploadBlocked: boolean;
  showProductWarning: boolean;
  productAddBlocked: boolean;
}

export const useBusinessUsage = (businessId?: string) => {
  return useQuery({
    queryKey: ["business-usage", businessId],
    queryFn: async (): Promise<UsageStatus> => {
      if (!businessId) {
        return {
          usage: null,
          imageLimit: 50,
          productLimit: 100,
          imageUsagePercent: 0,
          productUsagePercent: 0,
          showImageWarning: false,
          imageUploadBlocked: false,
          showProductWarning: false,
          productAddBlocked: false,
        };
      }

      // Get usage data
      const { data: usage } = await supabase
        .from("business_usage")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      // Get subscription limits - need to get owner first
      const { data: business } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", businessId)
        .single();

      let imageLimit = 50;
      let productLimit = 100;

      if (business?.owner_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("id", business.owner_id)
          .single();

        if (profile?.user_id) {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("image_limit, product_addon_enabled")
            .eq("user_id", profile.user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (subscription) {
            imageLimit = subscription.image_limit || 50;
            // If product addon is enabled, no limit
            productLimit = subscription.product_addon_enabled ? Infinity : 100;
          }
        }
      }

      const storedImages = usage?.stored_images_count || 0;
      const productsCount = usage?.products_count || 0;

      const imageUsagePercent = imageLimit > 0 ? Math.round((storedImages / imageLimit) * 100) : 0;
      const productUsagePercent = productLimit === Infinity ? 0 : Math.round((productsCount / productLimit) * 100);

      return {
        usage: usage as BusinessUsage | null,
        imageLimit,
        productLimit,
        imageUsagePercent: Math.min(100, imageUsagePercent),
        productUsagePercent: Math.min(100, productUsagePercent),
        showImageWarning: imageUsagePercent >= IMAGE_WARNING_THRESHOLD && imageUsagePercent < IMAGE_BLOCK_THRESHOLD,
        imageUploadBlocked: imageUsagePercent >= IMAGE_BLOCK_THRESHOLD,
        showProductWarning: productLimit !== Infinity && productUsagePercent >= 80 && productUsagePercent < 100,
        productAddBlocked: productLimit !== Infinity && productUsagePercent >= 100,
      };
    },
    enabled: !!businessId,
  });
};

export const useRecalculateUsage = () => {
  return async (businessId: string) => {
    const { error } = await supabase.rpc("recalculate_business_usage", {
      p_business_id: businessId,
    });
    if (error) throw error;
  };
};
