import { motion } from "framer-motion";
import { ShoppingBag, Gem, Laptop, Gift, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const TemplateShowcaseSection = () => {
  const { t } = useLanguage();

  const templates = [
    {
      id: 1,
      titleKey: "templates.fashion",
      description: "אופנתי, נקי, מודרני",
      icon: ShoppingBag,
      hero: "/templates/fashion.jpg",
      products: ["/templates/fashion-p1.jpg", "/templates/fashion-p2.jpg", "/templates/fashion-p3.jpg"],
      prices: [189, 139, 89],
      banner: "#6b4a3a",
      swatches: ["#3a3a3a", "#8a7a6a", "#d8cfc4"],
    },
    {
      id: 2,
      titleKey: "templates.jewelry",
      description: "יוקרתי, מוקפד, זוהר",
      icon: Gem,
      hero: "/templates/jewelry.jpg",
      products: ["/templates/jewelry-p1.jpg", "/templates/jewelry-p2.jpg", "/templates/jewelry-p3.jpg"],
      prices: [590, 220, 390],
      banner: "#7a5a25",
      swatches: ["#6b5836", "#b9952f", "#e8d9a8"],
    },
    {
      id: 3,
      titleKey: "templates.electronics",
      description: "טכנולוגי, חדשני, חד",
      icon: Laptop,
      hero: "/templates/electronics.jpg",
      products: ["/templates/electronics-p1.jpg", "/templates/electronics-p2.jpg", "/templates/electronics-p3.jpg"],
      prices: [899, 349, 259],
      banner: "#26384d",
      swatches: ["#1f2933", "#3a4a57", "#8a98a5"],
    },
    {
      id: 4,
      titleKey: "templates.gifts",
      description: "חם, מפנק, אלגנטי",
      icon: Gift,
      hero: "/templates/gifts.jpg",
      products: ["/templates/gifts-p1.jpg", "/templates/gifts-p2.jpg", "/templates/gifts-p3.jpg"],
      prices: [149, 89, 199],
      banner: "#6e3a4c",
      swatches: ["#5a3f47", "#9a6a72", "#d8b8bf"],
    },
    {
      id: 5,
      titleKey: "templates.home",
      description: "כפרי, נעים, חם",
      icon: Home,
      hero: "/templates/home.jpg",
      products: ["/templates/home-p1.jpg", "/templates/home-p2.jpg", "/templates/home-p3.jpg"],
      prices: [129, 79, 169],
      banner: "#2d5a4a",
      swatches: ["#2d5a4a", "#4a7a6a", "#a8c4b8"],
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
            כל תבנית מותאמת לסוג עסק אחר — הצבעים יתאימו למותג שלכם
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
              className="group rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-xl hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)] transition-all"
            >
              {/* Store browser header */}
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-white/5">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-xs font-medium text-white/90">החנות שלי</span>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
              </div>

              {/* Hero banner (real category image + promo) */}
              <div className="relative h-28 flex flex-col items-center justify-center text-center overflow-hidden">
                <img
                  src={template.hero}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, ${template.banner}e6 0%, ${template.banner}b3 100%)` }}
                />
                <div className="relative z-10">
                  <div className="text-[11px] text-white/80">קולקציה חדשה</div>
                  <div className="text-lg font-bold text-white leading-tight">הנחות עד 50%</div>
                  <div className="mt-1.5 inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[11px] text-white">
                    קנו עכשיו
                  </div>
                </div>
              </div>

              {/* Products row */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-white">
                {template.products.map((img, j) => (
                  <div key={j} className="relative">
                    {j === 1 && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-500 text-[8px] font-medium text-white rounded z-10">
                        מבצע
                      </div>
                    )}
                    <img src={img} alt="" className="w-full aspect-square object-cover rounded-md bg-zinc-100" />
                    <div className="text-[10px] text-zinc-500 mt-1 text-right">מוצר</div>
                    <div className="text-xs font-bold text-zinc-900 text-right">₪{template.prices[j]}</div>
                  </div>
                ))}
              </div>

              {/* Footer: brand colors + category */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-950">
                <div className="flex gap-1.5">
                  {template.swatches.map((color, j) => (
                    <span
                      key={j}
                      className="w-3.5 h-3.5 rounded-full border border-white/15"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <div className="text-sm font-bold text-white">{t(template.titleKey)}</div>
                    <div className="text-[11px] text-muted-foreground">{template.description}</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <template.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TemplateShowcaseSection;
