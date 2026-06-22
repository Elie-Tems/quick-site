import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdChannel {
  id: string;
  business_id: string;
  name: string;
  icon: string | null;
  budget_amount: number;
  budget_currency: string;
  budget_period: "monthly" | "weekly" | "custom";
  budget_start_date: string | null;
  budget_end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface AdLink {
  id: string;
  channel_id: string;
  business_id: string;
  label: string;
  destination_url: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  clicks: number;
  is_active: boolean;
  created_at: string;
}

export function buildUTMUrl(link: AdLink): string {
  const url = new URL(link.destination_url.startsWith("http") ? link.destination_url : `https://${link.destination_url}`);
  if (link.utm_source) url.searchParams.set("utm_source", link.utm_source);
  if (link.utm_medium) url.searchParams.set("utm_medium", link.utm_medium);
  if (link.utm_campaign) url.searchParams.set("utm_campaign", link.utm_campaign);
  if (link.utm_content) url.searchParams.set("utm_content", link.utm_content);
  if (link.utm_term) url.searchParams.set("utm_term", link.utm_term);
  return url.toString();
}

// ── Channels ──────────────────────────────────────────────────────────────────

export function useAdChannels(businessId?: string) {
  return useQuery({
    queryKey: ["ad-channels", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from("ad_channels")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdChannel[];
    },
    enabled: !!businessId,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<AdChannel, "id" | "created_at">) => {
      const { data, error } = await supabase.from("ad_channels").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ad-channels", vars.business_id] });
      toast.success("ערוץ פרסום נוסף");
    },
    onError: () => toast.error("שגיאה בהוספת ערוץ"),
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<AdChannel> & { id: string }) => {
      const { error } = await supabase.from("ad_channels").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ad-channels"] });
    },
    onError: () => toast.error("שגיאה בעדכון ערוץ"),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, businessId }: { id: string; businessId: string }) => {
      const { error } = await supabase.from("ad_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { businessId }) => {
      qc.invalidateQueries({ queryKey: ["ad-channels", businessId] });
      toast.success("ערוץ נמחק");
    },
    onError: () => toast.error("שגיאה במחיקת ערוץ"),
  });
}

// ── Links ─────────────────────────────────────────────────────────────────────

export function useAdLinks(channelId?: string) {
  return useQuery({
    queryKey: ["ad-links", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from("ad_links")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdLink[];
    },
    enabled: !!channelId,
  });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<AdLink, "id" | "clicks" | "created_at">) => {
      const { data, error } = await supabase.from("ad_links").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ad-links", vars.channel_id] });
      toast.success("קישור נוסף");
    },
    onError: () => toast.error("שגיאה בהוספת קישור"),
  });
}

export function useUpdateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, channel_id, ...patch }: Partial<AdLink> & { id: string; channel_id: string }) => {
      const { error } = await supabase.from("ad_links").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ad-links", vars.channel_id] });
    },
    onError: () => toast.error("שגיאה בעדכון קישור"),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, channelId }: { id: string; channelId: string }) => {
      const { error } = await supabase.from("ad_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { channelId }) => {
      qc.invalidateQueries({ queryKey: ["ad-links", channelId] });
      toast.success("קישור נמחק");
    },
    onError: () => toast.error("שגיאה במחיקת קישור"),
  });
}
