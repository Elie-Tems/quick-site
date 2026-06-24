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
      // Cap the initial load so the admin never tries to pull thousands of rows
      // at once (kept the most-recent 300; full search/pagination is the next step).
      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) throw error;
      
      // Counts in BULK (3 queries total) instead of N+1 per business — the old
      // per-business loop fired dozens of concurrent queries and could hang.
      const ids = (businesses || []).map((b) => b.id);
      const safeIds = ids.length ? ids : ['00000000-0000-0000-0000-000000000000'];
      const tally = (rows: { business_id: string }[] | null) => {
        const m: Record<string, number> = {};
        (rows || []).forEach((r) => { m[r.business_id] = (m[r.business_id] || 0) + 1; });
        return m;
      };

      const [prodRes, orderRes] = await Promise.all([
        supabase.from('products').select('business_id').in('business_id', safeIds),
        supabase.from('orders').select('business_id').in('business_id', safeIds),
      ]);
      const pc = tally(prodRes.data as any);
      const oc = tally(orderRes.data as any);

      const businessesWithStats: BusinessWithStats[] = (businesses || []).map((biz) => ({
        ...biz,
        products_count: pc[biz.id] || 0,
        orders_count: oc[biz.id] || 0,
        page_views_count: 0,
      }));

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

// All cancelled subscriptions (admin only - RLS "Admins can view all subscriptions").
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

// ─── MRR / ARR ────────────────────────────────────────────────────────────────
export interface MRRPoint {
  month: string;
  mrr: number;
  new_mrr: number;
  churned_mrr: number;
}

export function useMRR() {
  return useQuery({
    queryKey: ["admin-mrr"],
    queryFn: async (): Promise<MRRPoint[]> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_name, created_at, status, cancel_at, paid_until, monthly_total")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const planPrice: Record<string, number> = {
        basic: 69,
        recommended: 69,
        premium: 69,
      };

      const byMonth: Record<string, { new_mrr: number; churned_mrr: number }> = {};
      const now = new Date();

      (data || []).forEach((sub: any) => {
        // Only count subscriptions that were ACTUALLY paid (real revenue), not
        // every signup row — otherwise the dashboard shows demo/fake money.
        const reallyPaid = sub.paid_until && new Date(sub.paid_until) > now && sub.status === "active";
        if (!reallyPaid) return;
        const price = Number(sub.monthly_total) || planPrice[sub.plan_name?.toLowerCase()] || 69;
        const createdMonth = sub.created_at?.slice(0, 7);
        if (createdMonth) {
          if (!byMonth[createdMonth]) byMonth[createdMonth] = { new_mrr: 0, churned_mrr: 0 };
          byMonth[createdMonth].new_mrr += price;
        }
        if (sub.cancel_at) {
          const cancelMonth = sub.cancel_at.slice(0, 7);
          if (!byMonth[cancelMonth]) byMonth[cancelMonth] = { new_mrr: 0, churned_mrr: 0 };
          byMonth[cancelMonth].churned_mrr += price;
        }
      });

      let cumulative = 0;
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { new_mrr, churned_mrr }]) => {
          cumulative += new_mrr - churned_mrr;
          return { month, mrr: Math.max(0, cumulative), new_mrr, churned_mrr };
        });
    },
  });
}

// ─── Conversion Funnel ────────────────────────────────────────────────────────
export interface FunnelStep {
  label: string;
  count: number;
  pct: number;
}

export function useConversionFunnel() {
  return useQuery({
    queryKey: ["admin-funnel"],
    queryFn: async (): Promise<FunnelStep[]> => {
      const [{ count: registered }, { count: withBusiness }, { count: published }, { count: withOrder }] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("businesses").select("*", { count: "exact", head: true }),
          supabase.from("businesses").select("*", { count: "exact", head: true }).eq("is_published", true),
          supabase.from("orders").select("business_id", { count: "exact", head: true }),
        ]);

      const steps = [
        { label: "נרשמו", count: registered ?? 0 },
        { label: "יצרו עסק", count: withBusiness ?? 0 },
        { label: "פרסמו אתר", count: published ?? 0 },
        { label: "הזמנה ראשונה", count: withOrder ?? 0 },
      ];
      const top = steps[0].count || 1;
      return steps.map((s) => ({ ...s, pct: Math.round((s.count / top) * 100) }));
    },
  });
}

// ─── Churn Rate ───────────────────────────────────────────────────────────────
export interface ChurnPoint {
  month: string;
  active: number;
  churned: number;
  churn_rate: number;
}

export function useChurnRate() {
  return useQuery({
    queryKey: ["admin-churn"],
    queryFn: async (): Promise<ChurnPoint[]> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, created_at, cancel_at")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const byMonth: Record<string, { active: number; churned: number }> = {};
      (data || []).forEach((sub) => {
        const m = sub.created_at?.slice(0, 7);
        if (!m) return;
        if (!byMonth[m]) byMonth[m] = { active: 0, churned: 0 };
        byMonth[m].active++;
        if (sub.cancel_at) {
          const cm = sub.cancel_at.slice(0, 7);
          if (!byMonth[cm]) byMonth[cm] = { active: 0, churned: 0 };
          byMonth[cm].churned++;
        }
      });

      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { active, churned }]) => ({
          month,
          active,
          churned,
          churn_rate: active > 0 ? Math.round((churned / active) * 100) : 0,
        }));
    },
  });
}

// ─── Top Performers ───────────────────────────────────────────────────────────
export interface TopBusiness {
  id: string;
  name: string;
  slug: string | null;
  orders_count: number;
  revenue: number;
  page_views: number;
}

export function useTopPerformers(limit = 10) {
  return useQuery({
    queryKey: ["admin-top-performers", limit],
    queryFn: async (): Promise<TopBusiness[]> => {
      const { data: businesses, error } = await supabase
        .from("businesses")
        .select("id, name, slug");
      if (error) throw error;

      const results = await Promise.all(
        (businesses || []).map(async (biz) => {
          const [{ data: orders }, { count: views }] = await Promise.all([
            supabase.from("orders").select("total_price").eq("business_id", biz.id),
            supabase.from("page_views").select("*", { count: "exact", head: true }).eq("business_id", biz.id),
          ]);
          const revenue = (orders || []).reduce((s, o) => s + (o.total_price || 0), 0);
          return {
            id: biz.id,
            name: biz.name,
            slug: biz.slug,
            orders_count: orders?.length ?? 0,
            revenue,
            page_views: views ?? 0,
          };
        })
      );

      return results.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
    },
  });
}

// ─── Dormant Businesses ───────────────────────────────────────────────────────
export interface DormantBusiness {
  id: string;
  name: string;
  slug: string | null;
  owner_email: string | null;
  created_at: string;
  is_published: boolean;
  last_order_at: string | null;
  days_inactive: number;
}

export function useDormantBusinesses() {
  return useQuery({
    queryKey: ["admin-dormant"],
    queryFn: async (): Promise<DormantBusiness[]> => {
      const { data: businesses, error } = await supabase
        .from("businesses")
        .select("id, name, slug, email, created_at, is_published");
      if (error) throw error;

      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 30);

      const results = await Promise.all(
        (businesses || []).map(async (biz) => {
          const { data: lastOrder } = await supabase
            .from("orders")
            .select("created_at")
            .eq("business_id", biz.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastAt = lastOrder?.created_at ?? null;
          const refDate = lastAt ? new Date(lastAt) : new Date(biz.created_at);
          const daysInactive = Math.floor((Date.now() - refDate.getTime()) / 86400000);

          return {
            id: biz.id,
            name: biz.name,
            slug: biz.slug,
            owner_email: biz.email ?? null,
            created_at: biz.created_at,
            is_published: biz.is_published ?? false,
            last_order_at: lastAt,
            days_inactive: daysInactive,
          };
        })
      );

      return results
        .filter((b) => b.days_inactive >= 30)
        .sort((a, b) => b.days_inactive - a.days_inactive);
    },
  });
}

// ─── Category Distribution ────────────────────────────────────────────────────
export interface CategorySlice {
  category: string;
  count: number;
  pct: number;
}

export function useCategoryDistribution() {
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async (): Promise<CategorySlice[]> => {
      const { data, error } = await supabase
        .from("businesses")
        .select("business_category");
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((b) => {
        const cat = b.business_category || "לא מוגדר";
        counts[cat] = (counts[cat] || 0) + 1;
      });

      const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => ({ category, count, pct: Math.round((count / total) * 100) }));
    },
  });
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
export interface ActivityEvent {
  id: string;
  type: "order" | "signup" | "publish" | "cancel";
  label: string;
  time: string;
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ["admin-activity"],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const [{ data: orders }, { data: profiles }, { data: published }, { data: cancels }] =
        await Promise.all([
          supabase.from("orders").select("id, customer_name, created_at").order("created_at", { ascending: false }).limit(20),
          supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(20),
          supabase.from("businesses").select("id, name, updated_at").eq("is_published", true).order("updated_at", { ascending: false }).limit(20),
          supabase.from("subscriptions").select("id, plan_name, cancel_at").not("cancel_at", "is", null).order("cancel_at", { ascending: false }).limit(20),
        ]);

      const events: ActivityEvent[] = [
        ...(orders || []).map((o) => ({
          id: `order-${o.id}`,
          type: "order" as const,
          label: `הזמנה חדשה מ-${o.customer_name || "לקוח"}`,
          time: o.created_at,
        })),
        ...(profiles || []).map((p) => ({
          id: `signup-${p.id}`,
          type: "signup" as const,
          label: `נרשם: ${p.full_name || "משתמש חדש"}`,
          time: p.created_at,
        })),
        ...(published || []).map((b) => ({
          id: `publish-${b.id}`,
          type: "publish" as const,
          label: `פרסם אתר: ${b.name}`,
          time: b.updated_at,
        })),
        ...(cancels || []).map((s) => ({
          id: `cancel-${s.id}`,
          type: "cancel" as const,
          label: `ביטול מנוי: ${s.plan_name}`,
          time: s.cancel_at!,
        })),
      ];

      return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 50);
    },
    refetchInterval: 30000,
  });
}

// ─── Payment Errors ───────────────────────────────────────────────────────────
export interface PaymentError {
  provider: string;
  count: number;
  common_reason: string;
}

export function usePaymentErrors() {
  return useQuery({
    queryKey: ["admin-payment-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("payment_provider, error_message, status, created_at")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const byProvider: Record<string, { count: number; reasons: string[] }> = {};
      (data || []).forEach((p) => {
        const provider = p.payment_provider || "לא ידוע";
        if (!byProvider[provider]) byProvider[provider] = { count: 0, reasons: [] };
        byProvider[provider].count++;
        if (p.error_message) byProvider[provider].reasons.push(p.error_message);
      });

      return Object.entries(byProvider).map(([provider, { count, reasons }]) => {
        const reasonCounts: Record<string, number> = {};
        reasons.forEach((r) => { reasonCounts[r] = (reasonCounts[r] || 0) + 1; });
        const common_reason = Object.entries(reasonCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "לא ידוע";
        return { provider, count, common_reason };
      });
    },
  });
}

// ─── Cohort Retention ─────────────────────────────────────────────────────────
export interface CohortRow {
  cohort: string;
  total: number;
  d30: number;
  d60: number;
  d90: number;
}

export function useCohortRetention() {
  return useQuery({
    queryKey: ["admin-cohort"],
    queryFn: async (): Promise<CohortRow[]> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("created_at, cancel_at, status");
      if (error) throw error;

      const byCohort: Record<string, { subs: Array<{ created_at: string; cancel_at: string | null }> }> = {};
      (data || []).forEach((sub) => {
        const cohort = sub.created_at?.slice(0, 7);
        if (!cohort) return;
        if (!byCohort[cohort]) byCohort[cohort] = { subs: [] };
        byCohort[cohort].subs.push({ created_at: sub.created_at, cancel_at: sub.cancel_at ?? null });
      });

      return Object.entries(byCohort)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cohort, { subs }]) => {
          const total = subs.length;
          const active = (days: number) =>
            subs.filter((s) => {
              if (!s.cancel_at) return true;
              const diff = (new Date(s.cancel_at).getTime() - new Date(s.created_at).getTime()) / 86400000;
              return diff > days;
            }).length;

          return {
            cohort,
            total,
            d30: total > 0 ? Math.round((active(30) / total) * 100) : 0,
            d60: total > 0 ? Math.round((active(60) / total) * 100) : 0,
            d90: total > 0 ? Math.round((active(90) / total) * 100) : 0,
          };
        });
    },
  });
}
