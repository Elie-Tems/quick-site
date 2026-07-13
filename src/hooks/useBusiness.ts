import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useActiveBusinessId } from '@/lib/activeBusiness';

type Business = Tables<'businesses'>;
type BusinessInsert = TablesInsert<'businesses'>;
type BusinessUpdate = TablesUpdate<'businesses'>;

// Get current user's profile
export const useProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// All businesses this account owns (for the site switcher). One account can own
// several sites; the switcher lists them and flips the active one.
export const useMyBusinesses = () => {
  const { data: profile } = useProfile();
  return useQuery({
    queryKey: ['my-businesses', profile?.id],
    queryFn: async () => {
      if (!profile) return [] as Pick<Business, 'id' | 'name' | 'slug' | 'is_published'>[];
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, is_published')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Pick<Business, 'id' | 'name' | 'slug' | 'is_published'>[];
    },
    enabled: !!profile,
    staleTime: 30000,
  });
};

// Get the business the merchant is currently managing (owner's business). Honors the
// active-business selection from the site switcher; falls back to the most recent.
// Keyed by the active id so a switch refetches and every screen follows at once.
export const useMyBusiness = () => {
  const { data: profile } = useProfile();
  const activeId = useActiveBusinessId();

  return useQuery({
    queryKey: ['my-business', profile?.id, activeId],
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []) as Business[];
      return (activeId && list.find((b) => b.id === activeId)) || list[0] || null;
    },
    enabled: !!profile,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });
};

// Get business by slug (for storefront)
export const useBusinessBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['business', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};

// Get business by ID
export const useBusinessById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['business', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// Create a new business
export const useCreateBusiness = () => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  
  return useMutation({
    mutationFn: async (business: Omit<BusinessInsert, 'owner_id'>) => {
      if (!profile) throw new Error('לא נמצא פרופיל משתמש');
      
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          ...business,
          owner_id: profile.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      toast.success('העסק נוצר בהצלחה!');
    },
    onError: (error) => {
      toast.error('שגיאה ביצירת העסק: ' + error.message);
    },
  });
};

// Update business
export const useUpdateBusiness = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: BusinessUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      queryClient.invalidateQueries({ queryKey: ['business', data.id] });
      queryClient.invalidateQueries({ queryKey: ['storefront-business'] });
      toast.success('הגדרות העסק עודכנו בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון העסק: ' + error.message);
    },
  });
};
