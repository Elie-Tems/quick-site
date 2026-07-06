import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Building2, Inbox, Users, Settings,
  Home, Eye, Flame, Plus, Bell, Phone, MapPin, Maximize,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, PreviewBanner, PageHeading, PreviewThemeRoot,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY real-estate agent dashboard: manage listings + leads. Sample data. */

const NAV = [
  { key: "overview", label: "סקירה", icon: LayoutDashboard },
  { key: "listings", label: "נכסים", icon: Building2 },
  { key: "leads", label: "לידים", icon: Inbox },
  { key: "clients", label: "לקוחות", icon: Users },
  { key: "settings", label: "הגדרות", icon: Settings },
];

const LISTINGS = [
  { title: "דירת 4 חד' משופצת", city: "רמת גן", price: "₪2,450,000", views: 340, cat: "מכירה", hot: true, img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=120&q=80" },
  { title: "פנטהאוז עם מרפסת", city: "תל אביב", price: "₪8,900/ח", views: 512, cat: "השכרה", hot: false, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=120&q=80" },
  { title: "דירת גן 5 חד'", city: "הרצליה", price: "₪4,200,000", views: 198, cat: "מכירה", hot: true, img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=120&q=80" },
  { title: "חנות במרכז מסחרי", city: "פתח תקווה", price: "₪12,000/ח", views: 87, cat: "מסחרי", hot: false, img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=120&q=80" },
];

const LEADS = [
  { name: "דוד כהן", listing: "דירת 4 חד' · רמת גן", when: "לפני 5 דק'", tone: "primary" as const, status: "חדש" },
  { name: "מיכל לוי", listing: "פנטהאוז · תל אביב", when: "לפני שעה", tone: "amber" as const, status: "בטיפול" },
  { name: "אבי מזרחי", listing: "דירת גן · הרצליה", when: "אתמול", tone: "green" as const, status: "תואם ביקור" },
];

const RealEstateDashboard = () => {
  const [active, setActive] = useState("overview");

  return (
    <PreviewThemeRoot>
      <AuroraBg dim />
      <PreviewBanner title="נדל״ן מתווך - ניהול (צד סוחר)" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="נדל״ן לדוגמה"
        topRight={
          <>
            <button className="hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-white text-sm font-medium"><Plus className="w-4 h-4" /> נכס חדש</button>
            <button className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-muted relative"><Bell className="w-4 h-4" /><span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" /></button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="הנכסים שלך" subtitle="ניהול נכסים ולידים במקום אחד" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Home} label="נכסים פעילים" value="24" delta="4" delay={0} />
          <StatCard icon={Eye} label="צפיות החודש" value="3,140" delta="22%" delay={0.05} />
          <StatCard icon={Inbox} label="לידים חדשים" value="17" delta="30%" delay={0.1} />
          <StatCard icon={Flame} label="מציאות" value="5" delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Listings table */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg pv-strong">נכסים</h3>
              <button className="text-sm text-primary hover:opacity-80">הצג הכל</button>
            </div>
            <div className="space-y-2">
              {LISTINGS.map((l, i) => (
                <motion.div key={l.title} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 p-2.5 rounded-2xl pv-surface border pv-border hover:border-primary/30 transition-colors">
                  <img src={l.img} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium pv-strong truncate flex items-center gap-1.5">
                      {l.title} {l.hot && <Flame className="w-3.5 h-3.5 text-rose-500" />}
                    </div>
                    <div className="text-xs pv-muted flex items-center gap-2">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {l.city}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {l.views}</span>
                    </div>
                  </div>
                  <Pill tone="muted">{l.cat}</Pill>
                  <div className="text-sm font-bold pv-strong whitespace-nowrap w-28 text-left">{l.price}</div>
                </motion.div>
              ))}
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
                  <div className="text-xs pv-muted mb-2">{ld.listing} · {ld.when}</div>
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

export default RealEstateDashboard;
