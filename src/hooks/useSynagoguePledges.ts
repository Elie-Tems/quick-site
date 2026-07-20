import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Synagogue aliyot & nedarim (pledges). New table (migration 20260712140000) not
 * yet in generated types -> cast. A pledge is the gabbai's record that a member
 * committed to a sum (aliyah/neder); it's an open debt until settled.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type PledgeType = "aliyah" | "neder" | "other";
export type PledgeStatus = "open" | "paid" | "cancelled";

export interface SynagoguePledge {
  id: string; business_id: string;
  member_name: string; member_phone: string | null; member_email: string | null;
  pledge_type: PledgeType; label: string | null; amount: number;
  status: PledgeStatus; notes: string | null;
  created_at: string; paid_at: string | null;
}

export const useSynagoguePledges = (businessId?: string) =>
  useQuery({
    queryKey: ["synagogue-pledges", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<SynagoguePledge[]> => {
      const { data, error } = await sb.from("synagogue_pledges").select("*")
        .eq("business_id", businessId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreatePledge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      businessId: string; memberName: string; memberPhone?: string; memberEmail?: string;
      pledgeType: PledgeType; label?: string; amount: number;
    }) => {
      const { error } = await sb.from("synagogue_pledges").insert({
        business_id: p.businessId, member_name: p.memberName,
        member_phone: p.memberPhone || null, member_email: p.memberEmail || null,
        pledge_type: p.pledgeType, label: p.label || null, amount: p.amount, status: "open",
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["synagogue-pledges", v.businessId] }),
    onError: () => toast.error("יצירת ההתחייבות נכשלה"),
  });
};

/** Mark a pledge paid (settled) or cancel it. */
export const useUpdatePledgeStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { businessId: string; id: string; status: PledgeStatus }) => {
      const patch: Record<string, unknown> = { status };
      patch.paid_at = status === "paid" ? new Date().toISOString() : null;
      const { error } = await sb.from("synagogue_pledges").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["synagogue-pledges", v.businessId] }),
    onError: () => toast.error("עדכון הסטטוס נכשל"),
  });
};
