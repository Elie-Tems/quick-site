import { motion } from "framer-motion";
import { Shield, Award, Clock, ThumbsUp, Phone, MessageCircle, ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import type { StorefrontLayoutProps } from "./StorefrontLayout.types";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80";
const FALLBACK_WORK = [
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80",
  "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&q=80",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80",
];
const TRUST_ICONS = [Shield, Award, Clock, ThumbsUp];

export default function HomeProLayout(props: StorefrontLayoutProps) {
  const {
    businessName, tagline, heroTitle, aboutText, heroImageUrl,
    logoUrl, phone, products, banners, heroBenefits,
    whatsappEnabled, reviewsCache, onScrollToProducts, customLabels,
  } = props;

  const heroImg = heroImageUrl || banners?.[0]?.imageUrl || FALLBACK_HERO;
  const workGallery = banners.slice(1).map(b => b.imageUrl!).filter(Boolean);
  const displayGallery = workGallery.length > 0 ? workGallery : FALLBACK_WORK;

  const trustItems = heroBenefits?.slice(0, 4) || [
    "מחיר שקוף וקבוע מראש",
    "ניסיון של 10+ שנים",
    "מגיעים בזמן",
    "עבודה מובטחת",
  ];

  const whatsappUrl = phone
    ? `https://wa.me/972${phone.replace(/^0/, "")}?text=${encodeURIComponent("שלום, אשמח לקבל הצעת מחיר")}`
    : "#";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          {logoUrl
            ? <img src={logoUrl} alt={businessName} className="h-9 w-auto object-contain" />
            : <span className="font-display font-bold text-lg">{businessName}</span>}
          {tagline && <span className="hidden md:block text-sm text-muted-foreground">{tagline}</span>}
        </div>
        <div className="flex items-center gap-2">
          {whatsappEnabled && phone && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium">
              <MessageCircle className="w-4 h-4" /> הצעת מחיר
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              <Phone className="w-4 h-4" /> {phone}
            </a>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="relative h-[80vh] min-h-[500px] overflow-hidden">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
        <div className="absolute inset-0 flex items-end pb-16">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 leading-tight">
                {heroTitle || businessName}
              </h1>
              {tagline && <p className="text-xl text-white/80 mb-7">{tagline}</p>}
              <div className="flex flex-wrap gap-3">
                <a href={whatsappEnabled && phone ? whatsappUrl : `tel:${phone}`}
                  target={whatsappEnabled ? "_blank" : undefined} rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30">
                  קבלו הצעת מחיר <ArrowLeft className="w-5 h-5" />
                </a>
                <button onClick={onScrollToProducts}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-white/30 bg-white/10 text-white font-medium backdrop-blur-sm hover:bg-white/20 transition-colors">
                  השירותים שלנו
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="py-8 px-4 bg-primary">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustItems.map((item, i) => {
            const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-primary-foreground text-sm font-medium leading-snug">{item}</span>
              </div>
            );
          })}
        </div>
      </section>

      {props.verticalSlot}

      {/* SERVICES */}
      {products.length > 0 && (
        <section id="services" className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">{customLabels?.productsTitle || "השירותים שלנו"}</h2>
            <p className="text-muted-foreground text-sm mb-8">כל עבודה עם אחריות ושקיפות מלאה</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors">
                  {p.imageUrl && (
                    <div className="aspect-video rounded-xl overflow-hidden mb-4">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-lg">{p.name}</h3>
                      {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                    </div>
                    {p.price > 0 && (
                      <div className="text-right shrink-0">
                        <span className="text-primary font-bold text-lg">₪{p.price}</span>
                      </div>
                    )}
                  </div>
                  <a href={whatsappEnabled && phone ? whatsappUrl : `tel:${phone}`}
                    target={whatsappEnabled ? "_blank" : undefined} rel="noopener noreferrer"
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
                    בקשו הצעת מחיר
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WORK GALLERY */}
      <section className="py-14 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-display font-bold mb-2">{customLabels?.galleryTitle || "עבודות אחרונות"}</h2>
          <p className="text-muted-foreground text-sm mb-6">תוצאות אמיתיות של לקוחות מרוצים</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayGallery.slice(0, 8).map((img, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      {aboutText && (
        <section className="py-14 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">{customLabels?.aboutTitle || "קצת עלינו"}</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">{aboutText}</p>
                <div className="space-y-2">
                  {trustItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                <img src={displayGallery[0]} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {reviewsCache && (reviewsCache.reviews || []).length > 0 && (
        <section className="py-14 px-4 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6">מה אומרים הלקוחות</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {(reviewsCache.reviews || []).slice(0, 3).map((r, i) => (
                <div key={i} className="p-5 rounded-2xl border border-border bg-card">
                  <div className="flex gap-0.5 mb-3">{Array.from({ length: r.rating || 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{r.text}"</p>
                  <p className="mt-3 text-sm font-semibold">{r.author || "לקוח/ה"}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LEAD FORM CTA */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">{customLabels?.ctaTitle || "מוכנים לקבל הצעת מחיר?"}</h2>
          <p className="text-muted-foreground mb-7">בלי עלויות נסתרות. מחיר סופי, עבודה מקצועית.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {whatsappEnabled && phone && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 text-white font-bold text-lg shadow-lg shadow-emerald-500/30">
                <MessageCircle className="w-5 h-5" /> שלחו הודעה
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30">
                <Phone className="w-5 h-5" /> {phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 bg-muted/30 border-t border-border text-center">
        <div className="font-display font-bold text-lg">{businessName}</div>
        {tagline && <div className="text-muted-foreground text-sm mt-1">{tagline}</div>}
      </footer>
    </div>
  );
}
