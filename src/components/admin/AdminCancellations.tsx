import { useMemo } from "react";
import { Loader2, XCircle } from "lucide-react";
import { useCancellations } from "@/hooks/useAdmin";

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("he-IL");
  } catch {
    return "—";
  }
};

const typeLabel = (t: string | null) =>
  t === "immediate" ? "הורדה מיידית" : t === "end_of_period" ? "עד תום התקופה" : "—";

const AdminCancellations = () => {
  const { data: cancellations, isLoading, isError } = useCancellations();

  const reasonBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cancellations || []) {
      const key = c.cancel_reason?.trim() || "ללא סיבה";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cancellations]);

  const total = cancellations?.length || 0;
  const maxCount = reasonBreakdown[0]?.[1] || 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground">
        לא ניתן לטעון את נתוני הביטולים. (ייתכן שמיגרציית הביטולים עדיין לא הוחלה על מסד הנתונים.)
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
          <XCircle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">ביטולים</h2>
          <p className="text-sm text-muted-foreground">סה״כ {total} ביטולים</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground">
          אין ביטולים עדיין 🎉
        </div>
      ) : (
        <>
          {/* Reason breakdown */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">פילוח סיבות ביטול</h3>
            <div className="space-y-3">
              {reasonBreakdown.map(([reason, count]) => (
                <div key={reason}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground">{reason}</span>
                    <span className="text-muted-foreground">{count} ({Math.round((count / total) * 100)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent cancellations */}
          <div className="bg-card rounded-xl border border-border p-5 overflow-x-auto">
            <h3 className="font-semibold text-foreground mb-4">ביטולים אחרונים</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">תאריך ביטול</th>
                  <th className="pb-2 font-medium">חבילה</th>
                  <th className="pb-2 font-medium">סוג</th>
                  <th className="pb-2 font-medium">סיבה</th>
                </tr>
              </thead>
              <tbody>
                {(cancellations || []).map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground">{formatDate(c.cancel_at || c.created_at)}</td>
                    <td className="py-2.5 text-muted-foreground">{c.plan_name}</td>
                    <td className="py-2.5 text-muted-foreground">{typeLabel(c.cancel_type)}</td>
                    <td className="py-2.5 text-muted-foreground">{c.cancel_reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCancellations;
