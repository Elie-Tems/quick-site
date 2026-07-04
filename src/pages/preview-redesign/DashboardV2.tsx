import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingBag, BarChart3, Users, Megaphone,
  TrendingUp, DollarSign, Eye, Plus, Search, Bell, MoreHorizontal, ArrowUpLeft,
} from "lucide-react";
import {
  AuroraBg, AppShell, Card, StatCard, Pill, BarChart, LineChart, PreviewBanner, PageHeading,
} from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY redesigned merchant dashboard mockup. Illustrative sample data. */

const NAV = [
  { key: "overview", label: "סקירה כללית", icon: LayoutDashboard },
  { key: "products", label: "מוצרים", icon: Package },
  { key: "orders", label: "הזמנות", icon: ShoppingBag },
  { key: "analytics", label: "אנליטיקה", icon: BarChart3 },
  { key: "customers", label: "לקוחות", icon: Users },
  { key: "campaigns", label: "קמפיינים", icon: Megaphone },
];

const SALES = [12, 19, 14, 22, 18, 27, 24, 31, 28, 35, 30, 42];
const VISITS = [40, 62, 55, 78, 70, 95, 88, 120, 110, 140];

const ORDERS = [
  { id: "#1042", name: "שמלת קיץ פרחונית", customer: "נועה ל.", amount: "₪189", status: "חדש", tone: "primary" as const },
  { id: "#1041", name: "ג'ינס קלאסי", customer: "דנה מ.", amount: "₪249", status: "בטיפול", tone: "amber" as const },
  { id: "#1040", name: "חולצת כותנה", customer: "יוסי כ.", amount: "₪99", status: "נשלח", tone: "green" as const },
  { id: "#1039", name: "תיק עור", customer: "מאיה ר.", amount: "₪749", status: "נשלח", tone: "green" as const },
];

const PRODUCTS = [
  { name: "שמלת קיץ פרחונית", price: "₪189", stock: 24, img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=120&q=80" },
  { name: "נעלי ספורט", price: "₪599", stock: 8, img: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=120&q=80" },
  { name: "תיק עור", price: "₪749", stock: 15, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=120&q=80" },
  { name: "שעון יוקרה", price: "₪899", stock: 3, img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=80" },
];

const DashboardV2 = () => {
  const [active, setActive] = useState("overview");

  return (
    <div className="theme-refined text-white min-h-screen">
      <AuroraBg dim />
      <PreviewBanner title="דשבורד הסוחר" />
      <AppShell
        nav={NAV} active={active} onNav={setActive} storeName="בוטיק הדוגמה"
        topRight={
          <>
            <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm">
              <Search className="w-4 h-4" /> חיפוש...
            </div>
            <button className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600" />
          </>
        }
      >
        <PageHeading title="ברוך הבא 👋" subtitle="כל ניהול המכירות במקום אחד" />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={DollarSign} label="הכנסות החודש" value="₪12,480" delta="18%" delay={0} />
          <StatCard icon={ShoppingBag} label="הזמנות" value="64" delta="12%" delay={0.05} />
          <StatCard icon={Eye} label="מבקרים" value="1,240" delta="9%" delay={0.1} />
          <StatCard icon={TrendingUp} label="אחוז המרה" value="5.1%" delta="2%" deltaUp={false} delay={0.15} />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">מכירות</h3>
                <p className="text-sm text-white/40">12 החודשים האחרונים</p>
              </div>
              <Pill tone="green"><ArrowUpLeft className="w-3 h-3" /> +18% מהחודש שעבר</Pill>
            </div>
            <BarChart data={SALES} />
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-white">תנועה לחנות</h3>
              <Pill tone="primary">בזמן אמת</Pill>
            </div>
            <LineChart data={VISITS} />
            <div className="mt-4 space-y-2">
              {[["גוגל", 48], ["ישיר", 31], ["רשתות חברתיות", 21]].map(([src, pct]) => (
                <div key={src as string}>
                  <div className="flex justify-between text-xs text-white/60 mb-1"><span>{src}</span><span>{pct}%</span></div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-l from-primary to-emerald-400"
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Orders + products */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-white">הזמנות אחרונות</h3>
              <button className="text-sm text-primary hover:text-emerald-300">הצג הכל</button>
            </div>
            <div className="space-y-2">
              {ORDERS.map((o, i) => (
                <motion.div key={o.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">{o.id}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{o.name}</div>
                    <div className="text-xs text-white/40">{o.customer}</div>
                  </div>
                  <Pill tone={o.tone}>{o.status}</Pill>
                  <div className="text-sm font-bold text-white w-16 text-left">{o.amount}</div>
                  <MoreHorizontal className="w-4 h-4 text-white/30" />
                </motion.div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-white">מוצרים</h3>
              <button className="inline-flex items-center gap-1 text-sm text-primary hover:text-emerald-300"><Plus className="w-4 h-4" /> הוסף</button>
            </div>
            <div className="space-y-3">
              {PRODUCTS.map((p, i) => (
                <motion.div key={p.name}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3">
                  <img src={p.img} alt="" className="w-11 h-11 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{p.name}</div>
                    <div className="text-xs text-white/40">{p.stock} במלאי</div>
                  </div>
                  <div className="text-sm font-bold text-primary">{p.price}</div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </AppShell>
    </div>
  );
};

export default DashboardV2;
