import { useState } from "react";
import {
  UserPlus, Globe, CreditCard, ShoppingCart, TrendingUp, Building2,
  Users, AlertTriangle, Wallet, XCircle, Activity, BadgeDollarSign,
  ExternalLink, RefreshCw, Loader2, ChevronLeft,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCommandCenter } from "@/hooks/useCommandCenter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fmt = (n: number) => n.toLocaleString("he-IL");
const ils = (n: number) => `₪${fmt(Math.round(n))}`;

/**
 * Command Center: the super-admin's at-a-glance landing. Today's pulse, headline
 * KPIs, and actionable alerts in one screen. Detailed breakdowns live in the
 * dedicated analytics views (MRR, Funnel, Churn, Marketplace...).
 */

// --- Detail queries (run only when a modal is open) ---

function useFailedDomainOrders(enabled: boolean) {
  return useQuery({
    queryKey: ["failed-domain-orders-detail"],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("domain_orders")
        .select("id, domain_name, status, created_at, business_id, businesses(name)")
        .in("status", ["failed", "failed_funds"])
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as Array<{
        id: string;
        domain_name: string;
        status: string;
        created_at: string;
        business_id: string;
        businesses: { name: string } | null;
      }>;
    },
  });
}

function usePendingCancellations(enabled: boolean) {
  return useQuery({
    queryKey: ["pending-cancellations-detail"],
    enabled,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("subscriptions")
        .select("id, cancel_at, cancel_type, cancel_reason, business_id, plan, businesses(name)")
        .not("cancel_at", "is", null)
        .gt("cancel_at", new Date().toISOString())
        .order("cancel_at", { ascending: true })
        .limit(50);
      return (data || []) as Array<{
        id: string;
        cancel_at: string;
        cancel_type: string | null;
        cancel_reason: string | null;
        business_id: string;
        plan: string | null;
        businesses: { name: string } | null;
      }>;
    },
  });
}

// --- Modals ---

function BalanceModal({ balance, currency, onClose }: {
  balance: number; currency: string; onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const refreshBalance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("domain-balance-check");
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || "שגיאה");
      toast.success("היתרה עודכנה ✓");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בטעינת היתרה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
        <div className="text-3xl font-bold text-destructive">
          {currency} {balance.toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">יתרה נוכחית ב-Openprovider</div>
        <div className="text-xs text-muted-foreground mt-0.5">סף האזהרה: $20</div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
        <div className="font-semibold text-foreground">למה זה קורה?</div>
        <p className="text-muted-foreground">
          כל רכישת דומיין מנכה מהיתרה המשותפת אצל Openprovider. כשהיתרה יורדת מ-$20
          המערכת מתריעה כדי למנוע כישלון ברכישות עתידיות.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">פעולות</div>
        <Button
          className="w-full"
          onClick={() => window.open("https://cp.openprovider.eu/account/reseller.php", "_blank")}
        >
          <ExternalLink className="h-4 w-4 ml-1" />
          טעינת יתרה ב-Openprovider
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={refreshBalance}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <RefreshCw className="h-4 w-4 ml-1" />}
          רענן יתרה מ-API
        </Button>
      </div>
    </div>
  );
}

function FailedDomainsModal() {
  const { data, isLoading } = useFailedDomainOrders(true);

  const statusLabel: Record<string, string> = {
    failed: "שגיאה כללית",
    failed_funds: "יתרה נמוכה",
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-6">אין רכישות כושלות כרגע</p>;
  }

  return (
    <div className="space-y-2" dir="rtl">
      {data.map((o) => (
        <div key={o.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium text-foreground">{o.domain_name || "—"}</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                {o.businesses?.name || o.business_id} · {new Date(o.created_at).toLocaleDateString("he-IL")}
              </div>
            </div>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
              o.status === "failed_funds"
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-600"
            }`}>
              {statusLabel[o.status] ?? o.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CancellationsModal() {
  const { data, isLoading } = usePendingCancellations(true);

  const reasonLabels: Record<string, string> = {
    expensive: "יקר מדי",
    not_used: "לא השתמשתי",
    missing_features: "חסרות תכונות",
    closing_business: "סוגר עסק",
    other: "אחר",
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-6">אין ביטולים עתידיים כרגע</p>;
  }

  return (
    <div className="space-y-2" dir="rtl">
      {data.map((s) => {
        const cancelDate = new Date(s.cancel_at);
        const daysLeft = Math.ceil((cancelDate.getTime() - Date.now()) / 86_400_000);
        return (
          <div key={s.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-foreground">{s.businesses?.name || s.business_id}</div>
                <div className="text-muted-foreground text-xs mt-0.5">
                  {s.plan ?? "ללא מסלול"} · {s.cancel_type === "immediate" ? "ביטול מיידי" : "סוף תקופה"}
                </div>
                {s.cancel_reason && (
                  <div className="text-xs mt-1 text-amber-500">
                    סיבה: {reasonLabels[s.cancel_reason] ?? s.cancel_reason}
                  </div>
                )}
              </div>
              <div className="text-left shrink-0">
                <div className="text-xs font-semibold text-destructive">{daysLeft} ימים</div>
                <div className="text-xs text-muted-foreground">{cancelDate.toLocaleDateString("he-IL")}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Component ---

const AdminCommandCenter = () => {
  const { data, isLoading } = useCommandCenter();
  const t = data?.today;
  const k = data?.kpis;
  const a = data?.alerts;

  const [activeModal, setActiveModal] = useState<"balance" | "domains" | "cancellations" | null>(null);

  const pulse = [
    { label: "נרשמו היום", value: t?.signups, icon: UserPlus, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "פורסמו היום", value: t?.published, icon: Globe, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "מנויים חדשים", value: t?.newSubscribers, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "הזמנות היום", value: t?.orders, icon: ShoppingCart, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "מחזור חנויות היום", value: t ? ils(t.gmv) : undefined, icon: BadgeDollarSign, color: "text-green-600", bg: "bg-green-600/10" },
    { label: "דומיינים חדשים", value: t?.newDomains, icon: Globe, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  ];

  const kpis = [
    { label: "הכנסה חודשית", value: k ? ils(k.mrr) : undefined, icon: TrendingUp },
    { label: "הכנסה שנתית", value: k ? ils(k.arr) : undefined, icon: TrendingUp },
    { label: "חנויות פעילות", value: k ? fmt(k.activeStores) : undefined, icon: Building2 },
    { label: "סה\"כ משתמשים", value: k ? fmt(k.totalUsers) : undefined, icon: Users },
  ];

  const alerts: {
    key: "balance" | "domains" | "cancellations";
    label: string;
    icon: typeof AlertTriangle;
  }[] = [];
  if (a?.lowDomainBalance) alerts.push({ key: "balance", label: `יתרת Openprovider נמוכה: ${a.lowDomainBalance.currency} ${a.lowDomainBalance.balance} - כדאי לטעון`, icon: Wallet });
  if (a?.failedDomainOrders) alerts.push({ key: "domains", label: `${a.failedDomainOrders} רכישות דומיין נכשלו וממתינות לטיפול`, icon: AlertTriangle });
  if (a?.pendingCancellations) alerts.push({ key: "cancellations", label: `${a.pendingCancellations} מנויים סימנו ביטול עתידי`, icon: XCircle });

  const modalTitles: Record<string, string> = {
    balance: "יתרת Openprovider",
    domains: "רכישות דומיין שנכשלו",
    cancellations: "ביטולים עתידיים",
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Smart alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((al) => {
            const Icon = al.icon;
            return (
              <button
                key={al.key}
                onClick={() => setActiveModal(al.key)}
                className="w-full flex items-center gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-right"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{al.label}</span>
                <ChevronLeft className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            );
          })}
        </div>
      )}

      {/* Alert modals */}
      <Dialog open={activeModal !== null} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {activeModal ? modalTitles[activeModal] : ""}
            </DialogTitle>
          </DialogHeader>

          {activeModal === "balance" && a?.lowDomainBalance && (
            <BalanceModal
              balance={a.lowDomainBalance.balance}
              currency={a.lowDomainBalance.currency}
              onClose={() => setActiveModal(null)}
            />
          )}
          {activeModal === "domains" && <FailedDomainsModal />}
          {activeModal === "cancellations" && <CancellationsModal />}
        </DialogContent>
      </Dialog>

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
