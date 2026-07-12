import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, MessageCircle, Mail, Wand2, ArrowLeft, Crown, Check, BarChart3, Star, Users, Search, Sparkles } from "lucide-react";
import type { DashboardView } from "@/components/dashboard/DashboardNav";
import { whatsappEnabled, emailEnabled } from "@/lib/featureFlags";

interface Props { onNavigate: (v: DashboardView) => void }

const fade = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: d } });

type Category = "הכל" | "שיווק" | "לקוחות" | "דומיין" | "תמונות";

const products: {
  id: DashboardView;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  title: string;
  price: string;
  pitch: string;
  bullets: string[];
  category: Category;
  show: boolean;
  badge?: string;
  comingSoon?: boolean;
}[] = [
  {
    id: "customers", icon: Users, color: "#7c3aed", gradient: "from-violet-500 to-purple-600",
    title: "CRM - ניהול לקוחות", price: '₪49/חודש + מע"מ',
    pitch: "כל מה שצריך כדי להכיר את הלקוחות, לנהל את העסק, ולצמוח - במקום אחד.",
    bullets: [
      "כרטיס לקוח עם היסטוריית קניות מלאה",
      "אנליטיקה - מבקרים, מקורות הגעה ומגמות",
      "דוח רווחיות לפי מוצר ותקופה",
      "סגמנטים חכמים ותגיות לקוח",
      "ריטרגטינג ישיר בוואטסאפ",
    ], category: "לקוחות", show: true, badge: "פופולרי",
  },
  {
    id: "insights", icon: BarChart3, color: "#0891b2", gradient: "from-cyan-500 to-sky-600",
    title: "אנליטיקה", price: '₪29/חודש + מע"מ',
    pitch: "מי הלקוחות שלך, מאיפה הם מגיעים, ואיפה אפשר להשתפר - במקום לנחש.",
    bullets: ["כמות מבקרים ומגמות", "מקורות הגעה מדויקים", "תובנות לשיפור מכירות"], category: "שיווק", show: true,
  },
  {
    id: "tracking", icon: Star, color: "#db2777", gradient: "from-pink-500 to-rose-600",
    title: "תגי שיווק ומעקב", price: 'חד-פעמי ₪149 + מע"מ',
    pitch: "חברו Google Ads, פיקסל פייסבוק וטיקטוק לחנות - מדדו המרות ובנו קהלי ריטרגטינג.",
    bullets: ["מדידת המרות מדויקת", "קהלי ריטרגטינג", "כל הפלטפורמות"], category: "שיווק", show: true, badge: "חד-פעמי", comingSoon: true,
  },
  {
    id: "reviews", icon: Star, color: "#f59e0b", gradient: "from-amber-400 to-orange-500",
    title: "ביקורות Google", price: '₪14/חודש + מע"מ',
    pitch: "הציגו את דירוג הכוכבים והביקורות מגוגל בדף הבית של החנות - בונה אמון ומגדיל מכירות.",
    bullets: ["אמון מיידי מלקוחות", "דירוג כוכבים בולט", "בלי קוד"], category: "שיווק", show: true,
  },
  {
    id: "whatsapp", icon: MessageCircle, color: "#075E54", gradient: "from-green-600 to-emerald-700",
    title: "וואטסאפ עסקי", price: '₪89/חודש + מע"מ',
    pitch: "התראות הזמנה אוטומטיות, דיוור שיווקי לרשימת לקוחות, ובוט AI שעונה 24/7.",
    bullets: ["יותר לקוחות חוזרים", "פחות עבודה ידנית", "בוט שירות חכם"], category: "תקשורת", show: whatsappEnabled(), comingSoon: true,
  },
  {
    id: "email", icon: Mail, color: "#0f766e", gradient: "from-teal-500 to-cyan-700",
    title: "מייל עסקי", price: '₪19/חודש + מע"מ',
    pitch: "כתובת מייל מקצועית על הדומיין שלכם - info@your-brand.co.il. הרבה יותר אמין מ-Gmail אישי.",
    bullets: ["אמון ומקצועיות", "עובד בכל מכשיר", "תיבות לפי מחלקה"], category: "תקשורת", show: emailEnabled(), comingSoon: true,
  },
  {
    id: "domains", icon: Globe, color: "#2563eb", gradient: "from-blue-500 to-indigo-600",
    title: "דומיין אישי", price: 'מ-₪50/שנה + מע"מ',
    pitch: "כתובת אמיתית ומקצועית לאתר - your-brand.co.il. משדר אמון, נראה רציני, וקל לזכור.",
    bullets: ["נראים מקצועיים", "כתובת קלה לזכירה", "חיבור אוטומטי לאתר"], category: "דומיין", show: true,
  },
  {
    id: "ai-images", icon: Wand2, color: "#7c3aed", gradient: "from-purple-500 to-fuchsia-600",
    title: "תמונות AI", price: "לפי חבילה",
    pitch: "תמונות מקצועיות לחנות ולמוצרים, נוצרות ב-AI תוך שניות - בלי צלם ובלי מעצב.",
    bullets: ["תמונות בקליק", "חוסך זמן וכסף", "מראה מקצועי"], category: "תמונות", show: true,
  },
].filter((p) => p.show);

const CATEGORIES: Category[] = ["הכל", "שיווק", "לקוחות", "דומיין", "תמונות"];

const DashboardUpgrades = ({ onNavigate }: Props) => {
  const [activeCategory, setActiveCategory] = useState<Category>("הכל");
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === "הכל" || p.category === activeCategory;
    const matchSearch = !search || p.title.includes(search) || p.pitch.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* Hero */}
      <motion.div {...fade()} className="rounded-2xl p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)" }}>
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">תוספות וכלים</h1>
            <p className="text-white/75 text-sm mt-0.5">כל הכלים שהופכים חנות לעסק אמיתי - בחרו מה שמתאים לכם</p>
          </div>
        </div>
      </motion.div>

      {/* Search + filters */}
      <motion.div {...fade(0.05)} className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש פיצ'ר..."
            className="w-full h-10 pr-9 pl-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div key={p.id} {...fade(0.03 + i * 0.04)} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              {/* Colored top strip */}
              <div className={`h-1.5 bg-gradient-to-r ${p.gradient}`} />
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${p.color}18` }}>
                      <Icon className="w-5 h-5" style={{ color: p.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground leading-tight">{p.title}</h3>
                      {p.comingSoon ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">בקרוב</span>
                      ) : p.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${p.color}18`, color: p.color }}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: `${p.color}12`, color: p.color }}>
                    {p.price}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{p.pitch}</p>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {p.bullets.map((b, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: p.color }} /> {b}
                    </li>
                  ))}
                </ul>

                {p.comingSoon ? (
                  <button
                    disabled
                    className="mt-auto w-full rounded-xl py-2.5 font-semibold text-sm bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    בקרוב
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate(p.id)}
                    className="mt-auto w-full rounded-xl py-2.5 font-semibold text-white text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)` }}
                  >
                    הפעל עכשיו <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>לא נמצאו פיצ'רים התואמים את החיפוש</p>
        </div>
      )}
    </div>
  );
};

export default DashboardUpgrades;
