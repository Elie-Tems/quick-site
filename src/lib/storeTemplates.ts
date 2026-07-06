import { ColorPaletteId, colorPalettes } from './colorPalettes';

export type StoreLayoutId = 'classic' | 'service' | 'property' | 'market';

/**
 * Backward-compat alias so existing code referencing StoreTemplateId still compiles.
 * New code should use StoreLayoutId + ColorPaletteId separately.
 */
export type StoreTemplateId = StoreLayoutId | ColorPaletteId | string;

export interface StoreLayout {
  id: StoreLayoutId;
  name: string;
  description: string;
  previewImage: string;
  /** Which business types this layout suits best */
  suitedFor: Array<'products' | 'services' | 'realestate' | 'nonprofit'>;
  /** Default color palette for this layout */
  defaultPalette: ColorPaletteId;
}

export interface StoreTemplate {
  id: StoreTemplateId;
  name: string;
  description: string;
  previewImage: string;
  layoutId: StoreLayoutId;
  paletteId: ColorPaletteId;
  theme: {
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
  productGrid?: 'uniform-3col' | 'featured' | '2col' | '4col' | string;
  defaultCategories?: Array<{ name: string; description?: string }>;
  cssClasses?: {
    container: string;
    hero: string;
    card: string;
    button: string;
    header: string;
  };
}

export const storeLayouts: Record<StoreLayoutId, StoreLayout> = {
  classic: {
    id: 'classic',
    name: 'Classic Store',
    description: 'Header + hero banner + גריד 3 עמודות. הפריסה הכי מוכרת לחנויות.',
    previewImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04',
    suitedFor: ['products'],
    defaultPalette: 'bw-classic',
  },
  service: {
    id: 'service',
    name: 'Service Card',
    description: 'Hero split + כרטיסי שירות בגריד. מתאים לנותני שירות ועמותות.',
    previewImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136',
    suitedFor: ['services', 'nonprofit'],
    defaultPalette: 'cool-ocean',
  },
  property: {
    id: 'property',
    name: 'Property Grid',
    description: 'נכס מרכזי גדול + גריד צדדי. מתאים לנדל"ן ותיקי עבודות.',
    previewImage: 'https://images.unsplash.com/photo-1495121553079-4c61bcce1894',
    suitedFor: ['realestate'],
    defaultPalette: 'slate-orange',
  },
  market: {
    id: 'market',
    name: 'Market',
    description: 'טאבים לפי קטגוריה + גריד 4 עמודות. מתאים לחנויות עם מגוון רחב.',
    previewImage: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475',
    suitedFor: ['products'],
    defaultPalette: 'bold-violet',
  },
};

export const layoutList = Object.values(storeLayouts);

const GENERIC_CATEGORIES = [
  { name: 'חדש', description: 'מוצרים שנוספו לאחרונה' },
  { name: 'מומלצים', description: 'הפריטים הפופולריים' },
  { name: 'מבצעים', description: 'הנחות ומחירים מיוחדים' },
  { name: 'קולקציה', description: 'מבחר הפריטים שלנו' },
  { name: 'מתנות', description: 'רעיונות למתנה' },
  { name: 'הכל', description: 'כל הפריטים בחנות' },
];

/**
 * Build a StoreTemplate from a layout + palette combo.
 * This is the canonical factory used by the new template picker.
 */
export function buildTemplate(layoutId: StoreLayoutId, paletteId: ColorPaletteId): StoreTemplate {
  const layout = storeLayouts[layoutId];
  const palette = colorPalettes[paletteId] ?? colorPalettes['bw-classic'];

  const heroLayouts: Record<StoreLayoutId, StoreTemplate['heroStyle']> = {
    classic: { layout: 'full-image', overlayOpacity: 0.45, textAlignment: 'center', ctaStyle: 'outline' },
    service: { layout: 'split', overlayOpacity: 0, textAlignment: 'right', ctaStyle: 'solid' },
    property: { layout: 'centered', overlayOpacity: 0.3, textAlignment: 'center', ctaStyle: 'solid' },
    market: { layout: 'split', overlayOpacity: 0, textAlignment: 'right', ctaStyle: 'solid' },
  };

  const cardStyles: Record<StoreLayoutId, StoreTemplate['productCardStyle']> = {
    classic: { aspectRatio: '3/4', showBadges: false, hoverEffect: 'lift', borderStyle: 'none' },
    service: { aspectRatio: '1/1', showBadges: true, hoverEffect: 'lift', borderStyle: 'subtle' },
    property: { aspectRatio: '4/3', showBadges: true, hoverEffect: 'zoom', borderStyle: 'subtle' },
    market: { aspectRatio: '1/1', showBadges: true, hoverEffect: 'zoom', borderStyle: 'none' },
  };

  const grids: Record<StoreLayoutId, StoreTemplate['productGrid']> = {
    classic: 'uniform-3col',
    service: '2col',
    property: 'featured',
    market: '4col',
  };

  return {
    id: `${layoutId}-${paletteId}`,
    name: `${layout.name} · ${palette.name}`,
    description: layout.description,
    previewImage: layout.previewImage,
    layoutId,
    paletteId,
    theme: palette.theme,
    heroStyle: heroLayouts[layoutId],
    productCardStyle: cardStyles[layoutId],
    productGrid: grids[layoutId],
    defaultCategories: GENERIC_CATEGORIES,
  };
}

/**
 * Legacy template map — kept for backward compat with existing DB records
 * that stored a StoreTemplateId like 'luxury-boutique'.
 * Maps old IDs → nearest layout + palette.
 */
const LEGACY_MAP: Record<string, { layoutId: StoreLayoutId; paletteId: ColorPaletteId }> = {
  'luxury-boutique':  { layoutId: 'classic',  paletteId: 'midnight-gold' },
  'bold-playful':     { layoutId: 'classic',  paletteId: 'bold-violet' },
  'natural-organic':  { layoutId: 'classic',  paletteId: 'sage-green' },
  'tech-minimal':     { layoutId: 'classic',  paletteId: 'dark-lime' },
  'vintage-warm':     { layoutId: 'classic',  paletteId: 'warm-earth' },
  'ocean-breeze':     { layoutId: 'classic',  paletteId: 'cool-ocean' },
  'warm-sunset':      { layoutId: 'classic',  paletteId: 'coral-cream' },
  'urban-chic':       { layoutId: 'classic',  paletteId: 'slate-orange' },
  'fresh-mint':       { layoutId: 'classic',  paletteId: 'sage-green' },
  'royal-purple':     { layoutId: 'classic',  paletteId: 'bold-violet' },
  'editorial-mono':   { layoutId: 'classic',  paletteId: 'bw-classic' },
  'bakery-warm':      { layoutId: 'market',   paletteId: 'warm-earth' },
  'kids-pop':         { layoutId: 'market',   paletteId: 'bold-violet' },
  'spa-soft':         { layoutId: 'service',  paletteId: 'rose-soft' },
  'fitness-bold':     { layoutId: 'classic',  paletteId: 'dark-lime' },
};

/**
 * getTemplate — drop-in replacement for the old function.
 * Accepts old IDs, new "layoutId-paletteId" combos, or bare layout IDs.
 */
export function getTemplate(id?: string): StoreTemplate {
  if (!id) return buildTemplate('classic', 'bw-classic');

  // New composite ID: "classic-bw-classic"
  // Split on first dash that matches a known layout
  for (const layoutId of Object.keys(storeLayouts) as StoreLayoutId[]) {
    if (id === layoutId) return buildTemplate(layoutId, storeLayouts[layoutId].defaultPalette);
    if (id.startsWith(`${layoutId}-`)) {
      const paletteId = id.slice(layoutId.length + 1) as ColorPaletteId;
      if (colorPalettes[paletteId]) return buildTemplate(layoutId, paletteId);
    }
  }

  // Legacy ID
  const mapped = LEGACY_MAP[id];
  if (mapped) return buildTemplate(mapped.layoutId, mapped.paletteId);

  return buildTemplate('classic', 'bw-classic');
}

// Legacy export so old imports of `storeTemplates` still resolve
export const storeTemplates: Record<string, StoreTemplate> = Object.fromEntries(
  Object.keys(LEGACY_MAP).map(id => {
    const m = LEGACY_MAP[id];
    return [id, buildTemplate(m.layoutId, m.paletteId)];
  })
);

export const templateList = Object.values(storeTemplates);
