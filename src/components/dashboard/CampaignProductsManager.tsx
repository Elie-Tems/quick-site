import { useState } from "react";
import { Plus, Trash2, X, Package, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { 
  useCampaignProducts, 
  useCreateCampaignProduct,
  useDeleteCampaignProduct,
  useBulkAddProductsToCampaign,
  CampaignProduct 
} from "@/hooks/useCampaigns";

interface CampaignProductsManagerProps {
  campaignId: string;
  businessId?: string;
}

const CampaignProductsManager = ({ campaignId, businessId }: CampaignProductsManagerProps) => {
  const { data: campaignProducts, isLoading } = useCampaignProducts(campaignId);
  const { data: allProducts } = useProducts(businessId);
  const createProduct = useCreateCampaignProduct();
  const deleteProduct = useDeleteCampaignProduct();
  const bulkAddProducts = useBulkAddProductsToCampaign();
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    description: '',
    price: '',
    sale_price: '',
    image_url: '',
    active: true,
  });

  // Get IDs of products already in campaign
  const existingProductIds = new Set(
    campaignProducts?.filter(cp => cp.product_id).map(cp => cp.product_id) || []
  );

  // Filter available products (not already in campaign)
  const availableProducts = allProducts?.filter(
    p => !existingProductIds.has(p.id) && 
    (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkAdd = async () => {
    if (selectedProductIds.length === 0) {
      toast.error("בחרו לפחות מוצר אחד");
      return;
    }

    try {
      await bulkAddProducts.mutateAsync({
        campaignId,
        productIds: selectedProductIds,
      });
      toast.success(`${selectedProductIds.length} מוצרים נוספו לקמפיין`);
      setSelectedProductIds([]);
      setIsSelectMode(false);
    } catch (error) {
      console.error("Bulk add error:", error);
      toast.error("שגיאה בהוספת המוצרים");
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createProduct.mutateAsync({
        campaign_id: campaignId,
        product_id: null,
        is_campaign_only: true,
        name: newProductForm.name,
        description: newProductForm.description || null,
        price: parseFloat(newProductForm.price) || 0,
        sale_price: newProductForm.sale_price ? parseFloat(newProductForm.sale_price) : null,
        image_url: newProductForm.image_url || null,
        sort_order: campaignProducts?.length || 0,
        active: newProductForm.active,
      });
      toast.success("מוצר הקמפיין נוצר");
      setNewProductForm({
        name: '',
        description: '',
        price: '',
        sale_price: '',
        image_url: '',
        active: true,
      });
      setIsCreateMode(false);
    } catch (error) {
      console.error("Create product error:", error);
      toast.error("שגיאה ביצירת המוצר");
    }
  };

  const handleRemoveProduct = async (cp: CampaignProduct) => {
    const confirmMsg = cp.is_campaign_only 
      ? 'האם למחוק את מוצר הקמפיין?' 
      : 'האם להסיר את המוצר מהקמפיין?';
    
    if (!confirm(confirmMsg)) return;

    try {
      await deleteProduct.mutateAsync({ id: cp.id, campaignId });
      toast.success(cp.is_campaign_only ? "המוצר נמחק" : "המוצר הוסר מהקמפיין");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("שגיאה במחיקה");
    }
  };

  // Select existing products mode
  if (isSelectMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSelectMode(false)} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">בחר מוצרים קיימים</h2>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש מוצרים..."
            className="pr-10"
          />
        </div>

        {availableProducts.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">
              {searchQuery ? 'לא נמצאו מוצרים' : 'כל המוצרים כבר בקמפיין'}
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-2">
              {availableProducts.map((product) => {
                const isSelected = selectedProductIds.includes(product.id);
                return (
                  <div 
                    key={product.id}
                    onClick={() => toggleProductSelection(product.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <Checkbox checked={isSelected} />
                    {product.image_url && (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">₪{product.price}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                נבחרו: {selectedProductIds.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsSelectMode(false)}>
                  ביטול
                </Button>
                <Button 
                  onClick={handleBulkAdd} 
                  disabled={selectedProductIds.length === 0 || bulkAddProducts.isPending}
                >
                  הוסף לקמפיין
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Create new campaign product mode
  if (isCreateMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsCreateMode(false)} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">מוצר חדש לקמפיין</h2>
        </div>

        <form onSubmit={handleCreateProduct} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם המוצר *</Label>
            <Input
              id="name"
              value={newProductForm.name}
              onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
              placeholder="לדוגמה: משלוח פורים מיוחד"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">מחיר *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newProductForm.price}
                onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                placeholder="0.00"
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">מחיר מבצע</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                value={newProductForm.sale_price}
                onChange={(e) => setNewProductForm({ ...newProductForm, sale_price: e.target.value })}
                placeholder="0.00"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL תמונה</Label>
            <Input
              id="image_url"
              type="url"
              value={newProductForm.image_url}
              onChange={(e) => setNewProductForm({ ...newProductForm, image_url: e.target.value })}
              placeholder="https://..."
              dir="ltr"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <Label htmlFor="active" className="cursor-pointer">מוצר פעיל</Label>
            <Switch
              id="active"
              checked={newProductForm.active}
              onCheckedChange={(checked) => setNewProductForm({ ...newProductForm, active: checked })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1" disabled={createProduct.isPending}>
              צור מוצר
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsCreateMode(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">מוצרים בקמפיין</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsSelectMode(true)} variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            בחר מקיימים
          </Button>
          <Button onClick={() => setIsCreateMode(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            צור חדש
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      ) : campaignProducts?.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-lg">
          <Package className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">עדיין אין מוצרים בקמפיין</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setIsSelectMode(true)} variant="outline" size="sm">
              בחר מוצרים קיימים
            </Button>
            <Button onClick={() => setIsCreateMode(true)} size="sm">
              צור מוצר חדש
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {campaignProducts?.map((cp) => {
            // Get product details
            const displayName = cp.is_campaign_only ? cp.name : cp.product?.name || 'מוצר';
            const displayPrice = cp.is_campaign_only ? cp.price : cp.product?.price || 0;
            const displayImage = cp.is_campaign_only ? cp.image_url : cp.product?.image_url;
            
            return (
              <div 
                key={cp.id}
                className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border"
              >
                {displayImage ? (
                  <img 
                    src={displayImage} 
                    alt={displayName || ''}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{displayName}</p>
                    {cp.is_campaign_only && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                        ייחודי לקמפיין
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ₪{displayPrice}
                    {cp.sale_price && (
                      <span className="text-green-600 mr-2">← ₪{cp.sale_price}</span>
                    )}
                  </p>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemoveProduct(cp)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignProductsManager;
