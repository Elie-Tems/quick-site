import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useMyBusiness } from "@/hooks/useBusiness";

// Analytics entitlement: unlocked by CRM add-on OR standalone analytics add-on (or admin).
// Per-site: checked on the ACTIVE business's subscription.
export function useAnalyticsEntitled() {
  const { data: isAdmin } = useIsAdmin();
  const { data: business } = useMyBusiness();

  const { data: hasAddon } = useQuery({
    queryKey: ["analytics-entitled", business?.id],
    queryFn: async () => {
      if (!business?.id) return false;
      const { data } = await supabase
        .from("subscriptions")
        .select("crm_addon_enabled, analytics_addon_enabled, status")
        .eq("business_id", business.id)
        .maybeSingle();
      if (!data || data.status !== "active") return false;
      return !!((data as any).crm_addon_enabled || (data as any).analytics_addon_enabled);
    },
    enabled: !!business?.id,
  });

  return { entitled: !!isAdmin || !!hasAddon, isAdmin: !!isAdmin };
}
