import { useState, useEffect, useRef, useMemo } from "react";
import { gtm } from "@/lib/gtm";
import { cleanImageUrl, cleanImageList } from "@/lib/imageUrl";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Store, ShieldCheck, ExternalLink, ArrowRight } from "lucide-react";
import StoreHeader from "@/components/storefront/StoreHeader";
import StoreHero from "@/components/storefront/StoreHero";
import StoreBanners from "@/components/storefront/StoreBanners";
import StorePromoPopup from "@/components/storefront/StorePromoPopup";
import StoreProducts from "@/components/storefront/StoreProducts";
import StorefrontVertical from "@/components/storefront/StorefrontVertical";
import StoreAbout from "@/components/storefront/StoreAbout";
import FloatingCart, { type CartItem } from "@/components/storefront/FloatingCart";
import FloatingWhatsApp from "@/components/storefront/FloatingWhatsApp";
import StoreCheckout from "@/components/storefront/StoreCheckout";
import StoreThankYou from "@/components/storefront/StoreThankYou";
import StoreCartPage from "@/components/storefront/StoreCartPage";
import StoreFavorites from "@/components/storefront/StoreFavorites";
import StoreFooter from "@/components/storefront/StoreFooter";
import NewsletterSignup from "@/components/storefront/NewsletterSignup";
import StoreSEO from "@/components/storefront/StoreSEO";
import AgeVerificationModal from "@/components/storefront/AgeVerificationModal";
import { useStorefront } from "@/hooks/useStorefront";
import { useStoreTracking } from "@/components/storefront/StoreTracking";
import StoreReviews from "@/components/storefront/StoreReviews";
import { useIsShabbatNow } from "@/hooks/useIsShabbatNow";
import { useActiveCampaign, useCampaignBanners, useCampaignProducts } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { BusinessCategory } from "@/lib/categoryConfig";
import { trackPageView, trackEvent } from "@/hooks/useAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useCreateOrder } from "@/hooks/useOrders";
import { startPayplusPayment } from "@/hooks/usePayplus";
import { toast } from "sonner";
import { getTemplate, type StoreTemplateId } from "@/lib/storeTemplates";
import { getStoreFont, loadStoreFonts } from "@/lib/storeFonts";
import {
  ClassicLayout, ServiceLayout, PropertyLayout, MarketLayout,
  BoutiqueLayout, BeautySpaLayout, HomeProLayout, CharityLayout,
  type StorefrontLayoutProps,
} from "@/components/storefront/layouts";

type ViewState = 'shopping' | 'checkout' | 'thankyou' | 'cart' | 'favorites';

const StoreFront = ({ slugOverride }: { slugOverride?: string } = {}) => {
  const params = useParams<{ slug: string }>();
  // On a tenant subdomain (aurora.siango.app) the slug comes from the host,
  // not the path; fall back to the route param for /store/:slug.
  const slug = slugOverride ?? params.slug;
  const { business, products, banners, categories, isLoading, isError, error } = useStorefront(slug);
  const { data: isShabbatNow } = useIsShabbatNow((business as any)?.shabbat_mode === true);
  
  // Fetch active campaign data
  const { data: activeCampaign } = useActiveCampaign(business?.id);
  const { data: campaignBanners } = useCampaignBanners(activeCampaign?.id);
  const { data: campaignProducts } = useCampaignProducts(activeCampaign?.id);

  // Merchant's own marketing tags (paid add-on) - injected into their store.
  const b = business as any;
  useStoreTracking({
    paid: b?.tracking_paid,
    gtmId: b?.tracking_gtm_id,
    ga4Id: b?.tracking_ga4_id,
    metaPixel: b?.tracking_meta_pixel,
    googleAds: b?.tracking_google_ads,
    tiktokPixel: b?.tracking_tiktok_pixel,
    customHead: b?.tracking_custom_head,
  });
  
  // If this store is not published, redirect the owner to the payment flow.
  // Must be in useEffect — never call window.location inside render.
  const isUnpublishedError = isError && error instanceof Error && error.message === 'SITE_NOT_PUBLISHED';
  useEffect(() => {
    if (!isUnpublishedError) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) window.location.replace('/publish-payment');
    });
  }, [isUnpublishedError]);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [viewState, setViewState] = useState<ViewState>('shopping');
  // Hosted payment page URL, shown in an on-site iframe so the customer stays on Siango.
  const [paymentIframeUrl, setPaymentIframeUrl] = useState<string | null>(null);
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

  // Check if this is an alcohol/wine business that needs age verification
  const businessCategory = (business as any)?.business_category as BusinessCategory | undefined;
  const needsAgeVerification = businessCategory === "wine_alcohol";

  // Load template based on business template_id
  const template = useMemo(() => {
    return getTemplate(business?.template_id as StoreTemplateId);
  }, [business?.template_id]);

  // Apply dynamic theme colors from template
  useEffect(() => {
    if (!business || !template) return;
    
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    try {
      // Apply all template theme colors
      const primaryHsl = hexToHsl(template.theme.primaryColor);
      const backgroundHsl = hexToHsl(template.theme.backgroundColor);
      const foregroundHsl = hexToHsl(template.theme.foregroundColor);
      const cardHsl = hexToHsl(template.theme.cardColor);
      const mutedHsl = hexToHsl(template.theme.mutedColor);
      const accentHsl = hexToHsl(template.theme.accentColor);
      
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--background', backgroundHsl);
      root.style.setProperty('--foreground', foregroundHsl);
      root.style.setProperty('--card', cardHsl);
      root.style.setProperty('--muted', mutedHsl);
      root.style.setProperty('--accent', accentHsl);
      root.style.setProperty('--ring', primaryHsl);
      
      // Apply border radius
      root.style.setProperty('--radius', template.theme.borderRadius);
      
      // Apply font style via body class
      document.body.classList.remove('font-sans', 'font-serif', 'font-mixed');
      if (template.theme.fontStyle === 'serif') {
        document.body.classList.add('font-serif');
      } else if (template.theme.fontStyle === 'mixed') {
        document.body.classList.add('font-mixed');
      } else {
        document.body.classList.add('font-sans');
      }

      // Per-store custom fonts (heading + body) - override the template default.
      const headingFont = getStoreFont((business as any).font_heading);
      const bodyFont = getStoreFont((business as any).font_body);
      if (headingFont || bodyFont) {
        loadStoreFonts((business as any).font_heading, (business as any).font_body);
        if (bodyFont) document.body.style.fontFamily = bodyFont.family;
        const styleEl = document.getElementById('store-font-style') || document.head.appendChild(Object.assign(document.createElement('style'), { id: 'store-font-style' }));
        styleEl.textContent = headingFont
          ? `body h1, body h2, body h3, body h4 { font-family: ${headingFont.family} !important; }`
          : '';
      }
    } catch (e) {
      console.error('Invalid color format:', e);
    }
    
    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--gradient-start');
      root.style.removeProperty('--gradient-end');
      document.body.style.removeProperty('font-family');
      document.getElementById('store-font-style')?.remove();
    };
  }, [business, template]);

  // Track page view when business loads
  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (business?.id && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackPageView(business.id, `/store/${slug}`);
    }
  }, [business?.id, slug]);

  // Scroll to top when view changes
  useEffect(() => {
    if (viewState !== 'shopping') {
      window.scrollTo(0, 0);
    }
  }, [viewState]);

  // Transform products based on campaign display mode - must run before any early return (Rules of Hooks)
  const storeProducts = useMemo(() => {
    const baseProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      price: p.is_on_sale && p.sale_price ? p.sale_price : p.price,
      originalPrice: p.is_on_sale && p.sale_price ? p.price : undefined,
      imageUrl: cleanImageUrl(p.image_url),
      additionalImages: cleanImageList(p.additional_images),
      active: p.active ?? true,
      sku: p.sku || undefined,
      isSale: p.is_on_sale || false,
      isHot: p.is_hot || false,
      categoryId: p.category_id || undefined,
      custom_fields: p.custom_fields || [],
    }));

    // If no active campaign, return regular products
    if (!activeCampaign || !campaignProducts || campaignProducts.length === 0) {
      return baseProducts;
    }

    // Transform campaign products
    const campaignProductsList = campaignProducts
      .filter(cp => cp.active)
      .map(cp => {
        if (cp.is_campaign_only) {
          // Campaign-only product
          return {
            id: cp.id,
            name: cp.name || '',
            description: cp.description || undefined,
            price: cp.sale_price ?? cp.price,
            originalPrice: cp.sale_price ? cp.price : undefined,
            imageUrl: cleanImageUrl(cp.image_url),
            active: true,
            isSale: !!cp.sale_price,
            isHot: false,
            custom_fields: [],
          };
        } else {
          // Linked regular product
          const linkedProduct = baseProducts.find(p => p.id === cp.product_id);
          return linkedProduct || null;
        }
      })
      .filter(Boolean) as typeof baseProducts;

    // Apply display mode
    switch (activeCampaign.display_mode) {
      case 'replace':
        // Only campaign products
        return campaignProductsList;
      case 'add':
        // Merge campaign products with regular products (campaign at end)
        const campaignOnlyIds = new Set(campaignProducts.filter(cp => cp.is_campaign_only).map(cp => cp.id));
        const linkedProductIds = new Set(campaignProducts.filter(cp => !cp.is_campaign_only && cp.product_id).map(cp => cp.product_id));
        // Add campaign-only products to regular products, excluding already linked ones
        const regularWithoutLinked = baseProducts.filter(p => !linkedProductIds.has(p.id));
        const campaignOnlyProducts = campaignProductsList.filter(p => campaignOnlyIds.has(p.id));
        return [...regularWithoutLinked, ...campaignOnlyProducts];
      case 'prioritize':
        // Campaign products first, then regular products (excluding duplicates)
        const campaignIds = new Set(campaignProducts.filter(cp => !cp.is_campaign_only && cp.product_id).map(cp => cp.product_id));
        const campaignOnlyPrioIds = new Set(campaignProducts.filter(cp => cp.is_campaign_only).map(cp => cp.id));
        const remainingProducts = baseProducts.filter(p => !campaignIds.has(p.id));
        return [...campaignProductsList, ...remainingProducts.filter(p => !campaignOnlyPrioIds.has(p.id))];
      default:
        return baseProducts;
    }
  }, [products, activeCampaign, campaignProducts]);

  // Filter products by selected category (when using store categories)
  const storeProductsFiltered = useMemo(() => {
    if (!selectedCategoryId) return storeProducts;
    return storeProducts.filter((p: { categoryId?: string }) => p.categoryId === selectedCategoryId);
  }, [storeProducts, selectedCategoryId]);

  // Transform banners based on campaign display mode
  const storeBanners = useMemo(() => {
    const baseBanners = banners.map(b => ({
      id: b.id,
      title: b.title || undefined,
      text: b.text || undefined,
      imageUrl: cleanImageUrl(b.image_url),
      ctaText: b.cta_text || undefined,
      ctaUrl: b.cta_url || undefined,
    }));

    // If no active campaign or no campaign banners, return regular banners
    if (!activeCampaign || !campaignBanners || campaignBanners.length === 0) {
      return baseBanners;
    }

    // Transform campaign banners
    const campaignBannersList = campaignBanners
      .filter(cb => cb.active)
      .map(cb => ({
        id: cb.id,
        title: cb.title || undefined,
        text: cb.text || undefined,
        imageUrl: cleanImageUrl(cb.image_url),
        ctaText: cb.cta_text || undefined,
        ctaUrl: cb.cta_url || undefined,
      }));

    // Apply display mode
    switch (activeCampaign.display_mode) {
      case 'replace':
        return campaignBannersList;
      case 'add':
        return [...baseBanners, ...campaignBannersList];
      case 'prioritize':
        return [...campaignBannersList, ...baseBanners];
      default:
        return baseBanners;
    }
  }, [banners, activeCampaign, campaignBanners]);

  const createOrder = useCreateOrder();

  // Handle the redirect back from the PayPlus hosted payment page.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("payment");
    if (!p) return;
    if (p === "success") {
      setCartItems([]);
      setViewState("thankyou");
    } else if (p === "failed" || p === "cancelled") {
      toast.error("התשלום לא הושלם. אפשר לנסות שוב.");
      setViewState("checkout");
    }
    const url = new URL(window.location.href);
    ["payment", "order"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Loading state - after all hooks so hook order is stable
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">טוען את החנות...</p>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (isError || !business) {
    const isSuspended = error instanceof Error && error.message === 'SITE_SUSPENDED';

    // Owner arrived at their own unpublished store → useEffect above redirects them.
    if (isUnpublishedError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Store className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isSuspended ? 'האתר אינו זמין כעת' : 'החנות לא נמצאה'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isSuspended
              ? 'האתר מושהה זמנית. אנא נסו שוב מאוחר יותר.'
              : 'לא הצלחנו למצוא חנות בכתובת הזו. ייתכן שהיא הוסרה או שהכתובת שגויה.'
            }
          </p>
          <Button onClick={() => window.location.href = '/'}>
            חזרה לדף הבית
          </Button>
        </div>
      </div>
    );
  }

  // Shabbat mode: the merchant chose to close the store on Shabbat/Yom Tov.
  if ((business as any).shabbat_mode && isShabbatNow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
        <div className="max-w-md text-center">
          {business.logo_url && (
            <img src={business.logo_url} alt={business.name} className="h-16 w-auto mx-auto mb-6" />
          )}
          <div className="text-5xl mb-4">🕯️</div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{business.name}</h1>
          <p className="text-xl text-muted-foreground mb-1">החנות סגורה בשבת</p>
          <p className="text-muted-foreground">נשמח לראותכם שוב בצאת השבת 🙏</p>
        </div>
      </div>
    );
  }

  // A cart LINE is a (product, variant) pair - the same product in a different
  // color/size is a separate line. Products without variants: cartLineId === id.
  type Variant = { id: string; color: string | null; size: string | null; price_override: number | null };
  const lineKeyOf = (item: { cartLineId?: string; id: string }) => item.cartLineId ?? item.id;

  const handleAddToCart = (product: typeof storeProducts[0], variant?: Variant) => {
    const cartLineId = `${product.id}::${variant?.id ?? ""}`;
    setCartItems(prev => {
      const existing = prev.find(item => lineKeyOf(item) === cartLineId);
      if (existing) {
        return prev.map(item =>
          lineKeyOf(item) === cartLineId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        ...product,
        quantity: 1,
        cartLineId,
        price: variant?.price_override ?? product.price,
        variantId: variant?.id ?? null,
        variantColor: variant?.color ?? null,
        variantSize: variant?.size ?? null,
      }];
    });
    trackEvent(business.id, "add_to_cart", { productId: product.id, value: variant?.price_override ?? product.price });
  };

  const handleUpdateQuantity = (cartLineId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(cartLineId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        lineKeyOf(item) === cartLineId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (cartLineId: string) => {
    setCartItems(prev => prev.filter(item => lineKeyOf(item) !== cartLineId));
  };

  const handleCheckout = () => {
    trackEvent(business.id, "begin_checkout", {
      value: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    });
    setViewState('checkout');
  };

  const handleSubmitOrder = async (
    data: { fullName: string; phone: string; email: string; notes: string; deliveryAddress?: string; deliveryMethod?: 'pickup' | 'delivery' },
    couponId?: string,
    total?: number
  ) => {
    const orderTotal = total ?? cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Online payment enabled → create the order server-side and hand off to the
    // PayPlus hosted payment page. The customer returns via ?payment=success.
    if (business.payment_enabled) {
      try {
        const link = await startPayplusPayment({
          businessId: business.id,
          slug: business.slug ?? undefined,
          items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity, variant_id: item.variantId ?? undefined, variant_color: item.variantColor ?? undefined, variant_size: item.variantSize ?? undefined })),
          customer: { fullName: data.fullName, phone: data.phone, email: data.email },
          notes: data.notes || undefined,
          deliveryMethod: data.deliveryMethod,
          deliveryAddress: data.deliveryAddress,
          couponId,
        });
        // Show the hosted payment page in an on-site iframe (customer stays on Siango).
        // The gateway's success_url (?payment=success) escapes the frame to the top window.
        setPaymentIframeUrl(link);
      } catch (e: any) {
        toast.error("שגיאה במעבר לתשלום: " + (e?.message || "נסו שוב"));
        // Re-throw so the checkout does NOT show the "order received" success
        // screen when the payment never went through.
        throw e;
      }
      // Signal the checkout NOT to flash "order received" - the iframe now owns the flow.
      return { redirected: true };
    }

    try {
      await createOrder.mutateAsync({
        order: {
          business_id: business.id,
          customer_name: data.fullName,
          customer_phone: data.phone,
          customer_email: data.email,
          notes: data.notes || null,
          total_price: orderTotal,
          delivery_method: data.deliveryMethod ?? null,
          delivery_fee:
            data.deliveryMethod === 'delivery'
              ? ((business as any).delivery_fee ?? null)
              : null,
          delivery_address:
            data.deliveryMethod === 'delivery' ? (data.deliveryAddress || null) : null,
          status: 'pending',
        },
        items: cartItems.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          price_at_order: item.price,
          quantity: item.quantity,
          variant_id: item.variantId ?? null,
          variant_color: item.variantColor ?? null,
          variant_size: item.variantSize ?? null,
        })),
        businessName: business.name,
        businessEmail: business.email ?? null,
        businessPhone: business.phone ?? null,
      });
      trackEvent(business.id, "purchase", { value: orderTotal });
      gtm.purchase(orderTotal);
      // Customer order confirmation, sent FROM the merchant (reply-to the merchant).
      if (data.email) {
        supabase.functions
          .invoke("send-platform-email", {
            body: {
              type: "orderConfirmationCustomer",
              to: data.email,
              businessId: business.id,
              merchant: {
                storeName: business.name,
                email: business.email || undefined,
                storeUrl: `https://${import.meta.env.VITE_WEBSITE_URL}/store/${business.slug}`,
                brandColor: (business as any).primary_color || undefined,
                logoUrl: business.logo_url || undefined,
              },
              order: {
                firstName: data.fullName?.split(" ")[0],
                orderTotal,
                items: cartItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
                // Send the confirmation in the shopper's current language.
                lang: document.documentElement.lang || "he",
              },
            },
          })
          .catch(() => {});
      }
      setCartItems([]);
      setViewState('thankyou');
    } catch {
      // Toast already shown by useCreateOrder onError
    }
  };

  const handleContinueShopping = () => {
    setViewState('shopping');
  };

  const goToShopping = () => setViewState('shopping');
  const scrollToProductsSection = () => {
    setViewState('shopping');
    setTimeout(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Hosted payment page in an on-site iframe (the customer never leaves Siango). The
  // gateway's success_url (?payment=success&order=…) navigates the TOP window out of
  // the frame, back to the storefront which handles the success param. The fallback
  // link does a full-page redirect if the gateway refuses to be framed.
  if (paymentIframeUrl) {
    return (
      <div dir="rtl" className="min-h-screen bg-background flex flex-col">
        <div className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setPaymentIframeUrl(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="w-4 h-4" /> חזרה
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground">תשלום מאובטח</h1>
          <div className="w-[64px]" />
        </div>
        <div className="w-full max-w-4xl mx-auto grow flex px-4 pb-6">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg flex flex-col w-full">
            <div className="px-4 py-3 border-b border-border bg-primary/5 text-sm font-medium text-foreground text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> תשלום מאובטח - פרטי האשראי נשמרים אצל חברת הסליקה בלבד
            </div>
            <iframe
              title="תשלום מאובטח"
              src={paymentIframeUrl}
              className="w-full grow min-h-[min(80vh,820px)] border-0 bg-white"
              allow="payment *"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-top-navigation-by-user-activation"
            />
            <div className="px-4 py-3 border-t border-border bg-muted/20 text-center">
              <a href={paymentIframeUrl} target="_top" rel="noopener" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ExternalLink className="w-4 h-4" /> התשלום לא נטען? המשיכו לעמוד הסליקה
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Checkout view
  if (viewState === 'checkout') {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <StoreCheckout
          items={cartItems}
          hasPayment={business.payment_enabled ?? false}
          businessId={business.id}
          businessName={business.name}
          deliveryMode={(business as any).delivery_mode as 'pickup_only' | 'pickup_and_delivery' | undefined}
          deliveryFee={(business as any).delivery_fee ?? null}
          onSubmit={handleSubmitOrder}
          onBack={() => setViewState('shopping')}
          onIdentify={(email, name) => {
            // Abandoned-cart capture: record the cart when a valid email is entered.
            supabase.functions.invoke("email-track-cart", {
              body: {
                businessId: business.id, email, name,
                items: cartItems.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
                total: cartItems.reduce((s, it) => s + it.price * it.quantity, 0),
              },
            }).catch(() => {});
          }}
        />
      </>
    );
  }

  // Thank you view
  if (viewState === 'thankyou') {
    return (
      <StoreThankYou
        hasPayment={business.payment_enabled ?? false}
        paymentSuccess={true}
        businessPhone={business.phone || undefined}
        onContinueShopping={handleContinueShopping}
      />
    );
  }

  // Cart page
  if (viewState === 'cart') {
    return (
      <>
        <StoreHeader
          businessName={business.name}
          logoUrl={business.logo_url || undefined}
          phone={business.phone || undefined}
          showMarqueeBar={(business as any).marquee_bar_enabled ?? true}
          cartItemsCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
          favoritesCount={favoriteIds.size}
          promoText={business.promo_text || undefined}
          primaryColor={business.primary_color || undefined}
          businessCategory={(business as any).business_category as BusinessCategory}
          storeCategories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          aboutPath={`/store/${business.slug || slug}/about`}
          onNavigateHome={goToShopping}
          onScrollToProducts={scrollToProductsSection}
          onNavigateToFavorites={() => setViewState('favorites')}
          onNavigateToCart={() => setViewState('cart')}
        />
        <StoreCartPage
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemoveFromCart}
          onCheckout={handleCheckout}
          onBack={() => setViewState('shopping')}
          hasPayment={business.payment_enabled ?? false}
        />
        {business.phone && (business.whatsapp_enabled ?? true) && (
          <FloatingWhatsApp
            phone={business.phone}
            message={(business as any).whatsapp_message || undefined}
            businessName={business.name}
          />
        )}
      </>
    );
  }

  // Favorites page
  if (viewState === 'favorites') {
    const favoriteProducts = storeProducts.filter((p) => favoriteIds.has(p.id));
    return (
      <>
        <StoreHeader
          businessName={business.name}
          logoUrl={business.logo_url || undefined}
          phone={business.phone || undefined}
          showMarqueeBar={(business as any).marquee_bar_enabled ?? true}
          cartItemsCount={cartItems.reduce((s, i) => s + i.quantity, 0)}
          favoritesCount={favoriteIds.size}
          promoText={business.promo_text || undefined}
          primaryColor={business.primary_color || undefined}
          businessCategory={(business as any).business_category as BusinessCategory}
          storeCategories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          aboutPath={`/store/${business.slug || slug}/about`}
          onNavigateHome={goToShopping}
          onScrollToProducts={scrollToProductsSection}
          onNavigateToFavorites={() => setViewState('favorites')}
          onNavigateToCart={() => setViewState('cart')}
        />
        <StoreFavorites
          products={favoriteProducts}
          onAddToCart={handleAddToCart}
          onRemoveFavorite={removeFavorite}
          onBack={() => setViewState('shopping')}
        />
        {business.phone && (business.whatsapp_enabled ?? true) && (
          <FloatingWhatsApp
            phone={business.phone}
            message={(business as any).whatsapp_message || undefined}
            businessName={business.name}
          />
        )}
      </>
    );
  }

  // Generate store URL
  const storeUrl = `https://${import.meta.env.VITE_WEBSITE_URL}/store/${slug}`;

  // Transform products for SEO component
  const seoProducts = storeProducts.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    originalPrice: p.originalPrice,
    imageUrl: p.imageUrl,
    sku: p.sku,
  }));

  // Build shared layout props — all 4 layouts receive the same data object
  const layoutProps: StorefrontLayoutProps = {
    businessName: business.name,
    businessSlug: business.slug || slug || '',
    logoUrl: business.logo_url || undefined,
    phone: business.phone || undefined,
    tagline: business.tagline as string | null | undefined,
    ctaText: business.cta_text as string | null | undefined,
    heroTitle: business.hero_title as string | null | undefined,
    heroBadge: b?.hero_badge || undefined,
    heroImageUrl: b?.hero_image_url || undefined,
    heroBenefits: b?.hero_benefits ?? undefined,
    primaryColor: business.primary_color || undefined,
    promoText: b?.promo_text || undefined,
    aboutText: b?.about_text || undefined,
    whatsappEnabled: business.whatsapp_enabled ?? true,
    whatsappMessage: b?.whatsapp_message || undefined,
    showMarqueeBar: b?.marquee_bar_enabled ?? true,
    businessCategory: b?.business_category as BusinessCategory | undefined,
    // Only pass reviews if the business has paid for the feature and wants them shown
    reviewsCache: (b?.reviews_paid && (b?.reviews_show_on_store ?? true)) ? b?.google_reviews_cache : null,
    template,
    products: categories.length > 0 ? storeProductsFiltered : storeProducts,
    categories,
    selectedCategoryId,
    onSelectCategory: setSelectedCategoryId,
    banners: storeBanners,
    campaignPopup: activeCampaign?.popup_enabled ? {
      enabled: true,
      campaignId: activeCampaign.id,
      title: activeCampaign.popup_title || undefined,
      text: activeCampaign.popup_text || undefined,
      ctaText: activeCampaign.popup_cta_text || undefined,
      ctaUrl: activeCampaign.popup_cta_url || undefined,
      couponCode: activeCampaign.popup_coupon_code || undefined,
      accent: business.primary_color || undefined,
    } : undefined,
    cartItems,
    favoritesCount: favoriteIds.size,
    onAddToCart: handleAddToCart,
    onUpdateQuantity: handleUpdateQuantity,
    onRemoveFromCart: handleRemoveFromCart,
    onCheckout: handleCheckout,
    onNavigateToCart: () => setViewState('cart'),
    onNavigateToFavorites: () => setViewState('favorites'),
    onScrollToProducts: scrollToProductsSection,
    onNavigateHome: goToShopping,
    favoriteIds,
    onToggleFavorite: toggleFavorite,
    hasPayment: business.payment_enabled ?? false,
    customLabels: (b?.custom_labels as Record<string, string> | null) ?? undefined,
    // Every layout renders this right after its hero (prominent, framed, titled).
    verticalSlot: <StorefrontVertical business={business as any} />,
  };

  // Pick layout component based on template layoutId
  const LayoutComponent = (() => {
    switch (template?.layoutId) {
      case 'service':    return ServiceLayout;
      case 'property':   return PropertyLayout;
      case 'market':     return MarketLayout;
      case 'boutique':   return BoutiqueLayout;
      case 'beauty-spa': return BeautySpaLayout;
      case 'home-pro':   return HomeProLayout;
      case 'charity':    return CharityLayout;
      default:           return ClassicLayout;
    }
  })();

  // Main shopping view
  return (
    <>
      {/* Age Verification Modal for alcohol stores */}
      {needsAgeVerification && !ageVerified && (
        <AgeVerificationModal
          businessName={business.name}
          onVerified={() => setAgeVerified(true)}
        />
      )}

      <StoreSEO
        business={business}
        products={seoProducts}
        storeUrl={storeUrl}
      />

      <LayoutComponent {...layoutProps} />
      {/* The per-vertical experience (booking / listings / donations) is rendered
          by each layout right after its hero via the verticalSlot prop. */}
    </>
  );
};

export default StoreFront;
