import { TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useChurnRate } from "@/hooks/useAdmin";

const AdminChurnRate = () => {
  const { data, isLoading } = useChurnRate();

  const last6 = data?.slice(-6) ?? [];
  const avgChurn = last6.length > 0
    ? Math.round(last6.reduce((s, d) => s + d.churn_rate, 0) / last6.length)
    : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-500" /> Churn Rate
        </h3>
        <div className="text-left">
          <p className="text-2xl font-bold text-red-500">{avgChurn}%</p>
          <p className="text-xs text-muted-foreground">ממוצע 6 חודשים אחרונים</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : last6.length > 0 ? (
        <div className="space-y-2">
          {last6.map((item) => (
            <div key={item.month} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 shrink-0">{item.month}</span>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-red-400/80 rounded transition-all duration-300"
                  style={{ width: `${Math.min(item.churn_rate, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium w-12 text-left">{item.churn_rate}%</span>
              <span className="text-xs text-muted-foreground w-16 text-left">
                {item.churned}/{item.active}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-8 text-muted-foreground">אין נתונים עדיין</p>
      )}
    </div>
  );
};

export default AdminChurnRate;
