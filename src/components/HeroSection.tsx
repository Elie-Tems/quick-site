import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const products = [
    { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80", nameKey: "hero.product.luxuryWatch", price: "₪899" },
    { img: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=200&q=80", nameKey: "hero.product.premiumPerfume", price: "₪449" },
    { img: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=200&q=80", nameKey: "hero.product.sportShoes", price: "₪599" },
    { img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80", nameKey: "hero.product.leatherBag", price: "₪749" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Grid background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
      </div>
      
      {/* Soft ambient tint (subtle, no neon) */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[200px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[180px]" />

      {/* Content */}
      <div className="container relative z-10 pt-32 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Right: Text content (RTL) */}
          <div className={`text-center ${dir === 'rtl' ? 'lg:text-right' : 'lg:text-left'} order-1`}>
            {/* Main headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-foreground mb-6 leading-[1.1]"
            >
              {t('hero.title1')}
              <br />
              <span className="relative">
                <span className="neon-text">{t('hero.title2')}</span>
                {/* Glow underline */}
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className={`absolute -bottom-2 right-0 left-0 h-1 bg-primary rounded-full ${dir === 'rtl' ? 'origin-right' : 'origin-left'}`}
                />
              </span>
            </motion.h1>
            
            {/* Subheadline */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`text-xl md:text-2xl lg:text-3xl text-foreground/90 font-medium mt-10 mb-14 max-w-xl mx-auto ${dir === 'rtl' ? 'lg:mx-0 lg:mr-0' : 'lg:mx-0 lg:ml-0'} leading-relaxed`}
            >
              {t('hero.subtitle')}
            </motion.p>
            
            {/* Price highlight - framed */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mb-10 inline-block"
            >
              <div className="glass-card rounded-2xl px-8 py-5 border border-primary/30 relative overflow-hidden">
                {/* Subtle glow background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                
                <div className="relative">
                  <p className="text-2xl md:text-3xl font-bold text-foreground">
                    {t('hero.price')}
                  </p>
                  <p className="text-lg md:text-xl font-bold neon-text">
                    {t('hero.noCommitment')}
                  </p>
                </div>
              </div>
            </motion.div>
            
            {/* CTA Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={`flex flex-col items-center ${dir === 'rtl' ? 'lg:items-start' : 'lg:items-start'} gap-4 mb-8`}
            >
              <Button 
                size="lg" 
                className="neon-button text-lg px-10 py-7 rounded-xl font-bold"
                asChild
              >
                <Link to="/register">
                  {t('hero.cta')}
                  <Arrow className={`w-5 h-5 ${dir === 'rtl' ? 'mr-3' : 'ml-3'}`} />
                </Link>
              </Button>
              
              {/* Trust indicators */}
              <div className="flex items-center gap-6 text-base md:text-lg font-medium text-foreground/90 mt-2">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {t('hero.noTech')}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {t('hero.fiveMinutes')}
                </span>
              </div>
            </motion.div>
          </div>
          
          {/* Left: Holographic Phone Mockup */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="relative flex items-center justify-center order-2 lg:order-1"
          >
            {/* Outer glow ring */}
            <div className="absolute w-[350px] h-[350px] md:w-[450px] md:h-[450px] rounded-full border border-primary/20 animate-spin-slow" />
            <div className="absolute w-[400px] h-[400px] md:w-[500px] md:h-[500px] rounded-full border border-primary/10" />
            
            {/* Phone device */}
            <div className="relative">
              {/* Phone soft shadow */}
              <div className="absolute -inset-8 bg-primary/[0.06] rounded-[60px] blur-3xl" />
              
              {/* Phone frame */}
              <div className="relative w-[280px] md:w-[320px] h-[560px] md:h-[640px] rounded-[50px] bg-gradient-to-b from-zinc-800 to-zinc-900 p-2 shadow-2xl">
                {/* Glass reflection */}
                <div className="absolute inset-0 rounded-[50px] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                
                {/* Screen bezel */}
                <div className="w-full h-full rounded-[42px] bg-black overflow-hidden relative">
                  {/* Dynamic notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
                  
                  {/* Screen content - Vibrant Store UI */}
                  <div className="w-full h-full bg-gradient-to-b from-zinc-950 to-black p-3 pt-10">
                    {/* Store header with logo */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="flex items-center justify-between mb-3"
                    >
                      <img 
                        src="/logo-dark-bg.png" 
                        alt="Quick-Site" 
                        className="h-5 w-auto"
                        style={{ filter: 'drop-shadow(0 0 10px hsl(var(--primary)))' }}
                      />
                      <div className="text-[10px] font-bold text-foreground">{t('hero.management')}</div>
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/50">
                        <img 
                          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" 
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </motion.div>
                    
                    {/* Hero banner with real image */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1, duration: 0.6 }}
                      className="relative h-28 rounded-2xl overflow-hidden mb-3"
                    >
                      <img 
                        src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80"
                        alt="Store banner"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent mix-blend-overlay" />
                      <div className={`absolute bottom-2 ${dir === 'rtl' ? 'right-2 text-right' : 'left-2 text-left'}`}>
                        <div className="text-[11px] font-bold text-white mb-0.5">{t('hero.summerCollection')}</div>
                        <div className="text-[9px] text-white/70">{t('hero.upTo50Off')}</div>
                      </div>
                      {/* Shimmer effect */}
                      <motion.div
                        animate={{ x: ['100%', '-100%'] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                      />
                    </motion.div>
                    
                    {/* Product grid with real images */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2, duration: 0.5 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      {products.map((product, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.2 + i * 0.1, duration: 0.4 }}
                          className="rounded-xl bg-zinc-900/80 border border-zinc-800 overflow-hidden relative group"
                        >
                          <div className="aspect-square overflow-hidden">
                            <img 
                              src={product.img}
                              alt={t(product.nameKey)}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          </div>
                          <div className="p-2">
                            <div className="text-[9px] text-foreground font-medium truncate">{t(product.nameKey)}</div>
                            <div className="text-[10px] font-bold neon-text">{product.price}</div>
                          </div>
                          {/* Highlight effect for first card */}
                          {i === 0 && (
                            <motion.div
                              animate={{ opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute inset-0 border-2 border-primary rounded-xl"
                              style={{ boxShadow: 'inset 0 0 20px hsl(var(--primary) / 0.2)' }}
                            />
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                    
                    {/* Bottom CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.6, duration: 0.5 }}
                      className="absolute bottom-4 left-3 right-3"
                    >
                      <div className="h-11 rounded-xl bg-primary flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-white">{t('hero.addToCart')}</span>
                        <span className="text-xs text-white/70">🛒</span>
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Holographic overlay effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
              
              {/* Floating elements around phone */}
              {/* <motion.div
                animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute -top-8 ${dir === 'rtl' ? '-right-8' : '-left-8'} w-16 h-16 rounded-2xl glass-card border border-primary/30 flex items-center justify-center`}
                style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.2)' }}
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
              
              <motion.div
                animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className={`absolute -bottom-4 ${dir === 'rtl' ? '-left-8' : '-right-8'} w-14 h-14 rounded-xl glass-card border border-primary/20 flex items-center justify-center`}
              >
                <span className="text-xl">🚀</span>
              </motion.div>
              
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className={`absolute top-1/3 ${dir === 'rtl' ? '-left-12' : '-right-12'} w-12 h-12 rounded-full glass-card border border-primary/20 flex items-center justify-center`}
              >
                <span className="text-lg">✨</span>
              </motion.div> */}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      
      {/* Scroll indicator
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <motion.div className="w-1.5 h-2 rounded-full bg-primary" />
        </motion.div>
      </motion.div> */}
    </section>
  );
};

export default HeroSection;
