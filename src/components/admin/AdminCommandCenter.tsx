import {
  UserPlus, Globe, CreditCard, ShoppingCart, TrendingUp, Building2,
  Users, AlertTriangle, Wallet, XCircle, Activity, BadgeDollarSign,
} from "lucide-react";
import { useCommandCenter } from "@/hooks/useCommandCenter";

const fmt = (n: number) => n.toLocaleString("he-IL");
const ils = (n: number) => `₪${fmt(Math.round(n))}`;

/**
 * Command Center: the super-admin's at-a-glance landing. Today's pulse, headline
 * KPIs, and actionable alerts in one screen. Detailed breakdowns live in the
 * dedicated analytics views (MRR, Funnel, Churn, Marketplace...).
 */
const AdminCommandCenter = () => {
  const { data, isLoading } = useCommandCenter();
  const t = data?.today;
  const k = data?.kpis;
  const a = data?.alerts;

  const pulse = [
    { label: "נרשמו היום", value: t?.signups, icon: UserPlus, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "פורסמו היום", value: t?.published, icon: Globe, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "מנויים חדשים", value: t?.newSubscribers, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "הזמנות היום", value: t?.orders, icon: ShoppingCart, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "מחזור חנויות היום", value: t ? ils(t.gmv) : undefined, icon: BadgeDollarSign, color: "text-green-600", bg: "bg-green-600/10" },
    { label: "דומיינים חדשים", value: t?.newDomains, icon: Globe, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  ];

  const kpis = [
    { label: "MRR (הכנסה חודשית)", value: k ? ils(k.mrr) : undefined, icon: TrendingUp },
    { label: "ARR (שנתי)", value: k ? ils(k.arr) : undefined, icon: TrendingUp },
    { label: "חנויות פעילות", value: k ? fmt(k.activeStores) : undefined, icon: Building2 },
    { label: "סה\"כ משתמשים", value: k ? fmt(k.totalUsers) : undefined, icon: Users },
  ];

  const alerts: { label: string; icon: typeof AlertTriangle }[] = [];
  if (a?.lowDomainBalance) alerts.push({ label: `יתרת Openprovider נמוכה: ${a.lowDomainBalance.currency} ${a.lowDomainBalance.balance} - כדאי לטעון`, icon: Wallet });
  if (a?.failedDomainOrders) alerts.push({ label: `${a.failedDomainOrders} רכישות דומיין נכשלו וממתינות לטיפול`, icon: AlertTriangle });
  if (a?.pendingCancellations) alerts.push({ label: `${a.pendingCancellations} מנויים סימנו ביטול עתידי`, icon: XCircle });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Smart alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((al, i) => {
            const Icon = al.icon;
            return (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{al.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Today's pulse */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-primary" /> הדופק של היום
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {pulse.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className={`w-9 h-9 rounded-lg ${p.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`h-4.5 w-4.5 ${p.color}`} />
                </div>
                <div className="text-2xl font-bold text-foreground">{isLoading || p.value === undefined ? "…" : p.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Headline KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">מדדים מובילים</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kp, i) => {
            const Icon = kp.icon;
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-foreground truncate">{isLoading || kp.value === undefined ? "…" : kp.value}</div>
                  <div className="text-xs text-muted-foreground">{kp.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminCommandCenter;
