import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Nedarim Plus (נדרים פלוס) as a STOREFRONT donation gateway: the nonprofit's /
// synagogue's OWN Nedarim mosad charges donors, money reaches their account.
// Stored in payment_credentials: page_uid = מספר מוסד (7 digits),
// config.api_valid = the public ApiValid (from Nedarim's "מפתחות API" screen).
// config.mosad_id mirrors page_uid for clarity. There is no pre-charge credential
// check in Nedarim's API - the ApiValid is validated on the first real donation.

export interface NedarimCredentials {
  mosad_id: string;
  api_valid: string;
}

export const useNedarimCredentials = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["payment-credentials", businessId, "nedarimplus"],
    enabled: !!businessId,
    queryFn: async (): Promise<NedarimCredentials | null> => {
      const { data, error } = await (supabase as any)
        .from("payment_credentials")
        .select("page_uid, config")
        .eq("business_id", businessId)
        .eq("provider", "nedarimplus")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const config = (data.config ?? {}) as Record<string, unknown>;
      return {
        mosad_id: (data.page_uid as string) || (config.mosad_id as string) || "",
        api_valid: (config.api_valid as string) || "",
      };
    },
  });

// Save credentials (owner RLS) and flip the store to Nedarim Plus donations.
export const useSaveNedarimCredentials = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { businessId: string; mosad_id: string; api_valid: string }) => {
      const mosad = input.mosad_id.trim();
      const apiValid = input.api_valid.trim();
      const { error: credErr } = await (supabase as any)
        .from("payment_credentials")
        .upsert(
          {
            business_id: input.businessId,
            provider: "nedarimplus",
            page_uid: mosad,
            config: { mosad_id: mosad, api_valid: apiValid },
            mode: "live",
            verified_at: new Date().toISOString(),
          },
          { onConflict: "business_id,provider" },
        );
      if (credErr) throw credErr;

      const { error: bizErr } = await supabase
        .from("businesses")
        .update({ payment_enabled: true, payment_provider: "nedarimplus" } as any)
        .eq("id", input.businessId);
      if (bizErr) throw bizErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["payment-credentials", vars.businessId, "nedarimplus"] });
      toast.success("סליקת נדרים פלוס חוברה ונשמרה בהצלחה");
    },
    onError: (e: any) => toast.error("שמירת סליקת נדרים פלוס נכשלה: " + e.message),
  });
};
