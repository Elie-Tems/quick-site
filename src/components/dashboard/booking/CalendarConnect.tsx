import { CalendarClock, RefreshCw, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useCalendarConnections, useConnectCalendar, useSyncCalendar,
  type BookingStaff,
} from "@/hooks/useBooking";

/**
 * Google Calendar two-way sync control for a staff member. Connect -> OAuth
 * consent (calendar-oauth-start); once linked, external events block availability
 * and Siango appointments are pushed to Google. "Sync now" triggers calendar-sync
 * on demand (a scheduled cron keeps it fresh otherwise). Microsoft: coming next.
 */
const CalendarConnect = ({ businessId, staff }: { businessId: string; staff?: BookingStaff }) => {
  const { data: connections = [] } = useCalendarConnections(businessId);
  const connect = useConnectCalendar();
  const sync = useSyncCalendar();
  const conn = connections.find((c) => c.staff_id === staff?.id && c.provider === "google");

  return (
    <section>
      <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-primary" /> יומן Google
      </h3>

      {!staff && <p className="text-sm text-muted-foreground">* ייווצר נותן-שירות ברירת-מחדל בהזמנה הראשונה, ואז אפשר לחבר יומן.</p>}

      {staff && !conn && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-3">
            חברו את יומן Google כדי שתורים חדשים ייכנסו ליומן שלכם אוטומטית, ואירועים קיימים ביומן יחסמו זמינות.
          </p>
          <Button onClick={() => connect.mutate({ staffId: staff.id })} disabled={connect.isPending}>
            {connect.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CalendarClock className="w-4 h-4 ml-1" /> חיבור יומן Google</>}
          </Button>
        </div>
      )}

      {staff && conn && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          {conn.status === "active" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">{conn.provider_account_email || "יומן Google"}</div>
            <div className="text-xs text-muted-foreground">
              {conn.status === "needs_reauth" ? "נדרש חיבור מחדש" :
               conn.status === "error" ? "שגיאת סנכרון - נסו שוב" :
               conn.last_synced_at ? `סונכרן: ${new Date(conn.last_synced_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}` : "מחובר, ממתין לסנכרון"}
            </div>
          </div>
          {conn.status === "needs_reauth" ? (
            <Button size="sm" variant="outline" onClick={() => connect.mutate({ staffId: staff.id })} disabled={connect.isPending}>
              חיבור מחדש
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={sync.isPending}
              onClick={() => sync.mutate({ connectionId: conn.id }, {
                onSuccess: (r) => r.error ? toast.error("סנכרון נכשל") : toast.success(`סונכרן: ${r.inbound} אירועים, ${r.outbound} תורים`),
                onError: () => toast.error("סנכרון נכשל"),
              })}>
              {sync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 ml-1" /> סנכרן</>}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};

export default CalendarConnect;
