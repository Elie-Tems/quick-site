import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Synagogue seats (מקומות). New tables (migration 20260712150000) not yet in
 * generated types -> cast. The gabbai defines a layout; we generate one row per
 * physical seat. A member buys/picks one later (part 4).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type SeatSection = "main" | "women";
export type SeatStatus = "available" | "sold" | "held";

export interface SeatMap { business_id: string; rows: number; seats_per_row: number; women_rows: number; config: Record<string, unknown>; }
export interface Seat {
  id: string; business_id: string; section: SeatSection; row_num: number; seat_num: number;
  status: SeatStatus; holder_name: string | null; holder_phone: string | null; price: number; yamim_noraim: boolean;
}

export const useSynagogueSeats = (businessId?: string) =>
  useQuery({
    queryKey: ["synagogue-seats", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<{ map: SeatMap | null; seats: Seat[] }> => {
      const { data: map } = await sb.from("synagogue_seat_maps").select("*").eq("business_id", businessId).maybeSingle();
      const { data: seats } = await sb.from("synagogue_seats").select("*")
        .eq("business_id", businessId).order("section").order("row_num").order("seat_num");
      return { map: map ?? null, seats: seats ?? [] };
    },
  });

/** Define/replace the layout: saves the config and regenerates every seat.
 *  WARNING: regenerating clears existing assignments (this is a setup action). */
export const useBuildSeatMap = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { businessId: string; rows: number; seatsPerRow: number; womenRows: number }) => {
      await sb.from("synagogue_seat_maps").upsert({
        business_id: p.businessId, rows: p.rows, seats_per_row: p.seatsPerRow, women_rows: p.womenRows,
        updated_at: new Date().toISOString(),
      }, { onConflict: "business_id" });
      // Regenerate seats from scratch.
      await sb.from("synagogue_seats").delete().eq("business_id", p.businessId);
      const rows: any[] = [];
      for (let r = 1; r <= p.rows; r++)
        for (let s = 1; s <= p.seatsPerRow; s++)
          rows.push({ business_id: p.businessId, section: "main", row_num: r, seat_num: s });
      for (let r = 1; r <= p.womenRows; r++)
        for (let s = 1; s <= p.seatsPerRow; s++)
          rows.push({ business_id: p.businessId, section: "women", row_num: r, seat_num: s });
      if (rows.length) {
        // Insert in chunks to stay well under any payload limit.
        for (let i = 0; i < rows.length; i += 200) {
          const { error } = await sb.from("synagogue_seats").insert(rows.slice(i, i + 200));
          if (error) throw error;
        }
      }
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["synagogue-seats", v.businessId] }),
  });
};

/** Update one seat (assign holder, set price, status, High-Holidays flag). */
export const useUpdateSeat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { businessId: string; id: string; patch: Partial<Seat> }) => {
      const { error } = await sb.from("synagogue_seats").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["synagogue-seats", v.businessId] }),
  });
};
