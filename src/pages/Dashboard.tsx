import { useState, useEffect, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardNav, { type DashboardView } from "@/components/dashboard/DashboardNav";
import SubscriptionAlert from "@/components/dashboard/SubscriptionAlert";
import DashboardHome from "@/components/dashboard/DashboardHome";
import DashboardProducts, { type Product } from "@/components/dashboard/DashboardProducts";
import DashboardOrders, { type Order } from "@/components/dashboard/DashboardOrders";
import DashboardCRM from "@/components/dashboard/DashboardCRM";
import PremiumOverlay from "@/components/dashboard/PremiumOverlay";
import { useCrmEntitled } from "@/hooks/useCrmEntitled";
import { useAnalyticsEntitled } from "@/hooks/useAnalyticsEntitled";
import DashboardBanners, { type Banner } from "@/components/dashboard/DashboardBanners";
import DashboardCoupons from "@/components/dashboard/DashboardCoupons";
import DashboardSales from "@/components/dashboard/DashboardSales";
import DashboardCampaigns from "@/components/dashboard/DashboardCampaigns";
import DashboardSettings, { type BusinessSettings } from "@/components/dashboard/DashboardSettings";
import DashboardAboutPage from "@/components/dashboard/DashboardAboutPage";
import DashboardPreview from "@/components/dashboard/DashboardPreview";
import DashboardCategories from "@/components/dashboard/DashboardCategories";
import DashboardDesign from "@/components/dashboard/DashboardDesign";
import DashboardTracking from "@/components/dashboard/DashboardTracking";
import DashboardReviews from "@/components/dashboard/DashboardReviews";
import DashboardSubscription from "@/components/dashboard/DashboardSubscription";
import DashboardAIImages from "@/components/dashboard/DashboardAIImages";
import DashboardAIGeneratedImages from "@/components/dashboard/DashboardAIGeneratedImages";
import DashboardTour, { hasSeenTour } from "@/components/dashboard/DashboardTour";
import DashboardShipping from "@/components/dashboard/DashboardShipping";
import DashboardPayments from "@/components/dashboard/DashboardPayments";
import DashboardUsage from "@/components/dashboard/DashboardUsage";
import DashboardTrafficSources from "@/components/dashboard/DashboardTrafficSources";
import DashboardInsights from "@/components/dashboard/DashboardInsights";
import DashboardDomains from "@/components/dashboard/DashboardDomains";
import DashboardWhatsApp from "@/components/dashboard/DashboardWhatsApp";
import DashboardEmail from "@/components/dashboard/DashboardEmail";
import DashboardUpgrades from "@/components/dashboard/DashboardUpgrades";
import DashboardLegal from "@/components/dashboard/DashboardLegal";
import DashboardAdBudget from "@/components/dashboard/DashboardAdBudget";
import UnpublishedBanner from "@/components/dashboard/UnpublishedBanner";
import { useMyBusiness, useProfile } from "@/hooks/useBusiness";
import { useProducts, useUpdateProduct, useCreateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useOrders, useUpdateOrder } from "@/hooks/useOrders";
import { useBanners, useCreateBanner, useUpdateBanner, useDeleteBanner } from "@/hooks/useBanners";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useReferralRewardNotification } from "@/hooks/useReferralRewardNotification";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: business, isLoading: businessLoading } = useMyBusiness();
  
  // Check for new referral rewards and show toast
  useReferralRewardNotification();
  
  const [currentView, setCurrentView] = useState<DashboardView>('home');
  const { entitled: crmEntitled } = useCrmEntitled();
  const { entitled: analyticsEntitled } = useAnalyticsEntitled();

  // Refetch business data when returning from payment
  useEffect(() => {
    const fromPayment = searchParams.get('from_payment');
    if (fromPayment === 'true') {
      // Invalidate business query to force refetch
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      // Remove the param from URL
      searchParams.delete('from_payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);
  
  // Active, paid Siango subscription? Decides whether the store is live (drives the
  // dashboard banner). "active" + paid_until in the future.
  const { data: subData } = useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("paid_until, status")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .gt("paid_until", new Date().toISOString())
        .maybeSingle();
      return data;
    },
  });
  const isSubscribed = !!subData;

  // Fetch real data from database
  const { data: dbProducts, isLoading: productsLoading } = useProducts(business?.id);
  const { categories: productCategories } = useProductCategories(business?.id);
  const { data: dbOrders, isLoading: ordersLoading } = useOrders(business?.id);
  const updateOrder = useUpdateOrder();
  // Persist an order status change. Maps the UI status back to the DB status
  // (inverse of the load mapping below) so it actually saves.
  const handleOrderStatusChange = (orderId: string, uiStatus: Order['status']) => {
    const dbStatus =
      uiStatus === 'received' ? 'pending'
      : uiStatus === 'pending_payment' ? 'confirmed'
      : uiStatus; // completed / cancelled map 1:1
    updateOrder.mutate({ id: orderId, status: dbStatus });
  };
  const { data: dbBanners, isLoading: bannersLoading } = useBanners(business?.id);
  
  // Product mutations - MUST be called before any returns
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  // Banner mutations
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  
  // Local state for optimistic updates
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    name: "",
    phone: "",
    email: "",
    primaryColor: "#7c3aed",
    brandStyle: "modern",
    paymentEnabled: false,
    deliveryMode: "pickup_only",
  });
  const [productsCategoryFilter, setProductsCategoryFilter] = useState<string | null>(null);
  // Products hub: list / categories / sales are now tabs inside one screen.
  const [productsTab, setProductsTab] = useState<'list' | 'categories'>('list');
  // Design hub: template / banners are tabs inside one screen.
  const [designTab, setDesignTab] = useState<'template' | 'banners'>('template');
  // Analytics hub: insights / traffic / ad-budget are tabs inside one screen.
  const [analyticsTab, setAnalyticsTab] = useState<'insights' | 'traffic' | 'ad-budget'>('insights');
  // Redirect legacy nav targets into the matching hub tab.
  useEffect(() => {
    if (currentView === 'categories') { setProductsTab('categories'); setCurrentView('products'); }
    else if (currentView === 'banners') { setDesignTab('banners'); setCurrentView('design'); }
    else if (currentView === 'traffic') { setAnalyticsTab('traffic'); setCurrentView('insights'); }
    else if (currentView === 'ad-budget') { setAnalyticsTab('ad-budget'); setCurrentView('insights'); }
  }, [currentView]);

  // Handle sale updates
  const handleSaleUpdate = useCallback((productId: string, updates: { sale_price?: number | null; is_on_sale?: boolean; is_hot?: boolean; sale_end_date?: string | null }) => {
    updateProduct.mutate({
      id: productId,
      ...(updates.sale_price !== undefined && { sale_price: updates.sale_price }),
      ...(updates.is_on_sale !== undefined && { is_on_sale: updates.is_on_sale }),
      ...(updates.is_hot !== undefined && { is_hot: updates.is_hot }),
      ...(updates.sale_end_date !== undefined && { sale_end_date: updates.sale_end_date }),
    });
  }, [updateProduct]);

  // Handle banner changes - sync with database
  const handleBannersChange = useCallback((newBanners: Banner[]) => {
    if (!business?.id) {
      toast.error("לא נבחרה חנות. נסה לרענן את הדף.");
      return;
    }

    const currentById = new Map(banners.map((b) => [b.id, b]));

    // Deleted banners - exist in current but לא ב־new
    const deletedBanners = banners.filter(
      (b) => !newBanners.some((nb) => nb.id === b.id),
    );

    // New banners - id שלא קיים ברשימה הנוכחית
    const newOnes = newBanners.filter((b) => !currentById.has(b.id));

    // Existing banners - להשוות שדות ולשמור רק אם השתנו
    const maybeUpdated = newBanners.filter((b) => currentById.has(b.id));

    deletedBanners.forEach((b) => {
      // אין לנו business_id בשורה המקומית, אז נעביר מבחוץ
      deleteBanner.mutate({ id: b.id, businessId: business.id });
    });

    newOnes.forEach((b, index) => {
      createBanner.mutate({
        business_id: business.id,
        title: b.internalTitle || null,
        text: b.text || null,
        image_url: b.imageUrl || null,
        cta_text: b.ctaText || null,
        cta_url: b.ctaTarget || null,
        active: b.active,
        start_date: b.startDate || null,
        end_date: b.endDate || null,
        sort_order: index,
      } as any);
    });

    maybeUpdated.forEach((b, index) => {
      const original = currentById.get(b.id)!;
      const hasChanges =
        original.internalTitle !== b.internalTitle ||
        original.imageUrl !== b.imageUrl ||
        (original.text || "") !== (b.text || "") ||
        (original.ctaText || "") !== (b.ctaText || "") ||
        (original.ctaTarget || "") !== (b.ctaTarget || "") ||
        (original.startDate || "") !== (b.startDate || "") ||
        (original.endDate || "") !== (b.endDate || "") ||
        original.active !== b.active;

      if (hasChanges) {
        updateBanner.mutate({
          id: b.id,
          title: b.internalTitle || null,
          text: b.text || null,
          image_url: b.imageUrl || null,
          cta_text: b.ctaText || null,
          cta_url: b.ctaTarget || null,
          active: b.active,
          start_date: b.startDate || null,
          end_date: b.endDate || null,
          sort_order: index,
        } as any);
      }
    });

    // עדכון ה־state המקומי מיידית בשביל תצוגה מקדימה
    setBanners(newBanners);
  }, [banners, business?.id, createBanner, updateBanner, deleteBanner, setBanners]);

  // Handle product changes - sync with database
  const handleProductsChange = useCallback((newProducts: Product[]) => {
    if (!business?.id) {
      toast.error('לא נבחרה חנות. נסה לרענן את הדף.');
      return;
    }

    // Find deleted products
    const currentIds = new Set(newProducts.map(p => p.id));
    const deletedProducts = products.filter(p => !currentIds.has(p.id));
    
    // Find new products (temporary IDs)
    const newProductsToCreate = newProducts.filter(p => !p.id.includes('-') || p.id.length < 30);
    
    // Find updated products
    const existingProducts = newProducts.filter(p => p.id.includes('-') && p.id.length >= 30);
    
    // Delete removed products
    deletedProducts.forEach(p => {
      if (p.id.includes('-') && p.id.length >= 30) {
        deleteProduct.mutate({ id: p.id, businessId: business.id });
      }
    });
    
    // Create new products
    newProductsToCreate.forEach(p => {
      createProduct.mutate({
        business_id: business.id,
        name: p.name,
        description: p.description || null,
        price: p.price,
        sku: p.sku || null,
        image_url: p.imageUrl || null,
        sort_order: p.sortOrder ?? 0,
        active: p.active,
        category_id: p.categoryId || null,
        customFields: p.customFields || [],
      });
    });
    
    // Update existing products
    existingProducts.forEach(p => {
      const original = products.find(op => op.id === p.id);
      
      // Check if custom fields changed
      const customFieldsChanged = JSON.stringify(original?.customFields || []) !== JSON.stringify(p.customFields || []);
      
      if (original && (
        original.name !== p.name ||
        original.description !== p.description ||
        original.price !== p.price ||
        original.sku !== p.sku ||
        original.imageUrl !== p.imageUrl ||
        original.active !== p.active ||
        original.sortOrder !== p.sortOrder ||
        original.categoryId !== p.categoryId ||
        customFieldsChanged
      )) {
        updateProduct.mutate({
          id: p.id,
          name: p.name,
          description: p.description || null,
          price: p.price,
          sku: p.sku || null,
          image_url: p.imageUrl || null,
          sort_order: p.sortOrder ?? 0,
          active: p.active,
          category_id: p.categoryId ?? null,
          customFields: p.customFields || [],
        });
      }
    });
    
    // Update local state optimistically
    setProducts(newProducts);
  }, [business?.id, products, createProduct, deleteProduct, updateProduct]);

  // Redirect if not authenticated
  // useEffect(() => {
  //   if (!authLoading && !user) {
  //     navigate('/login');
  //   }
  // }, [user, authLoading, navigate]);
  
  useEffect(() => {
    // Wait for authentication to complete first
    if (authLoading) {
      return;
    }
    
    // Don't check business if profile is still loading or doesn't exist
    if (profileLoading || !profile) {
      return;
    }
    
    // CRITICAL: Only redirect if business query has finished AND returned null
    // Never redirect while businessLoading is true - this causes the redirect loop
    if (!businessLoading && !business) {
      console.log("✅ All queries completed. No business found, redirecting to onboarding");
      navigate('/onboarding', { replace: true });
      return;
    }
    
    // Allow dashboard access even for unpublished businesses
    // They will see a banner prompting them to complete payment
    // No auto-redirect to publish-payment
  }, [user, profile, business, authLoading, profileLoading, businessLoading, navigate]);

  // Sync products from database (preserve optimistically added products until DB refetch catches up)
  useEffect(() => {
    if (!dbProducts) return;

    const fromDb = dbProducts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: p.price,
      sku: (p as any).sku || undefined,
      imageUrl: p.image_url || undefined,
      active: p.active ?? true,
      sale_price: (p as any).sale_price || null,
      is_on_sale: (p as any).is_on_sale || false,
      is_hot: (p as any).is_hot || false,
      sortOrder: p.sort_order ?? undefined,
      categoryId: (p as any).category_id || undefined,
      customFields: (p as any).customFields || [],
    }));

    setProducts(prev => {
      const fromDbIds = new Set(fromDb.map(p => p.id));
      const localOnly = prev.filter(p => !fromDbIds.has(p.id));
      // If we have optimistically added products (temp ids: no dash or short) and DB has caught up, use only DB
      const hasTempIds = localOnly.some(p => !p.id.includes('-') || p.id.length < 30);
      if (hasTempIds && fromDb.length >= prev.length) {
        return fromDb;
      }
      return [...fromDb, ...localOnly];
    });
  }, [dbProducts]);

  // Sync orders from database
  useEffect(() => {
    if (dbOrders) {
      setOrders(dbOrders.map(o => ({
        id: o.id,
        date: o.created_at,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        customerEmail: o.customer_email,
        notes: o.notes || undefined,
        items: [], // Will be populated from order_items if needed
        total: o.total_price,
        status: o.status === 'pending' ? 'received' : 
                o.status === 'confirmed' ? 'pending_payment' :
                o.status === 'completed' ? 'completed' : 
                o.status === 'cancelled' ? 'cancelled' : 'received',
      })));
    }
  }, [dbOrders]);

  // Sync banners from database
  useEffect(() => {
    if (dbBanners) {
      setBanners(dbBanners.map(b => ({
        id: b.id,
        internalTitle: b.title || "",
        imageUrl: b.image_url || undefined,
        text: b.text || "",
        ctaText: b.cta_text || undefined,
        ctaTarget: b.cta_url || undefined,
        active: b.active ?? true,
        startDate: b.start_date || undefined,
        endDate: b.end_date || undefined,
      })));
    }
  }, [dbBanners]);

  // Sync settings from database
  useEffect(() => {
    if (business) {
      setSettings({
        id: business.id,
        name: business.name,
        phone: business.phone || "",
        email: business.email || "",
        tagline: business.tagline || "",
        logoUrl: business.logo_url || undefined,
        heroImageUrl: business.hero_image_url || undefined,
        primaryColor: business.primary_color || "#7c3aed",
        brandStyle: (business.brand_style as BusinessSettings['brandStyle']) || "modern",
        paymentEnabled: business.payment_enabled || false,
        paymentProvider: business.payment_provider as BusinessSettings['paymentProvider'],
        deliveryMode: (business as any).delivery_mode as BusinessSettings['deliveryMode'] || "pickup_only",
        deliveryFee: (business as any).delivery_fee ?? undefined,
        heroTitle: business.hero_title || undefined,
        heroBadge: business.hero_badge || undefined,
        heroBenefits: Array.isArray((business as any).hero_benefits) ? (business as any).hero_benefits : undefined,
        promoText: business.promo_text || "",
        ctaText: business.cta_text || "לקולקציה",
        // ברירת מחדל: מכובה (false) - המשתמש צריך להפעיל באופן ידני
        useTagline: business.tagline && business.tagline !== "" ? true : false,
        useHeroTitle: business.hero_title !== "",
        useHeroBadge: business.hero_badge ? true : false,
        usePromoText: business.promo_text ? true : false,
        useCtaText: business.cta_text != null,
        useHeroBenefits: Array.isArray((business as any).hero_benefits) && (business as any).hero_benefits?.length > 0,
        useMarqueeBar: (business as any).marquee_bar_enabled ?? false,
        businessCategory: (business.business_category as BusinessSettings['businessCategory']) || "other",
        customCategoryName: business.custom_category_name || undefined,
        whatsappEnabled: business.whatsapp_enabled ?? true,
        whatsappMessage: (business as any).whatsapp_message || undefined,
        shabbatMode: (business as any).shabbat_mode ?? false,
      });
    }
  }, [business]);

  // Flags for feature availability (נווט מסתמך עליהם להצגת טאבים מתקדמים)
  const hasProducts = (dbProducts?.length ?? 0) > 0;

  // First-visit guided tour of the dashboard (shown once per merchant).
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (business?.id && !hasSeenTour()) setShowTour(true);
  }, [business?.id]);

  // Show loading state
  const isLoading = authLoading || profileLoading || businessLoading;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">טוען את הדשבורד...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting to onboarding (only if profile loaded but no business)
  if (user && profile && !business && !businessLoading && !profileLoading && !authLoading) {
    return null;
  }

  // Calculate stats
  const stats = {
    totalOrders: orders.length,
    totalSales: orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0),
    paymentEnabled: settings.paymentEnabled,
    totalProducts: products.length,
    totalCategories: productCategories?.length ?? 0,
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <DashboardHome stats={stats} businessId={business?.id} isPublished={!!(business as any)?.is_published} isSubscribed={isSubscribed} hasAbout={!!(business as any)?.about_text?.trim()} onNavigate={setCurrentView} />;
      case 'products':
      case 'categories':
      case 'sales':
        return (
          <div className="space-y-4">
            {/* One product hub: list / categories as tabs */}
            <div className="flex gap-1 border-b border-border overflow-x-auto">
              {([
                { id: 'list', label: 'רשימת מוצרים' },
                { id: 'categories', label: 'קטגוריות' },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setProductsTab(t.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    productsTab === t.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {productsTab === 'list' && (
              <DashboardProducts
                products={products}
                onProductsChange={handleProductsChange}
                businessId={business?.id}
                categories={productCategories}
                onNavigateToAI={() => setCurrentView('ai-images')}
                onNavigateToSubscription={() => setCurrentView('subscription')}
                initialCategoryFilterId={productsCategoryFilter}
                onNavigateToCategories={() => setProductsTab('categories')}
              />
            )}

            {productsTab === 'categories' && (
              <DashboardCategories
                businessId={business?.id}
                businessCategory={business?.business_category ?? undefined}
                products={products}
                onProductUpdate={(productId, categoryId) => {
                  const updatedProducts = products.map((p) =>
                    p.id === productId ? { ...p, categoryId } : p
                  );
                  handleProductsChange(updatedProducts);
                }}
                onViewCategoryProducts={(categoryId) => {
                  setProductsCategoryFilter(categoryId);
                  setProductsTab('list');
                }}
              />
            )}

          </div>
        );
      case 'discounts':
        return (
          <DashboardSales
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              sale_price: (p as any).sale_price,
              is_on_sale: (p as any).is_on_sale,
              is_hot: (p as any).is_hot,
              imageUrl: p.imageUrl,
            }))}
            onProductUpdate={handleSaleUpdate}
            isLoading={productsLoading}
          />
        );
      case 'orders':
        return <DashboardOrders orders={orders} onOrdersChange={setOrders} onStatusChange={handleOrderStatusChange} />;
      case 'customers':
      case 'profitability':
        return (
          <PremiumOverlay
            locked={!crmEntitled}
            title="CRM - לקוחות, ספקים ורווחיות"
            description="כל ניהול המכירות במקום אחד: לקוחות עם היסטוריה וסגמנטים, ניהול ספקים, ודוחות רווחיות אמיתיים."
            bullets={["כרטיס לקוח מלא + סגמנטים + תגיות/הערות", "תזכורת רכישה חוזרת + שליחת הטבה בוואטסאפ", "כרטיסי ספק: פרטי קשר, הערות ומוצרים", "רווח ואחוז רווח לכל מוצר + רווח לפי ספק"]}
            priceLabel="הפעלה ב-₪49 לחודש"
            onUpgrade={() => setCurrentView('subscription')}
          >
            <DashboardCRM orders={orders} businessId={business?.id} demoMode={!crmEntitled} initialTab={currentView === 'profitability' ? 'profitability' : 'customers'} />
          </PremiumOverlay>
        );
      case 'campaigns':
        return (
          <DashboardCampaigns 
            businessId={business?.id}
            onNavigateToSubscription={() => setCurrentView('subscription')}
          />
        );
      case 'coupons':
        return <DashboardCoupons businessId={business?.id} />;
      case 'ai-images':
        return (
          <DashboardAIImages
            businessId={business?.id}
            onNavigateToSubscription={() => setCurrentView('subscription')}
            onNavigateToProducts={() => setCurrentView('products')}
          />
        );
      case 'ai-generated-images':
        return <DashboardAIGeneratedImages />;
      case 'usage':
        return <DashboardUsage businessId={business?.id} />;
      case 'insights':
      case 'traffic':
      case 'ad-budget':
        return (
          <PremiumOverlay
            locked={!analyticsEntitled}
            title="אנליטיקה - נתוני החנות שלך"
            description="מי הלקוחות שלך, מאיפה הם מגיעים, ואיפה אפשר להשתפר. הנתונים שמאפשרים לקבל החלטות מבוססות."
            bullets={["כמה מבקרים הגיעו לחנות ומתי", "מקורות הגעה - גוגל, ישיר, רשתות חברתיות", "תובנות לשיפור המכירות", "תקציב פרסום ומעקב קמפיינים"]}
            priceLabel="הפעלה ב-₪29 לחודש (או כחלק מ-CRM)"
            onUpgrade={() => setCurrentView('upgrades')}
          >
            <div className="space-y-4">
              <div className="flex gap-1 border-b border-border overflow-x-auto">
                {([
                  { id: 'insights', label: 'תובנות' },
                  { id: 'traffic', label: 'מקורות הגעה' },
                  { id: 'ad-budget', label: 'תקציב פרסום' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAnalyticsTab(t.id)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      analyticsTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {analyticsTab === 'insights' && <DashboardInsights businessId={business?.id} />}
              {analyticsTab === 'traffic' && <DashboardTrafficSources businessId={business?.id} />}
              {analyticsTab === 'ad-budget' && <DashboardAdBudget businessId={business?.id} />}
            </div>
          </PremiumOverlay>
        );
      case 'domains':
        return <DashboardDomains businessId={business?.id} />;
      case 'whatsapp':
        return <DashboardWhatsApp businessId={business?.id} />;
      case 'email':
        return <DashboardEmail businessId={business?.id} onGoToDomains={() => setCurrentView('domains')} />;
      case 'upgrades':
        return <DashboardUpgrades onNavigate={(v) => setCurrentView(v)} />;
      case 'tracking':
        return <DashboardTracking businessId={business?.id} />;
      case 'reviews':
        return <DashboardReviews businessId={business?.id} />;
      case 'subscription':
        return (
          <div className="space-y-6">
            <DashboardSubscription />
            <DashboardUsage businessId={business?.id} />
          </div>
        );
      case 'about':
        return <DashboardAboutPage businessId={business?.id} />;
      case 'shipping':
        return (
          <DashboardShipping settings={settings} onSettingsChange={setSettings} />
        );
      case 'payments':
        return (
          <DashboardPayments settings={settings} onSettingsChange={setSettings} />
        );
      case 'legal':
        return <DashboardLegal business={business as any} />;
      case 'design':
      case 'banners':
        return (
          <div className="space-y-4">
            {/* Design hub: template + banners in one place */}
            <div className="flex gap-1 border-b border-border overflow-x-auto">
              {([
                { id: 'template', label: 'תבנית ועיצוב' },
                { id: 'banners', label: 'באנרים' },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDesignTab(t.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    designTab === t.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {designTab === 'template' && (
              <DashboardDesign
                businessId={business?.id}
                currentTemplateId={business?.template_id}
              />
            )}

            {designTab === 'banners' && (
              <DashboardBanners
                banners={banners}
                onBannersChange={handleBannersChange}
                businessId={business?.id}
                onNavigateToSubscription={() => setCurrentView('subscription')}
              />
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] gap-0">
            <div className="border-l xl:border-l-0 border-border/50 bg-muted/30">
              <DashboardSettings settings={settings} onSettingsChange={setSettings} />
            </div>
            <div className="hidden xl:block sticky top-20 h-[calc(100vh-80px)] overflow-hidden bg-muted/20">
              <DashboardPreview
                settings={settings}
                products={products}
                banners={banners}
                categories={productCategories?.map(c => ({ id: c.id, name: c.name }))}
                storeSlug={business?.slug ?? undefined}
              />
            </div>
          </div>
        );
      case 'preview':
        return (
          <DashboardPreview
            settings={settings}
            products={products}
            banners={banners}
            categories={productCategories?.map(c => ({ id: c.id, name: c.name }))}
            storeSlug={business?.slug ?? undefined}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider>
      <SEOHead title="לוח ניהול | סיאנגו" noindex={true} />
      {showTour && <DashboardTour onClose={() => setShowTour(false)} />}
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader
          businessName={settings.name}
          siteUrl={business?.slug ? `/store/${business.slug}` : "/store"}
          merchantLogoUrl={(business as any)?.logo_url || undefined}
          onNavigate={setCurrentView}
        />
        
        <div className="flex">
          <DashboardNav 
            currentView={currentView} 
            onViewChange={setCurrentView}
            canUseCampaigns={hasProducts}
            canUseCoupons={hasProducts}
            // תמונות AI נשאר פתוח, מגבלות שימוש מנוהלות בתוך המסך עצמו
            canUseAIImages={true}
          />
          
          <main className="flex-1 pb-20 md:pb-0">
            <SubscriptionAlert onManage={() => setCurrentView('subscription')} />
            <div className="container max-w-7xl mx-auto px-4 py-6">
              {business && !business.is_published && (
                <UnpublishedBanner businessId={business.id} />
              )}
            </div>
            {renderContent()}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Dashboard;
