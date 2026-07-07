import { useMemo, useEffect, useRef, useState } from 'react';
import { OnboardingData } from '@/pages/Onboarding';
import { buildTemplate, type StoreLayoutId } from '@/lib/storeTemplates';
import { type ColorPaletteId } from '@/lib/colorPalettes';
import { ClassicLayout, ServiceLayout, PropertyLayout, MarketLayout, BoutiqueLayout, BeautySpaLayout, HomeProLayout, CharityLayout } from '@/components/storefront/layouts';
import type { StorefrontLayoutProps } from '@/components/storefront/layouts/StorefrontLayout.types';
import type { Product } from '@/components/storefront/StoreProducts';

const NOOP = () => {};
const INNER_W = 1100;

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
    const result = data.products.map((p): Product => {
      let imageUrl = p.imageUrl;
      if (!imageUrl && p.image instanceof File) {
        imageUrl = URL.createObjectURL(p.image);
        blobUrls.push(imageUrl);
      }
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
  }, [data.products]);

  useEffect(() => {
    const blobs = (products as any)._blobs as string[] | undefined;
    return () => blobs?.forEach(u => URL.revokeObjectURL(u));
  }, [products]);

  const template = useMemo(() => buildTemplate(layoutId, paletteId), [layoutId, paletteId]);

  // CSS vars scoped to this container so the layout colors don't bleed into onboarding UI
  const cssVars = useMemo((): React.CSSProperties => {
    try {
      return {
        '--primary':    hexToHsl(template.theme.primaryColor),
        '--background': hexToHsl(template.theme.backgroundColor),
        '--foreground': hexToHsl(template.theme.foregroundColor),
        '--card':       hexToHsl(template.theme.cardColor),
        '--muted':      hexToHsl(template.theme.mutedColor),
        '--accent':     hexToHsl(template.theme.accentColor),
      } as React.CSSProperties;
    } catch {
      return {};
    }
  }, [template]);

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
    primaryColor: template.theme.primaryColor,
    template,
    products,
    categories: data.productCategories.map(c => ({ id: c.id, name: c.name })),
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
