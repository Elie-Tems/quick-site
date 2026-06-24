import { Upload, Palette, Package, Sparkles, Store, FileImage, Zap, Plus, Image, Tag } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "מעלים שם ולוגו",
    description: "מזינים את שם העסק ומעלים לוגו. המערכת מנתחת ויוצרת עיצוב מותאם.",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80",
    mockupType: "upload" as const,
  },
  {
    number: "02",
    icon: Palette,
    title: "בוחרים עיצוב",
    description: "בוחרים תבנית וצבעים או נותנים ל-Siango לבחור בשבילכם.",
    image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80",
    mockupType: "design" as const,
  },
  {
    number: "03",
    icon: Package,
    title: "מוסיפים מוצרים",
    description: "מעלים מוצרים בקלות עם תמונות, מחירים ותיאורים - והאתר מוכן למכירה.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    mockupType: "products" as const,
  },
];

// Dynamic mockup component for each step
const StepMockup = ({ type, image }: { type: "upload" | "design" | "products"; image: string }) => {
  if (type === "upload") {
    return (
      <div className="relative w-full h-full rounded-2xl bg-zinc-900/90 border border-white/10 p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">הגדרת העסק שלך</div>
            <div className="text-xs text-muted-foreground">שלב 1 מתוך 3</div>
          </div>
        </div>
        
        {/* Form mockup */}
        <div className="space-y-4 flex-1">
          {/* Business name input */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">שם העסק</div>
            <div className="h-12 rounded-xl bg-white/5 border border-white/10 flex items-center px-4">
              <span className="text-sm text-foreground">בוטיק האופנה שלי</span>
              <motion.div 
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-0.5 h-5 bg-primary mr-1"
              />
            </div>
          </div>
          
          {/* Logo upload area */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">לוגו העסק</div>
            <motion.div 
              animate={{ 
                borderColor: ['hsl(var(--primary) / 0.3)', 'hsl(var(--primary) / 0.6)', 'hsl(var(--primary) / 0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-32 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-3"
            >
              <motion.div
                animate={{ y: [-3, 3, -3], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"
              >
                <FileImage className="w-6 h-6 text-primary" />
              </motion.div>
              <span className="text-xs text-muted-foreground">גרור קובץ או לחץ להעלאה</span>
            </motion.div>
          </div>
        </div>
        
        {/* Continue button */}
        <motion.div
          animate={{ boxShadow: ['0 0 20px hsl(var(--primary) / 0.3)', '0 0 40px hsl(var(--primary) / 0.5)', '0 0 20px hsl(var(--primary) / 0.3)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-12 rounded-xl bg-primary flex items-center justify-center gap-2 mt-4"
        >
          <span className="text-sm font-bold text-black">המשך</span>
          <Zap className="w-4 h-4 text-black" />
        </motion.div>
      </div>
    );
  }
  
  if (type === "design") {
    const templates = [
      { 
        name: "אורבני עם דמויות", 
        description: "אנרגטי, סגנון חיים",
        icon: "👥",
        heroColor: "#1e6b6b",
        products: [
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=150&q=80",
          "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=150&q=80",
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&q=80",
        ],
        colors: ["#1a1a1a", "#3a3a3a", "#6a6a6a"],
        active: true,
      },
      { 
        name: "אווירה חמה וביתית", 
        description: "כפרי, נעים, מזמין",
        icon: "🏠",
        heroColor: "#2d5a4a",
        products: [
          "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=150&q=80",
          "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=150&q=80", 
          "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=150&q=80",
        ],
        colors: ["#2d5a4a", "#4a7a6a", "#8aaa9a"],
      },
      { 
        name: "מינימליסטי נקי", 
        description: "פשוט, מודרני, נקי",
        icon: "◯",
        heroColor: "#1a1a1a",
        products: [
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80",
          "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=150&q=80",
          "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=150&q=80",
        ],
        colors: ["#000000", "#333333", "#666666"],
      },
      { 
        name: "יוקרתי ומפנק", 
        description: "אלגנטי, פרימיום",
        icon: "✨",
        heroColor: "#3d2a1a",
        products: [
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=150&q=80",
          "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=150&q=80",
          "https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=150&q=80",
        ],
        colors: ["#3d2a1a", "#6d5a4a", "#9d8a7a"],
      },
    ];
    
    return (
      <div className="relative w-full h-full rounded-2xl bg-zinc-900/90 border border-white/10 p-4 flex flex-col">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-xs text-muted-foreground">
            כל תבנית מותאמת לסוג עסק אחר - הצבעים יתאימו למותג שלכם
          </div>
        </div>
        
        {/* Template cards - 2 columns */}
        <div className="grid grid-cols-2 gap-3 flex-1">
          {templates.map((template, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-zinc-950 ${
                template.active 
                  ? 'border-primary shadow-[0_0_25px_hsl(var(--primary)/0.4)]' 
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Mini store preview */}
              <div className="bg-zinc-900 rounded-t-lg overflow-hidden">
                {/* Store header */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-950">
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded bg-zinc-800" />
                    <div className="w-4 h-4 rounded bg-zinc-800" />
                  </div>
                  <div className="text-[9px] font-medium text-foreground">החנות שלי</div>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded bg-zinc-800" />
                    <div className="w-4 h-4 rounded bg-zinc-800" />
                  </div>
                </div>
                
                {/* Hero banner */}
                <div 
                  className="h-12 flex flex-col items-center justify-center relative"
                  style={{ backgroundColor: template.heroColor }}
                >
                  <div className="text-[8px] text-white/70">קולקציה חדשה</div>
                  <div className="text-[10px] font-bold text-white">הנחות עד 50%</div>
                  <div className="mt-0.5 px-2 py-0.5 bg-white/20 rounded text-[7px] text-white">קנו עכשיו</div>
                </div>
                
                {/* Products grid */}
                <div className="grid grid-cols-3 gap-1 p-1.5 bg-white">
                  {template.products.map((img, j) => (
                    <motion.div
                      key={j}
                      className="relative"
                      animate={{ opacity: [0.9, 1, 0.9] }}
                      transition={{ duration: 2, repeat: Infinity, delay: j * 0.3 }}
                    >
                      {j === 1 && (
                        <div className="absolute top-0.5 right-0.5 px-1 py-0.5 bg-red-500 text-[6px] text-white rounded z-10">
                          מבצע
                        </div>
                      )}
                      <img 
                        src={img} 
                        alt="" 
                        className="w-full aspect-square object-cover rounded-sm"
                      />
                      <div className="text-[7px] text-zinc-800 mt-0.5 truncate text-right">מוצר</div>
                      <div className="text-[8px] font-bold text-zinc-900 text-right">₪{89 + j * 50}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Template info */}
              <div className="p-2 flex items-center justify-between bg-zinc-950">
                <div className="flex gap-1">
                  {template.colors.map((color, j) => (
                    <div 
                      key={j}
                      className="w-3 h-3 rounded-full border border-zinc-700"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-right">
                  <div>
                    <div className="text-[10px] font-medium text-foreground">{template.name}</div>
                    <div className="text-[8px] text-muted-foreground">{template.description}</div>
                  </div>
                  <span className="text-sm">{template.icon}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }
  
  // Products mockup - new step 3
  return (
    <div className="relative w-full h-full rounded-2xl bg-zinc-900/90 border border-white/10 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">ניהול מוצרים</div>
          <div className="text-xs text-muted-foreground">הוספה ועריכה קלה</div>
        </div>
      </div>
      
      {/* Add product button */}
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center gap-2 mb-4 cursor-pointer hover:bg-primary/20 transition-colors"
      >
        <Plus className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">הוספת מוצר חדש</span>
      </motion.div>
      
      {/* Products list */}
      <div className="space-y-3 flex-1 overflow-hidden">
        {[
          { name: "שמלת קיץ פרחונית", price: "₪189", status: "פעיל" },
          { name: "ג'ינס קלאסי", price: "₪249", status: "פעיל" },
          { name: "חולצת כותנה", price: "₪99", status: "חדש" },
        ].map((product, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors"
          >
            {/* Product image placeholder */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
            >
              <Image className="w-5 h-5 text-primary/60" />
            </motion.div>
            
            {/* Product info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{product.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Tag className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{product.price}</span>
              </div>
            </div>
            
            {/* Status badge */}
            <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${
              product.status === "חדש" 
                ? "bg-primary/20 text-primary" 
                : "bg-white/10 text-muted-foreground"
            }`}>
              {product.status}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Bottom stats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-muted-foreground">3 מוצרים פעילים</div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center gap-1 text-primary text-xs"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          מסונכרן
        </motion.div>
      </div>
    </div>
  );
};

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative py-16 md:py-24 bg-background overflow-hidden">
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
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[200px] -translate-y-1/2" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[150px]" />
      
      <div className="container relative z-10">
        {/* Section header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            איך זה עובד?
          </h2>
          <p className="text-xl text-muted-foreground">
            שלושה צעדים פשוטים והאתר שלכם באוויר
          </p>
        </motion.div>
        
        {/* Steps with images */}
        <div className="space-y-24 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="flex flex-col"
            >
              {/* Header with number on side and centered content */}
              <div className="relative mb-8 flex items-start justify-center">
                {/* Step number badge - positioned on the right side */}
                <div 
                  className="absolute right-0 top-0 w-14 h-14 rounded-2xl glass-card border border-primary/40 flex items-center justify-center"
                  style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.3)' }}
                >
                  <span className="text-lg font-bold neon-text">{step.number}</span>
                </div>
                
                {/* Centered text content */}
                <div className="text-center max-w-2xl">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div 
                      className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/30"
                      style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.2)' }}
                    >
                      <step.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display font-bold text-2xl md:text-3xl text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {/* Mockup below */}
              <div className="relative">
                <div className="relative aspect-[4/3] max-w-2xl mx-auto rounded-3xl overflow-hidden group">
                  {/* Glow behind */}
                  <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                  
                  {/* Interactive Mockup */}
                  <div className="relative w-full h-full rounded-3xl overflow-hidden border border-primary/20">
                    <StepMockup type={step.mockupType} image={step.image} />
                    
                    {/* Holographic shimmer */}
                    <motion.div
                      animate={{ x: ['100%', '-100%'] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent skew-x-12 pointer-events-none"
                    />
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

export default HowItWorksSection;
