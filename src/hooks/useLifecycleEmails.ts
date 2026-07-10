import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Per-merchant overrides for transactional/lifecycle emails. The email_templates
// table is new (migration 20260710130000) and not in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface EmailTemplateRow {
  template_key: string;
  enabled: boolean;
  subject: string | null;
  heading: string | null;
  body: string | null;
  button_text: string | null;
}

/** Map of template_key -> saved override (absent key = default, enabled). */
export const useLifecycleEmails = (businessId?: string) =>
  useQuery({
    queryKey: ["lifecycle-emails", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<Record<string, EmailTemplateRow>> => {
      const { data } = await sb.from("email_templates")
        .select("template_key, enabled, subject, heading, body, button_text")
        .eq("business_id", businessId);
      const map: Record<string, EmailTemplateRow> = {};
      for (const r of (data ?? []) as EmailTemplateRow[]) map[r.template_key] = r;
      return map;
    },
  });

export const useSaveLifecycleEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { businessId: string; templateKey: string; enabled?: boolean;
      subject?: string | null; heading?: string | null; body?: string | null; button_text?: string | null; }) => {
      const row: Record<string, unknown> = { business_id: v.businessId, template_key: v.templateKey };
      if (v.enabled !== undefined) row.enabled = v.enabled;
      if (v.subject !== undefined) row.subject = v.subject;
      if (v.heading !== undefined) row.heading = v.heading;
      if (v.body !== undefined) row.body = v.body;
      if (v.button_text !== undefined) row.button_text = v.button_text;
      const { error } = await sb.from("email_templates").upsert(row, { onConflict: "business_id,template_key" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["lifecycle-emails", v.businessId] }),
  });
};

/** Reset a template to its built-in default (delete the override row). */
export const useResetLifecycleEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { businessId: string; templateKey: string }) => {
      const { error } = await sb.from("email_templates").delete()
        .eq("business_id", v.businessId).eq("template_key", v.templateKey);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["lifecycle-emails", v.businessId] }),
  });
};
