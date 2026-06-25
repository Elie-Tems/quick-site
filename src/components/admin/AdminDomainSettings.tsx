import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Admin-managed domain pricing. Customer price =
 *   reseller cost x USD->ILS x (1 + margin%) x (1 - coupon%), rounded to ₪5.
 * The domain-search edge function reads these values server-side.
 */
const AdminDomainSettings = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["domain-settings-admin"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("domain_settings").select("*").eq("id", 1).maybeSingle();
      return data as { margin_percent: number; coupon_percent: number; usd_to_ils: number; max_price_ils: number } | null;
    },
  });

  const [margin, setMargin] = useState("100");
  const [coupon, setCoupon] = useState("15");
  const [fx, setFx] = useState("3.7");
  const [maxPrice, setMaxPrice] = useState("135");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setMargin(String(data.margin_percent));
      setCoupon(String(data.coupon_percent));
      setFx(String(data.usd_to_ils));
      setMaxPrice(String(data.max_price_ils ?? 135));
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("domain_settings")
        .update({
          margin_percent: Number(margin),
          coupon_percent: Number(coupon),
          usd_to_ils: Number(fx),
          max_price_ils: Number(maxPrice),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
      toast.success("התמחור נשמר ✓");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  // Live preview on a sample $10 cost domain.
  const sampleCost = 10;
  const list = Math.ceil((sampleCost * Number(fx || 0) * (1 + Number(margin || 0) / 100)) / 5) * 5;
  const uncapped = Math.ceil((list * (1 - Number(coupon || 0) / 100)) / 5) * 5;
  const final = Math.min(uncapped, Number(maxPrice || 999999));

  const Field = ({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-xl" dir="rtl">
      <div className="flex items-start gap-3">
        <Globe className="w-7 h-7 text-primary shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-foreground">תמחור דומיינים</h2>
          <p className="text-sm text-muted-foreground mt-0.5">קבע את אחוז הרווח והקופון. המחיר ללקוח מתעדכן אוטומטית בכל מקומות הרכישה.</p>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <Field label="אחוז רווח" value={margin} onChange={setMargin} suffix="%" />
          <Field label="קופון הנחה קבוע" value={coupon} onChange={setCoupon} suffix="%" />
          <Field label="שער המרה דולר→שקל" value={fx} onChange={setFx} suffix="₪/$" />
          <Field label="תקרת מחיר ללקוח (לא נמכור מעל; מתחת לעלות לא נרד)" value={maxPrice} onChange={setMaxPrice} suffix="₪" />

          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            <p className="text-muted-foreground mb-1">תצוגה מקדימה (דומיין שעולה לנו $10):</p>
            <p className="text-foreground">
              מחיר מחירון: <b>₪{list}</b> · אחרי קופון: <b className="text-primary">₪{final}</b>
            </p>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-lg bg-primary text-white font-medium py-2.5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            שמור תמחור
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDomainSettings;
