import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Booking {
  id: string;
  unit_name: string | null;
  checkin_date: string | null;
  checkout_date: string | null;
  customer_name: string | null;
  status: string | null;
}

interface Props {
  businessId: string | undefined;
}

export default function DashboardAvailabilityCalendar({ businessId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from("orders")
      .select("id, unit_name, checkin_date, checkout_date, status, customer_name")
      .eq("business_id", businessId)
      .not("checkin_date", "is", null)
      .then(({ data }) => {
        if (data) setBookings(data as Booking[]);
      });
  }, [businessId]);

  const firstDay = new Date(month.year, month.month, 1);
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  function bookingsForDay(day: number): Booking[] {
    const dateStr = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.filter(
      (b) => b.checkin_date && b.checkout_date && dateStr >= b.checkin_date && dateStr <= b.checkout_date
    );
  }

  function prevMonth() {
    setMonth((m) => {
      const d = new Date(m.year, m.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function nextMonth() {
    setMonth((m) => {
      const d = new Date(m.year, m.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const monthName = firstDay.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-l from-violet-500/15 to-indigo-500/5 border border-violet-500/20 p-5 mb-5 flex items-center gap-4">
        <div className="text-4xl">📅</div>
        <div>
          <h1 className="text-lg font-bold text-foreground">יומן זמינות</h1>
          <p className="text-sm text-muted-foreground">הזמנות לפי תאריכים - תצוגה בלבד</p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Button>
        <span className="font-semibold text-foreground min-w-[160px] text-center">{monthName}</span>
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {/* Day headers - Sun..Sat */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/30">
          {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map((d) => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`e${i}`} className="min-h-[60px] border-b border-l border-border" />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayBookings = bookingsForDay(day);
            return (
              <div
                key={day}
                className={`min-h-[60px] border-b border-l border-border p-1 ${
                  dayBookings.length > 0 ? "bg-emerald-50 dark:bg-emerald-950/20" : ""
                }`}
              >
                <span className="text-xs text-muted-foreground">{day}</span>
                {dayBookings.map((b) => (
                  <div
                    key={b.id}
                    className="mt-0.5 rounded px-1 py-px text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 truncate"
                  >
                    {b.unit_name ?? b.customer_name ?? "הזמנה"}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        ירוק = תפוס. לפרטי הזמנה - עבור לסעיף הזמנות לינה.
      </p>
    </div>
  );
}
