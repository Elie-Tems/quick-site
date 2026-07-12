import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Globe, TrendingUp, ShoppingCart, Eye, CreditCard, CheckCircle2 } from "lucide-react";

/**
 * Marketplace: platform-wide aggregate across ALL stores (merchant turnover,
 * not Siango's own revenue). GMV / orders / AOV from orders, plus an aggregate
 * conversion funnel from page_views + analytics_events. Admin-only (RLS admin
 * policies on those tables).
 */
const RANGES = [
  { label: "7 ימים", days: 7 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
];

const AdminMarketplace = () => {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-marketplace", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const iso = since.toISOString();

      const [orders, pv, ev] = await Promise.all([
        supabase.from("orders").select("total_price").gte("created_at", iso).limit(100000),
        (supabase as any).from("page_views").select("visitor_id").gte("created_at", iso).limit(100000),
        (supabase as any).from("analytics_events").select("visitor_id, event_type").gte("created_at", iso).limit(100000),
      ]);

      const prices = (orders.data || []).map((o: { total_price: number | null }) => Number(o.total_price) || 0);
      const gmv = prices.reduce((s: number, n: number) => s + n, 0);
      const orderCount = prices.length;
      const aov = orderCount ? Math.round(gmv / orderCount) : 0;

      const visitors = new Set((pv.data || []).map((r: { visitor_id: string }) => r.visitor_id).filter(Boolean));
      const setFor = (t: string) =>
        new Set((ev.data || []).filter((r: { event_type: string }) => r.event_type === t).map((r: { visitor_id: string }) => r.visitor_id).filter(Boolean));

      return {
        gmv,
        orderCount,
        aov,
        visits: visitors.size,
        added: setFor("add_to_cart").size,
        checkout: setFor("begin_checkout").size,
        purchased: setFor("purchase").size,
      };
    },
  });

  const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 100) : 0);
  const d = data;
  const funnel = [
    { label: "מבקרים", value: d?.visits || 0, icon: Eye, of: 100 },
    { label: "הוסיפו לעגלה", value: d?.added || 0, icon: ShoppingCart, of: pct(d?.added || 0, d?.visits || 0) },
    { label: "התחילו תשלום", value: d?.checkout || 0, icon: CreditCard, of: pct(d?.checkout || 0, d?.visits || 0) },
    { label: "רכשו", value: d?.purchased || 0, icon: CheckCircle2, of: pct(d?.purchased || 0, d?.visits || 0) },
  ];

  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-2xl font-bold text-foreground">{isLoading ? "…" : value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Globe className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-foreground">תמונת שוק - מבט-על על כל החנויות</h2>
            <p className="text-sm text-muted-foreground mt-0.5">מחזור החנויות והתנהגות הקונים בכל הפלטפורמה (לא ההכנסה של סיאנגו).</p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${days === r.days ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="GMV (מחזור כל החנויות)" value={`₪${(d?.gmv || 0).toLocaleString()}`} />
        <Kpi label="הזמנות" value={(d?.orderCount || 0).toLocaleString()} />
        <Kpi label="ערך הזמנה ממוצע" value={`₪${(d?.aov || 0).toLocaleString()}`} />
        <Kpi label="המרה (רכשו/מבקרים)" value={`${pct(d?.purchased || 0, d?.visits || 0)}%`} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> משפך מצרפי (כל החנויות)</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : (
          <div className="space-y-3">
            {funnel.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 text-foreground"><step.icon className="w-4 h-4 text-primary" /> {step.label}</span>
                  <span className="text-muted-foreground">{step.value.toLocaleString()} · {step.of}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${step.of}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMarketplace;
