import { Users, Store, Globe, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversionFunnel } from "@/hooks/useAdmin";

const icons = [Users, Store, Globe, ShoppingCart];
const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500"];

const AdminFunnel = () => {
  const { data, isLoading } = useConversionFunnel();

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
      <h3 className="font-semibold text-lg">פאנל המרה</h3>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((step, i) => {
            const Icon = icons[i];
            const dropPct = i > 0 ? 100 - step.pct : null;
            return (
              <div key={step.label}>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-8 h-8 rounded-lg ${colors[i]}/10 flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 text-${colors[i].replace("bg-", "")}`} />
                  </div>
                  <span className="text-sm font-medium flex-1">{step.label}</span>
                  <span className="text-lg font-bold">{step.count.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground w-12 text-left">{step.pct}%</span>
                </div>
                <div className="h-4 bg-muted rounded overflow-hidden mr-11">
                  <div
                    className={`h-full ${colors[i]} rounded transition-all duration-500`}
                    style={{ width: `${step.pct}%` }}
                  />
                </div>
                {dropPct !== null && dropPct > 0 && (
                  <p className="text-xs text-red-500 mr-11 mt-1">▼ {dropPct}% נשרו כאן</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminFunnel;
