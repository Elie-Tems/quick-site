import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, CalendarDays, BedDouble, Star, Settings,
  Percent, DollarSign, CalendarCheck, Bell, Plus, Check, Users, LogIn, LogOut,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, PreviewBanner, PageHeading, PreviewThemeRoot,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY vacation-rental owner dashboard: occupancy + reservations + availability. Sample data. */

const NAV = [
  { key: "overview", label: "סקירה", icon: LayoutDashboard },
  { key: "reservations", label: "הזמנות", icon: CalendarCheck },
  { key: "calendar", label: "יומן זמינות", icon: CalendarDays },
  { key: "units", label: "יחידות", icon: BedDouble },
  { key: "settings", label: "הגדרות", icon: Settings },
];

// month availability: booked day -> tone
const BOOKED: Record<number, "in" | "mid" | "out"> = {
  5: "in", 6: "mid", 7: "out", 12: "in", 13: "mid", 14: "mid", 15: "out",
  20: "in", 21: "out", 24: "in", 25: "mid", 26: "out",
};

const RES = [
  { guest: "משפחת לוי", unit: "סוויטת בריכה", dates: "14-17 יולי", nights: 3, amount: "₪3,900", status: "מאושר", tone: "green" as const },
  { guest: "רון ומיכל", unit: "בקתת יער", dates: "20-22 יולי", nights: 2, amount: "₪1,850", status: "מאושר", tone: "green" as const },
  { guest: "דנה אבני", unit: "וילה משפחתית", dates: "24-27 יולי", nights: 3, amount: "₪7,350", status: "ממתין לתשלום", tone: "amber" as const },
  { guest: "יוסי כהן", unit: "בקתת יער", dates: "1-3 אוגוסט", nights: 2, amount: "₪1,850", status: "מאושר", tone: "green" as const },
];

const UNITS = [
  { name: "בקתת יער", occ: 82, price: "₪850" },
  { name: "סוויטת בריכה", occ: 74, price: "₪1,250" },
  { name: "וילה משפחתית", occ: 61, price: "₪2,400" },
];

const VacationRentalDashboard = () => {
  const [active, setActive] = useState("overview");

  return (
    <PreviewThemeRoot>
      <AuroraBg dim />
      <PreviewBanner title="צימר / דירת נופש - ניהול (צד מארח)" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="צימרי לדוגמה"
        topRight={
          <>
            <button className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-white text-sm font-medium"><Plus className="w-4 h-4" /> חסימת תאריך</button>
            <button className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-muted relative"><Bell className="w-4 h-4" /><span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" /></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="לוח האירוח" subtitle="תפוסה, הזמנות וזמינות במקום אחד" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Percent} label="תפוסה החודש" value="78%" delta="9%" delay={0} />
          <StatCard icon={DollarSign} label="הכנסות החודש" value="₪38,400" delta="16%" delay={0.05} />
          <StatCard icon={CalendarCheck} label="הזמנות" value="22" delta="12%" delay={0.1} />
          <StatCard icon={Star} label="דירוג ממוצע" value="4.95" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          {/* Availability calendar */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">יומן זמינות · יולי</h3>
              <div className="flex items-center gap-3 text-xs pv-muted">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary" /> תפוס</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded pv-surface2 border pv-border" /> פנוי</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {["א","ב","ג","ד","ה","ו","ש"].map((d) => <div key={d} className="text-xs pv-muted py-1">{d}</div>)}
              {Array.from({ length: 31 }, (_, k) => k + 1).map((day) => {
                const b = BOOKED[day];
                return (
                  <motion.div key={day} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: day * 0.008 }}
                    className={`aspect-square rounded-lg text-sm flex items-center justify-center border ${
                      b ? "bg-primary/85 text-white border-primary" : "pv-surface2 pv-border pv-text"
                    } ${b === "in" ? "rounded-l-none" : ""} ${b === "out" ? "rounded-r-none" : ""} ${b === "mid" ? "rounded-none" : ""}`}>
                    {day}
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* Units occupancy */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">תפוסה לפי יחידה</h3>
            <div className="space-y-4">
              {UNITS.map((u, i) => (
                <motion.div key={u.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium pv-strong">{u.name} <span className="pv-muted font-normal">· {u.price}</span></span>
                    <span className="text-primary font-bold text-xs">{u.occ}%</span>
                  </div>
                  <div className="h-2 rounded-full pv-surface2 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-l from-primary to-emerald-400"
                      initial={{ width: 0 }} whileInView={{ width: `${u.occ}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-5 p-3 rounded-2xl bg-primary/10 border border-primary/25 text-sm pv-text flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" /> מסונכרן עם Booking ו-Airbnb
            </div>
          </Card>
        </div>

        {/* Reservations */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg pv-strong">הזמנות קרובות</h3>
            <button className="text-sm text-primary hover:opacity-80">כל ההזמנות</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="pv-muted text-xs">
                  <th className="text-right font-medium pb-3">אורח</th>
                  <th className="text-right font-medium pb-3">יחידה</th>
                  <th className="text-right font-medium pb-3">תאריכים</th>
                  <th className="text-right font-medium pb-3">לילות</th>
                  <th className="text-right font-medium pb-3">סטטוס</th>
                  <th className="text-right font-medium pb-3">סכום</th>
                </tr>
              </thead>
              <tbody>
                {RES.map((r, i) => (
                  <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="border-t pv-border">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-emerald-700/30 border pv-border shrink-0" />
                        <span className="font-medium pv-strong">{r.guest}</span>
                      </div>
                    </td>
                    <td className="py-3 pv-text">{r.unit}</td>
                    <td className="py-3 pv-text whitespace-nowrap"><span className="inline-flex items-center gap-1"><LogIn className="w-3 h-3 text-primary" />{r.dates}<LogOut className="w-3 h-3 pv-muted" /></span></td>
                    <td className="py-3 pv-muted">{r.nights}</td>
                    <td className="py-3"><Pill tone={r.tone}>{r.status}</Pill></td>
                    <td className="py-3 font-bold text-primary whitespace-nowrap">{r.amount}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AppShell>
    </PreviewThemeRoot>
  );
};

export default VacationRentalDashboard;
