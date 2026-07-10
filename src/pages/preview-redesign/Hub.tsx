import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, LayoutDashboard, Rocket, LogIn, Shield, ArrowLeft, Sparkles,
  Layers, CalendarClock, CalendarCheck, Building2, Inbox, Compass, ClipboardList,
  Heart, HandHeart, Camera, Wrench, Car, Tent, CalendarDays, Palette, Mail,
  ShoppingBag, CreditCard, FileText, HandCoins, MailCheck, FileCheck2,
} from "lucide-react";
import { AuroraBg, Card, PreviewThemeRoot, ThemeToggle } from "@/components/preview-redesign/kit";

/** Hub linking every redesign preview + spec docs. Route: /preview/redesign */

type Item = { to: string; icon: typeof Home; title: string; desc: string; tag: string; tone: string; external?: boolean };
const GROUPS: { title: string; note?: string; items: Item[] }[] = [
  {
    title: "המערכת הקיימת - בעיצוב החדש",
    items: [
      { to: "/preview/home-v2", icon: Home, title: "דף הבית", desc: "הדף השיווקי - אנימציות, וידאו, אנרגיה צעירה", tag: "לבדיקה", tone: "green" },
      { to: "/preview/redesign/dashboard", icon: LayoutDashboard, title: "דשבורד הסוחר", desc: "ניהול מוצרים, הזמנות, אנליטיקה ולקוחות", tag: "חדש", tone: "primary" },
      { to: "/preview/redesign/onboarding", icon: Rocket, title: "הקמת חנות", desc: "אשף 5 שלבים בסגנון החדש", tag: "חדש", tone: "primary" },
      { to: "/preview/redesign/templates", icon: Palette, title: "מערכת תבניות", desc: "4 מבנות × 10 ערכות צבע — תצוגה חיה", tag: "חדש", tone: "green" },
      { to: "/preview/redesign/login", icon: LogIn, title: "התחברות / הרשמה", desc: "מסך כניסה עם ויזואל צד", tag: "חדש", tone: "primary" },
      { to: "/preview/redesign/admin", icon: Shield, title: "פאנל אדמין", desc: "מרכז הבקרה של הפלטפורמה", tag: "חדש", tone: "primary" },
      { to: "/preview/redesign/emails", icon: Mail, title: "מיילים מעוצבים", desc: "מיילים פר-וורטיקל: אישור תור, ליד, תודה על תרומה", tag: "לאישור", tone: "green" },
    ],
  },
  {
    title: "תחומים חדשים",
    items: [
      { to: "/preview/redesign/home-multi", icon: Layers, title: "דף בית לכל התחומים", desc: "מחליף-קהל (מוצרים / שירותים / נדל״ן) + דוגמאות אתרים", tag: "מרכזי", tone: "green" },
      { to: "/preview/redesign/services", icon: CalendarClock, title: "נותני שירות - הזמנת תור", desc: "צד לקוח: תפריט שירותים + בחירת מועד", tag: "שירותים", tone: "primary" },
      { to: "/preview/redesign/services-dashboard", icon: CalendarCheck, title: "נותני שירות - יומן", desc: "צד סוחר: יומן שבועי + סנכרון גוגל/Outlook", tag: "שירותים", tone: "primary" },
      { to: "/preview/redesign/realestate", icon: Building2, title: "נדל״ן מתווך - לוח דירות", desc: "צד לקוח: סינון, מציאות, דף נכס + ליד", tag: "נדל״ן", tone: "primary" },
      { to: "/preview/redesign/realestate-dashboard", icon: Inbox, title: "נדל״ן מתווך - ניהול", desc: "צד סוחר: נכסים + לידים", tag: "נדל״ן", tone: "primary" },
      { to: "/preview/redesign/project", icon: Compass, title: "נדל״ן יזם - דף פרויקט", desc: "צד לקוח: הדמיות, 360, תוכניות מכר, מחירון", tag: "נדל״ן", tone: "primary" },
      { to: "/preview/redesign/project-dashboard", icon: ClipboardList, title: "נדל״ן יזם - ניהול", desc: "צד סוחר: יחידות, לידים, מדיה", tag: "נדל״ן", tone: "primary" },
    ],
  },
  {
    title: "תרומות וגיוס המונים",
    items: [
      { to: "/preview/redesign/nonprofit", icon: Heart, title: "עמותה - אתר", desc: "תדמית, סיפור, אלבומים, תרומה כללית + לפרויקטים, סעיף 46", tag: "צד לקוח", tone: "primary" },
      { to: "/preview/redesign/nonprofit-dashboard", icon: LayoutDashboard, title: "עמותה - ניהול", desc: "תורמים, הוראות קבע, פרויקטים, עדכונים, קבלות 46", tag: "צד ארגון", tone: "primary" },
      { to: "/preview/redesign/crowdfunding", icon: HandHeart, title: "גיוס המונים - קמפיין", desc: "עמוד קמפיין: יעד, מתגייסים, ימים, ומדרגות תמיכה", tag: "צד לקוח", tone: "primary" },
      { to: "/preview/redesign/campaign-dashboard", icon: LayoutDashboard, title: "גיוס המונים - ניהול", desc: "תומכים, מדרגות, גיוס לאורך זמן, עדכונים", tag: "צד יוצר", tone: "primary" },
    ],
  },
  {
    title: "עוד תחומים (צד לקוח)",
    items: [
      { to: "/preview/redesign/photographer", icon: Camera, title: "צלם", desc: "היברידי: גלריה + הזמנת סשן + חנות הדפסות", tag: "היברידי", tone: "primary" },
      { to: "/preview/redesign/home-pro", icon: Wrench, title: "בעל מקצוע / שיפוצים", desc: "שירותים, עבודות, המלצות, בקשת הצעת מחיר", tag: "לידים", tone: "primary" },
      { to: "/preview/redesign/car-dealer", icon: Car, title: "סוחר רכב", desc: "לוח רכבים + סינון + מפרט + ליד", tag: "לוח", tone: "primary" },
      { to: "/preview/redesign/boutique", icon: ShoppingBag, title: "חנות בוטיק", desc: "אתר מכר קלאסי בעיצוב החדש - קטלוג, מוצר, עגלה", tag: "מוצרים", tone: "primary" },
    ],
  },
  {
    title: "אירוח ונופש",
    items: [
      { to: "/preview/redesign/vacation", icon: Tent, title: "צימר / דירת נופש - אתר", desc: "גלריה, יחידות, מתקנים, ובחירת תאריכים עם מחיר ללילה", tag: "צד לקוח", tone: "primary" },
      { to: "/preview/redesign/vacation-dashboard", icon: CalendarDays, title: "צימר / דירת נופש - ניהול", desc: "תפוסה, הזמנות, יומן זמינות וסנכרון Booking/Airbnb", tag: "צד מארח", tone: "primary" },
    ],
  },
  {
    title: "חי במערכת האמיתית (בדשבורד)",
    note: "אלה כבר עובדים בפרודקשן, לא רק מוקאפ. הכרטיס פותח תצוגה; במערכת מגיעים דרך הדשבורד.",
    items: [
      { to: "/preview/redesign/emails", icon: MailCheck, title: "מיילים ללקוחות - לאישור", desc: "14 מיילים אוטומטיים + לוגו העסק. בדשבורד: יומן ולידים ← עריכת מיילים (הפעלה/כיבוי + עריכת טקסט)", tag: "חי · לאישור", tone: "green" },
      { to: "/preview/redesign/services-dashboard", icon: CalendarClock, title: "יומן ולידים", desc: "אזור חדש בדשבורד לפי סוג העסק (יומן תורים / לידים / תרומות). בדשבורד: תפריט צד ← יומן ולידים", tag: "חי", tone: "green" },
      { to: "/preview/redesign/nonprofit-dashboard", icon: HandCoins, title: "דיווח תרומות ישראל", desc: "הגדרת דיווח לרשות המסים (מספר 46 + ספק קבלות). בדשבורד: תרומות וקמפיינים ← דיווח לתרומות ישראל", tag: "חי · לבדיקה", tone: "green" },
      { to: "/preview/payments", icon: CreditCard, title: "סליקה בעיצוב חדש", desc: "מסך התשלומים והחיבור לסליקה (כיוון ירוק). בדשבורד: תפריט צד ← תשלומים", tag: "חי", tone: "green" },
    ],
  },
  {
    title: "מסמכי אפיון (לדניאל)",
    note: "מסמכים לקריאה - אפיון ארגון מחדש של הדשבורדים. נפתחים בלשונית חדשה.",
    items: [
      { to: "/specs/admin-dashboard-spec.html", external: true, icon: FileCheck2, title: "אפיון דשבורד העל (אדמין)", desc: "ארגון מחדש ל-7 אזורים, בעברית פשוטה בלי מושגים באנגלית", tag: "מסמך", tone: "primary" },
      { to: "/specs/merchant-crm-spec.html", external: true, icon: FileText, title: "אפיון דשבורד הסוחר (ניהול לקוחות)", desc: "הצעה לארגון דשבורד הסוחר כמערכת ניהול לקוחות - בהמתנה לעיון", tag: "מסמך · בהמתנה", tone: "primary" },
    ],
  },
];

const Hub = () => {
  useEffect(() => { document.title = "Siango - קו עיצוב חדש (תצוגות)"; }, []);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <div className="flex justify-end px-4 md:px-6 pt-4">
        <ThemeToggle />
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-24 pt-8 md:pt-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm pv-text">קו עיצוב חדש - תצוגה מקדימה</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 pv-strong">
            העיצוב החדש של <span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">Siango</span>
          </h1>
          <p className="text-lg pv-muted max-w-xl mx-auto">
            מרכז בקרה לבדיקה ואישור - כל מה שבנינו במקום אחד. חלק מוקאפים לעיצוב, וחלק כבר חי במערכת (מסומן "חי"). אפשר להחליף בין רקע בהיר לכהה עם המתג למעלה.
          </p>
        </motion.div>

        {GROUPS.map((g) => (
          <div key={g.title} className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-display font-bold pv-text">{g.title}</h2>
              <div className="flex-1 h-px" style={{ background: "var(--pv-border)" }} />
            </div>
            {g.note && <p className="text-sm pv-muted mb-4">{g.note}</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.items.map((s, i) => {
                const Wrapper = ({ children }: { children: React.ReactNode }) =>
                  s.external
                    ? <a href={s.to} target="_blank" rel="noopener noreferrer">{children}</a>
                    : <Link to={s.to}>{children}</Link>;
                return (
                <motion.div key={s.to}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: i * 0.05 }}>
                  <Wrapper>
                    <Card hover className="p-6 h-full group relative overflow-hidden">
                      <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                          <s.icon className="w-6 h-6 text-primary" strokeWidth={1.6} />
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.tone === "green" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-primary/15 text-primary border-primary/30"}`}>{s.tag}</span>
                      </div>
                      <h3 className="relative text-lg font-display font-bold pv-strong mb-1.5 flex items-center gap-2">
                        {s.title}
                        <ArrowLeft className="w-4 h-4 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                      </h3>
                      <p className="relative text-sm pv-muted leading-relaxed">{s.desc}</p>
                    </Card>
                  </Wrapper>
                </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        <p className="text-center pv-faint text-sm mt-12">
          לחיצה על כל כרטיס פותחת את המסך המלא. יש כפתור "חזרה לכל המסכים" ומתג בהיר/כהה בכל מוקאפ.
        </p>
      </div>
    </PreviewThemeRoot>
  );
};

export default Hub;
