import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, CalendarClock, Scissors, Users, Settings,
  DollarSign, CalendarCheck, Clock, RefreshCw, Bell, Check,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, PreviewBanner, PageHeading, PreviewThemeRoot,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY service-provider dashboard: calendar + appointments + sync. Sample data. */

const NAV = [
  { key: "calendar", label: "יומן", icon: CalendarClock },
  { key: "appointments", label: "תורים", icon: CalendarCheck },
  { key: "services", label: "שירותים", icon: Scissors },
  { key: "clients", label: "לקוחות", icon: Users },
  { key: "settings", label: "הגדרות", icon: Settings },
];

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"];
// appointments: [dayIndex, hourIndex, span, title, tone]
const APPTS: [number, number, number, string, "primary" | "amber" | "green"][] = [
  [0, 1, 1, "לק ג'ל · נועה", "primary"],
  [1, 0, 2, "איפור כלה · דנה", "amber"],
  [1, 4, 1, "גבות · מאיה", "green"],
  [2, 2, 1, "איפור ערב · רות", "primary"],
  [3, 3, 2, "איפור כלה · שיר", "amber"],
  [4, 1, 1, "לק ג'ל · תמר", "green"],
  [5, 5, 1, "גבות · לי", "primary"],
];

const toneCls: Record<string, string> = {
  primary: "bg-primary/20 border-primary/40 text-primary",
  amber: "bg-amber-500/20 border-amber-500/40 text-amber-600",
  green: "bg-emerald-500/20 border-emerald-500/40 text-emerald-600",
};

const UPCOMING = [
  { time: "היום 16:30", name: "נועה ל.", svc: "לק ג'ל", price: "₪120" },
  { time: "מחר 09:00", name: "דנה מ.", svc: "איפור כלה", price: "₪650" },
  { time: "מחר 14:00", name: "מאיה ר.", svc: "עיצוב גבות", price: "₪80" },
];

const ServicesDashboard = () => {
  const [active, setActive] = useState("calendar");

  return (
    <PreviewThemeRoot>
      <AuroraBg dim />
      <PreviewBanner title="נותני שירות - ניהול יומן (צד סוחר)" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="סטודיו יופי לדוגמה"
        topRight={
          <>
            <span className="hidden sm:inline-flex items-center gap-2 px-3 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm">
              <RefreshCw className="w-4 h-4" /> יומן גוגל מסונכרן
            </span>
            <button className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-muted"><Bell className="w-4 h-4" /></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="היומן שלך" subtitle="השבוע · 12-17 ביולי" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={CalendarCheck} label="תורים השבוע" value="18" delta="15%" delay={0} />
          <StatCard icon={DollarSign} label="צפי הכנסה" value="₪4,120" delta="9%" delay={0.05} />
          <StatCard icon={Clock} label="שעות פנויות" value="12" delay={0.1} />
          <StatCard icon={Users} label="לקוחות חדשים" value="6" delta="20%" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Week calendar */}
          <Card className="p-5 lg:col-span-2 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">לוח שבועי</h3>
              <Pill tone="green"><Check className="w-3 h-3" /> מסונכרן עם Google + Outlook</Pill>
            </div>
            <div className="min-w-[520px]">
              {/* header */}
              <div className="grid grid-cols-[48px_repeat(6,1fr)] gap-1 mb-1">
                <div />
                {DAYS.map((d) => <div key={d} className="text-center text-xs pv-muted font-medium py-1">{d}</div>)}
              </div>
              {/* grid */}
              <div className="relative grid grid-cols-[48px_repeat(6,1fr)] gap-1">
                {HOURS.map((h) => (
                  <div key={h} className="contents">
                    <div className="text-[10px] pv-faint text-left pr-1 h-10 flex items-start justify-end">{h}</div>
                    {DAYS.map((_, di) => <div key={di} className="h-10 rounded-md pv-surface2 border pv-border" />)}
                  </div>
                ))}
                {/* appointments overlay */}
                {APPTS.map(([di, hi, span, title, tone], k) => (
                  <motion.div key={k}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: k * 0.05 }}
                    className={`absolute rounded-md border px-1.5 py-1 text-[10px] font-medium overflow-hidden ${toneCls[tone]}`}
                    style={{
                      right: `calc(48px + ${di} * ((100% - 48px) / 6) + 2px)`,
                      width: `calc((100% - 48px) / 6 - 4px)`,
                      top: `calc(${hi} * (2.5rem + 4px) + 4px)`,
                      height: `calc(${span} * 2.5rem + ${(span - 1) * 4}px - 8px)`,
                    }}>
                    {title}
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>

          {/* Upcoming */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">התורים הקרובים</h3>
            <div className="space-y-3">
              {UPCOMING.map((u, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-2xl pv-surface border pv-border">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium pv-strong truncate">{u.name} · {u.svc}</div>
                    <div className="text-xs pv-muted">{u.time}</div>
                  </div>
                  <span className="text-sm font-bold text-primary">{u.price}</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-2xl bg-primary/10 border border-primary/25 text-sm pv-text flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary shrink-0" /> תזכורות וואטסאפ נשלחות אוטומטית יום לפני
            </div>
          </Card>
        </div>
      </AppShell>
    </PreviewThemeRoot>
  );
};

export default ServicesDashboard;
