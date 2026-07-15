import { Phone, ArrowLeft } from 'lucide-react';
import StoreHeader from '@/components/storefront/StoreHeader';
import StoreBanners from '@/components/storefront/StoreBanners';
import StoreAbout from '@/components/storefront/StoreAbout';
import StoreReviews from '@/components/storefront/StoreReviews';
import StoreFooter from '@/components/storefront/StoreFooter';
import FloatingWhatsApp from '@/components/storefront/FloatingWhatsApp';
import type { StorefrontLayoutProps } from './StorefrontLayout.types';

/**
 * Property Grid layout (real-estate / lead vertical):
 * Header → centered hero → listings board (lead capture) → about → reviews.
 *
 * This is a LEAD-based storefront, never e-commerce. The property listings and
 * their contact/lead forms are rendered by `verticalSlot` (ListingsBoard) - a
 * real-estate store captures a lead, it never adds a property "to cart". So this
 * layout intentionally renders NO products grid, NO add-to-cart and NO cart.
 */
const PropertyLayout = ({
  businessName, businessSlug, logoUrl, phone, tagline, ctaText, heroTitle,
  heroImageUrl, primaryColor, promoText, aboutText, whatsappEnabled,
  whatsappMessage, showMarqueeBar, businessCategory, reviewsCache,
  categories, selectedCategoryId, onSelectCategory, banners,
  favoritesCount, onNavigateToCart, onNavigateToFavorites, onScrollToProducts,
  onNavigateHome, verticalSlot,
}: StorefrontLayoutProps) => {
  const pc = primaryColor || '#374151';

  return (
    <>
      <StoreHeader
        businessName={businessName}
        logoUrl={logoUrl}
        phone={phone}
        showMarqueeBar={showMarqueeBar ?? false}
        whatsappEnabled={whatsappEnabled ?? false}
        cartItemsCount={0}
        favoritesCount={favoritesCount}
        promoText={promoText}
        primaryColor={primaryColor}
        businessCategory={businessCategory}
        storeCategories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
        aboutPath={`/store/${businessSlug}/about`}
        onNavigateHome={onNavigateHome}
        onScrollToProducts={onScrollToProducts}
        onNavigateToFavorites={onNavigateToFavorites}
        onNavigateToCart={onNavigateToCart}
      />

      <main dir="rtl">
        {/* Centered hero */}
        <section
          className="relative flex items-end justify-start min-h-[50vh] px-8 md:px-16 pb-12 overflow-hidden"
        >
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt={businessName}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${pc} 0%, ${pc}88 100%)` }} />
          )}
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 max-w-xl">
            <p className="text-white/70 text-xs uppercase tracking-widest mb-2">{businessName}</p>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
              {heroTitle || tagline || businessName}
            </h1>
            <button
              onClick={onScrollToProducts}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white border border-white/40 hover:bg-white/10 transition-colors backdrop-blur-sm"
            >
              {ctaText || 'צפו בנכסים'} <ArrowLeft className="inline w-4 h-4 mr-1" />
            </button>
          </div>
        </section>

        {banners.length > 0 && <StoreBanners banners={banners} />}

        {/* Property listings + lead capture (ListingsBoard). This is the whole
            point of a real-estate storefront - a lead, not a cart. The id lets
            the hero CTA scroll here. */}
        <div id="products">{verticalSlot}</div>

        {phone && (
          <section className="py-10 px-4 text-center border-t border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">מעוניינים לשמוע עוד?</h3>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: pc }}
            >
              <Phone className="w-4 h-4" /> {phone}
            </a>
          </section>
        )}

        {aboutText && <StoreAbout aboutText={aboutText} businessName={businessName} />}
        <StoreReviews cache={reviewsCache ?? null} primaryColor={primaryColor} />
      </main>

      <StoreFooter businessName={businessName} phone={phone} storeSlug={businessSlug} />

      {phone && whatsappEnabled && (
        <FloatingWhatsApp phone={phone} message={whatsappMessage} businessName={businessName} />
      )}
    </>
  );
};

export default PropertyLayout;
