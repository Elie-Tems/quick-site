import { useMemo, useState } from "react";
import { Users, Truck, TrendingUp, Lock } from "lucide-react";
import DashboardCustomers from "./DashboardCustomers";
import DashboardSuppliers from "./DashboardSuppliers";
import DashboardProfitability from "./DashboardProfitability";
import type { Order } from "./DashboardOrders";
import type { BusinessType } from "@/lib/businessModules";

type CrmTab = "customers" | "suppliers" | "profitability";

interface DashboardCRMProps {
  orders: Order[];
  businessId?: string;
  demoMode?: boolean;
  initialTab?: CrmTab;
  hasCrmAddon?: boolean;
  businessType?: BusinessType;
}

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);

// Free tier: name + what they bought + how much they paid. Nothing else.
function FreeCustomerList({ orders }: { orders: Order[] }) {
  // Aggregate by customer identity
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; products: string[] }>();
    for (const o of orders) {
      const key = (o.customerEmail || o.customerPhone || o.customerName || "").trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      const products = (o.items || []).map((i) => i.productName).filter(Boolean);
      if (existing) {
        existing.total += o.total || 0;
        for (const p of products) if (!existing.products.includes(p)) existing.products.push(p);
      } else {
        map.set(key, { name: o.customerName || "לקוח", total: o.total || 0, products });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [orders]);

  return (
    <div className="space-y-4" dir="rtl">
      {customers.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">עדיין אין לקוחות - יופיעו כאן עם ההזמנה הראשונה</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">לקוח</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">מה קנה</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">סך תשלום</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.products.length > 0 ? c.products.slice(0, 2).join(", ") + (c.products.length > 2 ? ` +${c.products.length - 2}` : "") : "-"}
                  </td>
                  <td className="px-4 py-3 text-left font-semibold text-primary">{fmtPrice(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CRM+ upsell */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5" dir="rtl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground mb-1">CRM+ — ניהול לקוחות מתקדם</p>
            <p className="text-sm text-muted-foreground mb-3">
              פילוחים (VIP / בסיכון / רדום), LTV, התראות חוזרים, וואטסאפ בלחיצה, הערות ותגיות, ניהול ספקים ורווחיות.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["👑 VIP ופילוחים", "🔔 התראות חוזרים", "💬 וואטסאפ/מייל", "📦 ספקים", "📊 רווחיות"].map((f) => (
                <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">{f}</span>
              ))}
            </div>
            <button
              type="button"
              className="rounded-xl bg-violet-600 text-white px-5 py-2 text-sm font-medium hover:bg-violet-700 transition-colors"
              onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
            >
              שדרג ל-CRM+ — 49 ₪/חודש ←
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS_PREMIUM: { id: CrmTab; label: string; icon: typeof Users }[] = [
  { id: "customers", label: "לקוחות", icon: Users },
  { id: "suppliers", label: "ספקים", icon: Truck },
  { id: "profitability", label: "רווחיות", icon: TrendingUp },
];

const DashboardCRM = ({ orders, businessId, demoMode, initialTab = "customers", hasCrmAddon = false, businessType }: DashboardCRMProps) => {
  const [tab, setTab] = useState<CrmTab>(initialTab);

  const customerLabel =
    businessType === "vacation" ? "האורחים שלך" :
    businessType === "nonprofit" || businessType === "synagogue" ? "התורמים שלך" :
    "הלקוחות שלך";

  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-foreground">{customerLabel}</h1>

      {hasCrmAddon ? (
        <>
          <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
            {TABS_PREMIUM.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
          {tab === "customers" && <DashboardCustomers orders={orders} businessId={businessId} demoMode={demoMode} />}
          {tab === "suppliers" && <DashboardSuppliers businessId={businessId} demoMode={demoMode} />}
          {tab === "profitability" && <DashboardProfitability businessId={businessId} demoMode={demoMode} />}
        </>
      ) : (
        <FreeCustomerList orders={orders} />
      )}
    </div>
  );
};

export default DashboardCRM;
