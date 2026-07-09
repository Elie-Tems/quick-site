import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Coins } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

/**
 * GLOBAL Siango revenue - every subscription / add-on / domain charge from
 * billing_charges (NOT the merchants' storefront sales, which live in `payments`
 * and show under "תשלומים"). Admin-only; refund per row. This is where a platform
 * charge like the publish subscription shows up.
 */

interface Charge {
  id: string;
  user_id: string;
  business_id: string | null;
  amount_ils: number;
  status: string;
  is_test: boolean;
  confirmation_code: string | null;
  payment_description: string | null;
  invoice_url: string | null;
  created_at: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: "שולם", cls: "text-green-700 bg-green-100" },
  pending: { label: "ממתין", cls: "text-amber-700 bg-amber-100" },
  failed: { label: "נכשל", cls: "text-red-700 bg-red-100" },
  refunded: { label: "זוכה", cls: "text-slate-600 bg-slate-100" },
};

export default function AdminSiangoRevenue() {
  const qc = useQueryClient();
  const [refunding, setRefunding] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-siango-revenue"],
    staleTime: 60000,
    queryFn: async () => {
      const { data: charges } = await (supabase as any)
        .from("billing_charges")
        .select("id, user_id, business_id, amount_ils, status, is_test, confirmation_code, payment_description, invoice_url, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const list = (charges || []) as Charge[];
      // Bulk business names.
      const bizIds = [...new Set(list.map((c) => c.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, string> = {};
      if (bizIds.length) {
        const { data: biz } = await supabase.from("businesses").select("id, name").in("id", bizIds);
        (biz || []).forEach((b: { id: string; name: string }) => { bizMap[b.id] = b.name; });
      }
      return { list, bizMap };
    },
  });

  const charges = data?.list || [];
  const bizMap = data?.bizMap || {};
  const totalPaid = charges.filter((c) => c.status === "success" && !c.is_test).reduce((s, c) => s + Number(c.amount_ils || 0), 0);

  const refund = async (id: string) => {
    if (!confirm("לזכות/להחזיר את החיוב הזה ללקוח?")) return;
    setRefunding(id);
    try {
      const { data, error } = await supabase.functions.invoke("billing-refund", { body: { chargeId: id } });
      if (error) throw error;
      if ((data as any)?.ok) {
        toast.success("הזיכוי בוצע ✓");
        qc.invalidateQueries({ queryKey: ["admin-siango-revenue"] });
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
    <div className="rounded-xl border border-border bg-card p-4 mb-6" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Coins className="h-5 w-5 text-primary" /> הכנסות סיאנגו (מנויים · תוספות · דומיינים)
        </div>
        <div className="text-sm text-muted-foreground">
          סה"כ שולם: <b className="text-foreground">₪{totalPaid.toLocaleString("he-IL", { maximumFractionDigits: 2 })}</b>
        </div>
      </div>
      {isLoading ? (
        <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : !charges.length ? (
        <p className="text-sm text-muted-foreground py-3 text-center">אין עדיין חיובי מנוי. חיוב פרסום/תוספת/דומיין יופיע כאן.</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden max-h-[420px] overflow-y-auto">
          {charges.map((c) => {
            const s = STATUS[c.status] || STATUS.pending;
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">₪{Number(c.amount_ils).toFixed(2)}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    {c.is_test && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">בדיקה</span>}
                    {c.business_id && bizMap[c.business_id] && <span className="text-[11px] text-muted-foreground">· {bizMap[c.business_id]}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                    {c.payment_description ? ` · ${c.payment_description}` : ""}
                    {c.confirmation_code ? ` · אישור ${c.confirmation_code}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.invoice_url && (
                    <a href={c.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">חשבונית</a>
                  )}
                  {c.status === "success" && !c.is_test && (
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={refunding === c.id} onClick={() => refund(c.id)}>
                      {refunding === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} זיכוי
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
