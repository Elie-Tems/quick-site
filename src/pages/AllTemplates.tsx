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

// Realistic mini-store thumbnail — identical to DashboardDesign so merchants
// see the same preview everywhere.
const TemplateThumb = ({ t }: { t: StoreTemplate }) => {
  const { backgroundColor: bg, cardColor: card, primaryColor: primary, foregroundColor: fg, accentColor: accent, borderRadius } = t.theme;
  const layout = t.heroStyle.layout;
  const r = parseInt(borderRadius) > 12 ? '6px' : parseInt(borderRadius) > 6 ? '3px' : parseInt(borderRadius) > 0 ? '2px' : '0px';
  const productColors = [accent, primary, `${accent}99`];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>

      {/* Navbar */}
      <div className="flex items-center justify-between px-3 shrink-0" style={{ height: '20px', background: card, borderBottom: `1px solid ${fg}15` }}>
        <div className="h-2.5 w-10 rounded-sm" style={{ background: primary, borderRadius: '1px' }} />
        <div className="flex gap-1.5">
          {[4, 5, 4].map((w, i) => (
            <div key={i} className="h-1.5 rounded-sm" style={{ width: `${w * 2}px`, background: `${fg}28` }} />
          ))}
        </div>
        <div className="h-3.5 w-3.5 rounded-sm" style={{ background: `${fg}18` }} />
      </div>

      {/* Hero */}
      {layout === 'split' ? (
        <div className="flex shrink-0" style={{ height: '80px' }}>
          <div className="w-[46%] flex flex-col justify-center gap-1 px-3 shrink-0" style={{ background: primary }}>
            <div className="h-1.5 rounded-sm bg-white/40" style={{ width: '55%' }} />
            <div className="h-2 rounded-sm bg-white/85" style={{ width: '80%' }} />
            <div className="h-3 mt-1 flex items-center px-2 rounded-sm" style={{ width: '52%', background: 'rgba(255,255,255,0.25)', borderRadius: r }}>
              <div className="h-1 w-full rounded-sm bg-white/70" />
            </div>
          </div>
          <div className="flex-1" style={{ background: `linear-gradient(135deg, ${accent}cc 0%, ${primary}44 100%)` }} />
        </div>
      ) : layout === 'centered' ? (
        <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-3" style={{ height: '80px', background: `linear-gradient(160deg, ${primary}ee, ${accent}99)` }}>
          <div className="h-1.5 rounded-sm bg-white/50" style={{ width: '40%' }} />
          <div className="h-2 rounded-sm bg-white/90" style={{ width: '65%' }} />
          <div className="h-3 mt-1 flex items-center justify-center px-3 rounded-full" style={{ width: '40%', background: 'rgba(255,255,255,0.3)' }}>
            <div className="h-1 w-full rounded-sm bg-white/80" />
          </div>
        </div>
      ) : (
        <div className="shrink-0 relative flex flex-col justify-end pb-3 px-3" style={{ height: '80px', background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${Math.min(t.heroStyle.overlayOpacity + 0.15, 0.6)})` }} />
          <div className="relative flex flex-col gap-1" style={{ alignItems: t.heroStyle.textAlignment === 'center' ? 'center' : t.heroStyle.textAlignment === 'left' ? 'flex-start' : 'flex-end' }}>
            <div className="h-1.5 rounded-sm bg-white/55" style={{ width: '40%' }} />
            <div className="h-2 rounded-sm bg-white/90" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Products */}
      <div className="flex-1 overflow-hidden" style={{ background: bg, padding: '7px 7px 6px' }}>
        <div className="h-1.5 w-14 mb-2 rounded-sm" style={{ background: `${fg}22` }} />
        <div className="grid grid-cols-3 gap-1.5" style={{ height: 'calc(100% - 14px)' }}>
          {productColors.map((color, i) => (
            <div key={i} className="flex flex-col overflow-hidden" style={{ background: card, borderRadius: r, border: `1px solid ${fg}10` }}>
              <div className="flex-1 flex items-center justify-center" style={{ background: `linear-gradient(150deg, ${color}40, ${color}18)`, minHeight: '24px' }}>
                <div className="rounded-sm" style={{ width: '50%', height: '50%', background: `${color}55` }} />
              </div>
              <div style={{ padding: '4px 5px 5px' }}>
                <div className="rounded-sm mb-1" style={{ height: '3px', width: '78%', background: `${fg}35` }} />
                <div className="rounded-sm" style={{ height: '3px', width: '44%', background: primary }} />
              </div>
            </div>
          ))}
        </div>
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
