import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listings hooks (real estate / vehicles). New table (migration 20260708140000)
 * not yet in generated types -> cast for now. Leads go through the
 * contacts-capture edge function (service-role), never a direct anon write.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface Listing {
  id: string; business_id: string; kind: "property" | "vehicle" | "generic";
  title: string; description: string | null; price: number | null; currency: string;
  price_period: string | null; category: string | null; status: string; is_hot: boolean;
  city: string | null; address: string | null;
  attrs: Record<string, unknown>; media: { images?: string[]; video?: string; tour360?: string; floor_plan?: string };
  active: boolean; sort_order: number;
}

export const useListings = (businessId?: string, opts?: { category?: string }) =>
  useQuery({
    queryKey: ["listings", businessId, opts?.category],
    enabled: !!businessId,
    queryFn: async (): Promise<Listing[]> => {
      let q = sb.from("listings").select("*").eq("business_id", businessId).eq("active", true);
      if (opts?.category && opts.category !== "all") q = q.eq("category", opts.category);
      const { data, error } = await q.order("is_hot", { ascending: false }).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useUpsertListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: Partial<Listing> & { business_id: string }) => {
      const { data, error } = await sb.from("listings").upsert(l).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["listings", v.business_id] }),
  });
};

/** Submit a lead from a listing's contact form -> CRM (via edge function). */
export const useSubmitLead = () =>
  useMutation({
    mutationFn: async (p: {
      businessId: string; name: string; phone: string; email?: string;
      message?: string; title?: string; value?: number; details?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke("contacts-capture", { body: p });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { ok: true; contactId: string };
    },
  });
