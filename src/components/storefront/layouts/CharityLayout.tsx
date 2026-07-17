import { motion } from "framer-motion";
import { Heart, MessageCircle, ArrowLeft, Check, Star } from "lucide-react";
import type { StorefrontLayoutProps } from "./StorefrontLayout.types";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&q=80";

export default function CharityLayout(props: StorefrontLayoutProps) {
  const {
    businessName, tagline, heroTitle, aboutText, heroImageUrl,
    logoUrl, phone, products, banners, heroBenefits,
    whatsappEnabled, reviewsCache, customLabels,
  } = props;

  const heroImg = heroImageUrl || banners?.[0]?.imageUrl || FALLBACK_HERO;
  const albumImgs = banners.slice(1).map(b => b.imageUrl!).filter(Boolean);

  const projects = products.slice(0, 4);

  const highlights = heroBenefits || [
    "נתמכים על ידי אלפי תורמים",
    "100% מהתרומות לפרויקטים",
    "שקיפות מלאה",
  ];

  const whatsappUrl = phone
    ? `https://wa.me/972${phone.replace(/^0/, "")}?text=${encodeURIComponent("שלום, אשמח לשמוע עוד על הארגון")}`
    : "#";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          {logoUrl
            ? <img src={logoUrl} alt={businessName} className="h-9 w-auto object-contain" />
            : <span className="font-display font-bold text-lg">{businessName}</span>}
        </div>
        <div className="flex items-center gap-2">
          {whatsappEnabled && phone && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-sm">
              <MessageCircle className="w-4 h-4" aria-hidden="true" /> צרו קשר
            </a>
          )}
          <button onClick={() => document.getElementById("donate")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            <Heart className="w-4 h-4" aria-hidden="true" /> תרמו עכשיו
          </button>
        </div>
      </header>

    <main>

      {/* HERO */}
      <section className="relative h-[85vh] min-h-[560px] overflow-hidden">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 leading-tight">
                {heroTitle || businessName}
              </h1>
              {tagline && <p className="text-xl text-white/80 mb-6">{tagline}</p>}
              {highlights.length > 0 && (
                <div className="space-y-2 mb-7">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-white/90 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" /> {h}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => document.getElementById("donate")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30">
                <Heart className="w-5 h-5" /> תרמו עכשיו <ArrowLeft className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The one real donation form (DonationWidget) - every "תרמו עכשיו" CTA scrolls here */}
      <div id="donate">{props.verticalSlot}</div>

      {/* ABOUT STORY */}
      {aboutText && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">{customLabels?.aboutTitle || "הסיפור שלנו"}</h2>
                <p className="text-foreground/80 leading-relaxed text-lg">{aboutText}</p>
              </div>
              {albumImgs.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {albumImgs.slice(0, 4).map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden">
                      <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* PROJECTS */}
      {projects.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">{customLabels?.productsTitle || "הפרויקטים שלנו"}</h2>
            <p className="text-muted-foreground text-sm mb-8">כל פרויקט מוצג עם שקיפות מלאה על ההתקדמות</p>
            <div className="grid md:grid-cols-2 gap-5">
              {projects.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  {p.imageUrl && (
                    <div className="aspect-video overflow-hidden">
                      <img src={p.imageUrl} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-display font-bold text-lg mb-2">{p.name}</h3>
                    {p.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{p.description}</p>}
                    <button onClick={() => document.getElementById("donate")?.scrollIntoView({ behavior: "smooth" })}
                      className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
                      תרמו לפרויקט זה
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {reviewsCache && (reviewsCache.reviews || []).length > 0 && (
        <section className="py-14 px-4 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6 text-center">מה אומרים התורמים שלנו</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {(reviewsCache.reviews || []).slice(0, 3).map((r, i) => (
                <div key={i} className="p-5 rounded-2xl border border-border bg-card">
                  <span aria-label={`דירוג: ${r.rating || 5} מתוך 5 כוכבים`} className="flex gap-0.5 mb-3">
                    {Array.from({ length: r.rating || 5 }).map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />)}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{r.text}"</p>
                  <p className="mt-3 text-sm font-semibold">{r.author || "תורם/ת"}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BOTTOM CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">{customLabels?.ctaTitle || "יחד נעשה שינוי"}</h2>
        <p className="text-muted-foreground mb-8 text-lg max-w-lg mx-auto">{tagline || "כל תרומה, קטנה כגדולה, עושה הבדל אמיתי"}</p>
        <button onClick={() => document.getElementById("donate")?.scrollIntoView({ behavior: "smooth" })}
          className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-xl shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow">
          <Heart className="w-6 h-6" /> תרמו עכשיו
        </button>
      </section>

      </main>

      {/* FOOTER */}
      <footer className="py-8 px-4 bg-muted/30 border-t border-border text-center">
        <div className="font-display font-bold text-lg">{businessName}</div>
        {tagline && <div className="text-muted-foreground text-sm mt-1">{tagline}</div>}
        <div className="flex justify-center gap-3 mt-4">
          {phone && <a href={`tel:${phone}`} className="text-sm text-muted-foreground hover:text-foreground">{phone}</a>}
        </div>
      </footer>
    </div>
  );
}
