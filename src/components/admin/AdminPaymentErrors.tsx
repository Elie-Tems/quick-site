import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentErrors } from "@/hooks/useAdmin";

const AdminPaymentErrors = () => {
  const { data, isLoading } = usePaymentErrors();
  const total = (data ?? []).reduce((s, p) => s + p.count, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" /> שגיאות תשלום
        </h3>
        {total > 0 && (
          <span className="text-2xl font-bold text-red-500">{total}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (data ?? []).length > 0 ? (
        <div className="space-y-3">
          {(data ?? []).map((err) => (
            <div key={err.provider} className="p-4 rounded-lg border border-red-100 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{err.provider}</span>
                <span className="text-sm font-bold text-red-600">{err.count} שגיאות</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">סיבה נפוצה: {err.common_reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-green-600 font-medium">אין שגיאות תשלום! 🎉</p>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentErrors;
