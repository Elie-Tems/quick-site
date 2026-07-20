import { useState } from "react";
import { Download, Package, Image as ImageIcon, Loader2, X } from "lucide-react";
import AICreditPackages from "./AICreditPackages";
import { useAICredits } from "@/hooks/useAIImageEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIImageJobs } from "@/hooks/useAIImageEngine";
import { useProducts, useUpdateProduct } from "@/hooks/useProducts";
import { useBanners, useUpdateBanner } from "@/hooks/useBanners";
import { useMyBusiness, useUpdateBusiness } from "@/hooks/useBusiness";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DashboardAIGeneratedImages = () => {
  const { t } = useLanguage();
  const { data: business } = useMyBusiness();
  const { data: credits } = useAICredits(business?.id);
  const { data: jobs, isLoading } = useAIImageJobs(business?.id);
  const { data: products } = useProducts(business?.id);
  const { data: banners } = useBanners(business?.id);
  const updateBanner = useUpdateBanner();
  const updateProduct = useUpdateProduct();
  const updateBusiness = useUpdateBusiness();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignType, setAssignType] = useState<'product' | 'banner' | 'hero' | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");

  // Show ALL of the merchant's images in one gallery - product photos, banners,
  // the hero image, and AI generations - deduped by URL.
  const allImages = (() => {
    const seen = new Set<string>();
    const out: { id: string; url: string; source: string }[] = [];
    const add = (url: string | null | undefined, source: string, id: string) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      out.push({ id, url, source });
    };
    (jobs || []).forEach((j) => { if (j.status === "completed") add(j.generated_image_url, "AI", `job-${j.id}`); });
    (products || []).forEach((p) => add((p as any).image_url, t("dash.aigallery.source_product"), `prod-${p.id}`));
    (banners || []).forEach((b) => add((b as any).image_url, t("dash.aigallery.source_banner"), `ban-${b.id}`));
    add((business as any)?.hero_image_url, t("dash.aigallery.source_hero"), "hero");
    return out;
  })();

  const handleDownload = async (imageUrl: string, jobId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-image-${jobId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(t("dash.aigallery.download_success"));
    } catch (error) {
      toast.error(t("dash.aigallery.download_error"));
    }
  };

  const handleAssignImage = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setAssignDialogOpen(true);
  };

  const handleAssignConfirm = async () => {
    if (!selectedImage || !assignType) return;

    try {
      if (assignType === 'hero') {
        // Assign as Hero Image
        if (!business?.id) {
          toast.error(t("dash.aigallery.business_not_found"));
          return;
        }

        await updateBusiness.mutateAsync({
          id: business.id,
          hero_image_url: selectedImage,
        });
        toast.success(t("dash.aigallery.assign_hero_success"));
      } else if (assignType === 'banner' && selectedTargetId) {
        // Assign to Banner
        await updateBanner.mutateAsync({
          id: selectedTargetId,
          image_url: selectedImage,
        });
        toast.success(t("dash.aigallery.assign_banner_success"));
      } else if (assignType === 'product' && selectedTargetId) {
        // Assign to Product
        await updateProduct.mutateAsync({
          id: selectedTargetId,
          image_url: selectedImage,
        });
        toast.success(t("dash.aigallery.assign_product_success"));
      }

      setAssignDialogOpen(false);
      setSelectedImage(null);
      setAssignType(null);
      setSelectedTargetId("");
    } catch (error) {
      toast.error(t("dash.aigallery.assign_error"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("dash.aigallery.empty_title")}</h3>
        <p className="text-muted-foreground">
          {t("dash.aigallery.empty_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("dash.aigallery.title")}</h2>
          <p className="text-muted-foreground">
            {allImages.length} {t("dash.aigallery.count_suffix")}
          </p>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allImages.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
          >
            <img
              src={img.url}
              alt={img.source}
              className="w-full h-full object-cover"
            />

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDownload(img.url, img.id)}
                className="w-full"
              >
                <Download className="h-4 w-4 ml-1" />
                {t("dash.aigallery.download_btn")}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleAssignImage(img.url)}
                className="w-full"
              >
                <Package className="h-4 w-4 ml-1" />
                {t("dash.aigallery.assign_btn")}
              </Button>
            </div>

            {/* Info badge */}
            <Badge className="absolute top-2 right-2 text-xs">
              {img.source}
            </Badge>
          </div>
        ))}
      </div>

      {/* AI Credits upgrade section */}
      <div className="border-t border-border pt-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">{t("dash.aigallery.credits_title")}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("dash.aigallery.credits_desc")}
          </p>
        </div>
        <AICreditPackages
          businessId={business?.id}
          currentCredits={credits?.credits_remaining ?? 0}
        />
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dash.aigallery.assign_dialog_title")}</DialogTitle>
            <DialogDescription>
              {t("dash.aigallery.assign_dialog_desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Preview */}
            {selectedImage && (
              <div className="aspect-video rounded-lg overflow-hidden border border-border">
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Assign Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dash.aigallery.assign_type_label")}</label>
              <Select
                value={assignType || ""}
                onValueChange={(value) => {
                  setAssignType(value as 'product' | 'banner' | 'hero');
                  setSelectedTargetId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("dash.aigallery.assign_type_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">{t("dash.aigallery.assign_type_hero")}</SelectItem>
                  <SelectItem value="banner">{t("dash.aigallery.source_banner")}</SelectItem>
                  <SelectItem value="product">{t("dash.aigallery.source_product")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Selection */}
            {assignType === 'banner' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("dash.aigallery.select_banner_label")}</label>
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("dash.aigallery.select_banner_label")} />
                  </SelectTrigger>
                  <SelectContent>
                    {banners?.map((banner) => (
                      <SelectItem key={banner.id} value={banner.id}>
                        {t("dash.aigallery.banner_item_prefix")} {banner.title || banner.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignType === 'product' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("dash.aigallery.select_product_label")}</label>
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("dash.aigallery.select_product_label")} />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedImage(null);
                setAssignType(null);
                setSelectedTargetId("");
              }}
              className="flex-1"
            >
              {t("dash.aigallery.cancel")}
            </Button>
            <Button
              onClick={handleAssignConfirm}
              disabled={
                !assignType ||
                (assignType !== 'hero' && !selectedTargetId)
              }
              className="flex-1"
            >
              {t("dash.aigallery.assign_btn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardAIGeneratedImages;
