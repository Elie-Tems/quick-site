import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import StoreHeaderV2 from "@/components/storefront-v2/StoreHeaderV2";
import StoreHeroV2 from "@/components/storefront-v2/StoreHeroV2";
import StoreProductsV2 from "@/components/storefront-v2/StoreProductsV2";
import StoreFooterV2 from "@/components/storefront-v2/StoreFooterV2";
import StoreBannersV2 from "@/components/storefront-v2/StoreBannersV2";
import StoreCartPageV2 from "@/components/storefront-v2/StoreCartPageV2";
import StoreCheckoutV2 from "@/components/storefront-v2/StoreCheckoutV2";
import StoreFavoritesV2 from "@/components/storefront-v2/StoreFavoritesV2";
import StoreThankYouV2 from "@/components/storefront-v2/StoreThankYouV2";
import FloatingCart, { type CartItem } from "@/components/storefront/FloatingCart";
import FloatingWhatsApp from "@/components/storefront/FloatingWhatsApp";
import StoreSEO from "@/components/storefront/StoreSEO";
import AgeVerificationModal from "@/components/storefront/AgeVerificationModal";
import { useStorefront } from "@/hooks/useStorefront";
import { useActiveCampaign, useCampaignBanners, useCampaignProducts } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { BusinessCategory } from "@/lib/categoryConfig";
import { trackPageView } from "@/hooks/useAnalytics";
import { useCreateOrder } from "@/hooks/useOrders";

type ViewState = 'shopping' | 'checkout' | 'thankyou' | 'cart' | 'favorites';

const StoreFrontV2 = () => {
  const { slug } = useParams<{ slug: string }>();
  const { business, products, banners, categories, isLoading, isError, error } = useStorefront(slug);
  
  const { data: activeCampaign } = useActiveCampaign(business?.id);
  const { data: campaignBanners } = useCampaignBanners(activeCampaign?.id);
  const { data: campaignProducts } = useCampaignProducts(activeCampaign?.id);
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [viewState, setViewState] = useState<ViewState>('shopping');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [ageVerified, setAgeVerified] = useState(false);

  const addFavorite = (productId: string) => {
    setFavoriteIds((prev) => new Set(prev).add(productId));
  };
  const removeFavorite = (productId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };
  const toggleFavorite = (productId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const businessCategory = (business as any)?.business_category as BusinessCategory | undefined;
  const needsAgeVerification = businessCategory === "wine_alcohol";

  useEffect(() => {
    if (!business) return;
    trackPageView(business.id, 'storefront');
  }, [business]);

  const handleAddToCart = (product: any) => {
    const existingItem = cartItems.find((item) => item.productId === product.id);
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.image_url || product.imageUrl,
          quantity: 1,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems(cartItems.filter((item) => item.productId !== productId));
    } else {
      setCartItems(
        cartItems.map((item) => (item.productId === productId ? { ...item, quantity } : item))
      );
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const createOrder = useCreateOrder();
  const [orderData, setOrderData] = useState<any>(null);

  const handleCheckout = async (customerInfo: any) => {
    if (!business) return;

    const orderItems = cartItems.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      const result = await createOrder.mutateAsync({
        business_id: business.id,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || null,
        customer_address: customerInfo.address || null,
        delivery_method: customerInfo.deliveryMethod || 'pickup',
        items: orderItems,
        total,
        notes: customerInfo.notes || null,
      });

      setOrderData({
        orderId: result.id,
        customerName: customerInfo.name,
        total,
      });

      setCartItems([]);
      setViewState('thankyou');
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  const scrollToProducts = () => {
    const productsSection = document.getElementById('products');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">טוען את החנות...</p>
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">😕</div>
          <h1 className="text-2xl font-bold text-foreground">החנות לא נמצאה</h1>
          <p className="text-muted-foreground">
            {error?.message === 'SITE_NOT_PUBLISHED'
              ? 'החנות עדיין לא פורסמה. אנא פרסם את החנות מהדשבורד.'
              : 'לא הצלחנו למצוא את החנות שחיפשת.'}
          </p>
        </div>
      </div>
    );
  }

  if (needsAgeVerification && !ageVerified) {
    return (
      <AgeVerificationModal
        isOpen={true}
        onVerify={() => setAgeVerified(true)}
        businessName={business.name}
      />
    );
  }

  const storeProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    price: p.sale_price && p.is_on_sale ? p.sale_price : p.price,
    originalPrice: p.sale_price && p.is_on_sale ? p.price : undefined,
    imageUrl: p.image_url || undefined,
    active: p.active ?? true,
    isHot: p.is_hot || false,
    isSale: p.is_on_sale || false,
    sku: p.sku || undefined,
    categoryId: p.category_id || undefined,
    custom_fields: p.custom_fields || [],
  }));

  const storeProductsFiltered = selectedCategoryId
    ? storeProducts.filter((p) => p.categoryId === selectedCategoryId)
    : storeProducts;

  return (
    <>
      <Helmet>
        <title>{business.name}</title>
        <meta name="description" content={business.tagline || `קנה מ${business.name}`} />
      </Helmet>

      <StoreSEO 
        business={business} 
        products={storeProducts}
        storeUrl={`https://${import.meta.env.VITE_WEBSITE_URL}/store/${business.slug}`}
      />

      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <StoreHeaderV2
          businessName={business.name}
          logoUrl={business.logo_url || undefined}
          cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
          favoriteCount={favoriteIds.size}
          onCartClick={() => setViewState('cart')}
          onFavoritesClick={() => setViewState('favorites')}
          storeSlug={business.slug || undefined}
          onNavigateToProducts={() => {
            setViewState('shopping');
            setTimeout(() => {
              const section = document.getElementById('products');
              section?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />

        {viewState === 'shopping' && (
          <main>
            <StoreHeroV2
              businessName={business.name}
              tagline={business.tagline as string | null | undefined}
              ctaText={business.cta_text as string | null | undefined}
              heroTitle={business.hero_title as string | null | undefined}
              heroBadge={business.hero_badge || undefined}
              logoUrl={business.logo_url || undefined}
              heroImageUrl={business.hero_image_url || undefined}
              onScrollToProducts={scrollToProducts}
            />

            {banners.length > 0 && <StoreBannersV2 banners={banners} />}

            <StoreProductsV2
              products={storeProductsFiltered}
              categories={categories}
              onAddToCart={handleAddToCart}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
            />

            <StoreFooterV2 
              businessName={business.name}
              phone={business.phone || undefined}
              email={business.email || undefined}
              storeSlug={business.slug || undefined}
            />
          </main>
        )}

        {viewState === 'cart' && (
          <StoreCartPageV2
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveFromCart}
            onCheckout={() => setViewState('checkout')}
            onBack={() => setViewState('shopping')}
            hasPayment={business.payment_enabled || false}
          />
        )}

        {viewState === 'favorites' && (
          <StoreFavoritesV2
            products={storeProducts.filter((p) => favoriteIds.has(p.id))}
            onAddToCart={handleAddToCart}
            onRemoveFavorite={removeFavorite}
            onBack={() => setViewState('shopping')}
          />
        )}

        {viewState === 'checkout' && (
          <StoreCheckoutV2
            items={cartItems}
            hasPayment={business.payment_enabled || false}
            businessId={business.id}
            deliveryMode={business.delivery_mode as 'pickup_only' | 'pickup_and_delivery' | undefined}
            deliveryFee={business.delivery_fee}
            onSubmit={handleCheckout}
            onBack={() => setViewState('cart')}
          />
        )}

        {viewState === 'thankyou' && orderData && (
          <StoreThankYouV2
            orderNumber={orderData.orderId}
            customerName={orderData.customerName}
            total={orderData.total}
            onContinueShopping={() => {
              setViewState('shopping');
              setOrderData(null);
            }}
            businessName={business.name}
          />
        )}

        {viewState === 'shopping' && (
          <>
            <FloatingCart
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveFromCart}
              onCheckout={() => setViewState('checkout')}
              hasPayment={business.payment_enabled || false}
            />
            {business.whatsapp_enabled && business.phone && (
              <FloatingWhatsApp phone={business.phone} businessName={business.name} />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default StoreFrontV2;
