import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Ticket, Plus, Power, Trash2 } from "lucide-react";

/**
 * Subscription coupons (super-admin): discounts the admin can hand out on the
 * 69₪/month plan. Duration = first month only, or recurring forever.
 * The merchant enters the code at checkout (application wired in the billing flow).
 */
// Paid features a coupon can target. 'all' = any revenue feature.
const SCOPES: { value: string; label: string }[] = [
  { value: "all", label: "כל הפיצ'רים בתשלום" },
  { value: "publish", label: "פרסום אתר (מנוי)" },
  { value: "crm", label: "ניהול לקוחות" },
  { value: "whatsapp", label: "וואטסאפ" },
  { value: "email", label: "מייל עסקי" },
  { value: "domains", label: "דומיינים" },
  { value: "ai_credits", label: "תמונות AI (קרדיטים)" },
  { value: "reviews", label: "ביקורות Google" },
  { value: "tags", label: "תגיות שיווק" },
];
const scopeLabel = (v: string) => SCOPES.find((s) => s.value === v)?.label || v;

interface Coupon {
  id: string;
  code: string;
  scope: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  duration: "first_month" | "forever";
  is_active: boolean;
  max_redemptions: number | null;
  redeemed_count: number;
  note: string | null;
  created_at: string;
}

const AdminSubscriptionCoupons = () => {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [duration, setDuration] = useState<"first_month" | "forever">("first_month");
  const [scope, setScope] = useState("all");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["subscription-coupons"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("subscription_coupons")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Coupon[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["subscription-coupons"] });

  const createCoupon = async () => {
    if (!code.trim() || !discountValue) {
      toast.error("יש למלא קוד וערך הנחה");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("subscription_coupons").insert({
      code: code.trim().toUpperCase(),
      scope,
      discount_type: discountType,
      discount_value: Number(discountValue),
      duration,
      max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "קוד הקופון כבר קיים" : "שגיאה ביצירת קופון");
      return;
    }
    toast.success("קופון נוצר");
    setCode(""); setDiscountValue(""); setMaxRedemptions(""); setNote("");
    refresh();
  };

  const toggleActive = async (c: Coupon) => {
    await (supabase as any).from("subscription_coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    refresh();
  };
  const remove = async (c: Coupon) => {
    if (!confirm(`למחוק את הקופון ${c.code}?`)) return;
    await (supabase as any).from("subscription_coupons").delete().eq("id", c.id);
    refresh();
  };

  const fmtDiscount = (c: Coupon) =>
    c.discount_type === "percent" ? `${c.discount_value}%` : `₪${c.discount_value}`;
  const fmtDuration = (c: Coupon) => (c.duration === "forever" ? "כל חודש" : "חודש ראשון");

  return (
    <div className="space-y-6" dir="rtl">
      {/* Create form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" /> יצירת קופון מנוי
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">קוד קופון</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WELCOME50" className="mt-1" dir="ltr" />
          </div>
          <div>
            <Label className="text-xs">סוג הנחה</Label>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="percent">אחוז (%)</option>
              <option value="fixed">סכום קבוע (₪)</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">ערך ההנחה</Label>
            <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="50" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">תקופה</Label>
            <select value={duration} onChange={(e) => setDuration(e.target.value as any)} className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="first_month">חודש ראשון בלבד</option>
              <option value="forever">כל חודש (קבוע)</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">עבור פיצ'ר</Label>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
              {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">מקסימום מימושים (ריק = ללא הגבלה)</Label>
            <Input type="number" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="∞" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">הערה (אופציונלי)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: ללקוחות מושב X" className="mt-1" />
          </div>
        </div>
        <Button onClick={createCoupon} disabled={saving} className="mt-4 gap-2">
          <Plus className="w-4 h-4" /> {saving ? "יוצר..." : "צור קופון"}
        </Button>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <Ticket className="w-5 h-5 text-primary" /> קופונים קיימים
        </h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : !coupons?.length ? (
          <p className="text-sm text-muted-foreground">עדיין אין קופונים.</p>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground" dir="ltr">{c.code}</span>
                    {!c.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">כבוי</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {fmtDiscount(c)} הנחה · {scopeLabel(c.scope || "all")} · {fmtDuration(c)} · מומש {c.redeemed_count}{c.max_redemptions ? `/${c.max_redemptions}` : ""}
                    {c.note ? ` · ${c.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(c)} className="gap-1.5">
                    <Power className="w-4 h-4" /> {c.is_active ? "כבה" : "הפעל"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(c)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        הערה: הקופון נוצר ומנוהל כאן. החלת ההנחה בפועל בתשלום המנוי תחובר בזרימת החיוב (השלב הבא).
      </p>
    </div>
  );
};

export default AdminSubscriptionCoupons;
