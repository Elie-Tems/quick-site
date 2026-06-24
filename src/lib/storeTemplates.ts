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
  | 'royal-purple';

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

export const storeTemplates: Record<StoreTemplateId, StoreTemplate> = {
  'luxury-boutique': {
    id: 'luxury-boutique',
    name: 'בוטיק יוקרתי',
    description: 'עיצוב אלגנטי ומינימליסטי למותגי פרימיום',
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
    cssClasses: {
      container: "max-w-6xl mx-auto px-8 md:px-16",
      hero: "h-screen flex items-center justify-center relative overflow-hidden",
      card: "bg-white group hover:-translate-y-1 transition-transform duration-500",
      button: "border border-[#d4af37] text-[#d4af37] px-10 py-3 text-xs tracking-[0.15em] hover:bg-[#d4af37] hover:text-black transition-all",
      header: "fixed top-0 w-full bg-black/90 backdrop-blur-sm z-50 py-4 px-8",
    },
    defaultCategories: [
      { name: 'תכשיטים', description: 'טבעות, שרשראות וצמידים' },
      { name: 'שעונים', description: 'שעוני יוקרה' },
      { name: 'אביזרי יוקרה', description: 'אופטיקה ואביזרים' },
      { name: 'עגילים', description: 'עגילים ותליונים' },
      { name: 'צמידים', description: 'צמידים וענבלים' },
      { name: 'מתנות יוקרה', description: 'מתנות ומזכרות פרימיום' },
    ],
  },
  'bold-playful': {
    id: 'bold-playful',
    name: 'נועז ושובב',
    description: 'עיצוב דינמי ואנרגטי למותגי נוער ורחוב',
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
    defaultCategories: [
      { name: 'אופנת רחוב', description: 'בגדים ואביזרים אורבניים' },
      { name: 'סניקרס', description: 'נעלי ספורט ואופנה' },
      { name: 'אקססוריז', description: 'תיקים, כובעים ותכשיטים' },
      { name: 'חולצות', description: 'טישרטים וסווטשירטים' },
      { name: 'מכנסיים', description: 'ג\'ינסים ומכנסי ספורט' },
      { name: 'ג\'קטים', description: 'מעילים וג\'קטים' },
    ],
  },
  'natural-organic': {
    id: 'natural-organic',
    name: 'טבעי ואורגני',
    description: 'עיצוב רגוע ואדמתי למוצרים טבעיים ובריאותיים',
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
    cssClasses: {
      container: "max-w-5xl mx-auto px-4 md:px-8",
      hero: "min-h-[60vh] bg-[#4a7c59] flex flex-col items-center justify-center text-center px-6 py-20",
      card: "bg-white rounded-xl border border-[#d4c5a9] overflow-hidden hover:-translate-y-1 transition-transform duration-300",
      button: "bg-[#f5f0e8] text-[#4a7c59] font-semibold px-7 py-3 rounded-full hover:bg-white transition-colors text-sm",
      header: "sticky top-0 bg-[#f5f0e8] border-b border-[#d4c5a9] px-4 py-3 z-50",
    },
    defaultCategories: [
      { name: 'מזון אורגני', description: 'מזון טבעי ובריא' },
      { name: 'טיפוח טבעי', description: 'קוסמטיקה אורגנית' },
      { name: 'אקו-אביזרים', description: 'אביזרים ידידותיים לסביבה' },
      { name: 'תבלינים ותה', description: 'תבלינים, תה וקפה אורגני' },
      { name: 'חטיפים בריאים', description: 'חטיפים ומזונות על' },
      { name: 'מתכלים', description: 'כלי אוכל וכלים מתכלים' },
    ],
  },
  'tech-minimal': {
    id: 'tech-minimal',
    name: 'טכנולוגי ומינימלי',
    description: 'עיצוב כהה ומדויק לחנויות אלקטרוניקה וגאדג\'טים',
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
    cssClasses: {
      container: "max-w-7xl mx-auto px-4 md:px-8",
      hero: "min-h-[65vh] bg-[#1e2433] grid md:grid-cols-2 items-center gap-8 px-8 md:px-16",
      card: "bg-[#1e2433] border border-[#334155] rounded-sm hover:border-[#3b82f6] hover:-translate-y-0.5 transition-all duration-200",
      button: "bg-[#3b82f6] text-white px-6 py-2.5 rounded-sm text-sm font-semibold hover:bg-[#2563eb] transition-colors tracking-wide",
      header: "sticky top-0 bg-[#0a0a0f] border-b border-[#1e2433] px-6 py-3 z-50",
    },
    defaultCategories: [
      { name: 'גאדג\'טים', description: 'מכשירים וטכנולוגיה' },
      { name: 'אודיו', description: 'אוזניות, רמקולים ועוד' },
      { name: 'אביזרים', description: 'אביזרים נלווים' },
      { name: 'שעונים חכמים', description: 'שעונים וטכנולוגיה נישאת' },
      { name: 'מחשבים וטאבלטים', description: 'מחשבים, טאבלטים ואביזרים' },
      { name: 'מצלמות', description: 'מצלמות וציוד צילום' },
    ],
  },
  'vintage-warm': {
    id: 'vintage-warm',
    name: 'וינטג׳ וחם',
    description: 'עיצוב חמים ואותנטי לחנויות מלאכת יד ומוצרים נוסטלגיים',
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
    defaultCategories: [
      { name: 'מלאכת יד', description: 'מוצרים בעבודת יד' },
      { name: 'וינטג׳', description: 'פריטים וינטג\' ונוסטלגיים' },
      { name: 'קרמיקה', description: 'כלי קרמיקה וחרס' },
      { name: 'טקסטיל', description: 'בדים ורקמות' },
      { name: 'תכשיטים בעבודת יד', description: 'תכשיטים מעוצבים' },
      { name: 'מתנות אישיות', description: 'מתנות מותאמות אישית' },
    ],
  },
  'ocean-breeze': {
    id: 'ocean-breeze',
    name: 'רוח ים',
    description: 'גוונים כחולים רגועים, תחושה רעננה',
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
    defaultCategories: [
      { name: 'ים וחוף', description: 'אביזרים לחוף וים' },
      { name: 'ספורט ימי', description: 'ציוד ופעילות' },
      { name: 'בריכה', description: 'אביזרי בריכה' },
      { name: 'בגדי ים', description: 'בגדי ים ומגבות' },
      { name: 'ציוד צלילה', description: 'צלילה ושנורקלינג' },
      { name: 'סירות וקייאקים', description: 'ציוד שיט' },
    ],
  },
  'warm-sunset': {
    id: 'warm-sunset',
    name: 'שקיעה חמה',
    description: 'כתומים וחומים חמימים, אווירה ביתית',
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
    defaultCategories: [
      { name: 'דקורציה לבית', description: 'אביזרים ועיצוב הבית' },
      { name: 'טקסטיל', description: 'כריות, שמיכות ומצעים' },
      { name: 'נרות וריח', description: 'נרות ריחניים ואביזרים' },
      { name: 'כלי בית', description: 'כלי מטבח ועיצוב' },
      { name: 'גן ומרפסת', description: 'צמחים ואביזרי חוץ' },
      { name: 'מתנות לבית', description: 'מתנות ועיצוב' },
    ],
  },
  'urban-chic': {
    id: 'urban-chic',
    name: 'אורבני שיק',
    description: 'אפורים מתוחכמים עם נגיעת זהב',
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
    defaultCategories: [
      { name: 'נעליים', description: 'נעליים וסניקרס' },
      { name: 'ביגוד', description: 'בגדים ואופנה' },
      { name: 'אקססוריז', description: 'תיקים, חגורות ואביזרים' },
      { name: 'חולצות', description: 'חולצות וטופים' },
      { name: 'מכנסיים', description: 'מכנסיים וחצאיות' },
      { name: 'שמלות', description: 'שמלות ובגדי ערב' },
    ],
  },
  'fresh-mint': {
    id: 'fresh-mint',
    name: 'מנטה רעננה',
    description: 'ירוק בהיר ורענן, מושלם לבריאות וספורט',
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
    defaultCategories: [
      { name: 'ספורט', description: 'ציוד ספורט וכושר' },
      { name: 'בריאות', description: 'תזונה וויטמינים' },
      { name: 'יוגה ומדיטציה', description: 'אביזרים ומשטחים' },
      { name: 'ריצה', description: 'נעלי ריצה וציוד' },
      { name: 'משקולות וכוח', description: 'ציוד חדר כושר' },
      { name: 'תזונת ספורט', description: 'חלבונים ותוספים' },
    ],
  },
  'royal-purple': {
    id: 'royal-purple',
    name: 'סגול מלכותי',
    description: 'יוקרתי ודרמטי, מושלם לתכשיטים ואביזרים',
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
    defaultCategories: [
      { name: 'תכשיטים', description: 'טבעות, עגילים ושרשראות' },
      { name: 'אביזרים', description: 'תיקים, שעונים ואביזרים' },
      { name: 'מתנות', description: 'מתנות ומזכרות' },
      { name: 'עגילים', description: 'עגילים ותליונים' },
      { name: 'שעונים', description: 'שעונים קלאסיים' },
      { name: 'מתנות פרימיום', description: 'מתנות יוקרתיות' },
    ],
  },
};

export function getTemplate(id?: StoreTemplateId): StoreTemplate {
  if (!id || !storeTemplates[id]) {
    return storeTemplates['luxury-boutique'];
  }
  return storeTemplates[id];
}

export const templateList = Object.values(storeTemplates);
