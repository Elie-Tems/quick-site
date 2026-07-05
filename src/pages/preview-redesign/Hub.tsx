import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, Rocket, LogIn, Shield, ArrowLeft, Sparkles } from "lucide-react";
import { AuroraBg, Card, PreviewThemeRoot, ThemeToggle } from "@/components/preview-redesign/kit";

/** Hub linking every redesign preview. Route: /preview/redesign */

const SCREENS = [
  { to: "/preview/home-v2", icon: Home, title: "דף הבית", desc: "הדף השיווקי - אנימציות, וידאו, אנרגיה צעירה", tag: "לבדיקה", tone: "green" },
  { to: "/preview/redesign/dashboard", icon: LayoutDashboard, title: "דשבורד הסוחר", desc: "ניהול מוצרים, הזמנות, אנליטיקה ולקוחות", tag: "חדש", tone: "primary" },
  { to: "/preview/redesign/onboarding", icon: Rocket, title: "הקמת חנות", desc: "אשף 5 שלבים בסגנון החדש", tag: "חדש", tone: "primary" },
  { to: "/preview/redesign/login", icon: LogIn, title: "התחברות / הרשמה", desc: "מסך כניסה עם ויזואל צד", tag: "חדש", tone: "primary" },
  { to: "/preview/redesign/admin", icon: Shield, title: "פאנל אדמין", desc: "מרכז הבקרה של הפלטפורמה", tag: "חדש", tone: "primary" },
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
            כל המסכים בשפה אחת - צעירה, נקייה ואנימטיבית. אפשר להחליף בין רקע בהיר לכהה עם המתג למעלה. מוקאפים בלבד; המערכת האמיתית לא השתנתה.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {SCREENS.map((s, i) => (
            <motion.div key={s.to}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.08 }}>
              <Link to={s.to}>
                <Card hover className="p-6 h-full group relative overflow-hidden">
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <s.icon className="w-6 h-6 text-primary" strokeWidth={1.6} />
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${s.tone === "green" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-primary/15 text-primary border-primary/30"}`}>{s.tag}</span>
                  </div>
                  <h3 className="relative text-xl font-display font-bold pv-strong mb-1.5 flex items-center gap-2">
                    {s.title}
                    <ArrowLeft className="w-4 h-4 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="relative text-sm pv-muted leading-relaxed">{s.desc}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center pv-faint text-sm mt-12">
          לחיצה על כל כרטיס פותחת את המסך המלא. יש כפתור "חזרה לכל המסכים" ומתג בהיר/כהה בכל מוקאפ.
        </p>
      </div>
    </PreviewThemeRoot>
  );
};

export default Hub;
