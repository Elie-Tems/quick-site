import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BedDouble, Users, X, Loader2, CalendarDays, Send, Home } from "lucide-react";
import { toast } from "sonner";
import { useCreateLodgingOrder } from "@/hooks/useOrders";

/**
 * A bookable lodging unit = a `products` row that has `price_per_night` set.
 * The DB has these columns but the generated Supabase types are stale, so the
 * parent passes raw rows and we read the vacation fields off this local shape.
 */
export interface LodgingUnit {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price_per_night: number | string;
  price_weekend?: number | string | null;
  max_guests?: number | string | null;
  min_nights?: number | string | null;
}

const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

/** Parse a <input type="date"> value ("YYYY-MM-DD") into a local Date. */
function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

interface Stay {
  nights: number;
  weekendNights: number;
  total: number;
  nightly: number;
  weekend: number;
}

/**
 * Client-side live preview of the price. Fri (getDay 5) + Sat (getDay 6) nights
 * bill at price_weekend (if set), everything else at price_per_night. This mirrors
 * the SERVER recompute in orders-create - the server total is the authoritative one.
 */
function computeStay(unit: LodgingUnit, checkin: string, checkout: string): Stay | null {
  const ci = parseDate(checkin);
  const co = parseDate(checkout);
  if (!ci || !co) return null;
  const nights = Math.round((co.getTime() - ci.getTime()) / 86_400_000);
  if (nights <= 0) return null;

  const nightly = num(unit.price_per_night) ?? 0;
  const wk = num(unit.price_weekend);
  const weekend = wk != null ? wk : nightly;

  let total = 0;
  let weekendNights = 0;
  const d = new Date(ci);
  for (let i = 0; i < nights; i++) {
    const day = d.getDay();
    const isWeekend = day === 5 || day === 6;
    total += isWeekend ? weekend : nightly;
    if (isWeekend) weekendNights++;
    d.setDate(d.getDate() + 1);
  }
  return { nights, weekendNights, total, nightly, weekend };
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function BookingModal({ unit, businessId, onClose }: {
  unit: LodgingUnit;
  businessId: string;
  onClose: () => void;
}) {
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const createOrder = useCreateLodgingOrder();

  const minNights = num(unit.min_nights) ?? 1;
  const maxGuests = num(unit.max_guests);
  const stay = useMemo(() => computeStay(unit, checkin, checkout), [unit, checkin, checkout]);

  // Validation - drives both the inline message and the disabled submit.
  let error: string | null = null;
  if (checkin && checkout) {
    if (!stay) error = "תאריך היציאה חייב להיות אחרי תאריך הכניסה";
    else if (stay.nights < minNights) error = `מינימום ${minNights} לילות להזמנה ביחידה זו`;
  }
  if (!error && maxGuests != null && guests > maxGuests) error = `עד ${maxGuests} אורחים ביחידה זו`;

  const customerOk = name.trim() && phone.trim() && email.trim();
  const canSubmit = !!stay && !error && !!customerOk && !createOrder.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !stay) return;
    try {
      await createOrder.mutateAsync({
        businessId,
        unitProductId: unit.id,
        checkinDate: checkin,
        checkoutDate: checkout,
        numGuests: guests,
        customer: { name: name.trim(), phone: phone.trim(), email: email.trim() },
      });
      toast.success("בקשת ההזמנה נשלחה! בעל הנכס יחזור אליך לתיאום ותשלום.");
      onClose();
    } catch {
      /* useCreateLodgingOrder already surfaces a toast on error */
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-background border border-border">
        <div className="relative h-44">
          {unit.image_url
            ? <img src={unit.image_url} alt={unit.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-muted flex items-center justify-center"><Home className="w-12 h-12 text-muted-foreground/30" /></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button onClick={onClose} type="button"
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 right-3 text-white font-display font-bold text-xl drop-shadow">{unit.name}</div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">תאריך כניסה</span>
              <input type="date" value={checkin} min={todayStr()}
                onChange={(e) => { setCheckin(e.target.value); if (checkout && checkout <= e.target.value) setCheckout(""); }}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground mb-1 block">תאריך יציאה</span>
              <input type="date" value={checkout} min={checkin || todayStr()}
                onChange={(e) => setCheckout(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-muted-foreground mb-1 block">
              מספר אורחים{maxGuests != null ? ` (עד ${maxGuests})` : ""}
            </span>
            <input type="number" min={1} max={maxGuests ?? undefined} value={guests}
              onChange={(e) => setGuests(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </label>

          {/* Live price summary */}
          {stay && !error && (
            <div className="rounded-xl bg-muted/60 border border-border p-3 text-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {stay.nights} לילות
                  {stay.weekendNights > 0 && stay.weekend !== stay.nightly ? ` (${stay.weekendNights} סופ״ש)` : ""}
                </span>
                <span className="text-foreground">
                  ₪{stay.nightly.toLocaleString()} / לילה
                  {stay.weekend !== stay.nightly ? ` · ₪${stay.weekend.toLocaleString()} סופ״ש` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between font-bold pt-1.5 border-t border-border">
                <span className="text-foreground">סה״כ</span>
                <span className="text-primary text-lg">₪{stay.total.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">התשלום נגבה ישירות מול בעל הנכס - זו בקשת הזמנה בלבד.</p>
            </div>
          )}
          {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

          <div className="space-y-3 pt-1">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם מלא" required
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="טלפון" type="tel" required
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="אימייל" type="email" required
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <button type="submit" disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            {createOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            שליחת בקשת הזמנה
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

const LodgingWidget = ({ businessId, units }: { businessId: string; units: LodgingUnit[] }) => {
  const [open, setOpen] = useState<LodgingUnit | null>(null);
  if (!units?.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-10" dir="rtl">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">יחידות האירוח שלנו</h2>
        <p className="text-muted-foreground mt-1.5">בחרו יחידה, תאריכים ומספר אורחים</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {units.map((u, i) => {
          const nightly = num(u.price_per_night) ?? 0;
          const maxGuests = num(u.max_guests);
          return (
            <motion.button key={u.id} onClick={() => setOpen(u)} className="text-right"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="rounded-2xl overflow-hidden border border-border bg-card group h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className="relative aspect-[16/11] overflow-hidden bg-muted">
                  {u.image_url
                    ? <img src={u.image_url} alt={u.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    : <div className="w-full h-full flex items-center justify-center"><Home className="w-12 h-12 text-muted-foreground/30" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 right-3 text-white font-display font-bold text-lg drop-shadow">
                    ₪{nightly.toLocaleString()} <span className="text-sm font-normal">/ לילה</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-display font-bold text-foreground mb-2 leading-snug">{u.name}</div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    {maxGuests != null && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> עד {maxGuests} אורחים</span>}
                    <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> הזמנה מהירה</span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {open && <BookingModal unit={open} businessId={businessId} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </section>
  );
};

export default LodgingWidget;
