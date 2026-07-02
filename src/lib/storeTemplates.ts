// Store template configurations inspired by top e-commerce sites

export type StoreTemplateId =
  | 'luxury-boutique'
  | 'bold-playful'
  | 'natural-organic'
  | 'tech-minimal'
  | 'vintage-warm'
  | 'ocean-breeze'
  | 'warm-sunset'
  | 'urban-chic'
  | 'fresh-mint'
  | 'royal-purple'
  | 'editorial-mono'
  | 'bakery-warm'
  | 'kids-pop'
  | 'spa-soft'
  | 'fitness-bold';

export interface StoreTemplate {
  id: StoreTemplateId;
  name: string;
  description: string;
  previewImage: string;
  theme: {
    // CSS custom properties
    primaryColor: string;
    backgroundColor: string;
    foregroundColor: string;
    cardColor: string;
    mutedColor: string;
    accentColor: string;
    borderRadius: string;
    fontStyle: 'sans' | 'serif' | 'mixed';
  };
  heroStyle: {
    layout: 'full-image' | 'split' | 'centered';
    overlayOpacity: number;
    textAlignment: 'left' | 'center' | 'right';
    ctaStyle: 'solid' | 'outline' | 'ghost';
  };
  productCardStyle: {
    aspectRatio: '3/4' | '1/1' | '4/3';
    showBadges: boolean;
    hoverEffect: 'zoom' | 'lift' | 'none';
    borderStyle: 'none' | 'subtle' | 'bold';
  };
  /** פריסת גריד המוצרים בחנות */
  productGrid?: 'uniform-3col' | 'featured' | '2col';
  /** קטגוריות מוצרים מוצעות לתבנית - יופיעו באונבורדינג ובקטגוריות בדשבורד */
  defaultCategories?: Array<{ name: string; description?: string }>;
  /** Tailwind CSS classes for implementing this template */
  cssClasses?: {
    container: string;
    hero: string;
    card: string;
    button: string;
    header: string;
  };
}

const GENERIC_CATEGORIES = [
  { name: 'חדש', description: 'מוצרים שנוספו לאחרונה' },
  { name: 'מומלצים', description: 'הפריטים הפופולריים' },
  { name: 'מבצעים', description: 'הנחות ומחירים מיוחדים' },
  { name: 'קולקציה', description: 'מבחר הפריטים שלנו' },
  { name: 'מתנות', description: 'רעיונות למתנה' },
  { name: 'הכל', description: 'כל הפריטים בחנות' },
];

export const storeTemplates: Record<StoreTemplateId, StoreTemplate> = {
  'luxury-boutique': {
    id: 'luxury-boutique',
    name: 'שחור וזהב',
    description: 'עיצוב אלגנטי ומינימליסטי - שחור, לבן וזהב עם פונטים קלאסיים',
    previewImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04',
    theme: {
      primaryColor: '#000000',
      backgroundColor: '#ffffff',
      foregroundColor: '#1a1a1a',
      cardColor: '#fafafa',
      mutedColor: '#737373',
      accentColor: '#d4af37',
      borderRadius: '0px',
      fontStyle: 'serif',
    },
    heroStyle: {
      layout: 'full-image',
      overlayOpacity: 0.45,
      textAlignment: 'center',
      ctaStyle: 'outline',
    },
    productCardStyle: {
      aspectRatio: '3/4',
      showBadges: false,
      hoverEffect: 'lift',
      borderStyle: 'none',
    },
    productGrid: 'uniform-3col',
    cssClasses: {
      container: "max-w-6xl mx-auto px-8 md:px-16",
      hero: "h-screen flex items-center justify-center relative overflow-hidden",
      card: "bg-white group hover:-translate-y-1 transition-transform duration-500",
      button: "border border-[#d4af37] text-[#d4af37] px-10 py-3 text-xs tracking-[0.15em] hover:bg-[#d4af37] hover:text-black transition-all",
      header: "fixed top-0 w-full bg-black/90 backdrop-blur-sm z-50 py-4 px-8",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'bold-playful': {
    id: 'bold-playful',
    name: 'ורוד וסגול',
    description: 'עיצוב דינמי ואנרגטי - גרדיאנט ורוד-סגול-כחול עם פינות מעוגלות',
    previewImage: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475',
    theme: {
      primaryColor: '#ff3cac',
      backgroundColor: '#f5f5f5',
      foregroundColor: '#1a1a1a',
      cardColor: '#ffffff',
      mutedColor: '#888888',
      accentColor: '#2b86c5',
      borderRadius: '16px',
      fontStyle: 'sans',
    },
    heroStyle: {
      layout: 'split',
      overlayOpacity: 0,
      textAlignment: 'left',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '1/1',
      showBadges: true,
      hoverEffect: 'zoom',
      borderStyle: 'none',
    },
    cssClasses: {
      container: "max-w-7xl mx-auto px-4 md:px-8",
      hero: "min-h-[70vh] grid grid-cols-1 md:grid-cols-2 bg-gradient-to-br from-[#ff3cac] via-[#784ba0] to-[#2b86c5]",
      card: "bg-white rounded-2xl p-3 overflow-hidden hover:scale-[1.02] transition-transform duration-200",
      button: "bg-white text-[#784ba0] font-black px-8 py-3 rounded-full text-sm hover:bg-[#ff3cac] hover:text-white transition-all duration-200",
      header: "sticky top-0 bg-[#784ba0] z-50 px-4 py-3 flex items-center justify-between",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'natural-organic': {
    id: 'natural-organic',
    name: 'ירוק ואדמתי',
    description: 'עיצוב רגוע ומאוזן - גוונים ירוקים ואדמתיים עם תחושה חמה',
    previewImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136',
    theme: {
      primaryColor: '#4a7c59',
      backgroundColor: '#f5f0e8',
      foregroundColor: '#2c3e2d',
      cardColor: '#ffffff',
      mutedColor: '#8c7b6b',
      accentColor: '#8b6914',
      borderRadius: '12px',
      fontStyle: 'sans',
    },
    heroStyle: {
      layout: 'centered',
      overlayOpacity: 0.2,
      textAlignment: 'center',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '1/1',
      showBadges: true,
      hoverEffect: 'lift',
      borderStyle: 'subtle',
    },
    productGrid: 'featured',
    cssClasses: {
      container: "max-w-5xl mx-auto px-4 md:px-8",
      hero: "min-h-[60vh] bg-[#4a7c59] flex flex-col items-center justify-center text-center px-6 py-20",
      card: "bg-white rounded-xl border border-[#d4c5a9] overflow-hidden hover:-translate-y-1 transition-transform duration-300",
      button: "bg-[#f5f0e8] text-[#4a7c59] font-semibold px-7 py-3 rounded-full hover:bg-white transition-colors text-sm",
      header: "sticky top-0 bg-[#f5f0e8] border-b border-[#d4c5a9] px-4 py-3 z-50",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'tech-minimal': {
    id: 'tech-minimal',
    name: 'כחול כהה',
    description: 'עיצוב מדויק ונקי - רקע כהה עם כחול בהיר, פינות חדות',
    previewImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    theme: {
      primaryColor: '#3b82f6',
      backgroundColor: '#0a0a0f',
      foregroundColor: '#e2e8f0',
      cardColor: '#1e2433',
      mutedColor: '#64748b',
      accentColor: '#60a5fa',
      borderRadius: '4px',
      fontStyle: 'sans',
    },
    heroStyle: {
      layout: 'split',
      overlayOpacity: 0,
      textAlignment: 'left',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '1/1',
      showBadges: true,
      hoverEffect: 'lift',
      borderStyle: 'subtle',
    },
    productGrid: '2col',
    cssClasses: {
      container: "max-w-7xl mx-auto px-4 md:px-8",
      hero: "min-h-[65vh] bg-[#1e2433] grid md:grid-cols-2 items-center gap-8 px-8 md:px-16",
      card: "bg-[#1e2433] border border-[#334155] rounded-sm hover:border-[#3b82f6] hover:-translate-y-0.5 transition-all duration-200",
      button: "bg-[#3b82f6] text-white px-6 py-2.5 rounded-sm text-sm font-semibold hover:bg-[#2563eb] transition-colors tracking-wide",
      header: "sticky top-0 bg-[#0a0a0f] border-b border-[#1e2433] px-6 py-3 z-50",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'vintage-warm': {
    id: 'vintage-warm',
    name: 'חרס ושמנת',
    description: 'עיצוב אותנטי וחמים - גוונים שמנתיים וחרס עם מגע נוסטלגי',
    previewImage: 'https://images.unsplash.com/photo-1495121553079-4c61bcce1894',
    theme: {
      primaryColor: '#c1440e',
      backgroundColor: '#fdf6ed',
      foregroundColor: '#3d2c1e',
      cardColor: '#ffffff',
      mutedColor: '#9c826b',
      accentColor: '#d4956a',
      borderRadius: '6px',
      fontStyle: 'mixed',
    },
    heroStyle: {
      layout: 'centered',
      overlayOpacity: 0,
      textAlignment: 'center',
      ctaStyle: 'outline',
    },
    productCardStyle: {
      aspectRatio: '3/4',
      showBadges: false,
      hoverEffect: 'lift',
      borderStyle: 'subtle',
    },
    cssClasses: {
      container: "max-w-5xl mx-auto px-4 md:px-10",
      hero: "min-h-[55vh] bg-[#e8dcc8] flex flex-col items-center justify-center text-center px-8 py-16 relative overflow-hidden",
      card: "bg-white rounded-md border border-[#e8dcc8] text-center overflow-hidden hover:-translate-y-1 transition-transform duration-300",
      button: "border-2 border-[#c1440e] text-[#c1440e] px-8 py-3 rounded text-sm tracking-wider font-medium hover:bg-[#c1440e] hover:text-white transition-all",
      header: "sticky top-0 bg-[#fdf6ed] border-b-2 border-[#c1440e] px-6 py-3 z-50 flex items-center justify-between",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'ocean-breeze': {
    id: 'ocean-breeze',
    name: 'כחול וציאן',
    description: 'עיצוב רענן ואוורירי - גוונים כחולים בהירים עם תחושה נקייה',
    previewImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    theme: {
      primaryColor: '#0077b6',
      backgroundColor: '#f0f9ff',
      foregroundColor: '#1e3a5f',
      cardColor: '#ffffff',
      mutedColor: '#6b8fad',
      accentColor: '#00b4d8',
      borderRadius: '12px',
      fontStyle: 'sans',
    },
    heroStyle: {
      layout: 'full-image',
      overlayOpacity: 0.4,
      textAlignment: 'center',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '1/1',
      showBadges: true,
      hoverEffect: 'lift',
      borderStyle: 'subtle',
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'warm-sunset': {
    id: 'warm-sunset',
    name: 'כתום וחום',
    description: 'עיצוב חמים ומזמין - גוונים כתומים וחומים עם אווירה ביתית',
    previewImage: 'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=800&q=80',
    theme: {
      primaryColor: '#c2410c',
      backgroundColor: '#fffbeb',
      foregroundColor: '#431407',
      cardColor: '#fef3c7',
      mutedColor: '#92400e',
      accentColor: '#ea580c',
      borderRadius: '8px',
      fontStyle: 'mixed',
    },
    heroStyle: {
      layout: 'split',
      overlayOpacity: 0.3,
      textAlignment: 'right',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '4/3',
      showBadges: true,
      hoverEffect: 'zoom',
      borderStyle: 'none',
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'urban-chic': {
    id: 'urban-chic',
    name: 'אפור וזהב',
    description: 'עיצוב מתוחכם ומינימלי - אפורים כהים עם נגיעת זהב',
    previewImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    theme: {
      primaryColor: '#374151',
      backgroundColor: '#f9fafb',
      foregroundColor: '#111827',
      cardColor: '#ffffff',
      mutedColor: '#6b7280',
      accentColor: '#b8860b',
      borderRadius: '4px',
      fontStyle: 'sans',
    },
    heroStyle: {
      layout: 'centered',
      overlayOpacity: 0.5,
      textAlignment: 'center',
      ctaStyle: 'outline',
    },
    productCardStyle: {
      aspectRatio: '3/4',
      showBadges: false,
      hoverEffect: 'lift',
      borderStyle: 'bold',
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'fresh-mint': {
    id: 'fresh-mint',
    name: 'ירוק בהיר',
    description: 'עיצוב רענן ונקי - ירוק מנטה בהיר עם קווים נקיים ומינימליים',
    previewImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    theme: {
      primaryColor: '#059669',
      backgroundColor: '#ecfdf5',
      foregroundColor: '#064e3b',
      cardColor: '#ffffff',
      mutedColor: '#6b7280',
      accentColor: '#10b981',
      borderRadius: '16px',
      fontStyle: 'sans',
    },
    heroStyle: {
      layout: 'split',
      overlayOpacity: 0.2,
      textAlignment: 'right',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '1/1',
      showBadges: true,
      hoverEffect: 'lift',
      borderStyle: 'none',
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'royal-purple': {
    id: 'royal-purple',
    name: 'סגול יוקרתי',
    description: 'עיצוב דרמטי ויוקרתי - סגול עמוק עם פינות מעוגלות ופונטים קלאסיים',
    previewImage: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80',
    theme: {
      primaryColor: '#6b21a8',
      backgroundColor: '#faf5ff',
      foregroundColor: '#3b0764',
      cardColor: '#ffffff',
      mutedColor: '#7e22ce',
      accentColor: '#a855f7',
      borderRadius: '12px',
      fontStyle: 'serif',
    },
    heroStyle: {
      layout: 'full-image',
      overlayOpacity: 0.5,
      textAlignment: 'center',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '3/4',
      showBadges: true,
      hoverEffect: 'zoom',
      borderStyle: 'subtle',
    },
    productGrid: 'uniform-3col',
    defaultCategories: GENERIC_CATEGORIES,
  },
  'editorial-mono': {
    id: 'editorial-mono',
    name: 'שחור-לבן ואדום',
    description: 'שחור-לבן חד עם הדגשה אדומה - טיפוגרפיה בולטת בסגנון עיתון',
    previewImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04',
    theme: {
      primaryColor: '#111111',
      backgroundColor: '#ffffff',
      foregroundColor: '#111111',
      cardColor: '#ffffff',
      mutedColor: '#8a8a8a',
      accentColor: '#e11d2a',
      borderRadius: '0px',
      fontStyle: 'serif',
    },
    heroStyle: {
      layout: 'centered',
      overlayOpacity: 0.3,
      textAlignment: 'center',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '4/3',
      showBadges: false,
      hoverEffect: 'none',
      borderStyle: 'subtle',
    },
    productGrid: 'featured',
    cssClasses: {
      container: "max-w-6xl mx-auto px-6 md:px-10",
      hero: "min-h-[80vh] flex items-center justify-center relative bg-white border-b-4 border-black",
      card: "bg-white border-t border-black/10 pt-3 group",
      button: "bg-black text-white px-9 py-3 text-xs tracking-[0.25em] uppercase hover:bg-[#e11d2a] transition-colors",
      header: "sticky top-0 bg-white z-50 py-5 px-6 border-b border-black/10 flex items-center justify-between",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'bakery-warm': {
    id: 'bakery-warm',
    name: 'חם וביתי',
    description: 'גווני שמנת, טרקוטה וחום - חמים ומזמינים עם פינות מעוגלות רכות',
    previewImage: 'https://images.unsplash.com/photo-1495121553079-4c61bcce1894',
    theme: {
      primaryColor: '#b45309',
      backgroundColor: '#fdf6ec',
      foregroundColor: '#4a2e12',
      cardColor: '#ffffff',
      mutedColor: '#9c7a55',
      accentColor: '#c2410c',
      borderRadius: '14px',
      fontStyle: 'mixed',
    },
    heroStyle: {
      layout: 'split',
      overlayOpacity: 0.15,
      textAlignment: 'right',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '4/3',
      showBadges: true,
      hoverEffect: 'lift',
      borderStyle: 'subtle',
    },
    productGrid: '2col',
    cssClasses: {
      container: "max-w-5xl mx-auto px-5 md:px-8",
      hero: "min-h-[65vh] grid grid-cols-1 md:grid-cols-2 items-center bg-[#fdf6ec]",
      card: "bg-white rounded-2xl p-4 shadow-sm hover:-translate-y-1 transition-transform duration-300 border border-[#b45309]/10",
      button: "bg-[#b45309] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#c2410c] transition-colors",
      header: "sticky top-0 bg-[#fdf6ec]/95 backdrop-blur z-50 px-5 py-4 flex items-center justify-between border-b border-[#b45309]/10",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'kids-pop': {
    id: 'kids-pop',
    name: 'צבעוני ועליז',
    description: 'צהוב, תכלת וקורל עליזים - שובב ומרגש עם פינות עגולות גדולות',
    previewImage: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475',
    theme: {
      primaryColor: '#2563eb',
      backgroundColor: '#fffdf5',
      foregroundColor: '#1e293b',
      cardColor: '#ffffff',
      mutedColor: '#94a3b8',
      accentColor: '#f59e0b',
      borderRadius: '24px',
      fontStyle: 'sans',
    },
    heroStyle: {
      layout: 'split',
      overlayOpacity: 0,
      textAlignment: 'right',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '1/1',
      showBadges: true,
      hoverEffect: 'zoom',
      borderStyle: 'bold',
    },
    productGrid: 'uniform-3col',
    cssClasses: {
      container: "max-w-7xl mx-auto px-4 md:px-8",
      hero: "min-h-[60vh] grid grid-cols-1 md:grid-cols-2 items-center bg-gradient-to-br from-[#fde68a] via-[#bfdbfe] to-[#fbcfe8]",
      card: "bg-white rounded-3xl p-3 border-2 border-[#2563eb]/15 hover:scale-[1.03] hover:border-[#f59e0b] transition-all duration-200",
      button: "bg-[#2563eb] text-white font-extrabold px-8 py-3 rounded-full text-base hover:bg-[#f59e0b] transition-colors",
      header: "sticky top-0 bg-white/90 backdrop-blur z-50 px-4 py-3 flex items-center justify-between rounded-b-3xl shadow-sm",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'spa-soft': {
    id: 'spa-soft',
    name: 'ורוד ועדין',
    description: 'ורוד עדין, חול וסייג׳ - רגוע ונקי עם טיפוגרפיה מעודנת',
    previewImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    theme: {
      primaryColor: '#9d7d6a',
      backgroundColor: '#faf5f2',
      foregroundColor: '#4b3f38',
      cardColor: '#ffffff',
      mutedColor: '#b3a79f',
      accentColor: '#c98f83',
      borderRadius: '10px',
      fontStyle: 'serif',
    },
    heroStyle: {
      layout: 'centered',
      overlayOpacity: 0.25,
      textAlignment: 'center',
      ctaStyle: 'outline',
    },
    productCardStyle: {
      aspectRatio: '3/4',
      showBadges: false,
      hoverEffect: 'lift',
      borderStyle: 'none',
    },
    productGrid: 'featured',
    cssClasses: {
      container: "max-w-5xl mx-auto px-6 md:px-12",
      hero: "min-h-[70vh] flex items-center justify-center relative bg-[#faf5f2]",
      card: "bg-white rounded-xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1 transition-transform duration-500",
      button: "border border-[#9d7d6a] text-[#9d7d6a] px-9 py-3 text-sm tracking-wide rounded-lg hover:bg-[#9d7d6a] hover:text-white transition-all",
      header: "sticky top-0 bg-[#faf5f2]/90 backdrop-blur z-50 px-6 py-4 flex items-center justify-between",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
  'fitness-bold': {
    id: 'fitness-bold',
    name: 'כהה ואנרגטי',
    description: 'שחור עמוק עם ליים אנרגטי - חד ודרמטי עם קונטרסט מקסימלי',
    previewImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    theme: {
      primaryColor: '#111111',
      backgroundColor: '#0f0f0f',
      foregroundColor: '#f5f5f5',
      cardColor: '#1a1a1a',
      mutedColor: '#9a9a9a',
      accentColor: '#c6ff00',
      borderRadius: '6px',
      fontStyle: 'sans',
    },
    heroStyle: {
      layout: 'full-image',
      overlayOpacity: 0.55,
      textAlignment: 'left',
      ctaStyle: 'solid',
    },
    productCardStyle: {
      aspectRatio: '1/1',
      showBadges: true,
      hoverEffect: 'zoom',
      borderStyle: 'bold',
    },
    productGrid: 'uniform-3col',
    cssClasses: {
      container: "max-w-7xl mx-auto px-4 md:px-8",
      hero: "h-[85vh] flex items-center relative overflow-hidden bg-black",
      card: "bg-[#1a1a1a] rounded-md p-3 border border-white/10 hover:border-[#c6ff00] transition-colors duration-200",
      button: "bg-[#c6ff00] text-black font-black uppercase px-9 py-3 text-sm tracking-wider rounded-md hover:brightness-110 transition-all",
      header: "sticky top-0 bg-black/90 backdrop-blur z-50 px-4 py-4 flex items-center justify-between border-b border-white/10",
    },
    defaultCategories: GENERIC_CATEGORIES,
  },
};

export function getTemplate(id?: StoreTemplateId): StoreTemplate {
  if (!id || !storeTemplates[id]) {
    return storeTemplates['luxury-boutique'];
  }
  return storeTemplates[id];
}

export const templateList = Object.values(storeTemplates);
