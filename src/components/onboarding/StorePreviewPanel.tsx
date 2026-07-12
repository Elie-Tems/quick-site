import { useMemo, useEffect, useRef, useState } from 'react';
import { OnboardingData } from '@/pages/Onboarding';
import { buildTemplate, type StoreLayoutId } from '@/lib/storeTemplates';
import { type ColorPaletteId } from '@/lib/colorPalettes';
import { ClassicLayout, ServiceLayout, PropertyLayout, MarketLayout, BoutiqueLayout, BeautySpaLayout, HomeProLayout, CharityLayout } from '@/components/storefront/layouts';
import type { StorefrontLayoutProps } from '@/components/storefront/layouts/StorefrontLayout.types';
import type { Product } from '@/components/storefront/StoreProducts';

const NOOP = () => {};
const INNER_W = 1100;

// Demo product names per business category, used when user hasn't added products yet
const DEMO_BY_CATEGORY: Record<string, { names: string[]; prices: string[] }> = {
  bakery:     { names: ['לחם כפרי', 'עוגת שוקולד', 'קרואסון חמאה', 'עוגיות שיבולת שועל', 'בגט פריז', 'מאפה גבינה'], prices: ['18', '95', '12', '32', '14', '22'] },
  restaurant: { names: ['סלט קיסר', 'המבורגר ביף', 'פסטה ארביאטה', 'פיצה מרגריטה', 'שניצל וינאי', 'קינוח שוקולד'], prices: ['52', '89', '72', '65', '84', '38'] },
  cafe:       { names: ['קפה אמריקאו', 'לאטה וניל', 'ספייסי לאטה', 'קרואסון שוקולד', 'עוגת גבינה', 'טוסט אבוקדו'], prices: ['16', '22', '24', '18', '42', '38'] },
  clothing:   { names: ['חולצה לבנה', 'ג\'ינס כחול', 'שמלת קיץ', 'מעיל עור', 'סריג בז\'', 'מכנסי פשתן'], prices: ['149', '299', '249', '599', '199', '189'] },
  jewelry:    { names: ['שרשרת זהב', 'עגילי יהלום', 'צמיד כסף', 'טבעת אמרלד', 'תליון לב', 'ברסלט זהב'], prices: ['890', '2400', '450', '1800', '650', '980'] },
  beauty:     { names: ['קרם פנים', 'שמפו ארגן', 'ליפגלוס ורוד', 'מסכת לחות', 'פרפיום ורד', 'סרום ויטמין C'], prices: ['89', '65', '42', '78', '195', '128'] },
  home:       { names: ['כרית דקורטיבית', 'מנורת שולחן', 'שטיח ברבר', 'מראה קיר', 'פרחים מלאכותיים', 'נר ריחני'], prices: ['89', '245', '450', '320', '78', '55'] },
  default:    { names: ['מוצר א', 'מוצר ב', 'מוצר ג', 'מוצר ד', 'מוצר ה', 'מוצר ו'], prices: ['99', '149', '79', '199', '129', '89'] },
};

const FALLBACK_IMAGES: Record<string, string[]> = {
  bakery:     ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80','https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80','https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80','https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&q=80','https://images.unsplash.com/photo-1464219551459-ac14ae01fbe0?w=600&q=80'],
  restaurant: ['https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&q=80','https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80','https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80','https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80','https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80'],
  cafe:       ['https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=600&q=80','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80','https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&q=80','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80','https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=600&q=80'],
  clothing:   ['https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80','https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80','https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80','https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80','https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=600&q=80'],
  jewelry:    ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80','https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600&q=80','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80','https://images.unsplash.com/photo-1601121141461-9d6647bef0a1?w=600&q=80','https://images.unsplash.com/photo-1561828995-aa79a2db86dd?w=600&q=80'],
  home:       ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80','https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&q=80','https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&q=80','https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&q=80','https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=600&q=80'],
  beauty:     ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80','https://images.unsplash.com/photo-1560066984-138daaa83f0d?w=600&q=80','https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80','https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80','https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80'],
  default:    ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80','https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80','https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80','https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'],
};

function getFallbackImage(category: string | undefined, index: number): string {
  const pool = FALLBACK_IMAGES[category ?? ''] ?? FALLBACK_IMAGES.default;
  return pool[index % pool.length];
}

const hexToHsl = (hex: string): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '0 0% 0%';
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

interface Props {
  data: OnboardingData;
  layoutId: StoreLayoutId;
  paletteId: ColorPaletteId;
  /** Render at full natural width — no scale transform */
  fullscreen?: boolean;
}

const StorePreviewPanel = ({ data, layoutId, paletteId, fullscreen = false }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setScale(containerRef.current.offsetWidth / INNER_W);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Object URL for logo File
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  useEffect(() => {
    if (!(data.logo instanceof File)) { setLogoUrl(undefined); return; }
    const url = URL.createObjectURL(data.logo);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [data.logo]);

  // Convert product File images → object URLs
  const products: Product[] = useMemo(() => {
    const blobUrls: string[] = [];
    const cat = data.businessCategory ?? 'default';

    // When user hasn't added products yet — show 6 realistic demo items so the
    // preview looks like a real store instead of an empty skeleton.
    if (!data.products || data.products.length === 0) {
      const demo = DEMO_BY_CATEGORY[cat] ?? DEMO_BY_CATEGORY.default;
      return Array.from({ length: 6 }, (_, idx) => ({
        id: `demo-${idx}`,
        name: demo.names[idx] ?? `מוצר ${idx + 1}`,
        price: demo.prices[idx] ?? '99',
        description: '',
        imageUrl: getFallbackImage(cat, idx),
        active: true,
        isSale: idx === 1,
        isHot: idx === 0,
        categoryId: undefined,
      }));
    }

    const result = data.products.map((p, idx): Product => {
      let imageUrl = p.imageUrl;
      if (!imageUrl && p.image instanceof File) {
        imageUrl = URL.createObjectURL(p.image);
        blobUrls.push(imageUrl);
      }
      if (!imageUrl) imageUrl = getFallbackImage(cat, idx);
      return {
        id: p.id || `prev-${Math.random()}`,
        name: p.name,
        price: p.price,
        description: p.description,
        imageUrl,
        active: true,
        isSale: false,
        isHot: false,
        categoryId: p.categoryId,
      };
    });
    // Revoke on next memo run
    return Object.assign(result, { _blobs: blobUrls });
  }, [data.products, data.businessCategory]);

  useEffect(() => {
    const blobs = (products as any)._blobs as string[] | undefined;
    return () => blobs?.forEach(u => URL.revokeObjectURL(u));
  }, [products]);

  const template = useMemo(() => buildTemplate(layoutId, paletteId), [layoutId, paletteId]);

  // For 'custom' palette, the palette itself is a fallback (bw-classic) and the
  // real color lives in extractedBranding.primaryColor.
  const effectivePrimaryColor =
    (paletteId === 'custom' ? data.extractedBranding?.primaryColor : null)
    || template.theme.primaryColor;

  // CSS vars scoped to this container so the layout colors don't bleed into onboarding UI
  const cssVars = useMemo((): React.CSSProperties => {
    try {
      return {
        '--primary':    hexToHsl(effectivePrimaryColor),
        '--background': hexToHsl(template.theme.backgroundColor),
        '--foreground': hexToHsl(template.theme.foregroundColor),
        '--card':       hexToHsl(template.theme.cardColor),
        '--muted':      hexToHsl(template.theme.mutedColor),
        '--accent':     hexToHsl(template.theme.accentColor),
      } as React.CSSProperties;
    } catch {
      return {};
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, effectivePrimaryColor]);

  const layoutProps: StorefrontLayoutProps = {
    businessName: data.businessName || 'שם העסק שלכם',
    businessSlug: 'preview',
    logoUrl,
    phone: data.phone || '',
    tagline: data.tagline || data.extractedBranding?.suggestedTagline || 'ברוכים הבאים לחנות שלנו',
    heroTitle: data.heroTitle,
    aboutText: data.aboutText,
    heroBenefits: data.heroBenefits,
    promoText: data.promoText,
    heroImageUrl: data.extractedBranding?.heroImageUrl,
    primaryColor: effectivePrimaryColor,
    template,
    products,
    categories: data.productCategories.length
      ? data.productCategories.map(c => ({ id: c.id, name: c.name }))
      : [{ id: 'demo-cat', name: 'מוצרים' }],
    selectedCategoryId: null,
    onSelectCategory: NOOP,
    banners: [],
    cartItems: [],
    favoritesCount: 0,
    onAddToCart: NOOP,
    onUpdateQuantity: NOOP,
    onRemoveFromCart: NOOP,
    onCheckout: NOOP,
    onNavigateToCart: NOOP,
    onNavigateToFavorites: NOOP,
    onScrollToProducts: NOOP,
    onNavigateHome: NOOP,
    favoriteIds: new Set(),
    onToggleFavorite: NOOP,
    hasPayment: false,
    showMarqueeBar: false,
    businessCategory: data.businessCategory,
  };

  const LayoutComponent =
    layoutId === 'service'    ? ServiceLayout :
    layoutId === 'property'   ? PropertyLayout :
    layoutId === 'market'     ? MarketLayout :
    layoutId === 'boutique'   ? BoutiqueLayout :
    layoutId === 'beauty-spa' ? BeautySpaLayout :
    layoutId === 'home-pro'   ? HomeProLayout :
    layoutId === 'charity'    ? CharityLayout :
    ClassicLayout;

  // Fullscreen mode: render at natural width, no scale
  if (fullscreen) {
    return (
      <div style={{ position: 'relative', ...cssVars }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
        <LayoutComponent {...layoutProps} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden"
      style={{
        width: '100%',
        height: Math.round(680 * scale),
        ...cssVars,
      }}
    >
      {/* Click blocker — preview is read-only */}
      <div className="absolute inset-0 z-10" />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: INNER_W,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <LayoutComponent {...layoutProps} />
      </div>
    </div>
  );
};

export default StorePreviewPanel;
