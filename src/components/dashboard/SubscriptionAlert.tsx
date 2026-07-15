import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyBusiness } from "@/hooks/useBusiness";
import { AlertTriangle, CreditCard, Clock } from "lucide-react";

// In-dashboard dunning alert. Complements the email reminders: shows a prominent
// banner the moment the subscription is overdue, escalating toward suspension and
// deletion. Timeline matches Terms §1.4 (≈10 days → suspend, ≈45 days → delete).
const FREEZE_DAYS = 10;
const DELETE_DAYS = 45;

interface Props {
  onManage?: () => void;
}

const SubscriptionAlert = ({ onManage }: Props) => {
  const { data: business } = useMyBusiness();

  const { data: sub } = useQuery({
    queryKey: ["subscription-alert", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      // Per-site: the alert reflects the ACTIVE site's subscription.
      const { data } = await supabase
        .from("subscriptions")
        .select("status, paid_until, monthly_total")
        .eq("business_id", (business as { id: string }).id)
        .maybeSingle();
      return data;
    },
  });

  if (!sub?.paid_until) return null;
  // Never show overdue alerts for trial subscriptions that simply expired —
  // only show them for accounts that were genuinely active/paying and stopped.
  if (sub.status === "trial" || sub.status === "cancelled" || sub.status === "expired") return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  const overdueDays = Math.floor((Date.now() - new Date(sub.paid_until).getTime()) / msPerDay);
  if (overdueDays <= 0) return null; // paid / not overdue

  let tone: "warning" | "danger" = "warning";
  let icon = <Clock className="h-5 w-5 shrink-0" />;
  let title = "התשלום החודשי לא עבר";
  let body = "";

  if (overdueDays < FREEZE_DAYS) {
    tone = "warning";
    title = "התשלום החודשי לא עבר 💳";
    body = `כדי שהאתר יישאר פעיל, עדכנו את אמצעי התשלום. אם לא יוסדר - האתר יושהה בעוד ${FREEZE_DAYS - overdueDays} ימים.`;
  } else if (overdueDays < DELETE_DAYS) {
    tone = "danger";
    icon = <AlertTriangle className="h-5 w-5 shrink-0" />;
    title = "האתר מושהה עקב אי-תשלום ⏸️";
    body = `האתר אינו זמין כרגע ללקוחות. הסדירו את התשלום כדי להחזירו מיד. הנתונים יימחקו בעוד ${DELETE_DAYS - overdueDays} ימים.`;
  } else {
    tone = "danger";
    icon = <AlertTriangle className="h-5 w-5 shrink-0" />;
    title = "האתר מיועד למחיקה ⚠️";
    body = "האתר מושהה זה זמן רב והנתונים עומדים להימחק לצמיתות. הסדירו את התשלום עכשיו כדי להציל אותם.";
  }

  const styles =
    tone === "danger"
      ? "bg-destructive/10 border-destructive/40 text-destructive"
      : "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400";

  return (
    <div className={`mx-4 md:mx-6 mt-4 rounded-xl border p-4 ${styles}`} dir="rtl" role="alert">
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="text-sm opacity-90 mt-0.5">{body}</p>
        </div>
        <button
          onClick={onManage}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity"
        >
          <CreditCard className="h-4 w-4" /> הסדרת תשלום
        </button>
      </div>
    </div>
  );
};

export default SubscriptionAlert;
