import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, CalendarDays, UserCheck, Settings,
  DollarSign, CalendarClock, Bell, Plus, Check, Clock, Dumbbell,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, BarChart, PreviewBanner, PageHeading, PreviewThemeRoot,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY fitness studio / gym owner dashboard: memberships + class schedule + attendance. Sample data. */

const NAV = [
  { key: "overview", label: "סקירה", icon: LayoutDashboard },
  { key: "members", label: "מנויים", icon: Users },
  { key: "schedule", label: "לוח שיעורים", icon: CalendarDays },
  { key: "attendance", label: "נוכחות", icon: UserCheck },
  { key: "settings", label: "הגדרות", icon: Settings },
];

const MEMBERS = [
  { name: "אורי טל", plan: "שנתי", status: "פעיל", tone: "green" as const, renew: "12 בינואר", amount: "₪129" },
  { name: "לירז מור", plan: "3 חודשים", status: "פעיל", tone: "green" as const, renew: "3 באוגוסט", amount: "₪169" },
  { name: "בן שגב", plan: "חודשי", status: "מסתיים מחר", tone: "amber" as const, renew: "מחר", amount: "₪199" },
  { name: "נועה כרמי", plan: "שנתי", status: "פעיל", tone: "green" as const, renew: "20 במרץ", amount: "₪129" },
  { name: "דן אבידן", plan: "חודשי", status: "מוקפא", tone: "muted" as const, renew: "-", amount: "₪199" },
];

// Today's classes with enrollment vs capacity.
const TODAY = [
  { name: "ספינינג", time: "18:00", coach: "רוני", enrolled: 18, cap: 20 },
  { name: "יוגה", time: "07:00", coach: "מאיה", enrolled: 12, cap: 15 },
  { name: "TRX", time: "19:30", coach: "עידן", enrolled: 14, cap: 16 },
  { name: "קרוספיט", time: "20:00", coach: "דניאל", enrolled: 9, cap: 12 },
];

// Weekly check-ins (Sun -> Sat).
const ATTENDANCE = [42, 58, 51, 64, 70, 88, 33];
const DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

const FitnessDashboard = () => {
  const [active, setActive] = useState("overview");

  return (
    <PreviewThemeRoot>
      <AuroraBg dim />
      <PreviewBanner title="סטודיו כושר - ניהול (צד בעל העסק)" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="סטודיו כושר לדוגמה"
        topRight={
          <>
            <button className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-white text-sm font-medium"><Plus className="w-4 h-4" /> מנוי חדש</button>
            <button className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-muted relative"><Bell className="w-4 h-4" /><span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" /></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="לוח הבקרה" subtitle="מנויים, שיעורים ונוכחות במקום אחד" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} label="מנויים פעילים" value="248" delta="6%" delay={0} />
          <StatCard icon={DollarSign} label="הכנסה חודשית" value="₪41,200" delta="11%" delay={0.05} />
          <StatCard icon={CalendarClock} label="שיעורים היום" value="7" delay={0.1} />
          <StatCard icon={UserCheck} label="כניסות השבוע" value="406" delta="8%" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          {/* Weekly attendance */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">נוכחות שבועית</h3>
              <Pill tone="green"><UserCheck className="w-3.5 h-3.5" /> 406 כניסות</Pill>
            </div>
            <BarChart data={ATTENDANCE} />
            <div className="grid grid-cols-7 gap-1 mt-1 text-center">
              {DAYS.map((d) => <div key={d} className="text-xs pv-muted">{d}</div>)}
            </div>
          </Card>

          {/* Today's classes with capacity */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">שיעורים היום</h3>
            <div className="space-y-4">
              {TODAY.map((c, i) => {
                const pct = Math.round((c.enrolled / c.cap) * 100);
                const full = c.enrolled >= c.cap;
                return (
                  <motion.div key={c.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium pv-strong">{c.name} <span className="pv-muted font-normal">· {c.time} · {c.coach}</span></span>
                      <span className={`font-bold text-xs ${full ? "text-amber-500" : "text-primary"}`}>{c.enrolled}/{c.cap}</span>
                    </div>
                    <div className="h-2 rounded-full pv-surface2 overflow-hidden">
                      <motion.div className={`h-full rounded-full ${full ? "bg-gradient-to-l from-amber-500 to-amber-400" : "bg-gradient-to-l from-primary to-emerald-400"}`}
                        initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-5 p-3 rounded-2xl bg-primary/10 border border-primary/25 text-sm pv-text flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary shrink-0" /> הרשמה לשיעורים נסגרת שעה לפני
            </div>
          </Card>
        </div>

        {/* Members */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg pv-strong flex items-center gap-2"><Dumbbell className="w-5 h-5 text-primary" /> מנויים אחרונים</h3>
            <button className="text-sm text-primary hover:opacity-80">כל המנויים</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="pv-muted text-xs">
                  <th className="text-right font-medium pb-3">שם</th>
                  <th className="text-right font-medium pb-3">מנוי</th>
                  <th className="text-right font-medium pb-3">חידוש</th>
                  <th className="text-right font-medium pb-3">סטטוס</th>
                  <th className="text-right font-medium pb-3">חיוב חודשי</th>
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map((m, i) => (
                  <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="border-t pv-border">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-emerald-700/30 border pv-border shrink-0" />
                        <span className="font-medium pv-strong">{m.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pv-text">{m.plan}</td>
                    <td className="py-3 pv-text whitespace-nowrap">{m.renew}</td>
                    <td className="py-3"><Pill tone={m.tone}>{m.status}</Pill></td>
                    <td className="py-3 font-bold text-primary whitespace-nowrap">{m.amount}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs pv-muted">
            <Check className="w-4 h-4 text-primary shrink-0" /> חידוש אוטומטי · תזכורת חידוש נשלחת 3 ימים לפני
          </div>
        </Card>
      </AppShell>
    </PreviewThemeRoot>
  );
};

export default FitnessDashboard;
