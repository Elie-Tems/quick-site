import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Business {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  whatsapp_enabled: boolean | null;
  payment_enabled: boolean | null;
  primary_color: string | null;
  color_palette: string[] | null;
  hero_image_url: string | null;
  hero_benefits: string[] | null;
  brand_style: string | null;
  template_id: string | null;
  // Editable storefront texts
  hero_title: string | null;
  hero_badge: string | null;
  promo_text: string | null;
  cta_text: string | null;
  about_text: string | null;
  about_page_body: string | null;
  custom_labels: Record<string, string> | null;
}

export interface ProductCustomField {
  id: string;
  field_name: string;
  field_value: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean | null;
  sku: string | null;
  sale_price: number | null;
  is_on_sale: boolean | null;
  is_hot: boolean | null;
  category_id: string | null;
  custom_fields?: ProductCustomField[];
}

export interface Banner {
  id: string;
  title: string | null;
  text: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  active: boolean | null;
}

export function useStorefront(slug: string | undefined) {
  // Check if we're in preview mode
  const isPreviewMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'true';
  
  // Fetch business by slug
  const businessQuery = useQuery({
    queryKey: ['storefront-business', slug, isPreviewMode],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;

      // Suspended sites are taken offline (data retained); show an "unavailable" page.
      if ((data as any).is_suspended) {
        throw new Error('SITE_SUSPENDED');
      }

      // Check if business is published
      if (!data.is_published) {
        // If not published, only allow preview mode with authentication
        if (!isPreviewMode) {
          throw new Error('SITE_NOT_PUBLISHED');
        }
        
        // In development mode, skip auth check for easier testing
        const isDevelopment = import.meta.env.DEV;
        if (isDevelopment) {
          console.log('🔓 Development mode: Skipping preview auth check');
        } else {
          // In production, verify the user is the owner
          const { data: authData } = await supabase.auth.getUser();
          const businessData = data as any;
          if (!authData.user || businessData.owner_id !== authData.user.id) {
            throw new Error('SITE_NOT_PUBLISHED');
          }
        }
      }
      
      const raw = data as Record<string, unknown>;
      return {
        ...raw,
        hero_benefits: Array.isArray(raw?.hero_benefits) ? (raw.hero_benefits as string[]) : null,
      } as Business;
    },
    enabled: !!slug,
    retry: 1,
    staleTime: 0,
  });

  // Fetch products for this business with custom fields
  const productsQuery = useQuery({
    queryKey: ['storefront-products', businessQuery.data?.id, isPreviewMode],
    queryFn: async () => {
      if (!businessQuery.data?.id) return [];
      
      // Fetch products - in preview mode, show all products including inactive ones
      let query = supabase
        .from('products')
        .select('*')
        .eq('business_id', businessQuery.data.id);
      
      // Only filter by active status if NOT in preview mode
      if (!isPreviewMode) {
        query = query.eq('active', true);
      }
      
      const { data: productsData, error: productsError } = await query
        .order('sort_order', { ascending: true });
      
      if (productsError) throw productsError;
      
      // Fetch custom fields for all products (batch in chunks to avoid URL length limits)
      const productIds = productsData.map(p => p.id);
      let allCustomFields: any[] = [];
      
      // Process in batches of 100 to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const { data: batchData, error: batchError } = await supabase
          .from('product_custom_fields')
          .select('*')
          .in('product_id', batch)
          .order('sort_order', { ascending: true });
        
        if (batchError) {
          console.error('Error fetching custom fields batch:', batchError);
          // Continue with other batches even if one fails
          continue;
        }
        
        if (batchData) {
          allCustomFields = [...allCustomFields, ...batchData];
        }
      }
      
      // Map custom fields to products
      const productsWithCustomFields = productsData.map(product => ({
        ...product,
        custom_fields: allCustomFields?.filter(cf => cf.product_id === product.id) || []
      }));
      
      return productsWithCustomFields as Product[];
    },
    enabled: !!businessQuery.data?.id,
  });

  // Fetch banners for this business
  const bannersQuery = useQuery({
    queryKey: ['storefront-banners', businessQuery.data?.id],
    queryFn: async () => {
      if (!businessQuery.data?.id) return [];
      
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('business_id', businessQuery.data.id)
        .eq('active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Banner[];
    },
    enabled: !!businessQuery.data?.id,
  });

  // Fetch product categories for this business (for store filter)
  const categoriesQuery = useQuery({
    queryKey: ['storefront-categories', businessQuery.data?.id],
    queryFn: async () => {
      if (!businessQuery.data?.id) return [];
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, sort_order')
        .eq('business_id', businessQuery.data.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as { id: string; name: string; sort_order: number | null }[];
    },
    enabled: !!businessQuery.data?.id,
  });

  return {
    business: businessQuery.data,
    products: productsQuery.data || [],
    banners: bannersQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoading: businessQuery.isLoading,
    isError: businessQuery.isError,
    error: businessQuery.error,
  };
}
