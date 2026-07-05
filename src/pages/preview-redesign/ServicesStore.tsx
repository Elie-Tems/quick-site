import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Check, CalendarDays, Star, MapPin, Phone, ArrowLeft } from "lucide-react";
import { AuroraBg, Card, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY customer booking storefront for a service provider. Sample data. */

const SERVICES = [
  { name: "איפור ערב", dur: "60 דק'", price: "₪350", desc: "איפור מלא לאירוע, כולל ריסים" },
  { name: "איפור כלה", dur: "90 דק'", price: "₪650", desc: "ניסיון + יום האירוע" },
  { name: "לק ג'ל", dur: "45 דק'", price: "₪120", desc: "כולל הסרה ועיצוב" },
  { name: "עיצוב גבות", dur: "30 דק'", price: "₪80", desc: "שעווה + מילוי" },
];

const DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"];
const DATES = [12, 13, 14, 15, 16, 17];
const SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30"];
const TAKEN = new Set(["12:00", "15:00"]);

const ServicesStore = () => {
  const [service, setService] = useState(0);
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState<string | null>("16:30");

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="נותני שירות - הזמנת תור (צד לקוח)" />
      <StoreTopBar
        name="סטודיו יופי לדוגמה"
        tagline="איפור · לק ג'ל · עיצוב גבות"
        cta={<a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> צרו קשר</a>}
      />

      {/* Hero */}
      <div className="relative h-52 md:h-64 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1400&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
        <div className="absolute bottom-5 right-0 left-0 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 text-white/90 text-sm mb-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 4.9 · <MapPin className="w-4 h-4" /> תל אביב
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white">קבעו תור אונליין</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-5 gap-6">
        {/* Services list */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="font-display font-bold text-xl pv-strong mb-2">בחרו שירות</h2>
          {SERVICES.map((s, i) => (
            <button key={s.name} onClick={() => setService(i)} className="w-full text-right">
              <Card hover className={`p-4 flex items-center gap-4 transition-all ${service === i ? "border-primary/50 ring-1 ring-primary/30" : ""}`}>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${service === i ? "bg-primary text-white" : "bg-primary/15 text-primary"}`}>
                  {service === i ? <Check className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold pv-strong">{s.name}</div>
                  <div className="text-sm pv-muted flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {s.dur} · {s.desc}</div>
                </div>
                <div className="font-display font-bold text-primary text-lg">{s.price}</div>
              </Card>
            </button>
          ))}
        </div>

        {/* Booking panel */}
        <div className="lg:col-span-2">
          <Card className="p-5 lg:sticky lg:top-28">
            <h2 className="font-display font-bold text-xl pv-strong mb-4">בחרו מועד</h2>
            {/* Days */}
            <div className="grid grid-cols-6 gap-1.5 mb-4">
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => setDay(i)}
                  className={`py-2 rounded-xl border text-center transition-colors ${day === i ? "bg-primary text-white border-primary" : "pv-surface2 pv-border pv-text"}`}>
                  <div className="text-[11px] opacity-80">{d}</div>
                  <div className="text-sm font-bold">{DATES[i]}</div>
                </button>
              ))}
            </div>
            {/* Slots */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {SLOTS.map((t) => {
                const taken = TAKEN.has(t);
                const on = slot === t;
                return (
                  <button key={t} disabled={taken} onClick={() => setSlot(t)}
                    className={`py-2 rounded-xl border text-sm font-medium transition-colors ${
                      taken ? "pv-surface2 pv-faint line-through cursor-not-allowed"
                        : on ? "bg-primary text-white border-primary"
                        : "pv-surface2 pv-border pv-text hover:border-primary/40"
                    }`}>
                    {t}
                  </button>
                );
              })}
            </div>
            {/* Summary */}
            <div className="rounded-2xl pv-surface2 border pv-border p-4 mb-4">
              <div className="flex justify-between text-sm mb-1"><span className="pv-muted">שירות</span><span className="pv-strong font-medium">{SERVICES[service].name}</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="pv-muted">מועד</span><span className="pv-strong font-medium">{slot ? `יום ${DAYS[day]} ${DATES[day]} · ${slot}` : "בחרו שעה"}</span></div>
              <div className="flex justify-between text-sm"><span className="pv-muted">מקדמה</span><span className="text-primary font-bold">{SERVICES[service].price}</span></div>
            </div>
            <button className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow inline-flex items-center justify-center gap-2">
              אישור וקביעת תור <ArrowLeft className="w-4 h-4" />
            </button>
            <p className="text-xs pv-muted text-center mt-3">תקבלו תזכורת בוואטסאפ יום לפני</p>
          </Card>
        </div>
      </div>
    </PreviewThemeRoot>
  );
};

export default ServicesStore;
