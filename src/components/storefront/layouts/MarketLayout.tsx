import StoreHeader from '@/components/storefront/StoreHeader';
import StoreBanners from '@/components/storefront/StoreBanners';
import StorePromoPopup from '@/components/storefront/StorePromoPopup';
import StoreProducts from '@/components/storefront/StoreProducts';
import StoreAbout from '@/components/storefront/StoreAbout';
import StoreReviews from '@/components/storefront/StoreReviews';
import StoreFooter from '@/components/storefront/StoreFooter';
import FloatingCart from '@/components/storefront/FloatingCart';
import FloatingWhatsApp from '@/components/storefront/FloatingWhatsApp';
import NewsletterSignup from '@/components/storefront/NewsletterSignup';
import type { StorefrontLayoutProps } from './StorefrontLayout.types';

/**
 * Market layout:
 * Compact header → slim hero banner → prominent category tabs → 4-col dense product grid
 * Best for: broad product catalogs, grocery, multi-category stores.
 */
const MarketLayout = ({
  businessName, businessSlug, logoUrl, phone, tagline, ctaText, heroTitle,
  heroImageUrl, primaryColor, promoText, aboutText, heroBenefits, whatsappEnabled, whatsappMessage,
  showMarqueeBar, businessCategory, reviewsCache, template, products, categories,
  selectedCategoryId, onSelectCategory, banners, campaignPopup, cartItems, favoritesCount,
  onAddToCart, onUpdateQuantity, onRemoveFromCart, onCheckout, onNavigateToCart,
  onNavigateToFavorites, onScrollToProducts, onNavigateHome, favoriteIds, onToggleFavorite,
  hasPayment,
  customLabels, verticalSlot,
}: StorefrontLayoutProps) => {
  const totalCartItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const pc = primaryColor || '#6b21a8';

  return (
    <>
      <StoreHeader
        businessName={businessName}
        logoUrl={logoUrl}
        phone={phone}
        showMarqueeBar={showMarqueeBar ?? true}
        whatsappEnabled={whatsappEnabled ?? false}
        cartItemsCount={totalCartItems}
        favoritesCount={favoritesCount}
        promoText={promoText}
        primaryColor={primaryColor}
        businessCategory={businessCategory}
        storeCategories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={onSelectCategory}
        onScrollToAbout={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
        onNavigateHome={onNavigateHome}
        onScrollToProducts={onScrollToProducts}
        onNavigateToFavorites={onNavigateToFavorites}
        onNavigateToCart={onNavigateToCart}
      />

      <main dir="rtl">
        {/* Slim banner hero */}
        <section
          className="relative flex items-center px-6 md:px-16 py-10 overflow-hidden"
          style={{
            background: heroImageUrl
              ? undefined
              : `linear-gradient(135deg, ${pc} 0%, ${pc}99 100%)`,
          }}
        >
          {heroImageUrl && (
            <>
              <img
                src={heroImageUrl}
                alt={businessName}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50" />
            </>
          )}
          <div className="relative z-10">
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-1">
              {heroTitle || businessName}
            </h1>
            {tagline && (
              <p className="text-sm text-white/80 mb-3">{tagline}</p>
            )}
            {heroBenefits && heroBenefits.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {heroBenefits.slice(0, 4).map((b, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs border border-white/25">{b}</span>
                ))}
              </div>
            )}
          </div>
        </section>

        {banners.length > 0 && <StoreBanners banners={banners} />}

        {campaignPopup?.enabled && (campaignPopup.title || campaignPopup.text) && (
          <StorePromoPopup
            title={campaignPopup.title}
            text={campaignPopup.text}
            ctaText={campaignPopup.ctaText}
            ctaUrl={campaignPopup.ctaUrl}
            imageUrl={campaignPopup.imageUrl}
          />
        )}

        {/* Prominent category tabs */}
        {categories.length > 0 && (
          <div className="sticky top-16 z-30 bg-background border-b border-border">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
                <button
                  onClick={() => onSelectCategory(null)}
                  className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                  style={
                    selectedCategoryId === null
                      ? { backgroundColor: pc, color: '#fff' }
                      : { backgroundColor: 'transparent', color: 'var(--foreground)' }
                  }
                >
                  הכל
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                    style={
                      selectedCategoryId === cat.id
                        ? { backgroundColor: pc, color: '#fff' }
                        : { backgroundColor: 'transparent', color: 'var(--foreground)' }
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dense 4-col product grid */}
        {verticalSlot}
        <section id="products" className="py-6 px-4">
          <div className="max-w-7xl mx-auto">
            <StoreProducts
              products={products}
              onAddToCart={onAddToCart}
              favoriteIds={favoriteIds}
              onToggleFavorite={onToggleFavorite}
              productCardStyle={template.productCardStyle}
              productGrid="4col"
              sectionTitle={customLabels?.productsTitle}
            />
          </div>
        </section>

        {aboutText && <StoreAbout aboutText={aboutText} businessName={businessName} />}
        <StoreReviews cache={reviewsCache ?? null} primaryColor={primaryColor} />
        <NewsletterSignup businessId={businessSlug} primaryColor={primaryColor} />
      </main>

      <StoreFooter businessName={businessName} phone={phone} storeSlug={businessSlug} />

      <FloatingCart
        items={cartItems}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemoveFromCart}
        onCheckout={onCheckout}
        hasPayment={hasPayment}
      />

      {phone && whatsappEnabled && (
        <FloatingWhatsApp phone={phone} message={whatsappMessage} businessName={businessName} />
      )}
    </>
  );
};

export default MarketLayout;
