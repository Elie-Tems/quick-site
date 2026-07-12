import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Synagogue settings: prayer times, location (for zmanim), sponsor + announcements.
 * New table (migration 20260712160000) not yet in generated types -> cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface PrayerTimes { shacharit?: string; mincha?: string; maariv?: string; shabbat_in?: string; daf_yomi?: string; }
export interface SynagogueSettings {
  business_id: string; city: string | null; latitude: number | null; longitude: number | null;
  nusach: string | null; prayer_times: PrayerTimes; parnas: string | null; announcements: string | null;
}

export const useSynagogueSettings = (businessId?: string) =>
  useQuery({
    queryKey: ["synagogue-settings", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<SynagogueSettings | null> => {
      const { data } = await sb.from("synagogue_settings").select("*").eq("business_id", businessId).maybeSingle();
      return data ?? null;
    },
  });

export const useSaveSynagogueSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { businessId: string } & Partial<SynagogueSettings>) => {
      const { businessId, ...rest } = v;
      const { error } = await sb.from("synagogue_settings").upsert(
        { business_id: businessId, ...rest, updated_at: new Date().toISOString() },
        { onConflict: "business_id" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["synagogue-settings", v.businessId] }),
  });
};
