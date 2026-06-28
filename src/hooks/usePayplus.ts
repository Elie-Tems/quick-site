import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Siango's dedicated PayPlus affiliate registration link for merchants.
export const PAYPLUS_SIGNUP_URL =
  "https://aff.pays.plus/bfb5d231-0a45-495c-9976-cd9cef45e02b?ref=";

export interface PayplusCredentials {
  api_key: string;
  secret_key: string;
  page_uid: string;
  mode: "test" | "live";
  verified_at: string | null;
}

// Load the merchant's saved PayPlus credentials (owner-only via RLS).
export const usePaymentCredentials = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["payment-credentials", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<PayplusCredentials | null> => {
      const { data, error } = await (supabase as any)
        .from("payment_credentials")
        .select("api_key, secret_key, page_uid, mode, verified_at")
        .eq("business_id", businessId)
        .eq("provider", "payplus")
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

// Validate keys against PayPlus before saving (generating a link does not charge).
export async function verifyPayplusCredentials(input: {
  businessId: string;
  api_key: string;
  secret_key: string;
  page_uid: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("payments-verify", {
    body: { ...input, provider: "payplus" },
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; error?: string };
}

// Save credentials (owner RLS) and flip the store's payment flags on.
export const useSavePayplusCredentials = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      businessId: string;
      api_key: string;
      secret_key: string;
      page_uid: string;
      mode?: "test" | "live";
      verified: boolean;
    }) => {
      const { error: credErr } = await (supabase as any)
        .from("payment_credentials")
        .upsert(
          {
            business_id: input.businessId,
            provider: "payplus",
            api_key: input.api_key,
            secret_key: input.secret_key,
            page_uid: input.page_uid,
            mode: input.mode ?? "test",
            verified_at: input.verified ? new Date().toISOString() : null,
          },
          { onConflict: "business_id,provider" },
        );
      if (credErr) throw credErr;

      const { error: bizErr } = await supabase
        .from("businesses")
        .update({ payment_enabled: true, payment_provider: "payplus" } as any)
        .eq("id", input.businessId);
      if (bizErr) throw bizErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["payment-credentials", vars.businessId] });
      toast.success("הסליקה חוברה ונשמרה בהצלחה");
    },
    onError: (e: any) => toast.error("שמירת הסליקה נכשלה: " + e.message),
  });
};

// Public storefront: create the order on the server and jump to PayPlus.
export async function startPayplusPayment(input: {
  businessId: string;
  slug?: string;
  items: { product_id: string; quantity: number }[];
  customer: { fullName: string; phone: string; email: string };
  notes?: string;
  deliveryMethod?: "pickup" | "delivery";
  deliveryAddress?: string;
  couponCode?: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("payments-create", {
    body: input,
  });
  if (error) throw new Error(error.message);
  const link = (data as any)?.payment_page_link;
  if (!link) throw new Error((data as any)?.error || "לא ניתן ליצור דף תשלום");
  let parsed: URL;
  try { parsed = new URL(link); } catch { throw new Error("Invalid payment redirect URL"); }
  if (parsed.protocol !== "https:") throw new Error("Invalid payment redirect URL: only https is allowed");
  window.location.href = link;
}
