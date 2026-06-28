import { motion } from "framer-motion";
import { Globe, MessageCircle, Mail, Sparkles, ArrowLeft, Crown, Check, BarChart3, Star } from "lucide-react";
import type { DashboardView } from "@/components/dashboard/DashboardNav";
import { whatsappEnabled, emailEnabled } from "@/lib/featureFlags";

interface Props { onNavigate: (v: DashboardView) => void }

const fade = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: d } });

/**
 * The upgrades hub - one place that showcases every premium (paid) product and
 * pushes the merchant to buy: domain, WhatsApp, business email, AI credits.
 * Each card links into the relevant area. Recurring-revenue driver.
 */
const DashboardUpgrades = ({ onNavigate }: Props) => {
  const products = [
    {
      id: "domains" as DashboardView, icon: Globe, color: "#2563eb",
      title: "דומיין אישי", price: 'מ-₪50/שנה + מע"מ',
      pitch: "כתובת אמיתית ומקצועית לאתר - your-brand.co.il במקום כתובת ארוכה. משדר אמון, נראה רציני, וקל לזכור.",
      bullets: ["נראים מקצועיים ללקוחות", "כתובת קלה לזכירה", "חיבור אוטומטי לאתר"], show: true,
    },
    {
      id: "whatsapp" as DashboardView, icon: MessageCircle, color: "#075E54",
      title: "וואטסאפ עסקי", price: '₪89/חודש + מע"מ',
      pitch: "הערוץ שכל לקוח ישראלי בו. התראות הזמנה אוטומטיות, דיוור שיווקי לרשימת התפוצה, ובוט AI שעונה 24/7.",
      bullets: ["יותר לקוחות חוזרים", "פחות עבודה ידנית", "בוט שירות חכם"], show: whatsappEnabled(),
    },
    {
      id: "email" as DashboardView, icon: Mail, color: "#0f766e",
      title: "מייל עסקי", price: '₪19/חודש + מע"מ',
      pitch: "כתובת מייל מקצועית על הדומיין שלכם - info@your-brand.co.il. הרבה יותר אמין מ-Gmail אישי.",
      bullets: ["אמון ומקצועיות", "עובד בכל מכשיר", "תיבות לפי מחלקה"], show: emailEnabled(),
    },
    {
      id: "reviews" as DashboardView, icon: Star, color: "#f59e0b",
      title: "ביקורות Google", price: '₪14/חודש + מע"מ',
      pitch: "יש לכם כרטיס עסק בגוגל עם ביקורות טובות? הציגו את הדירוג והביקורות בדף הבית של החנות - בונה אמון ומגדיל מכירות. רק מקלידים את שם העסק, אנחנו מוצאים אותו.",
      bullets: ["אמון מיידי מלקוחות", "דירוג כוכבים בולט", "בלי קוד - רק שם העסק"], show: true,
    },
    {
      id: "tracking" as DashboardView, icon: BarChart3, color: "#db2777",
      title: "תגי שיווק ומעקב", price: 'חד-פעמי ₪149 + מע"מ',
      pitch: "חברו את כלי הפרסום שלכם לחנות - Google Tag Manager, פיקסל פייסבוק/מטא, Google Ads, טיקטוק. חובה לכל מי שמפרסם, כדי למדוד המרות ולמטב קמפיינים.",
      bullets: ["מדידת המרות מדויקת", "קהלי ריטרגטינג", "כל הפלטפורמות"], show: true,
    },
    {
      id: "ai-images" as DashboardView, icon: Sparkles, color: "#7c3aed",
      title: "תמונות AI", price: "לפי חבילה",
      pitch: "תמונות מקצועיות לחנות ולמוצרים, נוצרות ב-AI תוך שניות - בלי צלם ובלי מעצב.",
      bullets: ["תמונות בקליק", "חוסך זמן וכסף", "מראה מקצועי"], show: true,
    },
  ].filter((p) => p.show);

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8" dir="rtl">
      {/* Hero */}
      <motion.div {...fade()} className="rounded-2xl p-8 md:p-10 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)" }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-4"><Crown className="w-3.5 h-3.5" /> שדרוגים לעסק</div>
          <h1 className="text-3xl md:text-[38px] font-bold leading-tight">כל מה שצריך כדי לצמוח<br/>במקום אחד</h1>
          <p className="mt-3 text-white/75 max-w-xl leading-relaxed">דומיין, וואטסאפ, מייל מקצועי ועוד - הכלים שהופכים עסק קטן לעסק שנראה גדול. בחרו מה שמתאים לכם והתחילו בקליק.</p>
        </div>
      </motion.div>

      {/* Product cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {products.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div key={p.id} {...fade(0.05 + i * 0.06)} className="rounded-2xl border border-border bg-card p-6 flex flex-col hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${p.color}15` }}><Icon className="w-6 h-6" style={{ color: p.color }} /></div>
                <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: `${p.color}12`, color: p.color }}>{p.price}</span>
              </div>
              <h3 className="font-bold text-foreground text-xl mb-1.5">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.pitch}</p>
              <ul className="space-y-1.5 mb-5">
                {p.bullets.map((b, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-foreground"><Check className="w-4 h-4 shrink-0" style={{ color: p.color }} /> {b}</li>
                ))}
              </ul>
              <button onClick={() => onNavigate(p.id)} className="mt-auto rounded-xl py-3 font-semibold text-white inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity" style={{ background: p.color }}>
                שדרגו עכשיו <ArrowLeft className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardUpgrades;
