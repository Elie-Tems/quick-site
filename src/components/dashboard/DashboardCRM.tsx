import { useMemo, useState } from "react";
import { Users, Truck, TrendingUp, Lock } from "lucide-react";
import DashboardCustomers from "./DashboardCustomers";
import DashboardSuppliers from "./DashboardSuppliers";
import DashboardProfitability from "./DashboardProfitability";
import DashboardAnalytics from "./DashboardAnalytics";
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

// Free tier: just customer names — a teaser. All analytics/segments are CRM+.
function FreeCustomerView({ orders }: { orders: Order[] }) {
  const names = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const o of orders) {
      const key = (o.customerEmail || o.customerPhone || o.customerName || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(o.customerName || "לקוח");
    }
    return result;
  }, [orders]);

  return (
    <div className="space-y-4">
      {names.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">עדיין אין לקוחות - יופיעו כאן עם ההזמנה הראשונה</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {names.map((name, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                {name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-foreground">{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* CRM+ upsell */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground mb-1">CRM+ - ניהול לקוחות מתקדם</p>
            <p className="text-sm text-muted-foreground mb-3">
              LTV, % חוזרים, פילוחים (VIP / בסיכון / רדום), התראות חוזרים, וואטסאפ בלחיצה, הערות, ספקים ורווחיות.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["📊 LTV ופילוחים", "👑 VIP / בסיכון", "🔔 התראות חוזרים", "💬 וואטסאפ/מייל", "📦 ספקים", "📈 רווחיות"].map((f) => (
                <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">{f}</span>
              ))}
            </div>
            <button
              type="button"
              className="rounded-xl bg-violet-600 text-white px-5 py-2 text-sm font-medium hover:bg-violet-700 transition-colors"
              onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
            >
              שדרג ל-CRM+ - 49 ₪/חודש ←
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockedTabView({ tab }: { tab: "suppliers" | "profitability" }) {
  const meta = tab === "suppliers"
    ? { title: "ניהול ספקים", desc: "עקוב אחרי עלויות, ספקים, ורווח נקי לכל מוצר", features: ["📦 ספקים ועלות רכישה", "📊 גיליון עלויות", "📈 מרג'ין לפי מוצר"] }
    : { title: "דוח רווחיות", desc: "ראה את ההכנסות, ההוצאות, והרווח האמיתי של העסק", features: ["💰 הכנסות מול הוצאות", "📉 גרף רווח לאורך זמן", "🎯 מוצרים הכי רווחיים"] };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-violet-600" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{meta.title} - CRM+</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">{meta.desc}</p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {meta.features.map((f) => (
          <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">{f}</span>
        ))}
      </div>
      <button
        type="button"
        className="rounded-xl bg-violet-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors"
        onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
      >
        שדרג ל-CRM+ - 49 ₪/חודש ←
      </button>
    </div>
  );
}

const TABS: { id: CrmTab; label: string; icon: typeof Users }[] = [
  { id: "customers",     label: "לקוחות",  icon: Users },
  { id: "suppliers",     label: "ספקים",   icon: Truck },
  { id: "profitability", label: "רווחיות", icon: TrendingUp },
];

const DashboardCRM = ({ orders, businessId, demoMode, initialTab = "customers", hasCrmAddon = false }: DashboardCRMProps) => {
  const [tab, setTab] = useState<CrmTab>(initialTab);

  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-foreground">ניהול לקוחות & CRM</h1>

      {/* Tab bar - always visible; ספקים/רווחיות show lock icon for free tier */}
      <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
        {TABS.map((t) => {
          const locked = !hasCrmAddon && t.id !== "customers";
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {locked && <Lock className="w-3 h-3 opacity-55" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {hasCrmAddon ? (
        <>
          {tab === "customers"     && <><DashboardCustomers orders={orders} businessId={businessId} demoMode={demoMode} /><DashboardAnalytics businessId={businessId} /></>}
          {tab === "suppliers"     && <DashboardSuppliers businessId={businessId} demoMode={demoMode} />}
          {tab === "profitability" && <DashboardProfitability businessId={businessId} demoMode={demoMode} />}
        </>
      ) : (
        <>
          {tab === "customers"                                && <><FreeCustomerView orders={orders} /><DashboardAnalytics businessId={businessId} /></>}
          {(tab === "suppliers" || tab === "profitability")  && <LockedTabView tab={tab} />}
        </>
      )}
    </div>
  );
};

export default DashboardCRM;
