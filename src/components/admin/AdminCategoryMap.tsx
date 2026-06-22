import { PieChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategoryDistribution } from "@/hooks/useAdmin";

const COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500",
  "bg-pink-500", "bg-cyan-500", "bg-yellow-500", "bg-red-500",
];

const AdminCategoryMap = () => {
  const { data, isLoading } = useCategoryDistribution();

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <PieChart className="h-5 w-5 text-primary" /> התפלגות קטגוריות עסקים
      </h3>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (data ?? []).length > 0 ? (
        <div className="space-y-2">
          {(data ?? []).map((cat, i) => (
            <div key={cat.category} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full shrink-0 ${COLORS[i % COLORS.length]}`} />
              <span className="text-sm flex-1 truncate">{cat.category}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden max-w-[200px]">
                <div
                  className={`h-full ${COLORS[i % COLORS.length]} opacity-70 rounded transition-all duration-500`}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
              <span className="text-sm font-medium w-8 text-left">{cat.pct}%</span>
              <span className="text-xs text-muted-foreground w-8 text-left">{cat.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-8 text-muted-foreground">אין נתונים עדיין</p>
      )}
    </div>
  );
};

export default AdminCategoryMap;
