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
      // Check if any listings exist for this business
      const { data: any1 } = await sb.from("listings").select("id").eq("business_id", businessId).eq("active", true).limit(1);
      const hasListings = Array.isArray(any1) && any1.length > 0;

      if (hasListings) {
        let q = sb.from("listings").select("*").eq("business_id", businessId).eq("active", true);
        if (opts?.category && opts.category !== "all") q = q.eq("category", opts.category);
        const { data, error } = await q.order("is_hot", { ascending: false }).order("sort_order");
        if (error) throw error;
        return data ?? [];
      }

      // No listings yet — fall back to products table (only for "הכל" tab)
      if (!opts?.category || opts.category === "all") {
        const { data: prods } = await supabase
          .from("products")
          .select("id, business_id, name, description, price, image_url, sort_order, active")
          .eq("business_id", businessId as string)
          .eq("active", true)
          .order("sort_order");
        if (prods && prods.length > 0) {
          return prods.map((p: any) => ({
            id: p.id, business_id: p.business_id, kind: "property" as const,
            title: p.name, description: p.description ?? null,
            price: p.price ?? null, currency: "ILS", price_period: null,
            category: null, status: "available", is_hot: false,
            city: null, address: null, attrs: {},
            media: { images: p.image_url ? [p.image_url] : [] },
            active: true, sort_order: p.sort_order ?? 0,
          } as Listing));
        }
      }

      return [];
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
      if (error) {
        console.error("contacts-capture error:", error);
        throw new Error(typeof error === "object" && "message" in error ? (error as any).message : JSON.stringify(error));
      }
      if ((data as { error?: string })?.error) {
        const msg = (data as { error: string }).error;
        console.error("contacts-capture data error:", msg, data);
        throw new Error(msg);
      }
      return data as { ok: true; contactId: string };
    },
  });
