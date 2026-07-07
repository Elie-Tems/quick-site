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
