import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * CRM hooks (contacts / transactions / pipeline). New tables (migration
 * 20260708130000) not yet in generated types -> cast for now.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface Contact {
  id: string; business_id: string; name: string | null; phone: string | null; email: string | null;
  source: string; tags: string[]; notes: string | null; ltv_cached: number | null;
  last_txn_at: string | null; txn_count: number;
}
export interface PipelineDef { id: string; business_id: string; vertical: string; name: string; stages: PipelineStage[]; is_default: boolean }
export interface PipelineStage { key: string; label: string; color?: string; is_won?: boolean; is_lost?: boolean }
export interface PipelineCard {
  id: string; business_id: string; pipeline_id: string; contact_id: string; stage_key: string;
  title: string | null; value: number | null; follow_up_at: string | null;
  status: "open" | "won" | "lost"; details: Record<string, unknown>;
}

export const useContacts = (businessId?: string) =>
  useQuery({
    queryKey: ["contacts", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await sb.from("contacts").select("*")
        .eq("business_id", businessId).order("last_txn_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const usePipeline = (businessId?: string) =>
  useQuery({
    queryKey: ["pipeline", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<{ pipeline: PipelineDef | null; cards: PipelineCard[] }> => {
      const { data: pipes } = await sb.from("pipelines").select("*")
        .eq("business_id", businessId).order("is_default", { ascending: false }).limit(1);
      const pipeline: PipelineDef | null = pipes?.[0] ?? null;
      if (!pipeline) return { pipeline: null, cards: [] };
      const { data: cards } = await sb.from("pipeline_cards").select("*")
        .eq("pipeline_id", pipeline.id).order("created_at", { ascending: false });
      return { pipeline, cards: cards ?? [] };
    },
  });

export const useMoveCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, stageKey, status }: { cardId: string; stageKey: string; status?: "open" | "won" | "lost" }) => {
      const patch: Record<string, unknown> = { stage_key: stageKey };
      if (status) patch.status = status;
      const { error } = await sb.from("pipeline_cards").update(patch).eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
  });
};

/** Set (or clear, with null) a lead's follow-up date. Powers the reminders strip
 *  and the daily merchant digest (leads-followup-run cron). */
export const useSetFollowUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, at }: { cardId: string; at: string | null }) => {
      const { error } = await sb.from("pipeline_cards").update({ follow_up_at: at }).eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
  });
};

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      businessId: string; pipelineId: string; name: string; phone?: string; email?: string;
      title?: string; value?: number; stageKey: string; details?: Record<string, unknown>;
    }) => {
      // upsert contact by dedup key (compute client-side to mirror the DB formula)
      const key = (p.email || p.phone || p.name || "").trim().toLowerCase();
      const { data: contact, error: cErr } = await sb.from("contacts")
        .upsert({ business_id: p.businessId, name: p.name, phone: p.phone ?? null, email: p.email ?? null, source: "lead_form", dedup_key: key },
          { onConflict: "business_id,dedup_key" })
        .select("id").single();
      if (cErr) throw cErr;
      const { error } = await sb.from("pipeline_cards").insert({
        business_id: p.businessId, pipeline_id: p.pipelineId, contact_id: contact.id,
        stage_key: p.stageKey, title: p.title ?? null, value: p.value ?? null, details: p.details ?? {},
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
  });
};
