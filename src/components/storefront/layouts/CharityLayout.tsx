import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Phone, MessageCircle, ArrowLeft, Users, Target, Gift, ChevronDown, Check, Star } from "lucide-react";
import type { StorefrontLayoutProps } from "./StorefrontLayout.types";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1600&q=80";
const DONATION_AMOUNTS = [50, 100, 200, 500];

export default function CharityLayout(props: StorefrontLayoutProps) {
  const {
    businessName, tagline, heroTitle, aboutText, heroImageUrl,
    logoUrl, phone, products, banners, heroBenefits,
    whatsappEnabled, reviewsCache, customLabels,
  } = props;

  const [donationAmt, setDonationAmt] = useState<number | null>(100);
  const [customAmt, setCustomAmt] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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
              <MessageCircle className="w-4 h-4" /> צרו קשר
            </a>
          )}
          <button onClick={() => document.getElementById("donate")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            <Heart className="w-4 h-4" /> תרמו עכשיו
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative h-[85vh] min-h-[560px] overflow-hidden">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              {/* LEFT: text */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
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

              {/* RIGHT: mini donation box */}
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65, delay: 0.15 }}
                id="donate" className="bg-background/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="font-display font-bold text-lg">תרמו לנו</span>
                </div>
                {/* Monthly / One-time toggle */}
                <div className="flex rounded-xl border border-border bg-muted/30 p-1 mb-5">
                  {["תרומה חד-פעמית", "תרומה חודשית"].map((label, i) => (
                    <button key={i} onClick={() => setIsMonthly(i === 1)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isMonthly === (i === 1) ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Amount buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {DONATION_AMOUNTS.map(amt => (
                    <button key={amt} onClick={() => { setDonationAmt(amt); setCustomAmt(""); }}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${donationAmt === amt && !customAmt ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:border-primary/40"}`}>
                      ₪{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={customAmt}
                  onChange={e => { setCustomAmt(e.target.value); setDonationAmt(null); }}
                  placeholder="סכום אחר (₪)"
                  className="w-full h-11 rounded-xl border border-border bg-muted/30 text-sm px-4 mb-4 text-right focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
                <button className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30 inline-flex items-center justify-center gap-2">
                  <Heart className="w-5 h-5" />
                  {isMonthly ? "תרמו חודשית" : "תרמו"} ₪{customAmt || donationAmt || ""}
                </button>
                <p className="text-center text-xs text-muted-foreground mt-3">תרומה מאובטחת · קבלה מיידית</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {props.verticalSlot}

      {/* ABOUT STORY */}
      {aboutText && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">{customLabels?.aboutTitle || "הסיפור שלנו"}</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">{aboutText}</p>
              </div>
              {albumImgs.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {albumImgs.slice(0, 4).map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden">
                      <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* STATS */}
      <section className="py-10 px-4 bg-primary/5 border-y border-primary/10">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Users, label: "תורמים פעילים", value: "2,400+" },
            { icon: Target, label: "פרויקטים הושלמו", value: `${projects.length * 10}+` },
            { icon: Gift, label: "תרומות השנה", value: "₪850K" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="font-display font-bold text-2xl md:text-3xl">{value}</div>
              <div className="text-muted-foreground text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROJECTS */}
      {projects.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">{customLabels?.productsTitle || "הפרויקטים שלנו"}</h2>
            <p className="text-muted-foreground text-sm mb-8">כל פרויקט מוצג עם שקיפות מלאה על ההתקדמות</p>
            <div className="grid md:grid-cols-2 gap-5">
              {projects.map((p, i) => {
                const progress = Math.min(100, 40 + i * 20);
                return (
                  <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                    {p.imageUrl && (
                      <div className="aspect-video overflow-hidden">
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-display font-bold text-lg mb-2">{p.name}</h3>
                      {p.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{p.description}</p>}
                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">גויס: ₪{(p.price * 120).toLocaleString()}</span>
                          <span className="font-semibold text-primary">{progress}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                            className="h-full rounded-full bg-primary" />
                        </div>
                        <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                          <span>יעד: ₪{(p.price * 200).toLocaleString()}</span>
                          <span>{Math.floor(30 - i * 7)} ימים נותרו</span>
                        </div>
                      </div>
                      <button onClick={() => document.getElementById("donate")?.scrollIntoView({ behavior: "smooth" })}
                        className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
                        תרמו לפרויקט זה
                      </button>
                    </div>
                  </div>
                );
              })}
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
                  <div className="flex gap-0.5 mb-3">{Array.from({ length: r.rating || 5 }).map((_, j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
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
