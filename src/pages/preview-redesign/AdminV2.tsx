import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, CreditCard, Share2, BarChart3,
  DollarSign, Store, UserPlus, Search, Bell, CheckCircle2, Clock, RotateCcw,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, BarChart, PreviewBanner, PageHeading, PreviewThemeRoot,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY redesigned platform-admin panel mockup. Illustrative sample data. */

const NAV = [
  { key: "overview", label: "סקירה כללית", icon: LayoutDashboard },
  { key: "customers", label: "לקוחות", icon: Users },
  { key: "payments", label: "תשלומים", icon: CreditCard },
  { key: "referrals", label: "הפניות", icon: Share2 },
  { key: "analytics", label: "אנליטיקה", icon: BarChart3 },
];

const REVENUE = [8, 11, 9, 14, 13, 18, 16, 22, 20, 26, 24, 30];

const CUSTOMERS = [
  { name: "בוטיק הדוגמה", email: "shop1@example.com", plan: "פעיל", since: "ינואר 2026", tone: "green" as const },
  { name: "מאפיית השכונה", email: "shop2@example.com", plan: "פעיל", since: "פברואר 2026", tone: "green" as const },
  { name: "סטודיו ליצירה", email: "shop3@example.com", plan: "ניסיון", since: "יוני 2026", tone: "amber" as const },
  { name: "חנות התקליטים", email: "shop4@example.com", plan: "פעיל", since: "מרץ 2026", tone: "green" as const },
];

const PAYMENTS = [
  { store: "בוטיק הדוגמה", amount: "₪69", status: "שולם", icon: CheckCircle2, tone: "green" as const },
  { store: "מאפיית השכונה", amount: "₪69", status: "שולם", icon: CheckCircle2, tone: "green" as const },
  { store: "סטודיו ליצירה", amount: "₪69", status: "ממתין", icon: Clock, tone: "amber" as const },
  { store: "חנות התקליטים", amount: "₪69", status: "זיכוי", icon: RotateCcw, tone: "muted" as const },
];

const AdminV2 = () => {
  const [active, setActive] = useState("overview");

  return (
    <PreviewThemeRoot>
      <AuroraBg dim />
      <PreviewBanner title="פאנל אדמין" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="Siango · ניהול"
        topRight={
          <>
            <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-xl pv-surface2 border pv-border pv-muted text-sm">
              <Search className="w-4 h-4" /> חיפוש לקוח...
            </div>
            <button className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-muted"><Bell className="w-4 h-4" /></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="מרכז הבקרה" subtitle="מבט-על על כל הפלטפורמה" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={DollarSign} label="הכנסה חודשית" value="₪—" delay={0} />
          <StatCard icon={Store} label="חנויות פעילות" value="—" delay={0.05} />
          <StatCard icon={UserPlus} label="הרשמות החודש" value="—" delay={0.1} />
          <StatCard icon={Share2} label="הפניות" value="—" delay={0.15} />
        </div>
        <p className="text-xs pv-faint mb-6 -mt-3">* מספרים אמיתיים נטענים מהמערכת - כאן ריקים בכוונה כדי לא להציג נתונים מזויפים.</p>

        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">מגמת הכנסות</h3>
              <Pill tone="primary">12 חודשים</Pill>
            </div>
            <BarChart data={REVENUE} />
          </Card>
          <Card className="p-6">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">תשלומים אחרונים</h3>
            <div className="space-y-2">
              {PAYMENTS.map((p, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl pv-surface border pv-border">
                  <p.icon className={`w-4 h-4 ${p.tone === "green" ? "text-emerald-500" : p.tone === "amber" ? "text-amber-500" : "pv-faint"}`} />
                  <div className="flex-1 min-w-0 text-sm pv-strong truncate">{p.store}</div>
                  <span className="text-xs pv-muted">{p.status}</span>
                  <span className="text-sm font-bold pv-strong">{p.amount}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg pv-strong">לקוחות</h3>
            <button className="text-sm text-primary hover:opacity-80">הצג הכל</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="pv-muted text-xs">
                  <th className="text-right font-medium pb-3">עסק</th>
                  <th className="text-right font-medium pb-3 hidden sm:table-cell">אימייל</th>
                  <th className="text-right font-medium pb-3">סטטוס</th>
                  <th className="text-right font-medium pb-3 hidden md:table-cell">מאז</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {CUSTOMERS.map((c, i) => (
                  <motion.tr key={c.email}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                    className="border-t pv-border">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-emerald-700/30 border pv-border" />
                        <span className="font-medium pv-strong">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pv-muted hidden sm:table-cell">{c.email}</td>
                    <td className="py-3"><Pill tone={c.tone}>{c.plan}</Pill></td>
                    <td className="py-3 pv-muted hidden md:table-cell">{c.since}</td>
                    <td className="py-3 text-left"><button className="text-primary text-xs hover:opacity-80">כרטיס לקוח</button></td>
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

export default AdminV2;
