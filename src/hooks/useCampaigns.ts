import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  display_mode: 'replace' | 'add' | 'prioritize';
  created_at: string;
  updated_at: string;
}

export interface CampaignBanner {
  id: string;
  campaign_id: string;
  title: string | null;
  text: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampaignProduct {
  id: string;
  campaign_id: string;
  product_id: string | null;
  is_campaign_only: boolean;
  name: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Joined product data when product_id is set
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
}

// Fetch all campaigns for a business
export const useCampaigns = (businessId?: string) => {
  return useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!businessId,
  });
};

// Fetch active campaign for a business (for storefront)
export const useActiveCampaign = (businessId?: string) => {
  return useQuery({
    queryKey: ['active-campaign', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No active campaign
        throw error;
      }
      return data as Campaign;
    },
    enabled: !!businessId,
  });
};

// Fetch campaign banners
export const useCampaignBanners = (campaignId?: string) => {
  return useQuery({
    queryKey: ['campaign-banners', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('campaign_banners')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as CampaignBanner[];
    },
    enabled: !!campaignId,
  });
};

// Fetch campaign products with joined product data
export const useCampaignProducts = (campaignId?: string) => {
  return useQuery({
    queryKey: ['campaign-products', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('campaign_products')
        .select(`
          *,
          product:products(id, name, price, image_url)
        `)
        .eq('campaign_id', campaignId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as CampaignProduct[];
    },
    enabled: !!campaignId,
  });
};

// Create campaign
export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();
      
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.business_id] });
      queryClient.invalidateQueries({ queryKey: ['active-campaign', data.business_id] });
    },
  });
};

// Update campaign
export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.business_id] });
      queryClient.invalidateQueries({ queryKey: ['active-campaign', data.business_id] });
    },
  });
};

// Delete campaign
export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, businessId }: { id: string; businessId: string }) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, businessId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.businessId] });
      queryClient.invalidateQueries({ queryKey: ['active-campaign', data.businessId] });
    },
  });
};

// Toggle campaign active status
export const useToggleCampaignActive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive, businessId }: { id: string; isActive: boolean; businessId: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, businessId } as Campaign & { businessId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.businessId] });
      queryClient.invalidateQueries({ queryKey: ['active-campaign', data.businessId] });
    },
  });
};

// Create campaign banner
export const useCreateCampaignBanner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (banner: Omit<CampaignBanner, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('campaign_banners')
        .insert(banner)
        .select()
        .single();
      
      if (error) throw error;
      return data as CampaignBanner;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-banners', data.campaign_id] });
    },
  });
};

// Update campaign banner
export const useUpdateCampaignBanner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignBanner> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaign_banners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as CampaignBanner;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-banners', data.campaign_id] });
    },
  });
};

// Delete campaign banner
export const useDeleteCampaignBanner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from('campaign_banners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-banners', data.campaignId] });
    },
  });
};

// Create campaign product
export const useCreateCampaignProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<CampaignProduct, 'id' | 'created_at' | 'updated_at' | 'product'>) => {
      const { data, error } = await supabase
        .from('campaign_products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data as CampaignProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-products', data.campaign_id] });
    },
  });
};

// Update campaign product
export const useUpdateCampaignProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignProduct> & { id: string }) => {
      // Remove the 'product' field from updates as it's a joined field
      const { product, ...cleanUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('campaign_products')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as CampaignProduct;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-products', data.campaign_id] });
    },
  });
};

// Delete campaign product
export const useDeleteCampaignProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId: string }) => {
      const { error } = await supabase
        .from('campaign_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-products', data.campaignId] });
    },
  });
};

// Bulk add existing products to campaign
export const useBulkAddProductsToCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ campaignId, productIds }: { campaignId: string; productIds: string[] }) => {
      const products = productIds.map((productId, index) => ({
        campaign_id: campaignId,
        product_id: productId,
        is_campaign_only: false,
        sort_order: index,
        active: true,
      }));
      
      const { data, error } = await supabase
        .from('campaign_products')
        .insert(products)
        .select();
      
      if (error) throw error;
      return { campaignId, data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-products', data.campaignId] });
    },
  });
};

// Duplicate a campaign with all its banners and products
export const useDuplicateCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ campaignId, businessId, newName }: { campaignId: string; businessId: string; newName: string }) => {
      // 1. Fetch the original campaign
      const { data: originalCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      
      if (campaignError) throw campaignError;
      
      // 2. Create a new campaign with the same settings (but inactive)
      const { data: newCampaign, error: newCampaignError } = await supabase
        .from('campaigns')
        .insert({
          business_id: businessId,
          name: newName,
          description: originalCampaign.description,
          display_mode: originalCampaign.display_mode,
          is_active: false, // Always start inactive
          start_date: null, // Reset dates
          end_date: null,
        })
        .select()
        .single();
      
      if (newCampaignError) throw newCampaignError;
      
      // 3. Fetch and duplicate banners
      const { data: originalBanners, error: bannersError } = await supabase
        .from('campaign_banners')
        .select('*')
        .eq('campaign_id', campaignId);
      
      if (bannersError) throw bannersError;
      
      if (originalBanners && originalBanners.length > 0) {
        const newBanners = originalBanners.map(banner => ({
          campaign_id: newCampaign.id,
          title: banner.title,
          text: banner.text,
          image_url: banner.image_url,
          cta_text: banner.cta_text,
          cta_url: banner.cta_url,
          sort_order: banner.sort_order,
          active: banner.active,
        }));
        
        const { error: insertBannersError } = await supabase
          .from('campaign_banners')
          .insert(newBanners);
        
        if (insertBannersError) throw insertBannersError;
      }
      
      // 4. Fetch and duplicate products
      const { data: originalProducts, error: productsError } = await supabase
        .from('campaign_products')
        .select('*')
        .eq('campaign_id', campaignId);
      
      if (productsError) throw productsError;
      
      if (originalProducts && originalProducts.length > 0) {
        const newProducts = originalProducts.map(product => ({
          campaign_id: newCampaign.id,
          product_id: product.product_id,
          is_campaign_only: product.is_campaign_only,
          name: product.name,
          description: product.description,
          price: product.price,
          sale_price: product.sale_price,
          image_url: product.image_url,
          sort_order: product.sort_order,
          active: product.active,
        }));
        
        const { error: insertProductsError } = await supabase
          .from('campaign_products')
          .insert(newProducts);
        
        if (insertProductsError) throw insertProductsError;
      }
      
      return { newCampaign, businessId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', data.businessId] });
    },
  });
};
