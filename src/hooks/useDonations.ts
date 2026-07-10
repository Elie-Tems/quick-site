import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Donation campaigns hooks. New table (migration 20260708150000) not yet in
 * generated types -> cast for now. A donation itself is a transactions row of
 * kind='donation'; recurring donations reuse the iCount billing engine. Section
 * 46 is gated by businesses.section46_enabled (OFF by default).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface DonationCampaign {
  id: string; business_id: string; title: string; description: string | null;
  goal_amount: number | null; raised_cached: number; backers_cached: number;
  cover_url: string | null; is_crowdfunding: boolean; deadline: string | null;
  all_or_nothing: boolean; tiers: { amount: number; title: string; desc?: string; limit?: number }[];
  active: boolean; sort_order: number;
}

export const useDonationCampaigns = (businessId?: string) =>
  useQuery({
    queryKey: ["donation-campaigns", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<DonationCampaign[]> => {
      const { data, error } = await sb.from("donation_campaigns")
        .select("*").eq("business_id", businessId).eq("active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<DonationCampaign> & { business_id: string }) => {
      const { data, error } = await sb.from("donation_campaigns").upsert(c).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["donation-campaigns", v.business_id] }),
  });
};

/** Whether this business issues Section 46 tax receipts (never assume - OFF by default). */
export const useSection46Enabled = (businessId?: string) =>
  useQuery({
    queryKey: ["section46", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<boolean> => {
      const { data } = await sb.from("businesses").select("section46_enabled").eq("id", businessId).maybeSingle();
      return !!data?.section46_enabled;
    },
  });

// ---- תרומות ישראל (Tax Authority) reporting config ----
// Provider-agnostic: iCount auto-issues today; Morning/ריווחית/SUMIT/self run in
// record mode (Siango stores the donor ID, the nonprofit issues the receipt).
export type ReceiptProvider = "icount" | "morning" | "rivhit" | "sumit" | "self";
export interface DonationReporting { number46: string; enabled: boolean; hasToken: boolean; provider: ReceiptProvider; }
export const useDonationReporting = (businessId?: string) =>
  useQuery({
    queryKey: ["donation-reporting", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<DonationReporting> => {
      const { data: b } = await sb.from("businesses")
        .select("nonprofit_46_number, donation_reporting_enabled, donation_receipt_provider").eq("id", businessId).maybeSingle();
      const { data: c } = await sb.from("donation_receipt_credentials")
        .select("business_id").eq("business_id", businessId).maybeSingle();
      return {
        number46: b?.nonprofit_46_number || "", enabled: !!b?.donation_reporting_enabled, hasToken: !!c,
        provider: (b?.donation_receipt_provider as ReceiptProvider) || "icount",
      };
    },
  });

export const useSaveDonationReporting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { businessId: string; number46: string; provider: ReceiptProvider; apiToken?: string; companyId?: string; enabled: boolean }) => {
      const { data, error } = await supabase.functions.invoke("donation-reporting-settings", { body: v });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { ok: boolean; enabled: boolean; hasToken: boolean; provider: string; mode: string; blocked: string | null };
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["donation-reporting", v.businessId] }),
  });
};
