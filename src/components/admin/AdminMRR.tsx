import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMRR } from "@/hooks/useAdmin";

const AdminMRR = () => {
  const { data, isLoading } = useMRR();

  const fmt = (n: number) =>
    new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);

  const latest = data?.[data.length - 1];
  const prev = data?.[data.length - 2];
  const arr = (latest?.mrr ?? 0) * 12;
  const growth = prev && prev.mrr > 0 ? Math.round(((latest!.mrr - prev.mrr) / prev.mrr) * 100) : 0;
  const maxMRR = Math.max(...(data?.map((d) => d.mrr) ?? [1]));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "הכנסה חודשית נוכחית", value: fmt(latest?.mrr ?? 0), icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "הכנסה שנתית", value: fmt(arr), icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "צמיחה חודש-חודש", value: `${growth > 0 ? "+" : ""}${growth}%`, icon: growth >= 0 ? TrendingUp : TrendingDown, color: growth >= 0 ? "text-green-500" : "text-red-500", bg: growth >= 0 ? "bg-green-500/10" : "bg-red-500/10" },
        ].map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <span className="text-sm text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* MRR chart */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> הכנסה חודשית לאורך זמן
        </h3>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data && data.length > 0 ? (
          <div className="space-y-2">
            {data.slice(-12).map((item) => (
              <div key={item.month} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 shrink-0">{item.month}</span>
                <div className="flex-1 h-7 bg-muted rounded overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500/80 rounded transition-all duration-300"
                    style={{ width: `${(item.mrr / maxMRR) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-24 text-left shrink-0">{fmt(item.mrr)}</span>
                {item.new_mrr > 0 && (
                  <span className="text-xs text-green-600 shrink-0">+{fmt(item.new_mrr)}</span>
                )}
                {item.churned_mrr > 0 && (
                  <span className="text-xs text-red-500 shrink-0">-{fmt(item.churned_mrr)}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-12 text-muted-foreground">אין נתוני מנויים עדיין</p>
        )}
      </div>
    </div>
  );
};

export default AdminMRR;
