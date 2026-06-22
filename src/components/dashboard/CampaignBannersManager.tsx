import { useState } from "react";
import { Plus, Pencil, Trash2, X, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useBusinessUsage } from "@/hooks/useBusinessUsage";
import { ImageUploadBlocker, ImageUploadWarning } from "./ImageUploadBlocker";
import { 
  useCampaignBanners, 
  useCreateCampaignBanner, 
  useUpdateCampaignBanner, 
  useDeleteCampaignBanner,
  CampaignBanner 
} from "@/hooks/useCampaigns";

interface CampaignBannersManagerProps {
  campaignId: string;
  businessId?: string;
  onNavigateToSubscription?: () => void;
}

const CampaignBannersManager = ({ campaignId, businessId, onNavigateToSubscription }: CampaignBannersManagerProps) => {
  const { data: banners, isLoading } = useCampaignBanners(campaignId);
  const createBanner = useCreateCampaignBanner();
  const updateBanner = useUpdateCampaignBanner();
  const deleteBanner = useDeleteCampaignBanner();
  
  const { data: usageStatus } = useBusinessUsage(businessId);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<CampaignBanner | null>(null);
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    text: '',
    image_url: '',
    cta_text: '',
    cta_url: '',
    active: true,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      text: '',
      image_url: '',
      cta_text: '',
      cta_url: '',
      active: true,
    });
    setEditingBanner(null);
    setIsFormOpen(false);
  };

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (banner: CampaignBanner) => {
    setFormData({
      title: banner.title || '',
      text: banner.text || '',
      image_url: banner.image_url || '',
      cta_text: banner.cta_text || '',
      cta_url: banner.cta_url || '',
      active: banner.active,
    });
    setEditingBanner(banner);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const bannerData = {
        campaign_id: campaignId,
        title: formData.title || null,
        text: formData.text || null,
        image_url: formData.image_url || null,
        cta_text: formData.cta_text || null,
        cta_url: formData.cta_url || null,
        active: formData.active,
        sort_order: banners?.length || 0,
      };

      if (editingBanner) {
        await updateBanner.mutateAsync({ id: editingBanner.id, ...bannerData });
        toast.success("הבאנר עודכן");
      } else {
        await createBanner.mutateAsync(bannerData);
        toast.success("הבאנר נוסף");
      }
      resetForm();
    } catch (error) {
      console.error("Banner save error:", error);
      toast.error("שגיאה בשמירת הבאנר");
    }
  };

  const handleDelete = async (banner: CampaignBanner) => {
    if (!confirm('האם למחוק את הבאנר?')) return;
    
    try {
      await deleteBanner.mutateAsync({ id: banner.id, campaignId });
      toast.success("הבאנר נמחק");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("שגיאה במחיקת הבאנר");
    }
  };

  // Form View
  if (isFormOpen) {
    return (
      <div className="space-y-4">
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

        <div className="flex items-center gap-3">
          <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {editingBanner ? 'עריכת באנר' : 'הוספת באנר לקמפיין'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">כותרת הבאנר</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="כותרת הבאנר"
            />
          </div>

          <div className="space-y-2">
            <Label>תמונה</Label>
            <ImageUploadWarning
              usagePercent={usageStatus?.imageUsagePercent || 0}
              currentImages={usageStatus?.usage?.stored_images_count || 0}
              imageLimit={usageStatus?.imageLimit || 10}
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
                }
              }}
            >
              {formData.image_url ? (
                <img src={formData.image_url} alt="Preview" className="max-h-32 mx-auto rounded-lg mb-2" />
              ) : (
                <Upload className={`h-8 w-8 mx-auto mb-2 ${usageStatus?.imageUploadBlocked ? 'text-destructive/50' : 'text-muted-foreground'}`} />
              )}
              <Input
                type="url"
                value={formData.image_url}
                onChange={(e) => {
                  if (usageStatus?.imageUploadBlocked) {
                    setShowBlockerDialog(true);
                    return;
                  }
                  setFormData({ ...formData, image_url: e.target.value });
                }}
                placeholder="URL לתמונה"
                className="mt-3"
                dir="ltr"
                disabled={usageStatus?.imageUploadBlocked}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">טקסט</Label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="טקסט שיוצג על הבאנר"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta_text">טקסט כפתור</Label>
              <Input
                id="cta_text"
                value={formData.cta_text}
                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                placeholder="לדוגמה: למבצעים"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta_url">קישור</Label>
              <Input
                id="cta_url"
                value={formData.cta_url}
                onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                placeholder="#products או URL"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <Label htmlFor="active" className="cursor-pointer">באנר פעיל</Label>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={createBanner.isPending || updateBanner.isPending}>
              {editingBanner ? 'שמור' : 'הוסף באנר'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">באנרים בקמפיין</h2>
        <Button onClick={openAddForm} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          הוסף באנר
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      ) : banners?.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-lg">
          <ImageIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">עדיין אין באנרים בקמפיין</p>
          <Button onClick={openAddForm} variant="outline" size="sm">
            הוסף באנר ראשון
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {banners?.map((banner) => (
            <div 
              key={banner.id}
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              {banner.image_url && (
                <div className="aspect-[3/1] bg-muted overflow-hidden">
                  <img src={banner.image_url} alt={banner.title || ''} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm truncate">{banner.title || 'ללא כותרת'}</h4>
                  <div className={`w-2 h-2 rounded-full ${banner.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditForm(banner)} className="flex-1 gap-1">
                    <Pencil className="h-3 w-3" />
                    ערוך
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(banner)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
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

export default CampaignBannersManager;
