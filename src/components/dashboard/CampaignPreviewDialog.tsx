import { useMemo, useState } from "react";
import { X, Monitor, Smartphone, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import StoreHeader from "@/components/storefront/StoreHeader";
import StoreHero from "@/components/storefront/StoreHero";
import StoreBanners from "@/components/storefront/StoreBanners";
import StoreProducts from "@/components/storefront/StoreProducts";
import StoreAbout from "@/components/storefront/StoreAbout";
import StoreFooter from "@/components/storefront/StoreFooter";
import { Campaign, useCampaignBanners, useCampaignProducts } from "@/hooks/useCampaigns";
import { useMyBusiness } from "@/hooks/useBusiness";
import { useProducts } from "@/hooks/useProducts";
import { useBanners } from "@/hooks/useBanners";
import { BusinessCategory } from "@/lib/categoryConfig";

interface CampaignPreviewDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DeviceType = "desktop" | "mobile";

const CampaignPreviewDialog = ({ campaign, open, onOpenChange }: CampaignPreviewDialogProps) => {
  const [device, setDevice] = useState<DeviceType>("desktop");
  
  // Fetch business data
  const { data: business } = useMyBusiness();
  
  // Fetch regular products and banners
  const { data: regularProducts } = useProducts(campaign.business_id);
  const { data: regularBanners } = useBanners(campaign.business_id);
  
  // Fetch campaign-specific content
  const { data: campaignBanners } = useCampaignBanners(campaign.id);
  const { data: campaignProducts } = useCampaignProducts(campaign.id);

  // Transform products based on campaign display mode (same logic as StoreFront)
  const previewProducts = useMemo(() => {
    const baseProducts = (regularProducts || [])
      .filter(p => p.active)
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        price: p.is_on_sale && p.sale_price ? p.sale_price : p.price,
        originalPrice: p.is_on_sale && p.sale_price ? p.price : undefined,
        imageUrl: p.image_url || undefined,
        active: p.active ?? true,
        sku: p.sku || undefined,
        isSale: p.is_on_sale || false,
        isHot: p.is_hot || false,
        custom_fields: [],
      }));

    if (!campaignProducts || campaignProducts.length === 0) {
      return baseProducts;
    }

    // Transform campaign products
    const campaignProductsList = campaignProducts
      .filter(cp => cp.active)
      .map(cp => {
        if (cp.is_campaign_only) {
          return {
            id: cp.id,
            name: cp.name || '',
            description: cp.description || undefined,
            price: cp.sale_price ?? cp.price,
            originalPrice: cp.sale_price ? cp.price : undefined,
            imageUrl: cp.image_url || undefined,
            active: true,
            isSale: !!cp.sale_price,
            isHot: false,
            custom_fields: [],
          };
        } else {
          const linkedProduct = baseProducts.find(p => p.id === cp.product_id);
          return linkedProduct || null;
        }
      })
      .filter(Boolean) as typeof baseProducts;

    switch (campaign.display_mode) {
      case 'replace':
        return campaignProductsList;
      case 'add':
        const campaignOnlyIds = new Set(campaignProducts.filter(cp => cp.is_campaign_only).map(cp => cp.id));
        const linkedProductIds = new Set(campaignProducts.filter(cp => !cp.is_campaign_only && cp.product_id).map(cp => cp.product_id));
        const regularWithoutLinked = baseProducts.filter(p => !linkedProductIds.has(p.id));
        const campaignOnlyProducts = campaignProductsList.filter(p => campaignOnlyIds.has(p.id));
        return [...regularWithoutLinked, ...campaignOnlyProducts];
      case 'prioritize':
        const campaignIds = new Set(campaignProducts.filter(cp => !cp.is_campaign_only && cp.product_id).map(cp => cp.product_id));
        const campaignOnlyPrioIds = new Set(campaignProducts.filter(cp => cp.is_campaign_only).map(cp => cp.id));
        const remainingProducts = baseProducts.filter(p => !campaignIds.has(p.id));
        return [...campaignProductsList, ...remainingProducts.filter(p => !campaignOnlyPrioIds.has(p.id))];
      default:
        return baseProducts;
    }
  }, [regularProducts, campaign.display_mode, campaignProducts]);

  // Transform banners based on campaign display mode
  const previewBanners = useMemo(() => {
    const baseBanners = (regularBanners || [])
      .filter(b => b.active)
      .map(b => ({
        id: b.id,
        title: b.title || undefined,
        text: b.text || undefined,
        imageUrl: b.image_url || undefined,
        ctaText: b.cta_text || undefined,
        ctaUrl: b.cta_url || undefined,
      }));

    if (!campaignBanners || campaignBanners.length === 0) {
      return baseBanners;
    }

    const campaignBannersList = campaignBanners
      .filter(cb => cb.active)
      .map(cb => ({
        id: cb.id,
        title: cb.title || undefined,
        text: cb.text || undefined,
        imageUrl: cb.image_url || undefined,
        ctaText: cb.cta_text || undefined,
        ctaUrl: cb.cta_url || undefined,
      }));

    switch (campaign.display_mode) {
      case 'replace':
        return campaignBannersList;
      case 'add':
        return [...baseBanners, ...campaignBannersList];
      case 'prioritize':
        return [...campaignBannersList, ...baseBanners];
      default:
        return baseBanners;
    }
  }, [regularBanners, campaign.display_mode, campaignBanners]);

  if (!business) return null;

  const displayModeLabels = {
    replace: 'מחליף לגמרי',
    add: 'מוסיף על הקיים',
    prioritize: 'מציג קודם',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-4">
            <DialogHeader className="flex-row items-center gap-2 space-y-0">
              <Eye className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg">
                תצוגה מקדימה: {campaign.name}
              </DialogTitle>
            </DialogHeader>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {displayModeLabels[campaign.display_mode]}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ToggleGroup 
              type="single" 
              value={device} 
              onValueChange={(v) => v && setDevice(v as DeviceType)}
              className="bg-muted rounded-lg p-1"
            >
              <ToggleGroupItem value="desktop" aria-label="Desktop view" className="gap-1.5 px-3">
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline">Desktop</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="mobile" aria-label="Mobile view" className="gap-1.5 px-3">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Mobile</span>
              </ToggleGroupItem>
            </ToggleGroup>

            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div 
            className={`mx-auto bg-background rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
              device === "mobile" 
                ? "w-[375px] max-w-full" 
                : "w-full max-w-6xl"
            }`}
            style={{ minHeight: device === "mobile" ? "667px" : "auto" }}
          >
            {/* Store Preview Content */}
            <div className="overflow-auto max-h-[calc(95vh-120px)]">
              <StoreHeader
                businessName={business.name}
                logoUrl={business.logo_url || undefined}
                phone={business.phone || undefined}
                whatsappEnabled={business.whatsapp_enabled ?? false}
                cartItemsCount={0}
                promoText={business.promo_text || undefined}
                primaryColor={business.primary_color || undefined}
                businessCategory={(business as any).business_category as BusinessCategory}
              />

              <main>
                <StoreHero
                  businessName={business.name}
                  tagline={business.tagline || undefined}
                  ctaText={business.cta_text || undefined}
                  heroTitle={business.hero_title || undefined}
                  heroBadge={business.hero_badge || undefined}
                  logoUrl={business.logo_url || undefined}
                  heroImageUrl={business.hero_image_url || undefined}
                  primaryColor={business.primary_color || undefined}
                  businessCategory={(business as any).business_category as BusinessCategory}
                />

                {previewBanners.length > 0 && (
                  <StoreBanners banners={previewBanners} />
                )}

                <StoreProducts
                  products={previewProducts}
                  onAddToCart={() => {}}
                />

                {business.about_text && (
                  <StoreAbout
                    aboutText={business.about_text}
                    businessName={business.name}
                  />
                )}
              </main>

              <StoreFooter
                businessName={business.name}
                phone={business.phone || undefined}
                email={business.email || undefined}
              />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-4 py-2 border-t bg-muted/50 text-center text-sm text-muted-foreground">
          <span>
            {previewProducts.length} מוצרים • {previewBanners.length} באנרים
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignPreviewDialog;
