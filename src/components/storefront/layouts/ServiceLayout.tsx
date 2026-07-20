import { Phone, MessageCircle, ArrowLeft } from 'lucide-react';
import StoreHeader from '@/components/storefront/StoreHeader';
import StoreBanners from '@/components/storefront/StoreBanners';
import StorePromoPopup from '@/components/storefront/StorePromoPopup';
import StoreAbout from '@/components/storefront/StoreAbout';
import StoreReviews from '@/components/storefront/StoreReviews';
import StoreFooter from '@/components/storefront/StoreFooter';
import FloatingWhatsApp from '@/components/storefront/FloatingWhatsApp';
import FloatingCart from '@/components/storefront/FloatingCart';
import type { StorefrontLayoutProps } from './StorefrontLayout.types';
import type { Product } from '@/components/storefront/StoreProducts';
import ProductDetailModal from '@/components/storefront/ProductDetailModal';
import { useState } from 'react';

/**
 * Service Card layout:
 * Sticky header → split hero (text right, image left) → service cards 2-col → about → reviews
 * Best for: service providers, nonprofits, portfolios.
 * Services = products rendered as large feature cards instead of a product grid.
 */
const ServiceLayout = ({
  businessName, businessSlug, logoUrl, phone, tagline, ctaText, heroTitle,
  heroImageUrl, heroBenefits, primaryColor, promoText, aboutText, whatsappEnabled,
  whatsappMessage, showMarqueeBar, businessCategory, reviewsCache, template, products,
  categories, selectedCategoryId, onSelectCategory, banners, campaignPopup, cartItems,
  favoritesCount, onAddToCart, onUpdateQuantity, onRemoveFromCart, onCheckout,
  onNavigateToCart, onNavigateToFavorites, onScrollToProducts, onNavigateHome,
  favoriteIds, onToggleFavorite, hasPayment, customLabels, verticalSlot, hasCommerce = true,
}: StorefrontLayoutProps) => {
  // ServiceLayout is the shared default for services/vacation (which DO sell via cart)
  // AND nonprofit/synagogue (which never write to the orders table) - so cart/checkout
  // chrome must be gated on the business's actual commerce module, not shown unconditionally.
  const totalCartItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const pc = primaryColor || '#0077b6';

  return (
    <>
      <StoreHeader
        businessName={businessName}
        logoUrl={logoUrl}
        phone={phone}
        showMarqueeBar={showMarqueeBar ?? false}
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
        onNavigateToFavorites={hasCommerce ? onNavigateToFavorites : undefined}
        onNavigateToCart={hasCommerce ? onNavigateToCart : undefined}
      />

      <main dir="rtl">
        {/* Split hero */}
        <section
          className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh]"
          style={{ backgroundColor: `${pc}0d` }}
        >
          {/* Text side */}
          <div className="flex flex-col justify-center px-8 md:px-16 py-16 order-2 md:order-1">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: pc }}
            >
              {businessName}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              {heroTitle || tagline || businessName}
            </h1>
            {tagline && heroTitle && (
              <p className="text-lg text-muted-foreground mb-8 max-w-md">{tagline}</p>
            )}
            {heroBenefits && heroBenefits.length > 0 && (
              <ul className="space-y-2 mb-8">
                {heroBenefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                      style={{ backgroundColor: pc }}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onScrollToProducts}
                className="px-7 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: pc }}
              >
                {ctaText || 'לשירותים שלנו'} <ArrowLeft className="inline w-4 h-4 mr-1" />
              </button>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="px-7 py-3 rounded-full text-sm font-semibold border transition-colors hover:bg-muted"
                  style={{ borderColor: pc, color: pc }}
                >
                  <Phone className="inline w-4 h-4 ml-1" />
                  {phone}
                </a>
              )}
            </div>
          </div>

          {/* Image side */}
          <div className="order-1 md:order-2 min-h-[300px] md:min-h-full relative overflow-hidden">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={businessName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: `${pc}1a` }}
              >
                <span className="text-8xl opacity-20" aria-hidden="true">🛎</span>
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

        {/* Per-vertical experience (booking / listings) - right after the hero. */}
        {verticalSlot && <section className="py-8 px-4"><div className="max-w-5xl mx-auto">{verticalSlot}</div></section>}

        {/* Service cards grid. Gated on hasCommerce (not just the cart/checkout
            controls further down) - nonprofit/synagogue businesses have
            hasCommerce=false and their real content is the donation verticalSlot
            above; showing a priced product grid with no way to buy anything is
            both confusing and mislabels a donation-based storefront as a shop. */}
        {hasCommerce && (
        <section id="products" className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl font-semibold text-center text-foreground mb-2"
            >
              {customLabels?.productsTitle || "השירותים שלנו"}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-10">
              {tagline || ''}
            </p>

            {products.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-base">השירותים יתעדכנו בקרוב</p>
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => setDetailProduct(product)}
                  className="text-right rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {product.imageUrl && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-semibold text-foreground">{product.name}</h3>
                      {product.price > 0 && (
                        <span
                          className="text-sm font-semibold shrink-0 px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: pc }}
                        >
                          ₪{product.price}
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                    <div
                      className="mt-4 text-sm font-medium flex items-center gap-1"
                      style={{ color: pc }}
                    >
                      לפרטים נוספים <ArrowLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Contact strip */}
        {phone && (
          <section
            className="py-12 px-4 text-center"
            style={{ backgroundColor: `${pc}0d` }}
          >
            <h3 className="text-xl font-semibold text-foreground mb-2">{customLabels?.ctaTitle || "מוכנים להתחיל?"}</h3>
            <p className="text-sm text-muted-foreground mb-6">צרו קשר ונשמח לעזור</p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: pc }}
              >
                <Phone className="w-4 h-4" /> {phone}
              </a>
              <a
                href={`https://wa.me/972${phone.replace(/^0/, '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border transition-colors hover:bg-muted"
                style={{ borderColor: pc, color: pc }}
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" /> WhatsApp
              </a>
            </div>
          </section>
        )}

        {aboutText && <StoreAbout aboutText={aboutText} businessName={businessName} />}
        <StoreReviews cache={reviewsCache ?? null} primaryColor={primaryColor} />
      </main>

      <StoreFooter businessName={businessName} phone={phone} storeSlug={businessSlug} showOrders={hasCommerce} />

      {hasCommerce && (
        <FloatingCart
          items={cartItems}
          onUpdateQuantity={onUpdateQuantity}
          onRemove={onRemoveFromCart}
          onCheckout={onCheckout}
          hasPayment={hasPayment}
        />
      )}

      {phone && whatsappEnabled && (
        <FloatingWhatsApp phone={phone} message={whatsappMessage} businessName={businessName} />
      )}

      <ProductDetailModal
        product={detailProduct}
        isOpen={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={hasCommerce ? (p) => { onAddToCart(p); setDetailProduct(null); } : undefined}
        isFavorite={detailProduct ? favoriteIds.has(detailProduct.id) : false}
        onToggleFavorite={detailProduct ? () => onToggleFavorite(detailProduct.id) : undefined}
      />
    </>
  );
};

export default ServiceLayout;
