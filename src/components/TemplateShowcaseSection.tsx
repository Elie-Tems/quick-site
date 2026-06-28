import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShoppingBag, Gem, Laptop, Gift, Home, Sparkles, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TemplateShowcaseSection = () => {
  const { t } = useLanguage();

  // heroLayout: 'full-image' = text bottom-left over image (magazine)
  //             'split'      = colored panel left | image right
  //             'centered'   = text centered with overlay
  const templates = [
    {
      id: 1,
      titleKey: "templates.fashion",
      description: "מינימליסטי, נקי, אדיטוריאל",
      icon: ShoppingBag,
      heroLayout: "split" as const,
      hero: "/templates/fashion.jpg",
      products: ["/templates/fashion-p1.jpg", "/templates/fashion-p2.jpg", "/templates/fashion-p3.jpg"],
      prices: [189, 139, 89],
      banner: "#6b4a3a",
      swatches: ["#3a3a3a", "#8a7a6a", "#d8cfc4"],
      style: {
        card: "bg-white border border-zinc-200",
        browser: "bg-zinc-50 border-b border-zinc-200",
        browserDots: "bg-zinc-300",
        browserText: "text-zinc-500",
        productsBg: "bg-white",
        productsGap: "gap-0 p-0",
        imageRadius: "rounded-none",
        imageWrap: "border-r border-zinc-100 last:border-r-0",
        priceBg: "px-2 pb-2",
        priceLabel: "text-[9px] text-zinc-400 uppercase tracking-widest mt-1.5",
        priceValue: "text-[11px] font-light text-zinc-800 tracking-wide",
        badge: "bg-zinc-900 text-white text-[8px] rounded-none px-1.5 py-0.5",
        footer: "bg-zinc-50 border-t border-zinc-100",
        footerText: "text-zinc-800",
        footerSub: "text-zinc-400",
        swatchBorder: "border-zinc-300",
      },
    },
    {
      id: 2,
      titleKey: "templates.jewelry",
      description: "יוקרתי, זוהר, עצום",
      icon: Gem,
      heroLayout: "full-image" as const,
      hero: "/templates/jewelry.jpg",
      products: ["/templates/jewelry-p1.jpg", "/templates/jewelry-p2.jpg", "/templates/jewelry-p3.jpg"],
      prices: [590, 220, 390],
      banner: "#7a5a25",
      swatches: ["#6b5836", "#b9952f", "#e8d9a8"],
      style: {
        card: "bg-[#0d0c09] border border-[#2a2418]",
        browser: "bg-[#111009] border-b border-[#2a2418]",
        browserDots: "bg-[#3a3020]",
        browserText: "text-[#b9952f]/70",
        productsBg: "bg-[#0d0c09]",
        productsGap: "gap-3 p-3",
        imageRadius: "rounded-none",
        imageWrap: "",
        priceBg: "pt-1.5",
        priceLabel: "text-[9px] text-[#6b5836] uppercase tracking-widest",
        priceValue: "text-[11px] font-medium text-[#b9952f]",
        badge: "bg-[#b9952f] text-[#0d0c09] text-[8px] rounded-none px-1.5 py-0.5 font-bold",
        footer: "bg-[#111009] border-t border-[#2a2418]",
        footerText: "text-[#e8d9a8]",
        footerSub: "text-[#6b5836]",
        swatchBorder: "border-[#3a3020]",
      },
    },
    {
      id: 3,
      titleKey: "templates.electronics",
      description: "טכנולוגי, חדשני, חד",
      icon: Laptop,
      heroLayout: "split" as const,
      hero: "/templates/electronics.jpg",
      products: ["/templates/electronics-p1.jpg", "/templates/electronics-p2.jpg", "/templates/electronics-p3.jpg"],
      prices: [899, 349, 259],
      banner: "#26384d",
      swatches: ["#1f2933", "#3a4a57", "#8a98a5"],
      style: {
        card: "bg-[#111827] border border-[#1e2d3d]",
        browser: "bg-[#0d1421] border-b border-[#1e2d3d]",
        browserDots: "bg-[#1e2d3d]",
        browserText: "text-[#4a9eff]/70",
        productsBg: "bg-[#111827]",
        productsGap: "gap-2 p-3",
        imageRadius: "rounded-md",
        imageWrap: "bg-[#1a2535] p-1 rounded-md",
        priceBg: "pt-1.5",
        priceLabel: "text-[9px] text-[#4a5568] uppercase tracking-widest font-mono",
        priceValue: "text-[11px] font-bold text-[#4a9eff]",
        badge: "bg-[#4a9eff] text-white text-[8px] rounded px-1.5 py-0.5 font-bold",
        footer: "bg-[#0d1421] border-t border-[#1e2d3d]",
        footerText: "text-white",
        footerSub: "text-[#4a5568]",
        swatchBorder: "border-[#1e2d3d]",
      },
    },
    {
      id: 4,
      titleKey: "templates.gifts",
      description: "חם, עגול, מפנק",
      icon: Gift,
      heroLayout: "centered" as const,
      hero: "/templates/gifts.jpg",
      products: ["/templates/gifts-p1.jpg", "/templates/gifts-p2.jpg", "/templates/gifts-p3.jpg"],
      prices: [149, 89, 199],
      banner: "#6e3a4c",
      swatches: ["#5a3f47", "#9a6a72", "#d8b8bf"],
      style: {
        card: "bg-[#fdf6f0] border border-[#e8d5c8]",
        browser: "bg-[#f5ece4] border-b border-[#e8d5c8]",
        browserDots: "bg-[#d8b8bf]",
        browserText: "text-[#9a6a72]",
        productsBg: "bg-[#fdf6f0]",
        productsGap: "gap-2 p-3",
        imageRadius: "rounded-2xl",
        imageWrap: "bg-[#f5ece4] rounded-2xl p-0.5",
        priceBg: "pt-1.5",
        priceLabel: "text-[9px] text-[#b8927a] tracking-wide",
        priceValue: "text-[11px] font-semibold text-[#5a3f47]",
        badge: "bg-[#9a6a72] text-white text-[8px] rounded-full px-2 py-0.5",
        footer: "bg-[#f5ece4] border-t border-[#e8d5c8]",
        footerText: "text-[#5a3f47]",
        footerSub: "text-[#b8927a]",
        swatchBorder: "border-[#d8b8bf]",
      },
    },
    {
      id: 5,
      titleKey: "templates.home",
      description: "טבעי, אורגני, סקנדינבי",
      icon: Home,
      heroLayout: "full-image" as const,
      hero: "/templates/home.jpg",
      products: ["/templates/home-p1.jpg", "/templates/home-p2.jpg", "/templates/home-p3.jpg"],
      prices: [129, 79, 169],
      banner: "#2d5a4a",
      swatches: ["#2d5a4a", "#4a7a6a", "#a8c4b8"],
      style: {
        card: "bg-[#f4f1eb] border border-[#d6cfc2]",
        browser: "bg-[#ece8e0] border-b border-[#d6cfc2]",
        browserDots: "bg-[#a8c4b8]",
        browserText: "text-[#4a7a6a]",
        productsBg: "bg-[#f4f1eb]",
        productsGap: "gap-2.5 p-3",
        imageRadius: "rounded-xl",
        imageWrap: "",
        priceBg: "pt-1.5",
        priceLabel: "text-[9px] text-[#7a9a8a] tracking-wide",
        priceValue: "text-[11px] font-semibold text-[#2d5a4a]",
        badge: "bg-[#2d5a4a] text-white text-[8px] rounded-full px-2 py-0.5",
        footer: "bg-[#ece8e0] border-t border-[#d6cfc2]",
        footerText: "text-[#2d3a30]",
        footerSub: "text-[#7a9a8a]",
        swatchBorder: "border-[#c4bfb5]",
      },
    },
  ];

  return (
    <section className="relative py-24 md:py-32 bg-background overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[200px]" />

      <div className="container relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            {t("templates.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            כל תבנית מותאמת לסוג עסק אחר - הצבעים יתאימו למותג שלכם
          </p>
        </motion.div>

        {/* Store-mockup cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${template.style.card}`}
            >
              {/* Store browser header */}
              <div className={`flex items-center justify-between px-3 py-2 ${template.style.browser}`}>
                <div className="flex gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${template.style.browserDots}`} />
                  <span className={`w-2.5 h-2.5 rounded-full ${template.style.browserDots}`} />
                </div>
                <span className={`text-xs font-medium ${template.style.browserText}`}>החנות שלי</span>
                <div className="flex gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${template.style.browserDots}`} />
                  <span className={`w-2.5 h-2.5 rounded-full ${template.style.browserDots}`} />
                </div>
              </div>

              {/* Hero banner — 3 distinct layouts */}
              {template.heroLayout === "split" ? (
                <div className="flex h-28 overflow-hidden">
                  <div className="w-[45%] flex flex-col justify-center px-3 py-2 shrink-0" style={{ backgroundColor: template.banner }}>
                    <div className="text-[9px] text-white/70 uppercase tracking-widest mb-0.5">חדש</div>
                    <div className="text-sm font-black text-white leading-tight mb-2">הקולקציה<br />החדשה</div>
                    <div className="inline-block px-2 py-0.5 text-[9px] text-white rounded-sm" style={{ background: "rgba(0,0,0,0.3)" }}>קנו עכשיו</div>
                  </div>
                  <div className="flex-1 relative overflow-hidden">
                    <img src={template.hero} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                </div>
              ) : template.heroLayout === "full-image" ? (
                <div className="relative h-28 overflow-hidden">
                  <img src={template.hero} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)" }} />
                  <div className="absolute bottom-2 right-3 text-right">
                    <div className="text-[9px] text-white/70 uppercase tracking-wider mb-0.5">חדש</div>
                    <div className="text-sm font-black text-white leading-tight">הנחות עד 50%</div>
                    <div className="mt-1 inline-block px-2 py-0.5 border border-white/50 text-[9px] text-white">קנו עכשיו</div>
                  </div>
                </div>
              ) : (
                <div className="relative h-28 flex flex-col items-center justify-center text-center overflow-hidden">
                  <img src={template.hero} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: `${template.banner}cc` }} />
                  <div className="relative z-10">
                    <div className="text-[10px] text-white/80">קולקציה חדשה</div>
                    <div className="text-base font-bold text-white leading-tight">הנחות עד 50%</div>
                    <div className="mt-1.5 inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] text-white">קנו עכשיו</div>
                  </div>
                </div>
              )}

              {/* Products grid — style driven by template */}
              <div className={`grid grid-cols-3 ${template.style.productsBg} ${template.style.productsGap}`}>
                {template.products.map((img, j) => (
                  <div key={j} className={`relative ${template.style.imageWrap}`}>
                    {j === 1 && (
                      <div className={`absolute top-1 right-1 z-10 ${template.style.badge}`}>
                        מבצע
                      </div>
                    )}
                    <img
                      src={img}
                      alt=""
                      className={`w-full aspect-square object-cover ${template.style.imageRadius}`}
                    />
                    <div className={template.style.priceBg}>
                      <div className={`text-right ${template.style.priceLabel}`}>מוצר</div>
                      <div className={`text-right ${template.style.priceValue}`}>₪{template.prices[j]}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className={`flex items-center justify-between px-4 py-3 ${template.style.footer}`}>
                <div className="flex gap-1.5">
                  {template.swatches.map((color, j) => (
                    <span
                      key={j}
                      className={`w-3.5 h-3.5 rounded-full border ${template.style.swatchBorder}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <div className={`text-sm font-bold ${template.style.footerText}`}>{t(template.titleKey)}</div>
                    <div className={`text-[11px] ${template.style.footerSub}`}>{template.description}</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <template.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* 6th cell: signup CTA - fills the grid and drives registration */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link
              to="/register"
              className="group h-full min-h-[280px] flex flex-col items-center justify-center text-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.04] p-8 transition-all hover:border-primary/60 hover:bg-primary/[0.08]"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">האתר שלכם יכול להיראות ככה</div>
                <div className="text-sm text-muted-foreground mt-1">בחרו קטגוריה והצבעים יתאימו אוטומטית</div>
              </div>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-bold text-sm transition-transform group-hover:-translate-x-1">
                התחילו עכשיו
                <ArrowLeft className="w-4 h-4" />
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TemplateShowcaseSection;
