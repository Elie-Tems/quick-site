import { useState } from "react";
import { motion } from "framer-motion";
import {
  Camera, Check, ArrowLeft, ShoppingBag, Star, Instagram, Phone, Heart, Image as ImageIcon,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY full website for a photographer (hybrid: portfolio gallery +
 * session packages/booking + prints shop). Sample data.
 */

const CATS = ["הכל", "חתונות", "משפחה", "עסקי"];
const GALLERY = [
  { cat: "חתונות", img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=700&q=80", big: true },
  { cat: "משפחה", img: "https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=500&q=80" },
  { cat: "עסקי", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&q=80" },
  { cat: "חתונות", img: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=500&q=80" },
  { cat: "משפחה", img: "https://images.unsplash.com/photo-1490725263030-1f0521cec8ec?w=500&q=80" },
  { cat: "עסקי", img: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&q=80" },
  { cat: "חתונות", img: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=500&q=80" },
];

const PACKAGES = [
  { name: "סשן משפחתי", price: "₪690", dur: "שעה", items: ["20 תמונות ערוכות", "צילום בטבע/סטודיו", "גלריה דיגיטלית"], hot: false },
  { name: "חבילת חתונה", price: "₪4,900", dur: "יום מלא", items: ["צלם + עוזר", "500+ תמונות ערוכות", "אלבום יוקרה", "סרטון קצר"], hot: true },
  { name: "צילום עסקי", price: "₪1,200", dur: "חצי יום", items: ["פורטרטים לצוות", "תמונות למוצר/מותג", "רישיון שימוש מסחרי"], hot: false },
];

const PRINTS = [
  { name: "הדפסת קנבס 40x60", price: "₪249", img: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&q=80" },
  { name: "אלבום עור בעבודת יד", price: "₪590", img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80" },
  { name: "סט 10 הדפסות", price: "₪180", img: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&q=80" },
  { name: "מסגרת עץ פרימיום", price: "₪320", img: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80" },
];

const PhotographerSite = () => {
  const [cat, setCat] = useState("הכל");
  const gallery = GALLERY.filter((g) => cat === "הכל" || g.cat === cat);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="צלם - אתר מלא (גלריה + הזמנה + חנות)" />
      <StoreTopBar
        name="סטודיו צילום לדוגמה"
        tagline="חתונות · משפחה · עסקי"
        cta={
          <>
            <a href="#gallery" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">גלריה</a>
            <a href="#packages" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">חבילות</a>
            <a href="#shop" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">חנות</a>
            <a href="#packages" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Camera className="w-4 h-4" /> הזמנת סשן</a>
          </>
        }
      />

      {/* HERO */}
      <section className="relative h-[72vh] min-h-[440px] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/40" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm mb-4">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> מצלמים רגעים מאז 2012
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mb-4">
                כל רגע<br /><span className="bg-gradient-to-l from-primary via-emerald-300 to-lime-300 bg-clip-text text-transparent">ראוי להישמר</span>
              </h1>
              <p className="text-lg text-white/80 mb-7 max-w-md">צילום חתונות, משפחה ועסקים - עם עין אמנותית ויחס אישי לכל פרויקט.</p>
              <div className="flex flex-wrap gap-3">
                <a href="#packages" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                  הזמינו סשן <ArrowLeft className="w-5 h-5" />
                </a>
                <a href="#gallery" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors">
                  <ImageIcon className="w-4 h-4" /> לגלריה
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-4">
                <ImageIcon className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">תיק עבודות</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">הגלריה</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button key={c} onClick={() => setCat(c)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${cat === c ? "bg-primary text-white border-primary" : "pv-surface2 pv-border pv-text hover:border-primary/40"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gallery.map((g, i) => (
              <motion.div key={i} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className={`rounded-2xl overflow-hidden group ${g.big && cat === "הכל" ? "col-span-2 row-span-2" : ""}`}>
                <img src={g.img} alt={g.cat} className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${g.big && cat === "הכל" ? "h-full min-h-[240px]" : "h-44 aspect-square"}`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKAGES (booking) */}
      <section id="packages" className="relative py-20 px-4 pv-surface2 border-y pv-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface border pv-border mb-4">
              <Camera className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">חבילות צילום</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">בחרו חבילה</h2>
            <p className="pv-muted mt-1">בחרו חבילה ושריינו תאריך - נתאם את הפרטים יחד</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PACKAGES.map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Card hover className={`p-6 h-full flex flex-col ${p.hot ? "ring-1 ring-primary/40 border-primary/40" : ""}`}>
                  {p.hot && <span className="self-start mb-2"><Pill tone="amber">הכי מבוקש</Pill></span>}
                  <div className="font-display font-bold text-xl pv-strong">{p.name}</div>
                  <div className="text-3xl font-display font-bold text-primary my-2">{p.price}</div>
                  <div className="text-sm pv-muted mb-4">{p.dur}</div>
                  <div className="space-y-2 flex-1 mb-5">
                    {p.items.map((it) => (
                      <div key={it} className="flex items-center gap-2 text-sm pv-text">
                        <Check className="w-4 h-4 text-primary shrink-0" /> {it}
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-3 rounded-xl bg-primary text-white font-bold inline-flex items-center justify-center gap-2">
                    שריון תאריך <ArrowLeft className="w-4 h-4" />
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOP (products) */}
      <section id="shop" className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-4">
            <ShoppingBag className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">חנות הדפסות</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-6">הדפסות ואלבומים</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PRINTS.map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <Card hover className="overflow-hidden group">
                  <div className="relative aspect-square overflow-hidden">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="p-3">
                    <div className="text-sm pv-strong font-medium truncate">{p.name}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-display font-bold text-primary">{p.price}</span>
                      <button className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:brightness-110"><ShoppingBag className="w-4 h-4" /></button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-12 px-4 pv-surface2 border-t pv-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <div className="font-display font-bold text-lg pv-strong">סטודיו צילום לדוגמה</div>
            <div className="pv-muted text-sm flex items-center gap-1.5 justify-center md:justify-start"><Heart className="w-4 h-4 text-primary" /> מצלמים את הרגעים שלכם</div>
          </div>
          <div className="flex items-center gap-3">
            <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl pv-surface border pv-border pv-text text-sm"><Instagram className="w-4 h-4" /> אינסטגרם</a>
            <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> 050-0000000</a>
          </div>
        </div>
      </footer>
    </PreviewThemeRoot>
  );
};

export default PhotographerSite;
