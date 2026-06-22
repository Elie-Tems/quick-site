import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const WhoIsThisForSection = () => {
  const { t } = useLanguage();

  const audiences = [
    {
      titleKey: 'audience.boutiques',
      descriptionKey: 'audience.boutiques.desc',
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      gradient: "from-pink-500/30 to-rose-500/30",
    },
    {
      titleKey: 'audience.food',
      descriptionKey: 'audience.food.desc',
      image: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=600&q=80",
      gradient: "from-amber-500/30 to-orange-500/30",
    },
    {
      titleKey: 'audience.art',
      descriptionKey: 'audience.art.desc',
      image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80",
      gradient: "from-violet-500/30 to-purple-500/30",
    },
    {
      titleKey: 'audience.books',
      descriptionKey: 'audience.books.desc',
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
      gradient: "from-emerald-500/30 to-teal-500/30",
    },
    {
      titleKey: 'audience.toys',
      descriptionKey: 'audience.toys.desc',
      image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&q=80",
      gradient: "from-sky-500/30 to-blue-500/30",
    },
    {
      titleKey: 'audience.pets',
      descriptionKey: 'audience.pets.desc',
      image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&q=80",
      gradient: "from-lime-500/30 to-green-500/30",
    },
  ];

  return (
    <section className="relative py-32 md:py-40 bg-card overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.015]">
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
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[200px]" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[180px]" />
      
      {/* Dividers */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
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
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t('whoIsThisFor.badge')}</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            {t('whoIsThisFor.title')}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t('whoIsThisFor.subtitle')}
          </p>
        </motion.div>
        
        {/* Bento Grid with real photos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className={`group relative rounded-3xl overflow-hidden ${
                index === 0 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
            >
              {/* Image */}
              <div className={`relative w-full overflow-hidden ${
                index === 0 ? 'aspect-square md:aspect-auto md:h-full min-h-[400px]' : 'aspect-[4/3]'
              }`}>
                <img 
                  src={audience.image}
                  alt={t(audience.titleKey)}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Gradient overlays */}
                <div className={`absolute inset-0 bg-gradient-to-t ${audience.gradient} mix-blend-overlay opacity-60`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {/* Hover glow border */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 border-2 border-primary/50 rounded-3xl" />
                  <div className="absolute -inset-1 bg-primary/10 blur-xl rounded-3xl" />
                </div>
                                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="glass-card p-4 md:p-5 rounded-2xl backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      {/* <span className="text-xs text-primary font-medium uppercase tracking-wider">
                        {t('whoIsThisFor.customized')}
                      </span> */}
                    </div>
                    <h3 className={`font-display font-bold text-foreground mb-2 ${
                      index === 0 ? 'text-2xl md:text-3xl' : 'text-xl'
                    }`}>
                      {t(audience.titleKey)}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {t(audience.descriptionKey)}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-muted-foreground mt-12"
        >
          <span className="text-foreground font-semibold">{t('whoIsThisFor.andMore')}</span> {t('whoIsThisFor.moreCategories')}
        </motion.p>
      </div>
    </section>
  );
};

export default WhoIsThisForSection;
