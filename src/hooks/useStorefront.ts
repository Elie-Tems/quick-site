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

  // ONE request for the whole storefront via PostgREST FK embedding. The previous
  // shape was a 3-hop waterfall (business by slug -> then products/banners/
  // categories -> then product_custom_fields), each hop a full round-trip to the
  // DB, which on mobile added 1-2s before anything could render. RLS semantics
  // are unchanged - the same tables are read with the same role.
  const storeQuery = useQuery({
    queryKey: ['storefront', slug, isPreviewMode],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');

      let q = supabase
        .from('businesses')
        .select('*, products(*, product_custom_fields(*)), banners(*), product_categories(id, name, sort_order)')
        .eq('slug', slug)
        .eq('banners.active', true)
        .order('sort_order', { ascending: true, referencedTable: 'products' })
        .order('sort_order', { ascending: true, referencedTable: 'banners' })
        .order('sort_order', { ascending: true, referencedTable: 'product_categories' });

      // In preview mode the owner sees inactive products too.
      if (!isPreviewMode) {
        q = q.eq('products.active', true);
      }

      const { data, error } = await q.single();
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
      const embeddedProducts = (Array.isArray(raw.products) ? raw.products : []) as (Product & { product_custom_fields?: ProductCustomField[] })[];
      const products: Product[] = embeddedProducts.map((p) => {
        const { product_custom_fields, ...rest } = p as any;
        const fields = (Array.isArray(product_custom_fields) ? product_custom_fields : [])
          .slice()
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return { ...rest, custom_fields: fields } as Product;
      });
      const banners = (Array.isArray(raw.banners) ? raw.banners : []) as Banner[];
      const categories = (Array.isArray(raw.product_categories) ? raw.product_categories : []) as { id: string; name: string; sort_order: number | null }[];

      // Strip the embedded arrays off the business object itself.
      const { products: _p, banners: _b, product_categories: _c, ...bizRaw } = raw as any;
      const business = {
        ...bizRaw,
        hero_benefits: Array.isArray(bizRaw?.hero_benefits) ? (bizRaw.hero_benefits as string[]) : null,
      } as Business;

      return { business, products, banners, categories };
    },
    enabled: !!slug,
    retry: 1,
    // Cache the store for public shoppers so repeat views / back-navigation are instant.
    // Owners previewing edits (?preview=true) always get fresh data.
    staleTime: isPreviewMode ? 0 : 60_000,
    gcTime: 5 * 60_000,
  });

  return {
    business: storeQuery.data?.business,
    products: storeQuery.data?.products || [],
    banners: storeQuery.data?.banners || [],
    categories: storeQuery.data?.categories || [],
    isLoading: storeQuery.isLoading,
    isError: storeQuery.isError,
    error: storeQuery.error,
  };
}
