import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Layers, Inbox, Image, Settings,
  Building2, Eye, Inbox as InboxIcon, TrendingUp, Bell, Phone, Plus, Compass, FileText,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, BarChart, PreviewBanner, PageHeading, PreviewThemeRoot,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY developer project dashboard: units + leads + media. Sample data. */

const NAV = [
  { key: "overview", label: "סקירה", icon: LayoutDashboard },
  { key: "units", label: "יחידות", icon: Layers },
  { key: "leads", label: "לידים", icon: Inbox },
  { key: "media", label: "מדיה ו-360", icon: Image },
  { key: "settings", label: "הגדרות", icon: Settings },
];

const SALES = [2, 3, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9];

const UNITS = [
  { type: "3 חדרים", total: 40, sold: 36, price: "מ־₪1,950,000" },
  { type: "4 חדרים", total: 48, sold: 41, price: "מ־₪2,480,000" },
  { type: "5 חד' גן", total: 24, sold: 22, price: "מ־₪3,400,000" },
  { type: "פנטהאוז", total: 8, sold: 7, price: "מ־₪5,900,000" },
];

const LEADS = [
  { name: "רון שגב", unit: "4 חדרים", when: "לפני 12 דק'", tone: "primary" as const, status: "חדש" },
  { name: "טל אבידן", unit: "פנטהאוז", when: "לפני שעתיים", tone: "amber" as const, status: "בטיפול" },
  { name: "גיל נאור", unit: "5 חד' גן", when: "אתמול", tone: "green" as const, status: "נקבעה פגישה" },
];

const ProjectDashboard = () => {
  const [active, setActive] = useState("overview");

  return (
    <PreviewThemeRoot>
      <AuroraBg dim />
      <PreviewBanner title="נדל״ן יזם - ניהול פרויקט (צד סוחר)" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="פרויקט פארק העיר"
        topRight={
          <>
            <button className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-white text-sm font-medium"><Plus className="w-4 h-4" /> יחידה</button>
            <button className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-muted relative"><Bell className="w-4 h-4" /><span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" /></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="פארק העיר" subtitle="ניהול יחידות, לידים ומדיה" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Building2} label="יחידות שנמכרו" value="106 / 120" delta="8" delay={0} />
          <StatCard icon={Eye} label="צפיות בדף" value="9,820" delta="18%" delay={0.05} />
          <StatCard icon={InboxIcon} label="לידים החודש" value="43" delta="26%" delay={0.1} />
          <StatCard icon={TrendingUp} label="אחוז המרה" value="4.4%" delta="1%" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">קצב מכירות</h3>
              <Pill tone="primary">12 חודשים</Pill>
            </div>
            <BarChart data={SALES} />
          </Card>
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">מדיה</h3>
            <div className="space-y-2">
              {[
                { icon: Image, label: "הדמיות", meta: "12 תמונות" },
                { icon: Compass, label: "סיור 360°", meta: "3 דירות" },
                { icon: FileText, label: "תוכניות מכר", meta: "4 קבצי PDF" },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-3 p-3 rounded-2xl pv-surface border pv-border">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary"><m.icon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium pv-strong">{m.label}</div><div className="text-xs pv-muted">{m.meta}</div></div>
                  <button className="text-primary text-xs hover:opacity-80">ניהול</button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Units availability */}
          <Card className="p-5 lg:col-span-2">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">זמינות יחידות</h3>
            <div className="space-y-3">
              {UNITS.map((u, i) => {
                const pct = Math.round((u.sold / u.total) * 100);
                return (
                  <motion.div key={u.type} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium pv-strong">{u.type} <span className="pv-muted font-normal">· {u.price}</span></span>
                      <span className="pv-muted">{u.sold}/{u.total} נמכרו</span>
                    </div>
                    <div className="h-2 rounded-full pv-surface2 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-l from-primary to-emerald-400"
                        initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* Leads */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">לידים אחרונים</h3>
            <div className="space-y-3">
              {LEADS.map((ld, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="p-3 rounded-2xl pv-surface border pv-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium pv-strong text-sm">{ld.name}</span>
                    <Pill tone={ld.tone}>{ld.status}</Pill>
                  </div>
                  <div className="text-xs pv-muted mb-2">{ld.unit} · {ld.when}</div>
                  <button className="w-full py-2 rounded-lg bg-primary/10 border border-primary/25 text-primary text-xs font-medium inline-flex items-center justify-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> חייג ללקוח
                  </button>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </AppShell>
    </PreviewThemeRoot>
  );
};

export default ProjectDashboard;
