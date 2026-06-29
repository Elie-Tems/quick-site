import { Globe, CreditCard, ClipboardList, Package, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const BenefitsSection = () => {
  const { t } = useLanguage();

  const benefits = [
    {
      icon: Globe,
      titleKey: 'benefits.professionalSite',
      descriptionKey: 'benefits.professionalSite.desc',
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&q=80",
      stat: "100%",
      statLabelKey: 'benefits.mobileOptimized',
    },
    {
      icon: CreditCard,
      titleKey: 'benefits.orderOrPayment',
      descriptionKey: 'benefits.orderOrPayment.desc',
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80",
      stat: t('benefits.instant'),
      statLabelKey: 'benefits.instantPayment',
    },
    {
      icon: ClipboardList,
      titleKey: 'benefits.orderManagement',
      descriptionKey: 'benefits.orderManagement.desc',
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80",
      stat: "בזמן אמת",
      statLabelKey: 'benefits.orderManagement',
    },
    {
      icon: Package,
      titleKey: 'benefits.allInOne',
      descriptionKey: 'benefits.allInOne.desc',
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
      stat: "מסביב לשעון",
      statLabelKey: 'benefits.fullAccess',
    },
  ];

  return (
    <section className="relative py-32 md:py-40 bg-background overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      
      {/* Ambient glows */}
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[200px]" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[180px]" />
      
      <div className="container relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6"
          >
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t('benefits.badge')}</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            {t('benefits.title')}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t('benefits.subtitle')}
          </p>
        </motion.div>
        
        {/* Benefits Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-3xl overflow-hidden"
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <img 
                  src={benefit.image}
                  alt={t(benefit.titleKey)}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Stronger gradient overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50" />
              </div>
              
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 border border-primary/40 rounded-3xl" />
                <div className="absolute -inset-1 bg-primary/10 blur-xl rounded-3xl" />
              </div>
              
              {/* Content */}
              <div className="relative p-8 md:p-10 min-h-[280px] flex flex-col justify-end">
                {/* Stat badge - top right with stronger background */}
                <div className="absolute top-6 left-6 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10">
                  <div className="text-lg font-bold neon-text" style={{ textShadow: 'none' }}>{benefit.stat}</div>
                  <div className="text-xs text-foreground/80">{t(benefit.statLabelKey)}</div>
                </div>
                
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/20 backdrop-blur-sm flex items-center justify-center mb-4 border border-primary/30"
                     style={{ boxShadow: 'none' }}>
                  <benefit.icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
                
                {/* Title with text shadow for better visibility */}
                <h3 className="font-display font-bold text-2xl text-white mb-2"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)' }}>
                  {t(benefit.titleKey)}
                </h3>
                {/* Description with enhanced contrast */}
                <p className="text-white/90 leading-relaxed"
                   style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
                  {t(benefit.descriptionKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
