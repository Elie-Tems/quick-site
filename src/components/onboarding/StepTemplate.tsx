import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OnboardingData } from "@/pages/Onboarding";
import { StoreTemplateId, getTemplate } from "@/lib/storeTemplates";
import { ArrowLeft, ArrowRight, Users, Home, Sparkles, Zap, ShoppingBag, Heart, Check } from "lucide-react";
import { motion } from "framer-motion";
import { StepNavigation } from "./StepNavigation";

interface StepTemplateProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Template configuration for the 4 main styles
interface TemplateStyle {
  id: StoreTemplateId;
  name: string;
  description: string;
  icon: React.ReactNode;
  heroImage: string;
  products: Array<{
    img: string;
    name: string;
    price: string;
    sale?: boolean;
    originalPrice?: string;
  }>;
  vibe: string;
}

const templateStyles: TemplateStyle[] = [
  {
    id: 'urban-chic',
    name: 'אורבני עם דמויות',
    description: 'אנרגטי, סגנון חיים, דינמי',
    icon: <Users className="w-4 h-4" />,
    vibe: 'lifestyle',
    heroImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80',
    products: [
      { img: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=300&q=80', name: 'נעלי סניקרס', price: '₪699' },
      { img: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=300&q=80', name: 'הודי אורבני', price: '₪349', sale: true, originalPrice: '₪449' },
      { img: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=80', name: 'תיק גב', price: '₪289' },
    ],
  },
  {
    id: 'warm-sunset',
    name: 'אווירה חמה וביתית',
    description: 'כפרי, נעים, מזמין',
    icon: <Home className="w-4 h-4" />,
    vibe: 'cozy',
    heroImage: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=600&q=80',
    products: [
      { img: 'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=300&q=80', name: 'כרית דקורטיבית', price: '₪179' },
      { img: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=300&q=80', name: 'נר ריחני', price: '₪89', sale: true, originalPrice: '₪129' },
      { img: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&q=80', name: 'ספל קרמיקה', price: '₪65' },
    ],
  },
  {
    id: 'minimal',
    name: 'מינימליסטי נקי',
    description: 'יוקרתי, מדויק, סטודיו',
    icon: <Sparkles className="w-4 h-4" />,
    vibe: 'minimal',
    heroImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
    products: [
      { img: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&q=80', name: 'אוזניות אלחוטיות', price: '₪1,299' },
      { img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80', name: 'שעון חכם', price: '₪899' },
      { img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80', name: 'אוזניות פרימיום', price: '₪649' },
    ],
  },
  {
    id: 'bold-modern',
    name: 'מודרני נועז',
    description: 'קונטרסט חד, גרפי, אימפקט',
    icon: <Zap className="w-4 h-4" />,
    vibe: 'bold',
    heroImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    products: [
      { img: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300&q=80', name: 'כיסא מעצבים', price: '₪2,499' },
      { img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&q=80', name: 'מנורת שולחן', price: '₪449', sale: true, originalPrice: '₪599' },
      { img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&q=80', name: 'אגרטל גיאומטרי', price: '₪189' },
    ],
  },
  {
    id: 'elegant-dark',
    name: 'יוקרה ואלגנטיות',
    description: 'פרימיום, מוזהב, תכשיטים',
    icon: <Sparkles className="w-4 h-4" />,
    vibe: 'luxury',
    heroImage: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80',
    products: [
      { img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80', name: 'שרשרת זהב', price: '₪1,899' },
      { img: 'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=300&q=80', name: 'צמיד יהלומים', price: '₪3,499', sale: true, originalPrice: '₪4,299' },
      { img: 'https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?w=300&q=80', name: 'טבעת אירוסין', price: '₪5,999' },
    ],
  },
  {
    id: 'natural',
    name: 'טבעי ואורגני',
    description: 'אקולוגי, ירוק, בריאות',
    icon: <Home className="w-4 h-4" />,
    vibe: 'natural',
    heroImage: 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=600&q=80',
    products: [
      { img: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&q=80', name: 'סבון טבעי', price: '₪49' },
      { img: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=300&q=80', name: 'שמן ארומתי', price: '₪89', sale: true, originalPrice: '₪129' },
      { img: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&q=80', name: 'עציץ סוקולנט', price: '₪65' },
    ],
  },
];

// Neutral template preview component
const TemplatePreview = ({ template, isSelected }: { template: TemplateStyle; isSelected: boolean }) => {
  // All templates use neutral monochrome colors
  const neutralBg = '#0f0f0f';
  const neutralCard = '#1a1a1a';
  const neutralText = '#ffffff';
  const neutralMuted = '#6b6b6b';
  const neutralAccent = '#a3a3a3'; // Placeholder gray for accent areas
  
  return (
    <div 
      className="w-full h-full overflow-hidden"
      style={{ background: neutralBg }}
    >
      {/* Header Bar */}
      <div 
        className="h-7 flex items-center justify-between px-2.5 border-b"
        style={{ 
          background: neutralCard,
          borderColor: 'rgba(255,255,255,0.08)'
        }}
      >
        <div className="flex items-center gap-1.5">
          <div 
            className="w-4 h-4 rounded-md flex items-center justify-center"
            style={{ background: neutralAccent }}
          >
            <ShoppingBag className="w-2.5 h-2.5 text-black" />
          </div>
          <span 
            className="text-[9px] font-bold"
            style={{ color: neutralText }}
          >
            החנות שלי
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="w-2.5 h-2.5" style={{ color: neutralMuted }} />
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px]"
            style={{ background: neutralAccent, color: '#000' }}
          >
            <ShoppingBag className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>

      {/* Hero Section - Unique per template */}
      <div className="relative h-[65px] overflow-hidden">
        <img 
          src={template.heroImage}
          alt={template.name}
          className="w-full h-full object-cover"
        />
        <div 
          className="absolute inset-0"
          style={{ 
            background: `linear-gradient(to top, ${neutralBg}ee, ${neutralBg}40)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          <span 
            className="text-[7px] uppercase tracking-wider mb-0.5 opacity-80"
            style={{ color: neutralAccent }}
          >
            קולקציה חדשה
          </span>
          <span 
            className="text-[11px] font-bold"
            style={{ color: neutralText }}
          >
            הנחות עד 50%
          </span>
          <div
            className="mt-1 px-2 py-0.5 text-[6px] font-medium rounded-sm"
            style={{ 
              background: neutralAccent,
              color: '#000',
            }}
          >
            קנו עכשיו
          </div>
        </div>
      </div>

      {/* Products Grid - Unique products per template */}
      <div className="p-1.5 grid grid-cols-3 gap-1">
        {template.products.map((product, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.08 }}
            className="relative overflow-hidden rounded-sm"
            style={{ 
              background: neutralCard,
              border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            {/* Product Image */}
            <div className="aspect-square overflow-hidden relative">
              <img 
                src={product.img}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.sale && (
                <div 
                  className="absolute top-0.5 right-0.5 px-1 py-0.5 text-[5px] font-bold text-white rounded-sm"
                  style={{ background: '#dc2626' }}
                >
                  מבצע
                </div>
              )}
              <div 
                className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              >
                <Heart className="w-1.5 h-1.5" style={{ color: neutralMuted }} />
              </div>
            </div>
            
            {/* Product Info */}
            <div className="p-1">
              <div 
                className="text-[6px] font-medium truncate mb-0.5"
                style={{ color: neutralText }}
              >
                {product.name}
              </div>
              <div className="flex items-center gap-0.5">
                <span 
                  className="text-[7px] font-bold"
                  style={{ color: neutralAccent }}
                >
                  {product.price}
                </span>
                {product.originalPrice && (
                  <span 
                    className="text-[5px] line-through"
                    style={{ color: neutralMuted }}
                  >
                    {product.originalPrice}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const StepTemplate = ({ data, updateData, onNext, onBack }: StepTemplateProps) => {
  const selectedTemplate = data.storeTemplate;
  const hasSelection = !!selectedTemplate;

  const handleSelectTemplate = (templateId: StoreTemplateId) => {
    // בחירת תבנית משפיעה רק על העיצוב (צבעים, טיפוגרפיה וכו')
    // הקטגוריות מגיעות מהקטגוריה העסקית שנבחרה ומהמשתמש, לא מהתבנית
    updateData({ storeTemplate: templateId });
  };

  // Determine grid position classes for Bento layout
  const getGridClasses = (index: number) => {
    // 2x2 Bento grid
    return 'col-span-1';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          שלב 3
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          בחרו את סגנון החנות
        </h1>
        <p className="text-muted-foreground">
          כל תבנית מותאמת לסוג עסק אחר - הצבעים יתאימו למותג שלכם
        </p>
      </div>

      {/* Bento Grid - 2x2 Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templateStyles.map((template, index) => {
          const isSelected = selectedTemplate === template.id;
          
          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => handleSelectTemplate(template.id)}
              className={`group relative rounded-xl overflow-hidden transition-all duration-300 text-right ${
                isSelected 
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' 
                  : 'hover:ring-1 hover:ring-muted-foreground/30'
              }`}
              style={{
                background: '#0f0f0f',
                border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {/* Template Preview */}
              <div className="aspect-[4/3.5] relative overflow-hidden">
                <TemplatePreview template={template} isSelected={isSelected} />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                
                {/* Selection Checkmark */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg"
                    style={{ boxShadow: '0 0 15px hsl(var(--primary) / 0.5)' }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-white/70">
                      {template.icon}
                    </div>
                    <h3 className="font-bold text-sm text-white">
                      {template.name}
                    </h3>
                  </div>
                  {/* Neutral color dots indicator */}
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-neutral-900 border border-white/20" />
                    <div className="w-3 h-3 rounded-full bg-neutral-500 border border-white/20" />
                    <div className="w-3 h-3 rounded-full bg-neutral-300 border border-white/20" />
                  </div>
                </div>
                <p className="text-xs text-neutral-400">
                  {template.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Info note */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground bg-muted/50 inline-block px-4 py-2 rounded-full">
          💡 הצבעים המוצגים הם ניטרליים - צבעי המותג שלכם יוחלו אוטומטית
        </p>
      </div>

      {/* Navigation */}
      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel="הבא"
        saveLabel="שמור והמשך"
        nextDisabled={false}
        saveDisabled={!hasSelection}
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepTemplate;
