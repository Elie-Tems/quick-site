import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Coins, Package, Truck, AlertTriangle, Crown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardProfitabilityProps {
  businessId?: string;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  is_on_sale: boolean;
  cost_price: number | null;
  supplier: string | null;
}

interface SoldItem {
  product_id: string | null;
  quantity: number;
  price_at_order: number;
  cost_at_order: number | null;
}

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);

const sellPrice = (p: ProductRow) => (p.is_on_sale && p.sale_price != null ? p.sale_price : p.price);

const DashboardProfitability = ({ businessId }: DashboardProfitabilityProps) => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [sold, setSold] = useState<SoldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { cost: string; supplier: string }>>({});

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      setLoading(true);
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price, sale_price, is_on_sale, cost_price, supplier")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });
      const rows = (prods || []) as unknown as ProductRow[];
      setProducts(rows);
      setDrafts(Object.fromEntries(rows.map((p) => [p.id, {
        cost: p.cost_price != null ? String(p.cost_price) : "",
        supplier: p.supplier || "",
      }])));

      const { data: ords } = await supabase.from("orders").select("id").eq("business_id", businessId);
      const ids = (ords || []).map((o: any) => o.id);
      if (ids.length) {
        const { data: items } = await supabase
          .from("order_items")
          .select("product_id, quantity, price_at_order, cost_at_order")
          .in("order_id", ids);
        setSold((items || []) as unknown as SoldItem[]);
      }
      setLoading(false);
    })();
  }, [businessId]);

  const saveRow = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    const cost = d.cost.trim() === "" ? null : Number(d.cost);
    const supplier = d.supplier.trim() === "" ? null : d.supplier.trim();
    const cur = products.find((p) => p.id === id);
    if (cur && cur.cost_price === cost && (cur.supplier || null) === supplier) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, cost_price: cost, supplier } : p)));
    const { error } = await supabase.from("products").update({ cost_price: cost, supplier } as any).eq("id", id);
    if (error) toast.error("שמירה נכשלה");
  };

  // Realized profit from actual sales (uses the cost snapshot at order time).
  const realized = useMemo(() => {
    let revenue = 0, cost = 0, knownRevenue = 0, missing = 0;
    const bySupplierName = new Map<string, string>(products.map((p) => [p.id, p.supplier || "ללא ספק"]));
    const supplierAgg = new Map<string, { revenue: number; cost: number; units: number }>();
    for (const it of sold) {
      const rev = (it.price_at_order || 0) * (it.quantity || 0);
      revenue += rev;
      if (it.cost_at_order != null) {
        cost += it.cost_at_order * (it.quantity || 0);
        knownRevenue += rev;
        const sup = (it.product_id && bySupplierName.get(it.product_id)) || "ללא ספק";
        const a = supplierAgg.get(sup) || { revenue: 0, cost: 0, units: 0 };
        a.revenue += rev; a.cost += it.cost_at_order * (it.quantity || 0); a.units += it.quantity || 0;
        supplierAgg.set(sup, a);
      } else {
        missing += it.quantity || 0;
      }
    }
    const profit = knownRevenue - cost;
    const margin = knownRevenue > 0 ? Math.round((profit / knownRevenue) * 100) : 0;
    const suppliers = [...supplierAgg.entries()]
      .map(([name, a]) => ({ name, ...a, profit: a.revenue - a.cost }))
      .sort((x, y) => y.profit - x.profit);
    return { revenue, cost, profit, margin, missing, suppliers };
  }, [sold, products]);

  const withMargin = useMemo(() =>
    products.map((p) => {
      const sp = sellPrice(p);
      const hasCost = p.cost_price != null;
      const unitProfit = hasCost ? sp - (p.cost_price as number) : null;
      const marginPct = hasCost && sp > 0 ? Math.round(((unitProfit as number) / sp) * 100) : null;
      return { ...p, sp, unitProfit, marginPct, hasCost };
    }), [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withMargin;
    return withMargin.filter((p) => p.name.toLowerCase().includes(q) || (p.supplier || "").toLowerCase().includes(q));
  }, [withMargin, query]);

  const lowMargin = withMargin.filter((p) => p.marginPct != null && p.marginPct < 15);
  const noCostCount = withMargin.filter((p) => !p.hasCost).length;

  if (!businessId) return null;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> רווחיות וספקים
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600"><Crown className="w-3 h-3" /> פרימיום</span>
          </h2>
          <p className="text-sm text-muted-foreground">כמה אתם באמת מרוויחים - לא רק כמה מכרתם. הזינו מחיר עלות וספק לכל מוצר.</p>
        </div>
      </div>

      {/* KPI cards (from real sales) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card border border-border p-3.5">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> סך מכירות</div>
          <div className="text-2xl font-semibold">{fmtPrice(realized.revenue)}</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-3.5">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> עלות הסחורה</div>
          <div className="text-2xl font-semibold">{fmtPrice(realized.cost)}</div>
        </div>
        <div className="rounded-xl bg-primary/5 border border-primary/30 p-3.5">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-primary" /> רווח גולמי</div>
          <div className="text-2xl font-semibold text-primary">{fmtPrice(realized.profit)}</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-3.5">
          <div className="text-xs text-muted-foreground mb-1">אחוז רווח</div>
          <div className="text-2xl font-semibold">{realized.margin}%</div>
        </div>
      </div>

      {realized.missing > 0 && (
        <p className="text-xs text-muted-foreground">* {realized.missing} יחידות שנמכרו ללא מחיר עלות מוגדר - לא נכללות בחישוב הרווח. הזינו עלויות למטה לתמונה מדויקת.</p>
      )}

      {/* Alerts */}
      {lowMargin.length > 0 && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{lowMargin.length} מוצרים ברווחיות נמוכה (מתחת ל-15%)</p>
            <p className="text-xs text-muted-foreground mt-0.5">{lowMargin.slice(0, 4).map((p) => p.name).join(" · ")}{lowMargin.length > 4 ? "..." : ""} - אולי כדאי לתמחר מחדש.</p>
          </div>
        </div>
      )}

      {/* Suppliers breakdown */}
      {realized.suppliers.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Truck className="w-4 h-4" /> רווח לפי ספק</h3>
          <div className="space-y-2">
            {realized.suppliers.slice(0, 6).map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.name} <span className="text-xs">· {s.units} יח׳</span></span>
                <span className="font-medium">{fmtPrice(s.profit)} <span className="text-xs text-muted-foreground">רווח</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products cost/supplier table */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h3 className="text-sm font-medium">מחיר עלות וספק לכל מוצר</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש מוצר/ספק"
              className="h-8 w-48 rounded-lg border border-border bg-background pr-8 pl-2 text-sm" />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">טוען...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">אין מוצרים להצגה.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-right font-medium py-2 px-2">מוצר</th>
                  <th className="text-right font-medium py-2 px-2">מחיר מכירה</th>
                  <th className="text-right font-medium py-2 px-2">מחיר עלות</th>
                  <th className="text-right font-medium py-2 px-2">רווח ליחידה</th>
                  <th className="text-right font-medium py-2 px-2">ספק</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 px-2 font-medium max-w-[180px] truncate">{p.name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{fmtPrice(p.sp)}</td>
                    <td className="py-2 px-2">
                      <input
                        type="number" inputMode="decimal" min={0}
                        value={drafts[p.id]?.cost ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: { ...d[p.id], cost: e.target.value } }))}
                        onBlur={() => saveRow(p.id)}
                        placeholder="0"
                        className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      {p.unitProfit == null ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <span className={p.unitProfit >= 0 ? "text-primary font-medium" : "text-red-500 font-medium"}>
                          {fmtPrice(p.unitProfit)} {p.marginPct != null && <span className="text-xs text-muted-foreground">({p.marginPct}%)</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <input
                        value={drafts[p.id]?.supplier ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: { ...d[p.id], supplier: e.target.value } }))}
                        onBlur={() => saveRow(p.id)}
                        placeholder="שם ספק"
                        className="h-8 w-28 rounded-lg border border-border bg-background px-2 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {noCostCount > 0 && !loading && (
          <p className="text-xs text-muted-foreground mt-3">{noCostCount} מוצרים עדיין ללא מחיר עלות. נתוני העלות פנימיים בלבד - הלקוחות לא רואים אותם.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardProfitability;
