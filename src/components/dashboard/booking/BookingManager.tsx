import { useMemo, useState } from "react";
import { Plus, Clock, Calendar, Check, X, Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useBookingServices, useBookingStaff, useAppointments,
  useUpsertService, useSetWorkingHours, useWorkingHours, useUpdateAppointmentStatus,
  type Appointment,
} from "@/hooks/useBooking";

/**
 * Merchant-side booking management (services / weekly hours / appointments).
 * Feature-gated: shown only for businesses whose module set includes "booking"
 * (see src/lib/businessModules.ts). Self-contained so it can slot into the
 * dashboard. Needs the booking migration applied to function.
 */

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const toHM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const toMin = (hm: string) => { const [h, m] = hm.split(":").map(Number); return h * 60 + (m || 0); };

const statusLabel: Record<Appointment["status"], string> = {
  pending: "ממתין", confirmed: "מאושר", cancelled: "בוטל", completed: "הושלם", no_show: "לא הגיע",
};

const BookingManager = ({ businessId }: { businessId: string }) => {
  const { data: services = [], isLoading: sLoading } = useBookingServices(businessId);
  const { data: staff = [] } = useBookingStaff(businessId);
  const primaryStaff = staff[0];
  const { data: hours = [] } = useWorkingHours(primaryStaff?.id);
  const now = new Date().toISOString();
  const { data: appts = [] } = useAppointments(businessId, { from: now });

  const upsertService = useUpsertService();
  const setHours = useSetWorkingHours();
  const updateStatus = useUpdateAppointmentStatus();

  const [newSvc, setNewSvc] = useState({ name: "", duration: "45", price: "" });

  const hoursByDay = useMemo(() => {
    const m: Record<number, { start: string; end: string }> = {};
    for (const h of hours) m[h.weekday] = { start: toHM(h.start_minute), end: toHM(h.end_minute) };
    return m;
  }, [hours]);
  const [draftHours, setDraftHours] = useState<Record<number, { start: string; end: string; on: boolean }>>({});

  const dayState = (d: number) =>
    draftHours[d] ?? (hoursByDay[d] ? { ...hoursByDay[d], on: true } : { start: "09:00", end: "17:00", on: false });

  const saveHours = () => {
    if (!primaryStaff) return;
    const rows = WEEKDAYS.map((_, d) => dayState(d))
      .map((s, d) => ({ d, s })).filter(({ s }) => s.on)
      .map(({ d, s }) => ({ weekday: d, start_minute: toMin(s.start), end_minute: toMin(s.end) }));
    setHours.mutate({ staffId: primaryStaff.id, businessId, rows });
  };

  const addService = () => {
    if (!newSvc.name.trim()) return;
    upsertService.mutate({
      business_id: businessId, name: newSvc.name.trim(),
      duration_minutes: Number(newSvc.duration) || 30, price: Number(newSvc.price) || 0,
    }, { onSuccess: () => setNewSvc({ name: "", duration: "45", price: "" }) });
  };

  return (
    <div className="space-y-8">
      {/* Services */}
      <section>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Scissors className="w-5 h-5 text-primary" /> השירותים שלי</h3>
        <div className="space-y-2 mb-3">
          {sLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          {services.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="flex-1"><div className="font-medium text-foreground">{s.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2"><Clock className="w-3 h-3" /> {s.duration_minutes} דק'</div></div>
              <div className="font-bold text-primary">₪{s.price}</div>
            </div>
          ))}
          {!sLoading && services.length === 0 && <p className="text-sm text-muted-foreground">עוד אין שירותים - הוסיפו את הראשון.</p>}
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <Input placeholder="שם שירות" value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })} className="max-w-[180px]" />
          <Input placeholder="דק'" value={newSvc.duration} onChange={(e) => setNewSvc({ ...newSvc, duration: e.target.value })} className="max-w-[80px]" />
          <Input placeholder="מחיר ₪" value={newSvc.price} onChange={(e) => setNewSvc({ ...newSvc, price: e.target.value })} className="max-w-[100px]" />
          <Button onClick={addService} disabled={upsertService.isPending}><Plus className="w-4 h-4 ml-1" /> הוסף</Button>
        </div>
      </section>

      {/* Working hours */}
      <section>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> שעות פעילות</h3>
        {!primaryStaff && <p className="text-sm text-muted-foreground mb-2">* ייווצר נותן-שירות ברירת-מחדל בהזמנה הראשונה.</p>}
        <div className="space-y-1.5">
          {WEEKDAYS.map((label, d) => {
            const s = dayState(d);
            return (
              <div key={d} className="flex items-center gap-3">
                <button onClick={() => setDraftHours({ ...draftHours, [d]: { ...s, on: !s.on } })}
                  className={`w-20 text-sm py-1.5 rounded-lg border ${s.on ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
                  {label}
                </button>
                {s.on && (
                  <>
                    <Input type="time" value={s.start} onChange={(e) => setDraftHours({ ...draftHours, [d]: { ...s, start: e.target.value } })} className="max-w-[120px]" />
                    <span className="text-muted-foreground">-</span>
                    <Input type="time" value={s.end} onChange={(e) => setDraftHours({ ...draftHours, [d]: { ...s, end: e.target.value } })} className="max-w-[120px]" />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <Button onClick={saveHours} disabled={setHours.isPending || !primaryStaff} className="mt-3">
          {setHours.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור שעות"}
        </Button>
      </section>

      {/* Upcoming appointments */}
      <section>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> תורים קרובים</h3>
        <div className="space-y-2">
          {appts.length === 0 && <p className="text-sm text-muted-foreground">אין תורים קרובים.</p>}
          {appts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{a.customer_name} · {a.customer_phone}</div>
                <div className="text-xs text-muted-foreground">{new Date(a.starts_at).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" })}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{statusLabel[a.status]}</span>
              {a.status !== "cancelled" && a.status !== "completed" && (
                <>
                  <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: a.id, status: "completed" })} title="הושלם"><Check className="w-4 h-4 text-emerald-500" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: a.id, status: "cancelled" })} title="ביטול"><X className="w-4 h-4 text-rose-500" /></Button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BookingManager;
