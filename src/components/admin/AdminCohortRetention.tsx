import { Users2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCohortRetention } from "@/hooks/useAdmin";

function heatColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500 text-white";
  if (pct >= 60) return "bg-emerald-300 text-emerald-900";
  if (pct >= 40) return "bg-yellow-300 text-yellow-900";
  if (pct >= 20) return "bg-orange-300 text-orange-900";
  return "bg-red-300 text-red-900";
}

const AdminCohortRetention = () => {
  const { data, isLoading } = useCohortRetention();
  const rows = data?.slice(-6) ?? [];

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Users2 className="h-5 w-5 text-primary" /> שימור לקוחות לאורך זמן
      </h3>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right pb-2 font-medium text-muted-foreground">חודש</th>
                <th className="text-center pb-2 font-medium text-muted-foreground">נרשמו</th>
                <th className="text-center pb-2 font-medium text-muted-foreground">30 ימים</th>
                <th className="text-center pb-2 font-medium text-muted-foreground">60 ימים</th>
                <th className="text-center pb-2 font-medium text-muted-foreground">90 ימים</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cohort} className="border-b border-border/50">
                  <td className="py-2 font-medium">{row.cohort}</td>
                  <td className="py-2 text-center text-muted-foreground">{row.total}</td>
                  {[row.d30, row.d60, row.d90].map((pct, i) => (
                    <td key={i} className="py-2 text-center px-1">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${heatColor(pct)}`}>
                        {pct}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">
            צבעים: ירוק = שמירה גבוהה · אדום = נשירה גבוהה
          </p>
        </div>
      ) : (
        <p className="text-center py-8 text-muted-foreground">אין נתוני מנויים עדיין</p>
      )}
    </div>
  );
};

export default AdminCohortRetention;
