import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Receipt } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Charge {
  id: string;
  amount_ils: number;
  status: string;
  is_test: boolean;
  confirmation_code: string | null;
  coupon_code: string | null;
  payment_description: string | null;
  created_at: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: "שולם", cls: "text-green-700 bg-green-100" },
  pending: { label: "ממתין", cls: "text-amber-700 bg-amber-100" },
  failed: { label: "נכשל", cls: "text-red-700 bg-red-100" },
  refunded: { label: "זוכה", cls: "text-slate-600 bg-slate-100" },
};

/** Per-customer subscription charge history (from billing_charges) + admin refund. */
export default function BillingChargesPanel({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [refunding, setRefunding] = useState<string | null>(null);

  const { data: charges, isLoading } = useQuery({
    queryKey: ["billing-charges", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("billing_charges")
        .select("id, amount_ils, status, is_test, confirmation_code, coupon_code, payment_description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as Charge[];
    },
  });

  const refund = async (id: string) => {
    if (!confirm("לזכות/להחזיר את החיוב הזה ללקוח? הפעולה תבצע החזר ב-iCount.")) return;
    setRefunding(id);
    try {
      const { data, error } = await supabase.functions.invoke("billing-refund", { body: { chargeId: id } });
      if (error) throw error;
      if ((data as any)?.ok) {
        toast.success("הזיכוי בוצע ✓");
        qc.invalidateQueries({ queryKey: ["billing-charges", userId] });
      } else {
        toast.error((data as any)?.error || "הזיכוי נכשל");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בזיכוי");
    } finally {
      setRefunding(null);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
        <Receipt className="h-4 w-4 text-primary" /> פירוט חיובים (מנוי)
      </div>
      {isLoading ? (
        <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : !charges?.length ? (
        <p className="text-xs text-muted-foreground py-2">אין עדיין חיובים ללקוח זה.</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {charges.map((c) => {
            const s = STATUS[c.status] || STATUS.pending;
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">₪{Number(c.amount_ils).toFixed(2)}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    {c.is_test && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">בדיקה</span>}
                    {c.coupon_code && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{c.coupon_code}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                    {c.confirmation_code ? ` · אישור ${c.confirmation_code}` : ""}
                    {c.payment_description ? ` · ${c.payment_description}` : ""}
                  </div>
                </div>
                {c.status === "success" && !c.is_test && (
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={refunding === c.id} onClick={() => refund(c.id)}>
                    {refunding === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} זיכוי
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
