import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";

// Entitlement for the premium CRM + profitability features. Everyone can OPEN the
// screens (demo view); only an active CRM add-on (or an admin) unlocks real use.
export function useCrmEntitled() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  const { data: hasAddon } = useQuery({
    queryKey: ["crm-entitled", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("subscriptions")
        .select("crm_addon_enabled, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return !!(data && (data as any).crm_addon_enabled && data.status === "active");
    },
    enabled: !!user?.id,
  });

  return { entitled: !!isAdmin || !!hasAddon, isAdmin: !!isAdmin };
}
