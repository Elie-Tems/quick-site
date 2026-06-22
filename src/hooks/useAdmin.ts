import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PlatformStats {
  total_businesses: number;
  total_orders: number;
  total_revenue: number;
  total_page_views: number;
  total_unique_visitors: number;
  total_products: number;
  total_users: number;
}

export interface BusinessWithStats {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  created_at: string;
  email: string | null;
  phone: string | null;
  business_category: string | null;
  owner_email?: string;
  products_count?: number;
  orders_count?: number;
  page_views_count?: number;
}

export interface OrderWithBusiness {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_price: number;
  status: string;
  created_at: string;
  business_name: string;
  business_slug: string | null;
}

export function useIsAdmin() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user?.id,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: async () => {
      // Fetch all businesses
      const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('id');
      
      if (bizError) throw bizError;
      
      // Fetch all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_price');
      
      if (ordersError) throw ordersError;
      
      // Fetch all page views
      const { data: pageViews, error: pvError } = await supabase
        .from('page_views')
        .select('visitor_id');
      
      if (pvError) throw pvError;
      
      // Fetch all products
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id');
      
      if (prodError) throw prodError;
      
      // Fetch all profiles
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id');
      
      if (profError) throw profError;
      
      const stats: PlatformStats = {
        total_businesses: businesses?.length || 0,
        total_orders: orders?.length || 0,
        total_revenue: orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0,
        total_page_views: pageViews?.length || 0,
        total_unique_visitors: new Set(pageViews?.map(pv => pv.visitor_id).filter(Boolean)).size,
        total_products: products?.length || 0,
        total_users: profiles?.length || 0,
      };
      
      return stats;
    },
  });
}

export function useAllBusinesses() {
  return useQuery({
    queryKey: ['admin-all-businesses'],
    queryFn: async () => {
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get counts for each business
      const businessesWithStats: BusinessWithStats[] = await Promise.all(
        (businesses || []).map(async (biz) => {
          // Products count
          const { count: productsCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', biz.id);
          
          // Orders count
          const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', biz.id);
          
          // Page views count
          const { count: pageViewsCount } = await supabase
            .from('page_views')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', biz.id);
          
          return {
            ...biz,
            products_count: productsCount || 0,
            orders_count: ordersCount || 0,
            page_views_count: pageViewsCount || 0,
          };
        })
      );
      
      return businessesWithStats;
    },
  });
}

export function useAllOrders() {
  return useQuery({
    queryKey: ['admin-all-orders'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Get business names for each order
      const ordersWithBusiness: OrderWithBusiness[] = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: business } = await supabase
            .from('businesses')
            .select('name, slug')
            .eq('id', order.business_id)
            .maybeSingle();
          
          return {
            ...order,
            business_name: business?.name || 'לא ידוע',
            business_slug: business?.slug || null,
          };
        })
      );
      
      return ordersWithBusiness;
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (businessId: string) => {
      // First delete related data
      await supabase.from('products').delete().eq('business_id', businessId);
      await supabase.from('orders').delete().eq('business_id', businessId);
      await supabase.from('banners').delete().eq('business_id', businessId);
      await supabase.from('coupons').delete().eq('business_id', businessId);
      await supabase.from('page_views').delete().eq('business_id', businessId);
      
      // Then delete the business
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-platform-stats'] });
      toast.success('העסק נמחק בהצלחה');
    },
    onError: (error) => {
      console.error('Error deleting business:', error);
      toast.error('שגיאה במחיקת העסק');
    },
  });
}

export function usePageViewsOverTime(days: number = 30) {
  return useQuery({
    queryKey: ['admin-page-views-over-time', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('page_views')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Group by date
      const viewsByDate: Record<string, number> = {};
      data?.forEach(pv => {
        const date = new Date(pv.created_at).toLocaleDateString('he-IL');
        viewsByDate[date] = (viewsByDate[date] || 0) + 1;
      });
      
      return Object.entries(viewsByDate).map(([date, count]) => ({
        date,
        views: count,
      }));
    },
  });
}

export interface CancellationRow {
  id: string;
  plan_name: string;
  cancel_type: string | null;
  cancel_at: string | null;
  cancel_reason: string | null;
  paid_until: string | null;
  created_at: string;
}

// All cancelled subscriptions (admin only — RLS "Admins can view all subscriptions").
export function useCancellations() {
  return useQuery({
    queryKey: ["admin-cancellations"],
    queryFn: async (): Promise<CancellationRow[]> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, plan_name, cancel_type, cancel_at, cancel_reason, paid_until, created_at")
        .eq("status", "cancelled")
        .order("cancel_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as CancellationRow[];
    },
  });
}
