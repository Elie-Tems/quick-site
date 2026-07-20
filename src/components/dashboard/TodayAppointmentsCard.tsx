import { CalendarDays, Check, X, Palmtree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Appointment } from "@/hooks/useBooking";

interface TodayAppointmentsCardProps {
  appointments: Appointment[];
  isLoading: boolean;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onNavigateToCalendar: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "מאושר",
  pending: "ממתין",
  completed: "הסתיים",
  cancelled: "בוטל",
  no_show: "לא הגיע",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
}

function todayDayName() {
  return new Date().toLocaleDateString("he-IL", {
    weekday: "long",
    timeZone: "Asia/Jerusalem",
  });
}

export function TodayAppointmentsCard({
  appointments,
  isLoading,
  onConfirm,
  onCancel,
  onNavigateToCalendar,
}: TodayAppointmentsCardProps) {
  const active = appointments.filter((a) => a.status !== "cancelled");
  const pendingCount = active.filter((a) => a.status === "pending").length;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">היום, {todayDayName()}</span>
        </div>
        {!isLoading && active.length > 0 && (
          <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
            {active.length} תורים
            {pendingCount > 0 && (
              <span className="mr-1 text-amber-600">· {pendingCount} ממתין</span>
            )}
          </span>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="divide-y divide-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="w-10 h-3 rounded" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-2.5 w-24 rounded" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <Palmtree className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">אין תורים היום — יום פנוי</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {active.map((appt) => {
            const isPending = appt.status === "pending";
            return (
              <div
                key={appt.id}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                  isPending ? "bg-amber-50/60 dark:bg-amber-950/20" : ""
                }`}
              >
                <span className="text-xs text-muted-foreground tabular-nums min-w-[36px]">
                  {formatTime(appt.starts_at)}
                </span>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                  {initials(appt.customer_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {appt.customer_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {Math.round(
                      (new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) /
                        60000
                    )}{" "}
                    דק'
                  </p>
                </div>
                {isPending ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                      onClick={() => onConfirm(appt.id)}
                    >
                      <Check className="w-3 h-3 ml-1" /> אשר
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => onCancel(appt.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      appt.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : appt.status === "completed"
                        ? "bg-muted text-muted-foreground"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"
                    }`}
                  >
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-border">
        <button
          onClick={onNavigateToCalendar}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          לכל היומן
        </button>
      </div>
    </div>
  );
}
