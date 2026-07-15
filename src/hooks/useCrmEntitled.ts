import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useMyBusiness } from "@/hooks/useBusiness";

// Entitlement for the premium CRM + profitability features. Everyone can OPEN the
// screens (demo view); only an active CRM add-on (or an admin) unlocks real use.
// Per-site: the add-on is checked on the ACTIVE business's subscription.
export function useCrmEntitled() {
  const { data: isAdmin } = useIsAdmin();
  const { data: business } = useMyBusiness();

  const { data: hasAddon } = useQuery({
    queryKey: ["crm-entitled", business?.id],
    queryFn: async () => {
      if (!business?.id) return false;
      const { data } = await supabase
        .from("subscriptions")
        .select("crm_addon_enabled, status")
        .eq("business_id", business.id)
        .maybeSingle();
      return !!(data && (data as any).crm_addon_enabled && data.status === "active");
    },
    enabled: !!business?.id,
  });

  return { entitled: !!isAdmin || !!hasAddon, isAdmin: !!isAdmin };
}
