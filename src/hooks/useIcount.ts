import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// iCount as a STOREFRONT gateway (the merchant's own iCount account charges their
// end-customers). Credentials: api_key = the merchant's iCount API token,
// page_uid = their paypage id. Verification + charging happen server-side via the
// iCount adapter (payments-verify / payments-create / payments-callback).

export interface IcountCredentials {
  api_key: string;
  page_uid: string;
  verified_at: string | null;
}

export const useIcountCredentials = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["payment-credentials", businessId, "icount"],
    enabled: !!businessId,
    queryFn: async (): Promise<IcountCredentials | null> => {
      const { data, error } = await (supabase as any)
        .from("payment_credentials")
        .select("api_key, page_uid, verified_at")
        .eq("business_id", businessId)
        .eq("provider", "icount")
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

// Validate the token + paypage against iCount before saving (no charge). Runs the
// adapter's verifyCredentials via payments-verify.
export async function verifyIcountCredentials(input: {
  businessId: string;
  api_key: string;
  page_uid: string;
}): Promise<{ ok: boolean; error?: string; paypageId?: string | number }> {
  const { data, error } = await supabase.functions.invoke("payments-verify", {
    body: { ...input, provider: "icount" },
  });
  if (error) {
    // A transport-level failure (function unreachable / temporary load) shouldn't
    // read like the credentials are wrong - it's a pre-check, and saving still works.
    const transient = /failed to send|fetch|network|timeout/i.test(error.message || "");
    return { ok: false, error: transient ? "לא הצלחנו לבדוק את החיבור כרגע (עומס זמני). אפשר לשמור ולנסות שוב מאוחר יותר." : error.message };
  }
  return data as { ok: boolean; error?: string; paypageId?: string | number };
}

// Save credentials (owner RLS) and flip the store to iCount checkout.
export const useSaveIcountCredentials = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { businessId: string; api_key: string; page_uid: string; verified: boolean }) => {
      const { error: credErr } = await (supabase as any)
        .from("payment_credentials")
        .upsert(
          {
            business_id: input.businessId,
            provider: "icount",
            api_key: input.api_key,
            page_uid: input.page_uid,
            mode: "live",
            verified_at: input.verified ? new Date().toISOString() : null,
          },
          { onConflict: "business_id,provider" },
        );
      if (credErr) throw credErr;

      const { error: bizErr } = await supabase
        .from("businesses")
        .update({ payment_enabled: true, payment_provider: "icount" } as any)
        .eq("id", input.businessId);
      if (bizErr) throw bizErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["payment-credentials", vars.businessId, "icount"] });
      toast.success("סליקת iCount חוברה ונשמרה בהצלחה");
    },
    onError: (e: any) => toast.error("שמירת סליקת iCount נכשלה: " + e.message),
  });
};
