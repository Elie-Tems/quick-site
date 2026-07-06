import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Gift, Megaphone, Settings,
  TrendingUp, Clock, HandHeart, Plus, Bell, Check, Package, Image as ImageIcon,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, LineChart, PreviewBanner, PageHeading, PreviewThemeRoot,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY crowdfunding campaign management dashboard. Sample data. */

const NAV = [
  { key: "overview", label: "סקירה", icon: LayoutDashboard },
  { key: "backers", label: "תומכים", icon: Users },
  { key: "tiers", label: "מדרגות", icon: Gift },
  { key: "updates", label: "עדכונים", icon: Megaphone },
  { key: "settings", label: "הגדרות", icon: Settings },
];

const RAISED = 187400;
const GOAL = 250000;
const PCT = Math.round((RAISED / GOAL) * 100);
const PLEDGES = [10, 22, 35, 30, 48, 62, 55, 80, 72, 95];

const TIERS = [
  { amount: "₪50", title: "תודה מכל הלב", claimed: 420, left: null as number | null, revenue: "₪21,000" },
  { amount: "₪180", title: "המוצר הראשון", claimed: 512, left: 88, revenue: "₪92,160" },
  { amount: "₪500", title: "חבילת פרימיום", claimed: 210, left: 40, revenue: "₪105,000" },
  { amount: "₪1,000", title: "מהדורת אספנים", claimed: 34, left: 6, revenue: "₪34,000" },
];

const BACKERS = [
  { name: "רון שגב", tier: "₪180 · המוצר הראשון", when: "לפני 8 דק'", status: "לגבייה", tone: "primary" as const },
  { name: "מיכל לוי", tier: "₪500 · פרימיום", when: "לפני שעה", status: "אושר", tone: "green" as const },
  { name: "אבי כהן", tier: "₪50 · תודה", when: "לפני שעתיים", status: "אושר", tone: "green" as const },
  { name: "נועה ברק", tier: "₪1,000 · אספנים", when: "אתמול", status: "אושר", tone: "green" as const },
];

const CampaignDashboard = () => {
  const [active, setActive] = useState("overview");

  return (
    <PreviewThemeRoot>
      <AuroraBg dim />
      <PreviewBanner title="גיוס המונים - ניהול קמפיין (צד יוצר)" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="פרויקט לדוגמה"
        topRight={
          <>
            <span className="hidden sm:inline-flex items-center gap-2 px-3 h-9 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm">
              <Clock className="w-4 h-4" /> 12 ימים לסיום
            </span>
            <button className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-muted relative"><Bell className="w-4 h-4" /><span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" /></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="הקמפיין שלך" subtitle="מודל הכל-או-כלום · יעד ₪250,000" />

        {/* Big progress */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
            <div>
              <div className="text-3xl md:text-4xl font-display font-bold text-primary">₪{RAISED.toLocaleString()}</div>
              <div className="pv-muted text-sm">מתוך יעד של ₪{GOAL.toLocaleString()} · {PCT}%</div>
            </div>
            <Pill tone="green"><TrendingUp className="w-3.5 h-3.5" /> על המסלול ליעד</Pill>
          </div>
          <div className="h-3 rounded-full pv-surface2 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-l from-primary to-emerald-400"
              initial={{ width: 0 }} animate={{ width: `${PCT}%` }} transition={{ duration: 1.2 }} />
          </div>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={HandHeart} label="גויס" value={`₪${(RAISED / 1000).toFixed(0)}K`} delta="18%" delay={0} />
          <StatCard icon={Users} label="תומכים" value="1,240" delta="12%" delay={0.05} />
          <StatCard icon={TrendingUp} label="ממוצע תרומה" value="₪151" delta="4%" delay={0.1} />
          <StatCard icon={Clock} label="ימים נותרו" value="12" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">גיוס לאורך הקמפיין</h3>
              <Pill tone="primary">יומי</Pill>
            </div>
            <LineChart data={PLEDGES} />
          </Card>
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">מדרגות תמיכה</h3>
            <div className="space-y-2">
              {TIERS.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl pv-surface border pv-border">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0"><Package className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium pv-strong truncate">{t.amount} · {t.title}</div>
                    <div className="text-xs pv-muted">{t.claimed} נבחרו{t.left != null ? ` · ${t.left} נותרו` : ""}</div>
                  </div>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">{t.revenue}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Backers */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">תומכים אחרונים</h3>
              <button className="text-sm text-primary hover:opacity-80">כל התומכים</button>
            </div>
            <div className="space-y-2">
              {BACKERS.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-2xl pv-surface border pv-border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-emerald-700/30 border pv-border shrink-0" />
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium pv-strong truncate">{b.name}</div><div className="text-xs pv-muted truncate">{b.tier} · {b.when}</div></div>
                  <Pill tone={b.tone}>{b.status}</Pill>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Updates */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">עדכונים</h3>
              <button className="inline-flex items-center gap-1 text-sm text-primary hover:opacity-80"><Plus className="w-4 h-4" /> חדש</button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl pv-surface2 border pv-border mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0"><ImageIcon className="w-4 h-4" /></div>
              <span className="pv-faint text-xs flex-1">עדכנו את התומכים...</span>
            </div>
            <div className="space-y-2">
              {[
                { t: "עברנו 75% מהיעד! 🎉", when: "אתמול" },
                { t: "הצצה לאב-טיפוס הסופי", when: "לפני 4 ימים" },
              ].map((u, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl pv-surface border pv-border">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0"><div className="text-sm pv-strong truncate">{u.t}</div><div className="text-xs pv-muted">{u.when}</div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </AppShell>
    </PreviewThemeRoot>
  );
};

export default CampaignDashboard;
