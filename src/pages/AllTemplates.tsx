import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { templateList, type StoreTemplate } from "@/lib/storeTemplates";

// Six visually diverse templates to showcase on the sales page
const FEATURED_IDS = [
  'luxury-boutique',
  'bold-playful',
  'tech-minimal',
  'warm-sunset',
  'royal-purple',
  'fitness-bold',
] as const;

const featuredTemplates = FEATURED_IDS.map(
  (id) => templateList.find((t) => t.id === id)!,
);

// Color-based mini-store preview — identical to what DashboardDesign shows,
// so the merchant sees the real vibe before selecting.
const TemplateThumb = ({ t }: { t: StoreTemplate }) => {
  const {
    backgroundColor: bg,
    cardColor: card,
    primaryColor: primary,
    foregroundColor: fg,
    accentColor: accent,
  } = t.theme;
  const layout = t.heroStyle.layout;

  return (
    <div className="w-full h-full flex flex-col" style={{ background: bg }}>
      {/* navbar */}
      <div
        className="h-5 flex items-center justify-between px-2 shrink-0"
        style={{ background: card, borderBottom: `1px solid ${fg}15` }}
      >
        <div className="w-5 h-2 rounded-sm" style={{ background: primary }} />
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: fg, opacity: 0.25 }} />
          <div className="w-2 h-2 rounded-full" style={{ background: primary }} />
        </div>
      </div>

      {/* hero */}
      {layout === "split" ? (
        <div className="flex shrink-0" style={{ height: "130px" }}>
          <div
            className="w-2/5 flex flex-col justify-center gap-1.5 px-3"
            style={{ background: primary }}
          >
            <div className="w-10 h-1.5 rounded-sm bg-white/70" />
            <div className="w-14 h-2 rounded-sm bg-white/90" />
            <div className="w-8 h-2 rounded-sm mt-1" style={{ background: accent }} />
          </div>
          <div
            className="flex-1"
            style={{ background: `linear-gradient(135deg, ${accent}cc, ${card})` }}
          />
        </div>
      ) : layout === "centered" ? (
        <div
          className="shrink-0 flex flex-col items-center justify-center gap-1.5 px-3"
          style={{
            height: "130px",
            background: `linear-gradient(135deg, ${primary}22, ${accent}22)`,
          }}
        >
          <div className="w-14 h-2 rounded-sm" style={{ background: fg }} />
          <div className="w-8 h-1.5 rounded-sm" style={{ background: primary }} />
          <div className="w-10 h-2 rounded-full mt-1" style={{ background: primary }} />
        </div>
      ) : (
        <div
          className="shrink-0 relative"
          style={{ height: "130px", background: `linear-gradient(135deg, ${primary}, ${accent})` }}
        >
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${t.heroStyle.overlayOpacity})` }} />
          <div className="absolute bottom-3 right-3 text-right">
            <div className="w-12 h-2 rounded-sm bg-white/70 mb-1.5" />
            <div className="w-8 h-1.5 rounded-sm bg-white/50" />
          </div>
        </div>
      )}

      {/* product grid */}
      <div className="flex-1 grid grid-cols-3 gap-1 p-2" style={{ minHeight: 0 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded overflow-hidden flex flex-col"
            style={{
              background: card,
              borderRadius: t.theme.borderRadius,
              border: `1px solid ${fg}10`,
            }}
          >
            <div className="flex-1" style={{ background: `${accent}${i === 1 ? "33" : "1a"}` }} />
            <div className="px-1 py-1">
              <div className="w-full h-1.5 rounded-sm mb-1" style={{ background: `${fg}30` }} />
              <div className="w-2/3 h-1.5 rounded-sm" style={{ background: primary }} />
            </div>
          </div>
        ))}
      </div>
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
          <p className="text-sm text-primary font-medium mb-3 tracking-wide uppercase">15 תבניות מעוצבות</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            בחרו את המראה של האתר שלכם
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            כל תבנית כוללת עיצוב מלא, ניידות ועמוד מוצר - ניתן לשנות צבעים ותוכן בכל עת
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
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map((template) => (
              <div
                key={template.id}
                className="group rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-200 hover:shadow-xl bg-card"
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                </div>

                {/* Color-based store preview */}
                <div style={{ height: "260px" }}>
                  <TemplateThumb t={template} />
                </div>

                {/* Card footer */}
                <div className="p-4 border-t border-border flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-1">{template.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {template.description}
                    </p>
                    {/* Color dots */}
                    <div className="flex gap-1.5 mt-2">
                      {[
                        template.theme.primaryColor,
                        template.theme.accentColor,
                        template.theme.backgroundColor,
                      ].map((color, i) => (
                        <div
                          key={i}
                          className="w-3.5 h-3.5 rounded-full border border-border"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelect(template.id)}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
                    style={{ background: template.theme.primaryColor }}
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
