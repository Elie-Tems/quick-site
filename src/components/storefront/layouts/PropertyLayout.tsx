import { useState } from 'react';
import { MapPin, Phone, ArrowLeft, ChevronLeft } from 'lucide-react';
import StoreHeader from '@/components/storefront/StoreHeader';
import StoreBanners from '@/components/storefront/StoreBanners';
import StoreAbout from '@/components/storefront/StoreAbout';
import StoreReviews from '@/components/storefront/StoreReviews';
import StoreFooter from '@/components/storefront/StoreFooter';
import FloatingWhatsApp from '@/components/storefront/FloatingWhatsApp';
import FloatingCart from '@/components/storefront/FloatingCart';
import ProductDetailModal from '@/components/storefront/ProductDetailModal';
import type { StorefrontLayoutProps } from './StorefrontLayout.types';
import type { Product } from '@/components/storefront/StoreProducts';

/**
 * Property Grid layout:
 * Header → centered hero → featured listing (large) + side grid → about → reviews
 * Best for: real estate, portfolio, premium items.
 */
const PropertyLayout = ({
  businessName, businessSlug, logoUrl, phone, tagline, ctaText, heroTitle,
  heroImageUrl, heroBenefits, primaryColor, promoText, aboutText, whatsappEnabled,
  whatsappMessage, showMarqueeBar, businessCategory, reviewsCache, template, products,
  categories, selectedCategoryId, onSelectCategory, banners, cartItems,
  favoritesCount, onAddToCart, onUpdateQuantity, onRemoveFromCart, onCheckout,
  onNavigateToCart, onNavigateToFavorites, onScrollToProducts, onNavigateHome,
  favoriteIds, onToggleFavorite, hasPayment,
  verticalSlot,
}: StorefrontLayoutProps) => {
  const totalCartItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const pc = primaryColor || '#374151';

  const featured = products[0];
  const rest = products.slice(1);

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

        {/* Featured + side grid */}
        {verticalSlot}
        {/* Products section — hidden for real-estate businesses that use verticalSlot (listings board) instead */}
        {products.length > 0 && <section id="products" className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {products.length === 0 && (
              <p className="text-center text-muted-foreground py-16">אין פריטים להצגה כרגע</p>
            )}

            {featured && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Featured listing */}
                <button
                  onClick={() => setDetailProduct(featured)}
                  className="lg:col-span-2 text-right rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  <div className="aspect-[16/10] overflow-hidden relative">
                    {featured.imageUrl ? (
                      <img
                        src={featured.imageUrl}
                        alt={featured.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <MapPin className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div
                      className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: pc }}
                    >
                      מומלץ
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-1">{featured.name}</h3>
                    {featured.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{featured.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {featured.price > 0 && (
                        <span className="text-xl font-bold" style={{ color: pc }}>
                          ₪{featured.price.toLocaleString()}
                        </span>
                      )}
                      <span className="text-sm font-medium flex items-center gap-1" style={{ color: pc }}>
                        לפרטים <ChevronLeft className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </button>

                {/* Side grid */}
                <div className="flex flex-col gap-4">
                  {rest.slice(0, 3).map(product => (
                    <button
                      key={product.id}
                      onClick={() => setDetailProduct(product)}
                      className="text-right flex gap-3 rounded-xl border border-border bg-card p-3 hover:shadow-md transition-shadow group"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-foreground truncate">{product.name}</h4>
                        {product.price > 0 && (
                          <p className="text-sm font-medium mt-1" style={{ color: pc }}>
                            ₪{product.price.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}

                  {rest.length > 3 && (
                    <p className="text-sm text-center text-muted-foreground pt-2">
                      +{rest.length - 3} פריטים נוספים
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* All other listings in 2-col below */}
            {rest.length > 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                {rest.slice(3).map(product => (
                  <button
                    key={product.id}
                    onClick={() => setDetailProduct(product)}
                    className="text-right rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    <div className="aspect-[16/10] overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-1">{product.name}</h3>
                      {product.price > 0 && (
                        <span className="text-sm font-medium" style={{ color: pc }}>
                          ₪{product.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>}

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

      <ProductDetailModal
        product={detailProduct}
        isOpen={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={(p) => { onAddToCart(p); setDetailProduct(null); }}
        isFavorite={detailProduct ? favoriteIds.has(detailProduct.id) : false}
        onToggleFavorite={detailProduct ? () => onToggleFavorite(detailProduct.id) : undefined}
      />
    </>
  );
};

export default PropertyLayout;
