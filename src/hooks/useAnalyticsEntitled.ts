import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";

// Analytics entitlement: unlocked by CRM add-on OR standalone analytics add-on (or admin).
export function useAnalyticsEntitled() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  const { data: hasAddon } = useQuery({
    queryKey: ["analytics-entitled", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("subscriptions")
        .select("crm_addon_enabled, analytics_addon_enabled, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data || data.status !== "active") return false;
      return !!((data as any).crm_addon_enabled || (data as any).analytics_addon_enabled);
    },
    enabled: !!user?.id,
  });

  return { entitled: !!isAdmin || !!hasAddon, isAdmin: !!isAdmin };
}
