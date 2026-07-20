import { useState, useRef } from "react";
import { Plus, Pencil, Trash2, X, Upload, Image as ImageIcon, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusinessUsage } from "@/hooks/useBusinessUsage";
import { ImageUploadBlocker, ImageUploadWarning, ImageUsageMeter } from "./ImageUploadBlocker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Banner {
  id: string;
  internalTitle: string;
  imageUrl: string;
  text?: string;
  ctaText?: string;
  ctaTarget?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

interface DashboardBannersProps {
  banners: Banner[];
  onBannersChange: (banners: Banner[]) => void;
  businessId?: string;
  onNavigateToSubscription?: () => void;
}

const DashboardBanners = ({ banners, onBannersChange, businessId, onNavigateToSubscription }: DashboardBannersProps) => {
  const { t } = useLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);

  const { data: usageStatus } = useBusinessUsage(businessId);
  const [formData, setFormData] = useState({
    internalTitle: '',
    imageUrl: '',
    text: '',
    ctaText: '',
    ctaTarget: '',
    active: true,
    startDate: '',
    endDate: '',
  });

  const resetForm = () => {
    setFormData({
      internalTitle: '',
      imageUrl: '',
      text: '',
      ctaText: '',
      ctaTarget: '',
      active: true,
      startDate: '',
      endDate: '',
    });
    setEditingBanner(null);
    setIsFormOpen(false);
  };

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (banner: Banner) => {
    setFormData({
      internalTitle: banner.internalTitle,
      imageUrl: banner.imageUrl,
      text: banner.text || '',
      ctaText: banner.ctaText || '',
      ctaTarget: banner.ctaTarget || '',
      active: banner.active,
      startDate: banner.startDate || '',
      endDate: banner.endDate || '',
    });
    setEditingBanner(banner);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingBanner) {
      onBannersChange(banners.map(b => 
        b.id === editingBanner.id 
          ? { ...b, ...formData }
          : b
      ));
    } else {
      const newBanner: Banner = {
        id: Date.now().toString(),
        ...formData,
      };
      onBannersChange([...banners, newBanner]);
    }
    resetForm();
  };

  const handleDelete = (bannerId: string) => {
    if (confirm(t("dash.banners.confirm_delete"))) {
      onBannersChange(banners.filter(b => b.id !== bannerId));
    }
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t("dash.banners.err_select_image"));
      return;
    }
    if (usageStatus?.imageUploadBlocked) {
      setShowBlockerDialog(true);
      if (bannerImageInputRef.current) bannerImageInputRef.current.value = '';
      return;
    }
    setIsUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${businessId}/banners/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('business-assets').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
      toast.success(t("dash.banners.image_uploaded"));
    } catch (err) {
      console.error(err);
      toast.error(t("dash.banners.err_upload_image"));
    } finally {
      setIsUploadingImage(false);
      if (bannerImageInputRef.current) bannerImageInputRef.current.value = '';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  // Form View
  if (isFormOpen) {
    return (
      <div className="p-4 md:p-6">
        {/* Image Upload Blocker Dialog */}
        <ImageUploadBlocker
          open={showBlockerDialog}
          onOpenChange={setShowBlockerDialog}
          currentImages={usageStatus?.usage?.stored_images_count || 0}
          imageLimit={usageStatus?.imageLimit || 10}
          usagePercent={usageStatus?.imageUsagePercent || 0}
          onUpgrade={() => {
            setShowBlockerDialog(false);
            onNavigateToSubscription?.();
          }}
        />

        <div className="flex items-center gap-3 mb-6">
          <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            {editingBanner ? t("dash.banners.edit_banner_title") : t("dash.banners.add_banner_title")}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <Label htmlFor="internalTitle">{t("dash.banners.internal_title_label")}</Label>
            <Input
              id="internalTitle"
              value={formData.internalTitle}
              onChange={(e) => setFormData({ ...formData, internalTitle: e.target.value })}
              placeholder={t("dash.banners.internal_title_placeholder")}
              required
            />
            <p className="text-xs text-muted-foreground">{t("dash.banners.internal_title_help")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("dash.banners.image_label")}</Label>
            
            {/* Always-visible quota meter + near-limit warning */}
            <ImageUsageMeter
              usagePercent={usageStatus?.imageUsagePercent || 0}
              currentImages={usageStatus?.usage?.stored_images_count || 0}
              imageLimit={usageStatus?.imageLimit || 10}
            />
            <ImageUploadWarning
              usagePercent={usageStatus?.imageUsagePercent || 0}
              currentImages={usageStatus?.usage?.stored_images_count || 0}
              imageLimit={usageStatus?.imageLimit || 10}
            />
            
            <input
              ref={bannerImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerImageUpload}
              aria-hidden
            />
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                usageStatus?.imageUploadBlocked 
                  ? 'border-destructive/50 bg-destructive/5 cursor-not-allowed' 
                  : 'border-border hover:border-primary/50 cursor-pointer'
              }`}
              onClick={() => {
                if (usageStatus?.imageUploadBlocked) {
                  setShowBlockerDialog(true);
                } else if (!isUploadingImage) {
                  bannerImageInputRef.current?.click();
                }
              }}
            >
              {isUploadingImage ? (
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
              ) : formData.imageUrl ? (
                <img src={formData.imageUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg mb-2" />
              ) : (
                <Upload className={`h-8 w-8 mx-auto mb-2 ${usageStatus?.imageUploadBlocked ? 'text-destructive/50' : 'text-muted-foreground'}`} />
              )}
              <p className={`text-sm ${usageStatus?.imageUploadBlocked ? 'text-destructive' : 'text-muted-foreground'}`}>
                {usageStatus?.imageUploadBlocked ? t("dash.banners.quota_full") : t("dash.banners.upload_hint")}
              </p>
              <Input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => {
                  if (usageStatus?.imageUploadBlocked) {
                    setShowBlockerDialog(true);
                    return;
                  }
                  setFormData({ ...formData, imageUrl: e.target.value });
                }}
                placeholder={t("dash.banners.image_url_placeholder")}
                className="mt-3"
                dir="ltr"
                required
                disabled={usageStatus?.imageUploadBlocked}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">{t("dash.banners.text_label")}</Label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder={t("dash.banners.text_placeholder")}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctaText">{t("dash.banners.cta_text_label")}</Label>
              <Input
                id="ctaText"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                placeholder={t("dash.banners.cta_text_placeholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaTarget">{t("dash.banners.cta_target_label")}</Label>
              <Input
                id="ctaTarget"
                value={formData.ctaTarget}
                onChange={(e) => setFormData({ ...formData, ctaTarget: e.target.value })}
                placeholder={t("dash.banners.cta_target_placeholder")}
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t("dash.banners.start_date_label")}</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t("dash.banners.end_date_label")}</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <Label htmlFor="active" className="cursor-pointer">{t("dash.banners.active_label")}</Label>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingBanner ? t("dash.banners.save_changes") : t("dash.banners.add_banner_submit")}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              {t("dash.banners.cancel")}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // List View
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("dash.banners.title")}</h1>
        <Button onClick={openAddForm} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t("dash.banners.add_banner_btn")}
        </Button>
      </div>

      {banners.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <ImageIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{t("dash.banners.empty_state")}</p>
          <Button onClick={openAddForm} variant="outline">
            {t("dash.banners.add_first_banner")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className="bg-card rounded-xl border border-border shadow-soft overflow-hidden"
            >
              {/* Image Preview */}
              <div className="aspect-[3/1] bg-muted overflow-hidden">
                <img src={banner.imageUrl} alt={banner.internalTitle} className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-foreground">{banner.internalTitle}</h3>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${banner.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-xs text-muted-foreground">
                      {banner.active ? t("dash.banners.active") : t("dash.banners.inactive")}
                    </span>
                  </div>
                </div>
                
                {(banner.startDate || banner.endDate) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(banner.startDate)} - {formatDate(banner.endDate)}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditForm(banner)} className="flex-1 gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    {t("dash.banners.edit_btn")}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(banner.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardBanners;
