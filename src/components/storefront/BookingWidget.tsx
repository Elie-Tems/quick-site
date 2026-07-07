import { useMemo, useState } from "react";
import { Clock, Check, Loader2, ArrowLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useBookingServices, useAvailability, useCreateAppointment, type BookingService,
} from "@/hooks/useBooking";

/**
 * Storefront booking flow: pick service -> see server-computed availability ->
 * pick slot -> details -> create appointment. Availability + create go through
 * edge functions (server-authoritative). Real replacement for the ServicesStore
 * mockup; renders when the business has the "booking" module. Needs the booking
 * migration applied + at least one service with working hours.
 */

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const BookingWidget = ({ businessId }: { businessId: string }) => {
  const { data: services = [], isLoading } = useBookingServices(businessId);
  const [service, setService] = useState<BookingService | null>(null);
  const [day, setDay] = useState(0); // offset from today
  const [slot, setSlot] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ fullName: "", phone: "", email: "" });
  const [done, setDone] = useState(false);

  const date = useMemo(() => addDays(new Date(), day), [day]);
  const { data: avail, isFetching } = useAvailability(
    service ? { businessId, serviceId: service.id, fromDate: ymd(date), toDate: ymd(date) } : undefined,
  );
  const create = useCreateAppointment();

  const book = () => {
    if (!service || !slot) return;
    const staffId = Object.entries(avail?.slotsByStaff ?? {}).find(([, v]) => v.includes(slot))?.[0];
    if (!staffId) { toast.error("המשבצת התפנתה, בחרו אחרת"); return; }
    create.mutate(
      { businessId, serviceId: service.id, staffId, startsAt: slot, customer },
      {
        onSuccess: () => setDone(true),
        onError: (e) => toast.error(e.message === "slot_taken" ? "המשבצת נתפסה, בחרו אחרת" : "שגיאה בקביעת התור"),
      },
    );
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center p-8 rounded-2xl border border-border bg-card">
        <span className="inline-flex w-16 h-16 rounded-full bg-primary/15 items-center justify-center mb-3"><Check className="w-8 h-8 text-primary" /></span>
        <h3 className="text-xl font-bold text-foreground mb-1">התור נקבע!</h3>
        <p className="text-muted-foreground text-sm">{service?.name} · {slot && new Date(slot).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" })}</p>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (services.length === 0) return null;

  return (
    <div className="max-w-lg mx-auto">
      {/* Services */}
      <h3 className="font-bold text-foreground mb-2">בחרו שירות</h3>
      <div className="space-y-2 mb-5">
        {services.map((s) => (
          <button key={s.id} onClick={() => { setService(s); setSlot(null); }}
            className={`w-full text-right flex items-center gap-3 p-3 rounded-xl border transition-colors ${service?.id === s.id ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"}`}>
            <div className="flex-1"><div className="font-medium text-foreground">{s.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_minutes} דק'</div></div>
            <div className="font-bold text-primary">₪{s.price}</div>
          </button>
        ))}
      </div>

      {service && (
        <>
          <h3 className="font-bold text-foreground mb-2 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> בחרו מועד</h3>
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {Array.from({ length: 7 }, (_, i) => i).map((i) => {
              const d = addDays(new Date(), i);
              return (
                <button key={i} onClick={() => { setDay(i); setSlot(null); }}
                  className={`px-3 py-2 rounded-xl border text-center shrink-0 ${day === i ? "bg-primary text-white border-primary" : "border-border text-foreground"}`}>
                  <div className="text-[11px]">{d.toLocaleDateString("he-IL", { weekday: "short" })}</div>
                  <div className="text-sm font-bold">{d.getDate()}</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-5 min-h-[44px]">
            {isFetching && <div className="col-span-4 flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
            {!isFetching && (avail?.slots.length ?? 0) === 0 && <div className="col-span-4 text-sm text-muted-foreground text-center py-2">אין משבצות פנויות ביום זה</div>}
            {!isFetching && avail?.slots.map((t) => {
              const label = new Date(t).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
              return (
                <button key={t} onClick={() => setSlot(t)}
                  className={`py-2 rounded-lg border text-sm font-medium ${slot === t ? "bg-primary text-white border-primary" : "border-border text-foreground hover:border-primary/40"}`}>
                  {label}
                </button>
              );
            })}
          </div>

          {slot && (
            <div className="space-y-2">
              <Input placeholder="שם מלא" value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} />
              <Input placeholder="טלפון" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              <Input placeholder="אימייל (לא חובה)" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              <Button className="w-full" onClick={book} disabled={create.isPending || !customer.fullName || !customer.phone}>
                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>אישור וקביעת תור <ArrowLeft className="w-4 h-4 mr-1" /></>}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BookingWidget;
