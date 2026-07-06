import { motion } from "framer-motion";
import {
  MapPin, Play, Building2, Check, Compass, FileText, Layers, ArrowLeft, Phone,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY developer project microsite. Sample data. */

const RENDERS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
];

const UNITS = [
  { type: "3 חדרים", size: "82 מ״ר", floor: "3-6", price: "מ־₪1,950,000", left: 4 },
  { type: "4 חדרים", size: "105 מ״ר", floor: "2-8", price: "מ־₪2,480,000", left: 7 },
  { type: "5 חדרים גן", size: "138 מ״ר", floor: "קרקע", price: "מ־₪3,400,000", left: 2 },
  { type: "פנטהאוז", size: "180 מ״ר", floor: "9", price: "מ־₪5,900,000", left: 1 },
];

const HIGHLIGHTS = ["לובי מפואר", "בריכה וחדר כושר", "חניון תת-קרקעי", "גינה קהילתית", "ממ״ד בכל דירה", "מעליות מהירות"];

const ProjectSite = () => (
  <PreviewThemeRoot>
    <AuroraBg />
    <PreviewBanner title="נדל״ן יזם - דף פרויקט (צד לקוח)" />
    <StoreTopBar
      name="פרויקט לדוגמה · פארק העיר"
      tagline="מתחם מגורים חדש · אכלוס 2027"
      cta={<a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> תיאום פגישה</a>}
    />

    {/* Hero with rendering + 360 */}
    <div className="relative h-[60vh] min-h-[380px] overflow-hidden">
      <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=80" alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
      <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 text-white">
        <span className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl"><Compass className="w-7 h-7" /></span>
        <span className="text-sm font-medium bg-black/40 px-3 py-1 rounded-full">סיור וירטואלי 360°</span>
      </button>
      <div className="absolute bottom-8 right-0 left-0 px-4">
        <div className="max-w-6xl mx-auto">
          <Pill tone="primary"><Building2 className="w-3.5 h-3.5" /> בבנייה · אכלוס 2027</Pill>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mt-3 mb-2">פארק העיר</h1>
          <p className="text-white/80 text-lg flex items-center gap-2"><MapPin className="w-5 h-5" /> שכונת הפארק, ראשון לציון</p>
        </div>
      </div>
    </div>

    <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
      {/* About */}
      <section className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl font-display font-bold pv-strong mb-4">על הפרויקט</h2>
          <p className="pv-text leading-relaxed mb-4">
            מתחם מגורים יוקרתי בלב השכונה הירוקה, המשלב אדריכלות מודרנית עם איכות חיים גבוהה.
            120 יחידות דיור, שטחי מסחר בקומת הקרקע, ופארק פרטי לדיירים. במרחק הליכה מבתי ספר,
            תחבורה ציבורית ומרכזי קניות.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {HIGHLIGHTS.map((h) => (
              <div key={h} className="flex items-center gap-2 text-sm pv-text">
                <span className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-primary" /></span>
                {h}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Building2, k: "120", v: "יחידות דיור" },
            { icon: Layers, k: "9", v: "קומות" },
            { icon: Compass, k: "360°", v: "סיור וירטואלי" },
            { icon: FileText, k: "PDF", v: "תוכניות מכר" },
          ].map((s) => (
            <Card key={s.v} className="p-5 text-center">
              <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-display font-bold pv-strong">{s.k}</div>
              <div className="text-sm pv-muted">{s.v}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Renderings gallery */}
      <section>
        <h2 className="text-3xl font-display font-bold pv-strong mb-6">הדמיות</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {RENDERS.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className={`relative rounded-2xl overflow-hidden group ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
              <img src={r} alt="" className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${i === 0 ? "h-full min-h-[220px]" : "h-full aspect-square"}`} />
              {i === 1 && (
                <button className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-white"><Play className="w-5 h-5" /></span>
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Units price list */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-display font-bold pv-strong">מחירון יחידות</h2>
          <button className="inline-flex items-center gap-2 text-sm text-primary hover:opacity-80"><FileText className="w-4 h-4" /> תוכניות מכר (PDF)</button>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="pv-muted text-xs pv-surface2">
                  <th className="text-right font-medium p-4">סוג</th>
                  <th className="text-right font-medium p-4">שטח</th>
                  <th className="text-right font-medium p-4">קומה</th>
                  <th className="text-right font-medium p-4">מחיר</th>
                  <th className="text-right font-medium p-4">זמינות</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {UNITS.map((u, i) => (
                  <motion.tr key={u.type} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                    className="border-t pv-border">
                    <td className="p-4 font-medium pv-strong">{u.type}</td>
                    <td className="p-4 pv-text">{u.size}</td>
                    <td className="p-4 pv-text">{u.floor}</td>
                    <td className="p-4 font-bold text-primary whitespace-nowrap">{u.price}</td>
                    <td className="p-4"><Pill tone={u.left <= 2 ? "amber" : "green"}>{u.left} נותרו</Pill></td>
                    <td className="p-4 text-left"><button className="text-primary text-xs font-medium hover:opacity-80">פרטים</button></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Lead CTA */}
      <section className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-primary/20 via-transparent to-emerald-500/10" />
        <Card className="relative p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-3">מתעניינים בפרויקט?</h2>
          <p className="pv-muted mb-6 max-w-lg mx-auto">השאירו פרטים ונציג המכירות יחזור אליכם עם כל המידע, תוכניות מכר וזימון לפגישה</p>
          <div className="max-w-md mx-auto grid sm:grid-cols-2 gap-2 mb-3">
            <div className="rounded-xl pv-surface2 border pv-border px-3 py-3 text-sm pv-faint text-right">שם מלא</div>
            <div className="rounded-xl pv-surface2 border pv-border px-3 py-3 text-sm pv-faint text-right">טלפון</div>
          </div>
          <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
            שלחו פרטים <ArrowLeft className="w-4 h-4" />
          </button>
        </Card>
      </section>
    </div>
  </PreviewThemeRoot>
);

export default ProjectSite;
