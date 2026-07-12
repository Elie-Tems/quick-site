import { useMemo, useState } from "react";
import {
  ChevronRight, ChevronLeft, Calendar as CalendarIcon, Settings2, Check, X,
  Clock, Phone, StickyNote, CalendarCheck,
} from "lucide-react";
import { useAppointments, useUpdateAppointmentStatus, type Appointment } from "@/hooks/useBooking";
import {
  holidaysForMonth, loadHolidayPrefs, saveHolidayPrefs, FAITH_META,
  type HolidayPrefs, type Faith, type Holiday,
} from "@/lib/holidays";

/**
 * The big month calendar for service businesses - the main surface for running
 * the day: every appointment shows in-grid (time + who), holidays of the
 * enabled faiths overlay each day, and clicking a day opens its full schedule
 * with notes and one-tap status actions. Two-way Google sync is handled by the
 * sibling <CalendarConnect> so appointments booked/edited in Google appear here
 * too. Holiday faith layers are chosen per operator and persist locally.
 */

const WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

const localDay = (isoStr: string) => {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hhmm = (isoStr: string) => new Date(isoStr).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
const hebrewDay = (d: Date) => {
  try {
    const parts = new Intl.DateTimeFormat("he-u-ca-hebrew", { day: "numeric" }).formatToParts(d);
    return parts.find((p) => p.type === "day")?.value ?? "";
  } catch {
    return "";
  }
};

const statusColor: Record<Appointment["status"], string> = {
  pending: "#f59e0b",
  confirmed: "#2563eb",
  completed: "#10b981",
  cancelled: "#9ca3af",
  no_show: "#ef4444",
};
const statusLabel: Record<Appointment["status"], string> = {
  pending: "ממתין", confirmed: "מאושר", cancelled: "בוטל", completed: "הושלם", no_show: "לא הגיע",
};

const BookingCalendar = ({ businessId }: { businessId: string }) => {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<HolidayPrefs>(() => loadHolidayPrefs());
  const [showSettings, setShowSettings] = useState(false);

  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();

  // Fetch the whole visible month (a little padding so edge days render too).
  const from = new Date(year, month0, 1).toISOString();
  const to = new Date(year, month0 + 1, 0, 23, 59, 59).toISOString();
  const { data: appts = [] } = useAppointments(businessId, { from, to });
  const updateStatus = useUpdateAppointmentStatus();

  const apptsByDay = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    for (const a of appts) {
      if (a.status === "cancelled") continue;
      (m[localDay(a.starts_at)] ??= []).push(a);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return m;
  }, [appts]);

  const holidaysByDay = useMemo(() => {
    const m: Record<string, Holiday[]> = {};
    for (const h of holidaysForMonth(year, month0, prefs)) (m[h.date] ??= []).push(h);
    return m;
  }, [year, month0, prefs]);

  // Grid cells: leading blanks for the first weekday, then each day of the month.
  const firstWeekday = new Date(year, month0, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dateKey = (day: number) => `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const move = (delta: number) => { setCursor(new Date(year, month0 + delta, 1)); setSelected(null); };
  const toggleFaith = (f: Faith) => {
    const next = { ...prefs, [f]: !prefs[f] };
    setPrefs(next);
    saveHolidayPrefs(next);
  };

  const selectedAppts = selected ? (apptsByDay[selected] ?? []) : [];
  const selectedHolidays = selected ? (holidaysByDay[selected] ?? []) : [];

  return (
    <section dir="rtl">
      {/* Header: month nav + sync badge + settings */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="w-9 h-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center" title="חודש קודם">
            <ChevronRight className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold text-foreground min-w-[9rem] text-center">{MONTHS[month0]} {year}</h3>
          <button onClick={() => move(1)} className="w-9 h-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center" title="חודש הבא">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(null); }} className="text-sm px-3 h-9 rounded-lg border border-border hover:bg-muted">
            היום
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 px-2.5 py-1.5 rounded-full">
            <CalendarCheck className="w-3.5 h-3.5" /> מסונכרן עם Google
          </span>
          <div className="relative">
            <button onClick={() => setShowSettings((s) => !s)} className="w-9 h-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center" title="הצגת חגים">
              <Settings2 className="w-4.5 h-4.5" />
            </button>
            {showSettings && (
              <div className="absolute left-0 mt-2 w-56 z-20 rounded-xl border border-border bg-card shadow-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">אילו חגים להציג ביומן</p>
                {(Object.keys(FAITH_META) as Faith[]).map((f) => (
                  <label key={f} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm">
                    <input type="checkbox" checked={prefs[f]} onChange={() => toggleFaith(f)} className="accent-primary w-4 h-4" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: FAITH_META[f].color }} />
                    {FAITH_META[f].label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-semibold text-muted-foreground py-1">{w}</div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-[92px] rounded-lg bg-muted/30" />;
          const key = dateKey(day);
          const dayAppts = apptsByDay[key] ?? [];
          const dayHols = holidaysByDay[key] ?? [];
          const isToday = key === todayKey;
          const cellDate = new Date(year, month0, day);
          const isFriSat = cellDate.getDay() === 5 || cellDate.getDay() === 6;
          return (
            <button
              key={i}
              onClick={() => setSelected(key)}
              className={`min-h-[92px] rounded-lg border p-1.5 text-right flex flex-col gap-1 transition-colors hover:border-primary/50 ${
                isToday ? "border-primary bg-primary/5" : isFriSat ? "border-border bg-muted/20" : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] text-muted-foreground">{hebrewDay(cellDate)}</span>
                <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
              </div>
              {dayHols.slice(0, 1).map((h, j) => (
                <span key={j} className="text-[9px] leading-tight px-1 py-0.5 rounded truncate" style={{ background: `${FAITH_META[h.faith].color}18`, color: FAITH_META[h.faith].color }}>
                  {h.name}
                </span>
              ))}
              {dayAppts.slice(0, 2).map((a) => (
                <span key={a.id} className="text-[9px] leading-tight px-1 py-0.5 rounded truncate text-white" style={{ background: statusColor[a.status] }}>
                  {hhmm(a.starts_at)} {a.customer_name}
                </span>
              ))}
              {dayAppts.length > 2 && (
                <span className="text-[9px] text-muted-foreground">+{dayAppts.length - 2} נוספים</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected-day schedule */}
      {selected && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              {new Date(selected).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
            </h4>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>

          {selectedHolidays.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedHolidays.map((h, j) => (
                <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${FAITH_META[h.faith].color}18`, color: FAITH_META[h.faith].color }}>
                  {h.name}
                </span>
              ))}
            </div>
          )}

          {selectedAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">אין תורים ביום זה.</p>
          ) : (
            <div className="space-y-2">
              {selectedAppts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <div className="text-center shrink-0">
                    <div className="text-base font-bold text-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary" /> {hhmm(a.starts_at)}</div>
                    <div className="text-[11px] text-muted-foreground">{hhmm(a.ends_at)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{a.customer_name}</div>
                    <a href={`tel:${a.customer_phone}`} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" /> {a.customer_phone}</a>
                    {a.notes && <div className="text-xs text-muted-foreground flex items-start gap-1 mt-1"><StickyNote className="w-3 h-3 mt-0.5 shrink-0" /> {a.notes}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ background: statusColor[a.status] }}>{statusLabel[a.status]}</span>
                    {a.status !== "completed" && a.status !== "cancelled" && (
                      <div className="flex gap-1">
                        <button onClick={() => updateStatus.mutate({ id: a.id, status: "completed" })} className="w-7 h-7 rounded-md border border-border hover:bg-emerald-500/10 flex items-center justify-center" title="הושלם"><Check className="w-3.5 h-3.5 text-emerald-500" /></button>
                        <button onClick={() => updateStatus.mutate({ id: a.id, status: "cancelled" })} className="w-7 h-7 rounded-md border border-border hover:bg-rose-500/10 flex items-center justify-center" title="ביטול"><X className="w-3.5 h-3.5 text-rose-500" /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default BookingCalendar;
