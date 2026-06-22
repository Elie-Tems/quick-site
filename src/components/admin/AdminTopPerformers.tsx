import { Trophy, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopPerformers } from "@/hooks/useAdmin";

const medals = ["🥇", "🥈", "🥉"];

const AdminTopPerformers = () => {
  const { data, isLoading } = useTopPerformers(10);

  const fmt = (n: number) =>
    new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" /> 10 העסקים המובילים
      </h3>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (data ?? []).length > 0 ? (
        <div className="space-y-2">
          {(data ?? []).map((biz, i) => (
            <div key={biz.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-lg w-7 shrink-0">{medals[i] ?? `${i + 1}.`}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{biz.name}</p>
                <p className="text-xs text-muted-foreground">{biz.orders_count} הזמנות · {biz.page_views.toLocaleString()} צפיות</p>
              </div>
              <p className="font-bold text-emerald-600 text-sm shrink-0">{fmt(biz.revenue)}</p>
              {biz.slug && (
                <a
                  href={`/store/${biz.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-8 text-muted-foreground">אין נתוני מכירות עדיין</p>
      )}
    </div>
  );
};

export default AdminTopPerformers;
