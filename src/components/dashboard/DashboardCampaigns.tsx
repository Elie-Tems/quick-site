import { useState } from "react";
import { Plus, Pencil, Trash2, X, Power, PowerOff, Calendar, ChevronRight, Image, Package, LayoutList, Megaphone, Clock, Info, Copy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  useCampaigns, 
  useCreateCampaign, 
  useUpdateCampaign, 
  useDeleteCampaign,
  useToggleCampaignActive,
  useDuplicateCampaign,
  Campaign 
} from "@/hooks/useCampaigns";
import CampaignBannersManager from "./CampaignBannersManager";
import CampaignProductsManager from "./CampaignProductsManager";
import CampaignPreviewDialog from "./CampaignPreviewDialog";

interface DashboardCampaignsProps {
  businessId?: string;
  onNavigateToSubscription?: () => void;
}

type CampaignTab = 'details' | 'banners' | 'products';

const DashboardCampaigns = ({ businessId, onNavigateToSubscription }: DashboardCampaignsProps) => {
  const { data: campaigns, isLoading } = useCampaigns(businessId);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const toggleActive = useToggleCampaignActive();
  const duplicateCampaign = useDuplicateCampaign();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState<CampaignTab>('details');
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [campaignToDuplicate, setCampaignToDuplicate] = useState<Campaign | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    display_mode: 'replace' as 'replace' | 'add' | 'prioritize' | 'all',
    is_active: false,
    popup_enabled: false,
    popup_title: '',
    popup_text: '',
    popup_cta_text: '',
    popup_cta_url: '',
    popup_coupon_code: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      display_mode: 'replace',
      is_active: false,
      popup_enabled: false,
      popup_title: '',
      popup_text: '',
      popup_cta_text: '',
      popup_cta_url: '',
      popup_coupon_code: '',
    });
    setEditingCampaign(null);
    setIsFormOpen(false);
    setActiveTab('details');
  };

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
      end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
      display_mode: campaign.display_mode,
      is_active: campaign.is_active,
      popup_enabled: campaign.popup_enabled || false,
      popup_title: campaign.popup_title || '',
      popup_text: campaign.popup_text || '',
      popup_cta_text: campaign.popup_cta_text || '',
      popup_cta_url: campaign.popup_cta_url || '',
      popup_coupon_code: campaign.popup_coupon_code || '',
    });
    setEditingCampaign(campaign);
    setIsFormOpen(true);
    setActiveTab('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessId) {
      toast.error("שגיאה: לא נמצא עסק");
      return;
    }

    try {
      const campaignData = {
        business_id: businessId,
        name: formData.name,
        description: formData.description || null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        display_mode: formData.display_mode,
        is_active: formData.is_active,
        popup_enabled: formData.popup_enabled,
        popup_title: formData.popup_title || null,
        popup_text: formData.popup_text || null,
        popup_cta_text: formData.popup_cta_text || null,
        popup_cta_url: formData.popup_cta_url || null,
        popup_coupon_code: formData.popup_coupon_code || null,
      };

      if (editingCampaign) {
        await updateCampaign.mutateAsync({ id: editingCampaign.id, ...campaignData });
        toast.success("הקמפיין עודכן בהצלחה");
      } else {
        const newCampaign = await createCampaign.mutateAsync(campaignData);
        setEditingCampaign(newCampaign);
        toast.success("הקמפיין נוצר בהצלחה");
        // Stay in form to add banners/products
        setActiveTab('banners');
        return; // Don't reset form
      }
      resetForm();
    } catch (error) {
      console.error("Campaign save error:", error);
      toast.error("שגיאה בשמירת הקמפיין");
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`האם למחוק את הקמפיין "${campaign.name}"?`)) return;
    
    try {
      await deleteCampaign.mutateAsync({ id: campaign.id, businessId: campaign.business_id });
      toast.success("הקמפיין נמחק");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("שגיאה במחיקת הקמפיין");
    }
  };

  const handleToggleActive = async (campaign: Campaign) => {
    try {
      await toggleActive.mutateAsync({
        id: campaign.id,
        isActive: !campaign.is_active,
        businessId: campaign.business_id,
      });
      toast.success(campaign.is_active ? "הקמפיין כובה" : "הקמפיין הופעל");
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error("שגיאה בעדכון סטטוס הקמפיין");
    }
  };

  const openDuplicateDialog = (campaign: Campaign) => {
    setCampaignToDuplicate(campaign);
    setDuplicateName(`${campaign.name} (עותק)`);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicate = async () => {
    if (!campaignToDuplicate || !businessId || !duplicateName.trim()) return;
    
    try {
      await duplicateCampaign.mutateAsync({
        campaignId: campaignToDuplicate.id,
        businessId,
        newName: duplicateName.trim(),
      });
      toast.success("הקמפיין שוכפל בהצלחה");
      setDuplicateDialogOpen(false);
      setCampaignToDuplicate(null);
      setDuplicateName('');
    } catch (error) {
      console.error("Duplicate error:", error);
      toast.error("שגיאה בשכפול הקמפיין");
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const getScheduleStatus = (campaign: Campaign) => {
    const now = new Date();
    const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
    
    if (!startDate && !endDate) return null;
    
    if (startDate && startDate > now) {
      return { type: 'scheduled', text: `מתוזמן להפעלה ב-${formatDate(campaign.start_date)}` };
    }
    if (endDate && endDate < now) {
      return { type: 'ended', text: `הסתיים ב-${formatDate(campaign.end_date)}` };
    }
    if (startDate && endDate) {
      return { type: 'active-period', text: `פעיל עד ${formatDate(campaign.end_date)}` };
    }
    if (endDate) {
      return { type: 'active-period', text: `פעיל עד ${formatDate(campaign.end_date)}` };
    }
    return null;
  };

  const displayModeLabels = {
    replace: 'ראש הדף',
    add: 'בין המוצרים',
    prioritize: 'מעל המוצרים',
    all: 'כל המיקומים',
  };

  // Form View
  if (isFormOpen) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground flex-1">
            {editingCampaign ? `עריכת פרסום: ${editingCampaign.name}` : 'פרסום חדש'}
          </h1>
          {editingCampaign && (
            <button
              onClick={() => setPreviewCampaign(editingCampaign)}
              className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
            >
              <Eye className="h-4 w-4" />
              הצג בחנות
            </button>
          )}
        </div>

        {editingCampaign ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CampaignTab)}>
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
              <TabsTrigger value="details" className="gap-1.5">
                <LayoutList className="h-4 w-4" />
                פרטים
              </TabsTrigger>
              <TabsTrigger value="banners" className="gap-1.5">
                <Image className="h-4 w-4" />
                באנרים
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-1.5">
                <Package className="h-4 w-4" />
                מוצרים
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <CampaignDetailsForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                onCancel={resetForm}
                isEditing={!!editingCampaign}
                isSubmitting={updateCampaign.isPending}
              />
            </TabsContent>

            <TabsContent value="banners">
              <CampaignBannersManager 
                campaignId={editingCampaign.id}
                businessId={businessId}
                onNavigateToSubscription={onNavigateToSubscription}
              />
            </TabsContent>

            <TabsContent value="products">
              <CampaignProductsManager 
                campaignId={editingCampaign.id}
                businessId={businessId}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <CampaignDetailsForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            isEditing={false}
            isSubmitting={createCampaign.isPending}
          />
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">פרסום באתר</h1>
          <p className="text-sm text-muted-foreground mt-1">
            קדם מוצרים ומבצעים בתוך החנות שלך
          </p>
        </div>
        <Button onClick={openAddForm} className="gap-1.5">
          <Plus className="h-4 w-4" />
          פרסום חדש
        </Button>
      </div>

      {/* Active campaign indicator */}
      {campaigns?.some(c => c.is_active) && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              פרסום פעיל: {campaigns.find(c => c.is_active)?.name}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              התוכן מוצג בחנות לפי הגדרות הקמפיין
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">טוען פרסומים...</p>
        </div>
      ) : campaigns?.length === 0 ? (
        <div className="space-y-6">
          {/* Explanation */}
          <div className="rounded-xl border border-border bg-muted/20 p-6 text-right">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 rounded-xl p-3 shrink-0">
                <Megaphone className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">פרסום בתוך החנות שלך</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  פרסום באתר מאפשר לך לקדם מוצרים ומבצעים <b>ישירות בחנות שלך</b>. מוסיפים באנרים, חלון קופץ עם מבצע, ומוצרים ייעודיים שיקפצו לעין.
                </p>
                <Button onClick={openAddForm} className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" />
                  צור פרסום ראשון
                </Button>
              </div>
            </div>
          </div>

          {/* Visual demos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Banner demo */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground font-medium border-b">
                דוגמה - באנר בראש החנות
              </div>
              <div className="p-4">
                <div className="rounded-lg bg-primary text-primary-foreground px-4 py-3 text-center space-y-1">
                  <p className="font-bold text-sm">🌸 מבצעי פורים - עד 30% הנחה!</p>
                  <p className="text-xs opacity-80">הנחה אוטומטית בסל הקניות</p>
                </div>
              </div>
            </div>

            {/* Popup demo */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground font-medium border-b">
                דוגמה - חלון מבצע קופץ
              </div>
              <div className="p-4 flex justify-center">
                <div className="bg-background rounded-xl border shadow-lg p-5 max-w-[220px] w-full text-center space-y-2">
                  <p className="font-bold text-sm">ברוכים הבאים! 🎉</p>
                  <p className="text-xs text-muted-foreground">15% הנחה על הזמנה ראשונה</p>
                  <div className="bg-primary/10 text-primary font-mono font-bold px-3 py-1.5 rounded-lg text-xs inline-block">
                    WELCOME15
                  </div>
                  <button className="w-full bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-medium">
                    קנו עכשיו
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns?.map((campaign) => (
            <div 
              key={campaign.id}
              className={`bg-card rounded-xl border shadow-soft overflow-hidden transition-all ${
                campaign.is_active 
                  ? 'border-green-500 ring-2 ring-green-500/20' 
                  : 'border-border'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        campaign.is_active 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {campaign.is_active ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground truncate">{campaign.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          campaign.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-muted'
                        }`}>
                          {campaign.is_active ? 'פעיל' : 'לא פעיל'}
                        </span>
                        <span>•</span>
                        <span>{displayModeLabels[campaign.display_mode]}</span>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const scheduleStatus = getScheduleStatus(campaign);
                    if (!scheduleStatus) return null;
                    
                    return (
                      <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                        scheduleStatus.type === 'scheduled' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : scheduleStatus.type === 'ended'
                          ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                      }`}>
                        <Clock className="h-3 w-3" />
                        <span>{scheduleStatus.text}</span>
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-2">
                    <Button 
                      variant={campaign.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(campaign)}
                      disabled={toggleActive.isPending}
                      className="gap-1.5"
                    >
                      {campaign.is_active ? (
                        <>
                          <PowerOff className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">כבה</span>
                        </>
                      ) : (
                        <>
                          <Power className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">הפעל</span>
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditForm(campaign)}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">ערוך</span>
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPreviewCampaign(campaign)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>תצוגה מקדימה</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openDuplicateDialog(campaign)}
                            disabled={duplicateCampaign.isPending}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>שכפל קמפיין</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(campaign)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {campaign.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {campaign.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>שכפול קמפיין</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              הקמפיין החדש יכלול את כל הבאנרים והמוצרים מהקמפיין המקורי.
              התאריכים יאופסו והקמפיין יתחיל כלא פעיל.
            </p>
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">שם הקמפיין החדש</Label>
              <Input
                id="duplicate-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="הזן שם לקמפיין החדש"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleDuplicate} 
              disabled={!duplicateName.trim() || duplicateCampaign.isPending}
              className="gap-1.5"
            >
              <Copy className="h-4 w-4" />
              {duplicateCampaign.isPending ? 'משכפל...' : 'שכפל קמפיין'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Preview Dialog */}
      {previewCampaign && (
        <CampaignPreviewDialog
          campaign={previewCampaign}
          open={!!previewCampaign}
          onOpenChange={(open) => !open && setPreviewCampaign(null)}
        />
      )}
    </div>
  );
};

// Separated form component for reuse
interface CampaignFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  display_mode: 'replace' | 'add' | 'prioritize' | 'all';
  is_active: boolean;
  popup_enabled: boolean;
  popup_title: string;
  popup_text: string;
  popup_cta_text: string;
  popup_cta_url: string;
  popup_coupon_code: string;
}

interface CampaignDetailsFormProps {
  formData: CampaignFormData;
  setFormData: React.Dispatch<React.SetStateAction<CampaignFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  isSubmitting: boolean;
}

const CampaignDetailsForm = ({ formData, setFormData, onSubmit, onCancel, isEditing, isSubmitting }: CampaignDetailsFormProps) => {
  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">שם הפרסום *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="לדוגמה: פורים 2026, קולקציה חדשה, מבצע סוף עונה"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">תיאור</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="תיאור קצר של הקמפיין"
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label>תזמון אוטומטי</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-right" side="top">
                <p>הקמפיין יופעל ויכובה אוטומטית לפי התאריכים שהגדרת. אם אין תאריכים, הקמפיין יפעל רק בהפעלה ידנית.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date" className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5" />
              תאריך התחלה
            </Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date" className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5" />
              תאריך סיום
            </Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>

        {(formData.start_date || formData.end_date) && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {formData.start_date && formData.end_date ? (
                <>הקמפיין יופעל אוטומטית ב-{new Date(formData.start_date).toLocaleDateString('he-IL')} ויכובה ב-{new Date(formData.end_date).toLocaleDateString('he-IL')}</>
              ) : formData.start_date ? (
                <>הקמפיין יופעל אוטומטית ב-{new Date(formData.start_date).toLocaleDateString('he-IL')}</>
              ) : (
                <>הקמפיין יכובה אוטומטית ב-{new Date(formData.end_date).toLocaleDateString('he-IL')}</>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>מיקום הפרסום באתר</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            {
              value: 'replace',
              label: 'ראש הדף',
              desc: 'באנר מעל הכל',
              diagram: (
                <div className="w-full space-y-0.5">
                  <div className="h-2.5 w-full rounded-sm bg-primary/70" />
                  <div className="h-1 w-full rounded-sm bg-muted" />
                  <div className="grid grid-cols-3 gap-0.5">
                    {[0,1,2].map(i => <div key={i} className="h-2 rounded-sm bg-muted" />)}
                  </div>
                </div>
              ),
            },
            {
              value: 'prioritize',
              label: 'מעל המוצרים',
              desc: 'אחרי ה-hero',
              diagram: (
                <div className="w-full space-y-0.5">
                  <div className="h-1 w-full rounded-sm bg-muted" />
                  <div className="h-2.5 w-full rounded-sm bg-primary/70" />
                  <div className="grid grid-cols-3 gap-0.5">
                    {[0,1,2].map(i => <div key={i} className="h-2 rounded-sm bg-muted" />)}
                  </div>
                </div>
              ),
            },
            {
              value: 'add',
              label: 'בין המוצרים',
              desc: 'משולב בגריד',
              diagram: (
                <div className="w-full space-y-0.5">
                  <div className="h-1 w-full rounded-sm bg-muted" />
                  <div className="grid grid-cols-3 gap-0.5">
                    <div className="h-2 rounded-sm bg-muted" />
                    <div className="h-2 rounded-sm bg-primary/70" />
                    <div className="h-2 rounded-sm bg-muted" />
                  </div>
                  <div className="grid grid-cols-3 gap-0.5">
                    {[0,1,2].map(i => <div key={i} className="h-2 rounded-sm bg-muted" />)}
                  </div>
                </div>
              ),
            },
            {
              value: 'all',
              label: 'כל הבאנרים',
              desc: 'בכל המיקומים',
              diagram: (
                <div className="w-full space-y-0.5">
                  <div className="h-2 w-full rounded-sm bg-primary/70" />
                  <div className="h-2 w-full rounded-sm bg-primary/50" />
                  <div className="grid grid-cols-3 gap-0.5">
                    <div className="h-2 rounded-sm bg-muted" />
                    <div className="h-2 rounded-sm bg-primary/30" />
                    <div className="h-2 rounded-sm bg-muted" />
                  </div>
                </div>
              ),
            },
          ] as const).map(({ value, label, desc, diagram }) => {
            const active = formData.display_mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, display_mode: value })}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 bg-background'
                }`}
              >
                <div className="w-full px-1">{diagram}</div>
                <div>
                  <div className={`text-xs font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{label}</div>
                  <div className="text-[10px] text-muted-foreground">{desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <Label htmlFor="is_active" className="cursor-pointer">
          <div className="font-medium">הפעל קמפיין מיד</div>
          <div className="text-sm text-muted-foreground font-normal">ניתן להפעיל גם אחר כך</div>
        </Label>
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>

      {/* Promotional popup - shows once per visitor session while the campaign is active */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="popup_enabled" className="cursor-pointer">
            <div className="font-medium">חלון מבצע קופץ (פופאפ) בחנות</div>
            <div className="text-sm text-muted-foreground font-normal">מוצג פעם אחת לכל מבקר, אחרי כמה שניות בחנות</div>
          </Label>
          <Switch
            id="popup_enabled"
            checked={formData.popup_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, popup_enabled: checked })}
          />
        </div>

        {formData.popup_enabled && (
          <div className="space-y-3 pt-1">
            <div>
              <Label>כותרת</Label>
              <Input value={formData.popup_title} maxLength={60}
                onChange={(e) => setFormData({ ...formData, popup_title: e.target.value })}
                placeholder="מבצע השקה! 15% הנחה" />
            </div>
            <div>
              <Label>טקסט</Label>
              <Textarea value={formData.popup_text} maxLength={200} rows={2}
                onChange={(e) => setFormData({ ...formData, popup_text: e.target.value })}
                placeholder="רק השבוע - 15% הנחה על כל החנות. הזדרזו!" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>קוד קופון (לא חובה)</Label>
                <Input value={formData.popup_coupon_code} maxLength={30}
                  onChange={(e) => setFormData({ ...formData, popup_coupon_code: e.target.value })}
                  placeholder="WELCOME15" />
              </div>
              <div>
                <Label>טקסט כפתור (לא חובה)</Label>
                <Input value={formData.popup_cta_text} maxLength={30}
                  onChange={(e) => setFormData({ ...formData, popup_cta_text: e.target.value })}
                  placeholder="קנו עכשיו" />
              </div>
            </div>
            <div>
              <Label>קישור לכפתור (לא חובה)</Label>
              <Input value={formData.popup_cta_url} dir="ltr"
                onChange={(e) => setFormData({ ...formData, popup_cta_url: e.target.value })}
                placeholder="#products" />
            </div>
            <p className="text-xs text-muted-foreground">הפופאפ מופיע רק כשהפרסום פעיל. הזינו לפחות כותרת או טקסט.</p>

            {(formData.popup_title || formData.popup_text) && (
              <div className="mt-3 rounded-lg border border-dashed p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">כך ייראה החלון הקופץ:</p>
                <div className="bg-background rounded-xl border shadow-lg p-5 max-w-xs mx-auto text-center space-y-2">
                  {formData.popup_title && <h3 className="font-bold text-lg">{formData.popup_title}</h3>}
                  {formData.popup_text && <p className="text-sm text-muted-foreground">{formData.popup_text}</p>}
                  {formData.popup_coupon_code && (
                    <div className="bg-primary/10 text-primary font-mono font-bold px-3 py-1.5 rounded-lg text-sm inline-block">
                      {formData.popup_coupon_code}
                    </div>
                  )}
                  {formData.popup_cta_text && (
                    <button className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium">
                      {formData.popup_cta_text}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'שומר...' : isEditing ? 'שמור שינויים' : 'צור פרסום'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </form>
  );
};

export default DashboardCampaigns;
