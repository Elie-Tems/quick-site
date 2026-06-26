import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Admin-managed business-email pricing (mirrors AdminDomainSettings). The merchant
 * monthly price per mailbox + our wholesale cost (OpenSRS ~$0.50). Drives the
 * price shown in the merchant email screen.
 */
const AdminEmailSettings = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["email-settings-admin"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("email_settings").select("*").eq("id", 1).maybeSingle();
      return data as { price_ils: number; cost_usd: number; usd_to_ils: number } | null;
    },
  });

  const [price, setPrice] = useState("19");
  const [cost, setCost] = useState("0.5");
  const [fx, setFx] = useState("3.7");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) { setPrice(String(data.price_ils)); setCost(String(data.cost_usd)); setFx(String(data.usd_to_ils)); }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("email_settings")
        .update({ price_ils: Number(price), cost_usd: Number(cost), usd_to_ils: Number(fx), updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
      toast.success("התמחור נשמר ✓"); refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "שגיאה בשמירה"); } finally { setSaving(false); }
  };

  const costIls = Number(cost || 0) * Number(fx || 0);
  const profit = Number(price || 0) - costIls;

  const Field = ({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-xl" dir="rtl">
      <div className="flex items-start gap-3">
        <Mail className="w-7 h-7 text-primary shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-foreground">תמחור מייל עסקי</h2>
          <p className="text-sm text-muted-foreground mt-0.5">המחיר החודשי לתיבה (ללקוח) והעלות הסיטונאית שלנו (OpenSRS).</p>
        </div>
      </div>

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <Field label="מחיר ללקוח (לתיבה לחודש)" value={price} onChange={setPrice} suffix="₪" />
          <Field label="עלות סיטונאית (לתיבה לחודש)" value={cost} onChange={setCost} suffix="$" />
          <Field label="שער המרה דולר→שקל" value={fx} onChange={setFx} suffix="₪/$" />

          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="text-foreground">עלות לתיבה: <b>₪{costIls.toFixed(1)}</b> · רווח לתיבה לחודש: <b className="text-primary">₪{profit.toFixed(1)}</b></p>
          </div>

          <button onClick={save} disabled={saving} className="w-full rounded-lg bg-primary text-white font-medium py-2.5 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} שמור תמחור
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminEmailSettings;
