import { ShoppingBag, Heart, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

// ─── Template data (mirrors StepVisuals) ─────────────────────────────────────

interface TemplateStyle {
  id: string;
  name: string;
  description: string;
  heroImage: string;
  heroLayout: "full-image" | "split" | "centered";
  accentColor: string;
  products: Array<{ img: string; name: string; price: string; sale?: boolean }>;
  audience: "general" | "religious-friendly";
}

const templates: TemplateStyle[] = [
  {
    id: "luxury-boutique",
    name: "בוטיק יוקרתי",
    description: "קלאסי ואלגנטי — מתאים לאופנה, תכשיטים ומותגי פרימיום",
    audience: "general",
    heroLayout: "full-image",
    accentColor: "#b8860b",
    heroImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80", name: "שמלה", price: "₪849" },
      { img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", name: "נעליים", price: "₪649", sale: true },
      { img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80", name: "תיק", price: "₪1,299" },
    ],
  },
  {
    id: "nature-organic",
    name: "טבעי ואורגני",
    description: "ירוק, רגוע ואמין — מתאים למוצרי טבע, קוסמטיקה ואוכל בריאות",
    audience: "religious-friendly",
    heroLayout: "centered",
    accentColor: "#4a7c59",
    heroImage: "https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80", name: "סבון", price: "₪49" },
      { img: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&q=80", name: "שמן", price: "₪89", sale: true },
      { img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80", name: "עציץ", price: "₪65" },
    ],
  },
  {
    id: "tech-minimal",
    name: "טכנולוגי ומינימלי",
    description: "כהה, מדויק, מוצר בצד — מתאים לאלקטרוניקה, גאדג׳טים וציוד",
    audience: "religious-friendly",
    heroLayout: "split",
    accentColor: "#3b82f6",
    heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80", name: "אוזניות", price: "₪1,299" },
      { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", name: "שעון", price: "₪899" },
      { img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80", name: "TWS", price: "₪649" },
    ],
  },
  {
    id: "royal-purple",
    name: "סגול מלכותי",
    description: "דרמטי ויוקרתי — מתאים לתכשיטים, מתנות ואירועים",
    audience: "general",
    heroLayout: "full-image",
    accentColor: "#a855f7",
    heroImage: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=400&q=80", name: "צמיד", price: "₪3,499", sale: true },
      { img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80", name: "שרשרת", price: "₪1,899" },
      { img: "https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?w=400&q=80", name: "טבעת", price: "₪5,999" },
    ],
  },
];

// ─── Store preview components ─────────────────────────────────────────────────

const ProductGrid = ({ products, color }: { products: TemplateStyle["products"]; color: string }) => (
  <div className="p-3 grid grid-cols-3 gap-1.5">
    {products.map((p, i) => (
      <div key={i} className="relative overflow-hidden rounded-md bg-[#1a1a1a]">
        <div className="aspect-square overflow-hidden">
          <img src={p.img} alt="" className="w-full h-full object-cover" />
          {p.sale && (
            <div className="absolute top-1 right-1 px-1 py-px text-[8px] font-bold text-white rounded bg-red-600">מבצע</div>
          )}
        </div>
        <div className="p-1.5">
          <div className="text-[10px] font-medium truncate text-white/80 mb-0.5">{p.name}</div>
          <span className="text-[11px] font-bold" style={{ color }}>{p.price}</span>
        </div>
      </div>
    ))}
  </div>
);

const StoreNav = ({ color, name }: { color: string; name: string }) => (
  <div className="h-10 flex items-center justify-between px-3 border-b border-white/10 bg-[#1a1a1a] shrink-0">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: color }}>
        <ShoppingBag className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="text-xs font-bold text-white">{name}</span>
    </div>
    <Heart className="w-3.5 h-3.5 opacity-30 text-white" />
  </div>
);

const StorePreview = ({ template, name = "החנות שלי" }: { template: TemplateStyle; name?: string }) => {
  const { heroLayout, heroImage, accentColor, products } = template;
  const bg = "#0f0f0f";

  if (heroLayout === "split") return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <StoreNav color={accentColor} name={name} />
      <div className="flex flex-row overflow-hidden" style={{ height: "120px" }}>
        <div className="w-[42%] flex flex-col justify-center px-3 py-2 shrink-0" style={{ background: accentColor }}>
          <span className="text-[9px] uppercase tracking-widest text-white/70 mb-1">חדש</span>
          <span className="text-base font-black text-white leading-tight mb-1.5">הקולקציה<br/>החדשה</span>
          <div className="px-2 py-0.5 text-[9px] font-bold text-white w-fit bg-black/25 rounded">קנו עכשיו</div>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <ProductGrid products={products} color={accentColor} />
    </div>
  );

  if (heroLayout === "centered") return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <StoreNav color={accentColor} name={name} />
      <div className="relative overflow-hidden shrink-0" style={{ height: "110px" }}>
        <img src={heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span className="text-[9px] uppercase tracking-widest mb-0.5 opacity-75" style={{ color: accentColor }}>ברוכים הבאים</span>
          <span className="text-base font-black text-white leading-tight mb-1.5">הקולקציה החדשה</span>
          <div className="px-2.5 py-0.5 text-[9px] font-bold text-white rounded-full" style={{ background: accentColor }}>גלו עכשיו</div>
        </div>
      </div>
      <ProductGrid products={products} color={accentColor} />
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <StoreNav color={accentColor} name={name} />
      <div className="relative overflow-hidden shrink-0" style={{ height: "115px" }}>
        <img src={heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,.8) 0%,rgba(0,0,0,.2) 60%,transparent 100%)" }} />
        <div className="absolute bottom-2.5 right-3 text-right">
          <span className="text-[9px] uppercase tracking-widest block mb-0.5 opacity-75" style={{ color: accentColor }}>חדש</span>
          <span className="text-base font-black text-white leading-tight block">הקולקציה<br/>החדשה</span>
        </div>
      </div>
      <ProductGrid products={products} color={accentColor} />
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AllTemplates = () => {
  const navigate = useNavigate();

  const handleSelect = (templateId: string) => {
    localStorage.setItem("selectedTemplateId", templateId);
    navigate("/register");
  };

  return (
    <>
      <SEOHead title="תבניות | סיאנגו" />
      <Header />
      <main className="min-h-screen bg-background" dir="rtl">

        {/* Hero */}
        <section className="py-16 px-4 text-center border-b border-border">
          <p className="text-sm text-primary font-medium mb-3 tracking-wide uppercase">4 תבניות מעוצבות</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            בחרו את המראה של האתר שלכם
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            כל תבנית כוללת עיצוב מלא, ניידות, ועמוד מוצר — ניתן לשנות צבעים ותוכן בכל עת
          </p>
          <button
            onClick={() => navigate("/register")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            התחילו בחינם
            <ArrowLeft className="w-4 h-4" />
          </button>
        </section>

        {/* Templates grid */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-200 hover:shadow-2xl"
                style={{ background: "#0f0f0f" }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-[#1a1a1a]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>

                {/* Store preview */}
                <div style={{ height: "320px" }}>
                  <StorePreview template={template} />
                </div>

                {/* Card footer */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-white">{template.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        template.audience === "religious-friendly"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-white/10 text-neutral-400"
                      }`}>
                        {template.audience === "religious-friendly" ? "מתאים לשומרי מסורת" : "קהל כללי"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">{template.description}</p>
                  </div>
                  <button
                    onClick={() => handleSelect(template.id)}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ background: template.accentColor }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    בחר
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-4 border-t border-border text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">מוכנים להתחיל?</h2>
          <p className="text-muted-foreground mb-6">פותחים חנות תוך 5 דקות</p>
          <button
            onClick={() => navigate("/register")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            התחילו בחינם
            <ArrowLeft className="w-4 h-4" />
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default AllTemplates;
