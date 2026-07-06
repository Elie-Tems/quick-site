import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Target, Megaphone, Settings,
  Heart, Repeat, UserPlus, Bell, Plus, FileText, Check, Clock, Image as ImageIcon,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, BarChart, PreviewBanner, PageHeading, PreviewThemeRoot,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY nonprofit management dashboard: donors + projects + updates. Sample data. */

const NAV = [
  { key: "overview", label: "סקירה", icon: LayoutDashboard },
  { key: "donors", label: "תורמים", icon: Users },
  { key: "projects", label: "פרויקטים", icon: Target },
  { key: "updates", label: "עדכונים", icon: Megaphone },
  { key: "settings", label: "הגדרות", icon: Settings },
];

const DONATIONS = [18, 24, 21, 30, 27, 36, 33, 42, 38, 47, 44, 52];

const DONORS = [
  { name: "משפחת כהן", amount: "₪250", type: "הוראת קבע", when: "היום", tone: "primary" as const, receipt: true },
  { name: "דנה לוי", amount: "₪1,000", type: "חד-פעמי", when: "אתמול", tone: "green" as const, receipt: true },
  { name: "יוסי מזרחי", amount: "₪100", type: "הוראת קבע", when: "לפני יומיים", tone: "primary" as const, receipt: false },
  { name: "אנונימי", amount: "₪500", type: "חד-פעמי", when: "לפני 3 ימים", tone: "green" as const, receipt: true },
];

const PROJECTS = [
  { title: "ארוחות חמות לנזקקים", raised: 68000, goal: 100000 },
  { title: "מלגות לסטודנטים", raised: 42000, goal: 80000 },
  { title: "פעילות לילדים בסיכון", raised: 91000, goal: 120000 },
];

const UPDATES = [
  { title: "סיכום מבצע החורף - חילקנו 500 מעילים", when: "לפני 3 ימים", views: 1240 },
  { title: "פתחנו מרכז חדש בדרום", when: "לפני שבוע", views: 2180 },
];

const NonprofitDashboard = () => {
  const [active, setActive] = useState("overview");

  return (
    <PreviewThemeRoot>
      <AuroraBg dim />
      <PreviewBanner title="עמותה - ניהול (צד ארגון)" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="עמותת לדוגמה"
        topRight={
          <>
            <button className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-white text-sm font-medium"><Plus className="w-4 h-4" /> קמפיין חדש</button>
            <button className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-muted relative"><Bell className="w-4 h-4" /><span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" /></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="לוח הבקרה" subtitle="תרומות, תורמים ופרויקטים במקום אחד" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Heart} label="גויס החודש" value="₪48,200" delta="22%" delay={0} />
          <StatCard icon={Users} label="תורמים פעילים" value="340" delta="8%" delay={0.05} />
          <StatCard icon={Repeat} label="הוראות קבע" value="128" delta="12%" delay={0.1} />
          <StatCard icon={UserPlus} label="תורמים חדשים" value="24" delta="15%" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">תרומות לאורך השנה</h3>
              <Pill tone="green">+22% מהחודש שעבר</Pill>
            </div>
            <BarChart data={DONATIONS} />
          </Card>
          <Card className="p-6">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">חלוקת תרומות</h3>
            <div className="space-y-4">
              {[["הוראת קבע", 62, "from-primary to-emerald-400"], ["חד-פעמי", 38, "from-emerald-500 to-lime-400"]].map(([label, pct, grad]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-sm mb-1"><span className="pv-text">{label as string}</span><span className="pv-muted">{pct as number}%</span></div>
                  <div className="h-2 rounded-full pv-surface2 overflow-hidden">
                    <motion.div className={`h-full rounded-full bg-gradient-to-l ${grad as string}`}
                      initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 rounded-2xl bg-primary/10 border border-primary/25 text-sm pv-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" /> קבלות סעיף 46 נשלחות אוטומטית
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Donors */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">תורמים אחרונים</h3>
              <button className="text-sm text-primary hover:opacity-80">כל התורמים</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[460px]">
                <thead>
                  <tr className="pv-muted text-xs">
                    <th className="text-right font-medium pb-3">תורם</th>
                    <th className="text-right font-medium pb-3">סוג</th>
                    <th className="text-right font-medium pb-3">מתי</th>
                    <th className="text-right font-medium pb-3">קבלה 46</th>
                    <th className="text-right font-medium pb-3">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {DONORS.map((d, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="border-t pv-border">
                      <td className="py-3 font-medium pv-strong">{d.name}</td>
                      <td className="py-3"><Pill tone={d.tone}>{d.type}</Pill></td>
                      <td className="py-3 pv-muted">{d.when}</td>
                      <td className="py-3">{d.receipt ? <span className="inline-flex items-center gap-1 text-emerald-500 text-xs"><Check className="w-3.5 h-3.5" /> נשלחה</span> : <span className="inline-flex items-center gap-1 text-amber-500 text-xs"><Clock className="w-3.5 h-3.5" /> ממתינה</span>}</td>
                      <td className="py-3 font-bold text-primary">{d.amount}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Projects */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">פרויקטים</h3>
              <button className="inline-flex items-center gap-1 text-sm text-primary hover:opacity-80"><Plus className="w-4 h-4" /> חדש</button>
            </div>
            <div className="space-y-4">
              {PROJECTS.map((p, i) => {
                const pct = Math.round((p.raised / p.goal) * 100);
                return (
                  <motion.div key={p.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className="flex justify-between text-sm mb-1"><span className="font-medium pv-strong">{p.title}</span><span className="text-primary font-bold text-xs">{pct}%</span></div>
                    <div className="h-2 rounded-full pv-surface2 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-l from-primary to-emerald-400"
                        initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
                    </div>
                    <div className="text-xs pv-muted mt-1">₪{p.raised.toLocaleString()} מתוך ₪{p.goal.toLocaleString()}</div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Updates composer + list */}
        <Card className="p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg pv-strong">עדכונים לתורמים</h3>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Plus className="w-4 h-4" /> עדכון חדש</button>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl pv-surface2 border pv-border mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0"><ImageIcon className="w-5 h-5" /></div>
            <span className="pv-faint text-sm flex-1">שתפו עדכון, תמונה או הישג עם התורמים...</span>
            <button className="px-4 py-2 rounded-lg bg-primary/15 text-primary text-sm font-medium">פרסום</button>
          </div>
          <div className="space-y-2">
            {UPDATES.map((u, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-3 rounded-2xl pv-surface border pv-border">
                <Megaphone className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium pv-strong truncate">{u.title}</div><div className="text-xs pv-muted">{u.when}</div></div>
                <span className="text-xs pv-muted whitespace-nowrap">{u.views.toLocaleString()} צפיות</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </AppShell>
    </PreviewThemeRoot>
  );
};

export default NonprofitDashboard;
