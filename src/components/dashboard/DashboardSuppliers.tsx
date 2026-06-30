import { useEffect, useMemo, useState } from "react";
import { Truck, Search, ArrowRight, Phone, Mail, Package, User, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardSuppliersProps {
  businessId?: string;
  demoMode?: boolean;
}

interface Prod {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  is_on_sale: boolean;
  cost_price: number | null;
  supplier: string | null;
}
interface Detail { phone: string; email: string; contact_name: string; notes: string; }

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);
const telLink = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
const waLink = (p: string) => `https://wa.me/${p.replace(/\D/g, "").replace(/^0/, "972")}`;
const blankDetail = (): Detail => ({ phone: "", email: "", contact_name: "", notes: "" });

const DEMO_PRODS: Prod[] = [
  { id: "p1", name: "חולצת טי פרימיום", price: 120, sale_price: null, is_on_sale: false, cost_price: 45, supplier: "טקסטיל ישיר" },
  { id: "p2", name: "כובע מצחייה", price: 79, sale_price: 59, is_on_sale: true, cost_price: 22, supplier: "טקסטיל ישיר" },
  { id: "p3", name: "בקבוק תרמי", price: 95, sale_price: null, is_on_sale: false, cost_price: 80, supplier: "יבוא מהיר" },
  { id: "p4", name: "תיק בד", price: 65, sale_price: null, is_on_sale: false, cost_price: 18, supplier: "אקו-בד" },
];
const DEMO_DETAILS: Record<string, Detail> = {
  "טקסטיל ישיר": { phone: "03-5551234", email: "sales@textil.example", contact_name: "רמי כהן", notes: "מינימום הזמנה 500₪, אספקה תוך 5 ימים." },
};

const DashboardSuppliers = ({ businessId, demoMode }: DashboardSuppliersProps) => {
  const [prods, setProds] = useState<Prod[]>([]);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Detail>(blankDetail());

  useEffect(() => {
    if (demoMode) {
      setProds(DEMO_PRODS); setDetails(DEMO_DETAILS); setLoading(false); return;
    }
    if (!businessId) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("products")
        .select("id, name, price, sale_price, is_on_sale, cost_price, supplier")
        .eq("business_id", businessId).order("sort_order", { ascending: true });
      setProds(((p || []) as unknown as Prod[]).filter((x) => x.supplier && x.supplier.trim()));
      const { data: d } = await supabase.from("supplier_details")
        .select("supplier_name, phone, email, contact_name, notes").eq("business_id", businessId);
      const m: Record<string, Detail> = {};
      (d || []).forEach((r: any) => { m[r.supplier_name] = { phone: r.phone || "", email: r.email || "", contact_name: r.contact_name || "", notes: r.notes || "" }; });
      setDetails(m);
      setLoading(false);
    })();
  }, [businessId, demoMode]);

  const suppliers = useMemo(() => {
    const map = new Map<string, { name: string; products: Prod[]; totalCost: number }>();
    for (const p of prods) {
      const name = (p.supplier || "").trim();
      if (!name) continue;
      const ex = map.get(name) || { name, products: [], totalCost: 0 };
      ex.products.push(p);
      ex.totalCost += p.cost_price || 0;
      map.set(name, ex);
    }
    return [...map.values()].sort((a, b) => b.products.length - a.products.length);
  }, [prods]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(q));
  }, [suppliers, query]);

  const openSupplier = (name: string) => {
    setSelected(name);
    setDraft(details[name] || blankDetail());
  };
  const saveDetail = async (patch: Partial<Detail>) => {
    if (!selected) return;
    const next = { ...(details[selected] || blankDetail()), ...draft, ...patch };
    setDetails((p) => ({ ...p, [selected]: next }));
    if (!businessId || demoMode) return;
    const { error } = await supabase.from("supplier_details").upsert({
      business_id: businessId, supplier_name: selected,
      phone: next.phone || null, email: next.email || null, contact_name: next.contact_name || null, notes: next.notes || null,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "business_id,supplier_name" });
    if (error) toast.error("שמירה נכשלה");
  };

  if (!businessId && !demoMode) return null;

  // Detail view
  const sup = selected ? suppliers.find((s) => s.name === selected) : null;
  if (selected && sup) {
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> חזרה לרשימת הספקים
        </button>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary"><Truck className="w-6 h-6" /></div>
            <div>
              <h2 className="text-lg font-semibold">{sup.name}</h2>
              <p className="text-sm text-muted-foreground">{sup.products.length} מוצרים · עלות קטלוג {fmtPrice(sup.totalCost)}</p>
            </div>
          </div>

          {/* Quick contact */}
          {(draft.phone) && (
            <div className="flex flex-wrap gap-2 mb-4">
              <a href={waLink(draft.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted"><Phone className="w-4 h-4" /> וואטסאפ</a>
              <a href={telLink(draft.phone)} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted"><Phone className="w-4 h-4" /> התקשר</a>
              {draft.email && <a href={`mailto:${draft.email}`} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted"><Mail className="w-4 h-4" /> מייל</a>}
            </div>
          )}

          {/* Contact fields */}
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground">איש קשר</label>
              <input value={draft.contact_name} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} onBlur={() => saveDetail({})}
                placeholder="שם איש הקשר" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">טלפון</label>
              <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} onBlur={() => saveDetail({})}
                placeholder="050-0000000" dir="ltr" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-right" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">מייל</label>
              <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} onBlur={() => saveDetail({})}
                placeholder="supplier@example.com" dir="ltr" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-right" />
            </div>
          </div>
          <div className="mb-5">
            <label className="text-xs text-muted-foreground">הערות</label>
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} onBlur={() => saveDetail({})} rows={2}
              placeholder="תנאי תשלום, זמני אספקה, מינימום הזמנה, כל מה שחשוב לזכור." className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 text-sm resize-y" />
          </div>

          <h3 className="text-sm font-medium mb-2">מוצרים מהספק הזה</h3>
          <div className="divide-y divide-border/60">
            {sup.products.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                <span className="text-muted-foreground">עלות {p.cost_price != null ? fmtPrice(p.cost_price) : "-"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" /> ספקים
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600"><Crown className="w-3 h-3" /> פרימיום</span>
        </h2>
        <p className="text-sm text-muted-foreground">כל הספקים שלכם במקום אחד - פרטי קשר, הערות והמוצרים מכל ספק. הרשימה נבנית אוטומטית מהספק שהזנתם במוצרים (בטאב רווחיות).</p>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש ספק"
          className="h-9 w-full rounded-lg border border-border bg-background pr-8 pl-2 text-sm" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">טוען...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Truck className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium">עדיין אין ספקים</p>
          <p className="text-xs text-muted-foreground mt-1">הזינו "ספק" למוצרים בטאב <b>רווחיות</b>, והם יופיעו כאן ככרטיסי ספק לניהול.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const d = details[s.name];
            return (
              <button key={s.name} onClick={() => openSupplier(s.name)}
                className="text-right rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Truck className="w-4 h-4" /></div>
                  <div className="font-semibold truncate">{s.name}</div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Package className="w-3.5 h-3.5" /> {s.products.length} מוצרים · עלות {fmtPrice(s.totalCost)}</div>
                {d?.contact_name && <div className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3.5 h-3.5" /> {d.contact_name}</div>}
                {d?.phone && <div className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr"><Phone className="w-3.5 h-3.5" /> {d.phone}</div>}
                {!d?.phone && !d?.contact_name && <div className="text-xs text-amber-600">חסרים פרטי קשר - לחצו להוספה</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardSuppliers;
