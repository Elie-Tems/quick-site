import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Banner = Tables<'banners'>;
type BannerInsert = TablesInsert<'banners'>;
type BannerUpdate = TablesUpdate<'banners'>;

// Get all banners for a business
export const useBanners = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['banners', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
};

// Get active banners for storefront
export const useActiveBanners = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ['banners', businessId, 'active'],
    queryFn: async () => {
      if (!businessId) return [];
      
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('sort_order', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });
};

// Create banner
export const useCreateBanner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (banner: BannerInsert) => {
      const { data, error } = await supabase
        .from('banners')
        .insert(banner)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['banners', data.business_id] });
      toast.success('הבאנר נוסף בהצלחה!');
    },
    onError: (error) => {
      toast.error('שגיאה בהוספת הבאנר: ' + error.message);
    },
  });
};

// Update banner
export const useUpdateBanner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: BannerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('banners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['banners', data.business_id] });
      toast.success('הבאנר עודכן בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון הבאנר: ' + error.message);
    },
  });
};

// Delete banner
export const useDeleteBanner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, businessId }: { id: string; businessId: string }) => {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, businessId };
    },
    onSuccess: ({ businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['banners', businessId] });
      toast.success('הבאנר נמחק בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה במחיקת הבאנר: ' + error.message);
    },
  });
};
