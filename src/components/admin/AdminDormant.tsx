import { Moon, AlertTriangle, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDormantBusinesses } from "@/hooks/useAdmin";

const AdminDormant = () => {
  const { data, isLoading } = useDormantBusinesses();

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Moon className="h-5 w-5 text-slate-500" /> עסקים רדומים
        </h3>
        {data && (
          <Badge variant="secondary">{data.length} עסקים</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (data ?? []).length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(data ?? []).map((biz) => (
            <div key={biz.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{biz.name}</p>
                <p className="text-xs text-muted-foreground">
                  {biz.owner_email ?? "אין מייל"} ·{" "}
                  {biz.last_order_at
                    ? `הזמנה אחרונה לפני ${biz.days_inactive} ימים`
                    : `נרשם לפני ${biz.days_inactive} ימים, אף הזמנה`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!biz.is_published && (
                  <Badge variant="destructive" className="text-xs">לא פורסם</Badge>
                )}
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${biz.days_inactive > 60 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {biz.days_inactive}י' לא פעיל
                </span>
                {biz.owner_email && (
                  <a href={`mailto:${biz.owner_email}`} className="text-muted-foreground hover:text-primary">
                    <Mail className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-green-500" />
          <p>כל העסקים פעילים! 🎉</p>
        </div>
      )}
    </div>
  );
};

export default AdminDormant;
