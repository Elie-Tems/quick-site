import { useMemo, useState } from "react";
import { Users, Truck, TrendingUp, Lock, Crown } from "lucide-react";
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

type LifecycleStatus = "new" | "active" | "at_risk" | "dormant";
const DORMANT_DAYS = 60;
const AT_RISK_DAYS = 30;

const STATUS_META: Record<LifecycleStatus, { label: string; bg: string; text: string }> = {
  new:     { label: "חדש",    bg: "bg-sky-100 dark:bg-sky-900/30",         text: "text-sky-700 dark:text-sky-300" },
  active:  { label: "פעיל",   bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  at_risk: { label: "בסיכון", bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-700 dark:text-amber-300" },
  dormant: { label: "רדום",   bg: "bg-rose-100 dark:bg-rose-900/30",       text: "text-rose-700 dark:text-rose-300" },
};

interface CustomerSummary {
  name: string;
  orderCount: number;
  totalSpent: number;
  lastOrder: string;
  isVip: boolean;
  status: LifecycleStatus;
}

function deriveCustomers(orders: Order[]): CustomerSummary[] {
  const map = new Map<string, { name: string; orderCount: number; totalSpent: number; lastOrder: string; firstOrder: string }>();
  const now = Date.now();

  for (const o of orders) {
    const key = (o.customerEmail || o.customerPhone || o.customerName || "").trim().toLowerCase();
    if (!key) continue;
    const date = o.createdAt || "";
    const ex = map.get(key);
    if (ex) {
      ex.orderCount += 1;
      ex.totalSpent += o.total || 0;
      if (date > ex.lastOrder) ex.lastOrder = date;
      if (date < ex.firstOrder) ex.firstOrder = date;
    } else {
      map.set(key, { name: o.customerName || "לקוח", orderCount: 1, totalSpent: o.total || 0, lastOrder: date, firstOrder: date });
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  const sortedSpends = rows.map((r) => r.totalSpent).sort((a, b) => b - a);
  const vipThreshold = sortedSpends[Math.floor(sortedSpends.length * 0.2)] ?? 0;

  return rows.map((r) => {
    const daysSinceLast = r.lastOrder ? Math.floor((now - new Date(r.lastOrder).getTime()) / 86_400_000) : 999;
    const daysSinceFirst = r.firstOrder ? Math.floor((now - new Date(r.firstOrder).getTime()) / 86_400_000) : 999;

    let status: LifecycleStatus = "active";
    if (daysSinceLast > DORMANT_DAYS) status = "dormant";
    else if (daysSinceLast > AT_RISK_DAYS) status = "at_risk";
    else if (r.orderCount === 1 && daysSinceFirst < 30) status = "new";

    return {
      name: r.name,
      orderCount: r.orderCount,
      totalSpent: r.totalSpent,
      lastOrder: r.lastOrder,
      isVip: r.totalSpent >= vipThreshold && r.orderCount >= 2,
      status,
    };
  });
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`;
  if (days < 365) return `לפני ${Math.floor(days / 30)} חודשים`;
  return `לפני ${Math.floor(days / 365)} שנים`;
}

function FreeCustomerView({ orders }: { orders: Order[] }) {
  const customers = useMemo(() => deriveCustomers(orders), [orders]);

  const total = customers.length;
  const ltv = total > 0 ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / total) : 0;
  const repeatPct = total > 0 ? Math.round((customers.filter((c) => c.orderCount > 1).length / total) * 100) : 0;
  const atRiskCount = customers.filter((c) => c.status === "at_risk" || c.status === "dormant").length;

  const kpis = [
    { label: "לקוחות",          value: String(total),       accent: "emerald" as const },
    { label: "LTV ממוצע",       value: fmtPrice(ltv),       accent: "emerald" as const },
    { label: "חוזרים",          value: `${repeatPct}%`,     accent: "emerald" as const },
    { label: "בסיכון / רדומים", value: String(atRiskCount), accent: "amber"   as const },
  ];

  const accentClasses = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400" },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-700 dark:text-amber-400" },
  };

  return (
    <div className="space-y-4">
      {/* KPI teaser cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const cls = accentClasses[k.accent];
          return (
            <div key={k.label} className={`rounded-2xl border ${cls.border} ${cls.bg} p-4 text-center`}>
              <p className={`text-2xl font-bold ${cls.text}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* Customer rows */}
      {customers.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">עדיין אין לקוחות - יופיעו כאן עם ההזמנה הראשונה</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {customers.map((c, i) => {
            const sm = STATUS_META[c.status];
            const subText = [
              `${c.orderCount} ${c.orderCount === 1 ? "הזמנה" : "הזמנות"}`,
              c.lastOrder ? `עסקה אחרונה ${relativeTime(c.lastOrder)}` : "",
            ].filter(Boolean).join(" · ");

            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-foreground text-sm">{c.name}</span>
                    {c.isVip && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <Crown className="w-2.5 h-2.5" /> VIP
                      </span>
                    )}
                    <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full ${sm.bg} ${sm.text}`}>
                      {sm.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{subText}</p>
                </div>
                <div className="text-sm font-semibold text-primary shrink-0">
                  {fmtPrice(c.totalSpent)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slim upsell strip */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground">הספקים והרווחיות שלך מחכים</p>
            <p className="text-xs text-muted-foreground mt-0.5">שדרג ל-CRM+ וקבל ניהול ספקים, דוח רווחיות, ייצוא, וואטסאפ ועוד</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-xl bg-violet-600 text-white px-4 py-2 text-xs font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap"
            onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
          >
            שדרג - 49 ₪/חודש ←
          </button>
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
          {tab === "customers"     && <DashboardCustomers orders={orders} businessId={businessId} demoMode={demoMode} />}
          {tab === "suppliers"     && <DashboardSuppliers businessId={businessId} demoMode={demoMode} />}
          {tab === "profitability" && <DashboardProfitability businessId={businessId} demoMode={demoMode} />}
        </>
      ) : (
        <>
          {tab === "customers"                                && <FreeCustomerView orders={orders} />}
          {(tab === "suppliers" || tab === "profitability")  && <LockedTabView tab={tab} />}
        </>
      )}
    </div>
  );
};

export default DashboardCRM;
