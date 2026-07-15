import { useState } from "react";
import { motion } from "framer-motion";
import {
  Heart, HandHeart, ShieldCheck, Users, Target, Check, ArrowLeft,
  Image as ImageIcon, Phone, Sparkles, Repeat,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY nonprofit (עמותה) website. Image + story + photo albums +
 * donations (general + per-project with progress) + Section 46 tax receipt.
 * Sample data only.
 */

const AMOUNTS = [50, 100, 250, 500];

const PROJECTS = [
  { title: "ארוחות חמות לנזקקים", raised: 68000, goal: 100000, img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80" },
  { title: "סיוע לקשישים בודדים", raised: 42000, goal: 80000, img: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600&q=80" },
  { title: "ליווי חולים ומשפחות", raised: 91000, goal: 120000, img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80" },
];

const ALBUM = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80",
  "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=500&q=80",
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&q=80",
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=500&q=80",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=80",
];

const Progress = ({ raised, goal }: { raised: number; goal: number }) => {
  const pct = Math.min(100, Math.round((raised / goal) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-bold text-primary">₪{raised.toLocaleString()}</span>
        <span className="pv-muted">מתוך ₪{goal.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full pv-surface2 overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-l from-primary to-emerald-400"
          initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1 }} />
      </div>
    </div>
  );
};

const NonprofitSite = () => {
  const [amount, setAmount] = useState(100);
  const [monthly, setMonthly] = useState(true);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="עמותה - אתר תדמית ותרומות (צד לקוח)" />
      <StoreTopBar
        name="עמותת לדוגמה"
        tagline="יחד עושים טוב"
        cta={
          <>
            <a href="#story" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">הסיפור</a>
            <a href="#projects" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">פרויקטים</a>
            <a href="#donate" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Heart className="w-4 h-4" /> לתרומה</a>
          </>
        }
      />

      {/* HERO / תדמית */}
      <section className="relative h-[68vh] min-h-[420px] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1600&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/40" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl">
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mb-4">
                כל תרומה<br /><span className="bg-gradient-to-l from-primary via-emerald-300 to-lime-300 bg-clip-text text-transparent">משנה חיים</span>
              </h1>
              <p className="text-lg text-white/80 mb-7 max-w-md">אנחנו פועלים כל יום למען אלה שהכי זקוקים לזה. הצטרפו אלינו - כל שקל עושה הבדל.</p>
              <div className="flex flex-wrap gap-3">
                <a href="#donate" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                  תרמו עכשיו <ArrowLeft className="w-5 h-5" />
                </a>
                <a href="#projects" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors">
                  הפרויקטים שלנו
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STORY / הסיפור */}
      <section id="story" className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-5">
              <Heart className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">מי אנחנו</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-4">הסיפור שלנו</h2>
            <p className="pv-text leading-relaxed mb-5">
              עמותת לדוגמה קמה מתוך אמונה שלכל אדם מגיע כבוד, הזדמנות ותקווה. כבר שנים אנחנו מפעילים תוכניות
              של חלוקת מזון, מלגות ופעילות חינוכית - בזכות מתנדבים ותורמים שמאמינים בנו.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[["₪—", "גויסו השנה", Target], ["—", "מתנדבים", Users], ["100%", "מגיע ליעד", HandHeart]].map(([k, v, Icon]) => {
                const I = Icon as typeof Target;
                return (
                  <div key={v as string} className="rounded-2xl pv-surface2 border pv-border p-4 text-center">
                    <I className="w-5 h-5 text-primary mx-auto mb-1.5" />
                    <div className="text-xl font-display font-bold pv-strong">{k as string}</div>
                    <div className="text-xs pv-muted mt-0.5">{v as string}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs pv-faint mt-3">* מספרים אמיתיים ימולאו ע"י העמותה - כאן ריקים בכוונה.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ALBUM.slice(0, 4).map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className={`rounded-2xl overflow-hidden ${i === 0 ? "col-span-2" : ""}`}>
                <img src={p} alt="" className={`w-full object-cover ${i === 0 ? "h-44" : "h-32"}`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DONATE / תרומה ===== general + projects */}
      <section id="donate" className="relative py-20 px-4 pv-surface2 border-y pv-border">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-6">
          {/* General donation widget */}
          <div className="lg:col-span-2">
            <Card className="p-6 lg:sticky lg:top-28">
              <h2 className="text-2xl font-display font-bold pv-strong mb-1">תרומה כללית</h2>
              <p className="pv-muted text-sm mb-5">בחרו סכום ותקבלו קבלה מוכרת לצורכי מס (סעיף 46)</p>

              {/* one-time / monthly */}
              <div className="flex p-1 rounded-xl pv-surface2 border pv-border mb-4">
                {[["monthly", "הוראת קבע"], ["once", "חד-פעמי"]].map(([k, label]) => (
                  <button key={k} onClick={() => setMonthly(k === "monthly")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${(monthly ? "monthly" : "once") === k ? "bg-primary text-white" : "pv-muted"}`}>
                    {k === "monthly" && <Repeat className="w-3.5 h-3.5" />} {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {AMOUNTS.map((a) => (
                  <button key={a} onClick={() => setAmount(a)}
                    className={`py-3 rounded-xl border font-bold transition-colors ${amount === a ? "bg-primary text-white border-primary" : "pv-surface pv-border pv-text hover:border-primary/40"}`}>
                    ₪{a}
                  </button>
                ))}
              </div>
              <div className="rounded-xl pv-surface border pv-border px-4 py-3 text-sm pv-faint mb-4">סכום אחר...</div>

              <button className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow inline-flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" /> תרמו ₪{amount}{monthly ? " לחודש" : ""}
              </button>
              <div className="flex items-center gap-2 justify-center mt-3 text-xs pv-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> תשלום מאובטח · קבלה לסעיף 46
              </div>
            </Card>
          </div>

          {/* Projects */}
          <div className="lg:col-span-3" id="projects">
            <h2 className="text-2xl font-display font-bold pv-strong mb-4">תרומה לפרויקט מסוים</h2>
            <div className="space-y-4">
              {PROJECTS.map((p, i) => (
                <motion.div key={p.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Card hover className="overflow-hidden flex flex-col sm:flex-row">
                    <img src={p.img} alt={p.title} className="w-full sm:w-40 h-40 sm:h-auto object-cover shrink-0" />
                    <div className="p-4 flex-1">
                      <div className="font-bold pv-strong mb-2">{p.title}</div>
                      <Progress raised={p.raised} goal={p.goal} />
                      <button className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary text-sm font-medium">
                        <Heart className="w-4 h-4" /> תרמו לפרויקט
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY / אלבום */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-5">
            <ImageIcon className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">אלבום תמונות</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-6">רגעים מהשטח</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALBUM.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className={`rounded-2xl overflow-hidden group ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                <img src={p} alt="" className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${i === 0 ? "h-full min-h-[220px]" : "h-40 aspect-square"}`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-12 px-4 pv-surface2 border-t pv-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <div className="font-display font-bold text-lg pv-strong">עמותת לדוגמה</div>
            <div className="pv-muted text-sm">עמותה רשומה מס' 58-XXXXXXX · אישור סעיף 46 לתרומות</div>
          </div>
          <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> צרו קשר</a>
        </div>
      </footer>
    </PreviewThemeRoot>
  );
};

export default NonprofitSite;
