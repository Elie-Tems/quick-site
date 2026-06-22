import { useState } from "react";
import { Download, Package, Image as ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIImageJobs } from "@/hooks/useAIImageEngine";
import { useProducts, useUpdateProduct } from "@/hooks/useProducts";
import { useBanners, useUpdateBanner } from "@/hooks/useBanners";
import { useMyBusiness, useUpdateBusiness } from "@/hooks/useBusiness";
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
  const { data: business } = useMyBusiness();
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

  // Debug logs
  console.log("DashboardAIGeneratedImages - business ID:", business?.id);
  console.log("DashboardAIGeneratedImages - jobs:", jobs);
  console.log("DashboardAIGeneratedImages - isLoading:", isLoading);

  // Filter only completed jobs with generated images
  const completedImages = jobs?.filter(
    (job) => job.status === "completed" && job.generated_image_url
  ) || [];
  
  console.log("DashboardAIGeneratedImages - completedImages:", completedImages);

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
      toast.success("התמונה הורדה בהצלחה");
    } catch (error) {
      toast.error("שגיאה בהורדת התמונה");
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
          toast.error("לא נמצא מזהה עסק");
          return;
        }
        
        await updateBusiness.mutateAsync({
          id: business.id,
          hero_image_url: selectedImage,
        });
        toast.success("התמונה שויכה לתמונת רקע ראשית");
      } else if (assignType === 'banner' && selectedTargetId) {
        // Assign to Banner
        await updateBanner.mutateAsync({
          id: selectedTargetId,
          image_url: selectedImage,
        });
        toast.success("התמונה שויכה לבאנר");
      } else if (assignType === 'product' && selectedTargetId) {
        // Assign to Product
        await updateProduct.mutateAsync({
          id: selectedTargetId,
          image_url: selectedImage,
        });
        toast.success("התמונה שויכה למוצר");
      }

      setAssignDialogOpen(false);
      setSelectedImage(null);
      setAssignType(null);
      setSelectedTargetId("");
    } catch (error) {
      toast.error("שגיאה בשיוך התמונה");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (completedImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">אין תמונות שנוצרו</h3>
        <p className="text-muted-foreground">
          התמונות שתיצור בעזרת AI יופיעו כאן
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">תמונות שנוצרו ב-AI</h2>
          <p className="text-muted-foreground">
            {completedImages.length} תמונות זמינות
          </p>
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {completedImages.map((job) => (
          <div
            key={job.id}
            className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
          >
            <img
              src={job.generated_image_url!}
              alt="AI Generated"
              className="w-full h-full object-cover"
            />
            
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDownload(job.generated_image_url!, job.id)}
                className="w-full"
              >
                <Download className="h-4 w-4 ml-1" />
                הורד
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleAssignImage(job.generated_image_url!)}
                className="w-full"
              >
                <Package className="h-4 w-4 ml-1" />
                שייך
              </Button>
            </div>

            {/* Info badge */}
            <Badge className="absolute top-2 right-2 text-xs">
              {job.style_type}
            </Badge>
          </div>
        ))}
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>שיוך תמונה</DialogTitle>
            <DialogDescription>
              בחר לאן תרצה לשייך את התמונה
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
              <label className="text-sm font-medium">סוג שיוך</label>
              <Select
                value={assignType || ""}
                onValueChange={(value) => {
                  setAssignType(value as 'product' | 'banner' | 'hero');
                  setSelectedTargetId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג שיוך" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">תמונת רקע ראשית (Hero)</SelectItem>
                  <SelectItem value="banner">באנר</SelectItem>
                  <SelectItem value="product">מוצר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Selection */}
            {assignType === 'banner' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">בחר באנר</label>
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר באנר" />
                  </SelectTrigger>
                  <SelectContent>
                    {banners?.map((banner) => (
                      <SelectItem key={banner.id} value={banner.id}>
                        באנר {banner.title || banner.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignType === 'product' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">בחר מוצר</label>
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מוצר" />
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
              ביטול
            </Button>
            <Button
              onClick={handleAssignConfirm}
              disabled={
                !assignType ||
                (assignType !== 'hero' && !selectedTargetId)
              }
              className="flex-1"
            >
              שייך
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardAIGeneratedImages;
