import StoreHeader from '@/components/storefront/StoreHeader';
import StoreHero from '@/components/storefront/StoreHero';
import StoreBanners from '@/components/storefront/StoreBanners';
import StorePromoPopup from '@/components/storefront/StorePromoPopup';
import StoreProducts from '@/components/storefront/StoreProducts';
import StoreAbout from '@/components/storefront/StoreAbout';
import StoreReviews from '@/components/storefront/StoreReviews';
import StoreFooter from '@/components/storefront/StoreFooter';
import NewsletterSignup from '@/components/storefront/NewsletterSignup';
import FloatingCart from '@/components/storefront/FloatingCart';
import FloatingWhatsApp from '@/components/storefront/FloatingWhatsApp';
import type { StorefrontLayoutProps } from './StorefrontLayout.types';

/**
 * Classic Store layout:
 * Full header ג†’ full-width hero ג†’ banners ג†’ 3-col product grid ג†’ about ג†’ footer
 * The universal default ג€” works for any product-focused business.
 */
const ClassicLayout = ({
  businessName, businessSlug, logoUrl, phone, tagline, ctaText, heroTitle, heroBadge,
  heroImageUrl, heroBenefits, primaryColor, promoText, aboutText, whatsappEnabled,
  whatsappMessage, showMarqueeBar, businessCategory, reviewsCache, template, products,
  categories, selectedCategoryId, onSelectCategory, banners, campaignPopup, cartItems,
  favoritesCount, onAddToCart, onUpdateQuantity, onRemoveFromCart, onCheckout,
  onNavigateToCart, onNavigateToFavorites, onScrollToProducts, onNavigateHome,
  favoriteIds, onToggleFavorite, hasPayment,
  customLabels, verticalSlot,
}: StorefrontLayoutProps) => {
  const totalCartItems = cartItems.reduce((s, i) => s + i.quantity, 0);

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

      <main>
        <StoreHero
          businessName={businessName}
          tagline={tagline}
          ctaText={ctaText}
          heroTitle={heroTitle}
          heroBadge={heroBadge}
          heroImageUrl={heroImageUrl}
          heroBenefits={heroBenefits}
          primaryColor={primaryColor}
          businessCategory={businessCategory}
          heroStyle={template.heroStyle}
          onCtaClick={onScrollToProducts}
        />

        {banners.length > 0 && <StoreBanners banners={banners} />}

        {campaignPopup?.enabled && campaignPopup.campaignId && (campaignPopup.title || campaignPopup.text) && (
          <StorePromoPopup
            campaignId={campaignPopup.campaignId}
            title={campaignPopup.title}
            text={campaignPopup.text}
            ctaText={campaignPopup.ctaText}
            ctaUrl={campaignPopup.ctaUrl}
            couponCode={campaignPopup.couponCode}
            accent={campaignPopup.accent}
          />
        )}

        {verticalSlot}
        <section id="products" className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <StoreProducts
              products={products}
              onAddToCart={onAddToCart}
              favoriteIds={favoriteIds}
              onToggleFavorite={onToggleFavorite}
              productCardStyle={template.productCardStyle}
              productGrid={template.productGrid}
              sectionTitle={customLabels?.productsTitle}
            />
          </div>
        </section>

        {aboutText && <StoreAbout aboutText={aboutText} businessName={businessName} />}

        <StoreReviews cache={reviewsCache ?? null} primaryColor={primaryColor} />
        <NewsletterSignup businessId={businessSlug} primaryColor={primaryColor} />
      </main>

      <StoreFooter
        businessName={businessName}
        phone={phone}
        storeSlug={businessSlug}
      />

      <FloatingCart
        items={cartItems}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemoveFromCart}
        onCheckout={onCheckout}
        hasPayment={hasPayment}
      />

      {phone && whatsappEnabled && (
        <FloatingWhatsApp
          phone={phone}
          message={whatsappMessage}
          businessName={businessName}
        />
      )}
    </>
  );
};

export default ClassicLayout;
