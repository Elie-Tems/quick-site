import { useState } from "react";
import { Tag, Percent, Check, X, Package, Search, Flame, DollarSign, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type DiscountType = "fixed" | "percentage";
export interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number | null;
  is_on_sale?: boolean;
  is_hot?: boolean;
  imageUrl?: string;
}

interface DashboardSalesProps {
  products: Product[];
  onProductUpdate: (productId: string, updates: { sale_price?: number | null; is_on_sale?: boolean; is_hot?: boolean; sale_end_date?: string | null }) => void;
  onBulkUpdate?: (updates: { sale_price?: number | null; is_on_sale?: boolean; sale_end_date?: string | null }, productIds?: string[]) => void;
  isLoading?: boolean;
  businessType?: string;
}

const DashboardSales = ({ products, onProductUpdate, onBulkUpdate, isLoading, businessType }: DashboardSalesProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountPercent, setDiscountPercent] = useState('');
  const [showSitewideSale, setShowSitewideSale] = useState(false);
  const [sitewidePercent, setSitewidePercent] = useState('');
  const [sitewideEndDate, setSitewideEndDate] = useState<Date | undefined>(undefined);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    return product.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const productsOnSale = products.filter(p => p.is_on_sale);
  const hotProducts = products.filter(p => p.is_hot);

  const handleToggleSale = (product: Product) => {
    if (product.is_on_sale) {
      // Turn off sale
      onProductUpdate(product.id, { sale_price: null, is_on_sale: false });
      toast.success(`המבצע על "${product.name}" הוסר`);
    } else {
      // Open dialog to set sale price
      setEditingProduct(product);
      setDiscountType('percentage');
      setDiscountPercent('');
      setSalePrice('');
    }
  };

  const handleToggleHot = (product: Product) => {
    const newHotStatus = !product.is_hot;
    onProductUpdate(product.id, { is_hot: newHotStatus });
    toast.success(newHotStatus 
      ? `"${product.name}" סומן כמוצר חם` 
      : `"${product.name}" הוסר מהמוצרים החמים`
    );
  };

  const handleSaveSale = () => {
    if (!editingProduct) return;
    
    let finalSalePrice: number;
    
    if (discountType === 'percentage') {
      const percent = parseFloat(discountPercent);
      if (isNaN(percent) || percent <= 0 || percent >= 100) {
        toast.error('יש להזין אחוז הנחה תקין (1-99)');
        return;
      }
      finalSalePrice = Math.round(editingProduct.price * (1 - percent / 100));
    } else {
      const price = parseFloat(salePrice);
      if (isNaN(price) || price <= 0) {
        toast.error('יש להזין מחיר מבצע תקין');
        return;
      }
      if (price >= editingProduct.price) {
        toast.error('מחיר המבצע חייב להיות נמוך מהמחיר הרגיל');
        return;
      }
      finalSalePrice = price;
    }
    
    onProductUpdate(editingProduct.id, { sale_price: finalSalePrice, is_on_sale: true });
    toast.success(`מבצע על "${editingProduct.name}" הופעל`);
    setEditingProduct(null);
    setSalePrice('');
    setDiscountPercent('');
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    if (product.sale_price) {
      const existingPercent = calculateDiscount(product.price, product.sale_price);
      setDiscountType('percentage');
      setDiscountPercent(existingPercent.toString());
      setSalePrice(product.sale_price.toString());
    } else {
      setDiscountType('percentage');
      setDiscountPercent('');
      setSalePrice('');
    }
  };

  const calculateDiscount = (originalPrice: number, salePrice: number) => {
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  };

  const handleApplySitewideSale = () => {
    const percent = parseFloat(sitewidePercent);
    if (isNaN(percent) || percent <= 0 || percent >= 100) {
      toast.error('יש להזין אחוז הנחה תקין (1-99)');
      return;
    }
    
    const endDateStr = sitewideEndDate ? sitewideEndDate.toISOString() : null;
    
    if (onBulkUpdate) {
      // Use bulk update if available
      const updates = products.map(product => ({
        id: product.id,
        sale_price: Math.round(product.price * (1 - percent / 100)),
        is_on_sale: true,
        sale_end_date: endDateStr,
      }));
      onBulkUpdate({ is_on_sale: true, sale_end_date: endDateStr }, products.map(p => p.id));
      
      // Still need to update individual sale prices
      products.forEach(product => {
        const newSalePrice = Math.round(product.price * (1 - percent / 100));
        onProductUpdate(product.id, { sale_price: newSalePrice, is_on_sale: true, sale_end_date: endDateStr });
      });
    } else {
      products.forEach(product => {
        const newSalePrice = Math.round(product.price * (1 - percent / 100));
        onProductUpdate(product.id, { sale_price: newSalePrice, is_on_sale: true, sale_end_date: endDateStr });
      });
    }
    
    const endDateMsg = sitewideEndDate ? ` (עד ${format(sitewideEndDate, 'dd/MM/yyyy', { locale: he })})` : '';
    toast.success(`מבצע ${percent}% הופעל על כל ${products.length} המוצרים${endDateMsg}`);
    setShowSitewideSale(false);
    setSitewidePercent('');
    setSitewideEndDate(undefined);
  };

  const handleRemoveSitewideSale = () => {
    const onSaleProducts = products.filter(p => p.is_on_sale);
    onSaleProducts.forEach(product => {
      onProductUpdate(product.id, { sale_price: null, is_on_sale: false, sale_end_date: null });
    });
    toast.success(`המבצע הוסר מ-${onSaleProducts.length} מוצרים`);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const ProductList = ({ showHotToggle = false }: { showHotToggle?: boolean }) => (
    <div className="space-y-3">
      {filteredProducts.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-xl">
          <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">לא נמצאו מוצרים עבור "{searchQuery}"</p>
        </div>
      ) : (
        filteredProducts.map((product) => (
          <div 
            key={product.id}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
              showHotToggle
                ? product.is_hot 
                  ? 'bg-orange-500/10 border-orange-500/30' 
                  : 'bg-card border-border'
                : product.is_on_sale 
                  ? 'bg-primary/5 border-primary/30' 
                  : 'bg-card border-border'
            }`}
          >
            {/* Image */}
            <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                {product.is_hot && !showHotToggle && (
                  <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {!showHotToggle && product.is_on_sale && product.sale_price ? (
                  <>
                    <span className="text-sm font-bold text-red-500">
                      {formatPrice(product.sale_price)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded">
                      -{calculateDiscount(product.price, product.sale_price)}%
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-2">
              {showHotToggle ? (
                <Switch
                  checked={product.is_hot || false}
                  onCheckedChange={() => handleToggleHot(product)}
                />
              ) : (
                <>
                  {product.is_on_sale ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                        className="text-primary"
                      >
                        ערוך
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSale(product)}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleSale(product)}
                      className="gap-1.5 border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <Percent className="h-3.5 w-3.5" />
                      הוסף מבצע
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Colorful vacation-aware header */}
      <div className="rounded-2xl bg-gradient-to-l from-orange-500/15 to-amber-500/5 border border-orange-500/20 p-5 flex items-center gap-4">
        <div className="text-4xl">{businessType === "vacation" ? "🌅" : "🔥"}</div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {businessType === "vacation" ? "הנחות עונתיות" : "מבצעים"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {businessType === "vacation" ? "הנחות לסוף עונה, ימי חול, הזמנות מוקדמות" : "מוצרים במבצע ועסקאות מיוחדות"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary/10 rounded-xl p-4">
          <p className="text-2xl font-bold text-primary">{productsOnSale.length}</p>
          <p className="text-xs text-muted-foreground">במבצע</p>
        </div>
        <div className="bg-orange-500/10 rounded-xl p-4">
          <p className="text-2xl font-bold text-orange-500">{hotProducts.length}</p>
          <p className="text-xs text-muted-foreground">מוצרים חמים</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{products.length}</p>
          <p className="text-xs text-muted-foreground">סה"כ</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales" className="gap-2">
            <Percent className="h-4 w-4" />
            מבצעים
          </TabsTrigger>
          <TabsTrigger value="hot" className="gap-2">
            <Flame className="h-4 w-4" />
            מוצרים מובילים
          </TabsTrigger>
        </TabsList>

        {/* Search - shared */}
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש מוצר..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        <TabsContent value="sales" className="space-y-6">
          {products.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">אין מוצרים עדיין</p>
              <p className="text-sm text-muted-foreground">הוסף מוצרים כדי להגדיר מבצעים</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Two clear options */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Option 1: Sitewide Sale */}
                <div 
                  onClick={() => setShowSitewideSale(true)}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                    showSitewideSale 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl">
                      <Tag className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-1">מבצע לכל המוצרים</h3>
                      <p className="text-sm text-muted-foreground">
                        החל הנחה אחידה על כל {products.length} המוצרים בחנות
                      </p>
                      {productsOnSale.length > 0 && productsOnSale.length === products.length && (
                        <div className="flex items-center gap-2 mt-2 text-green-600">
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-medium">מבצע פעיל</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Option 2: Individual Products */}
                <div 
                  onClick={() => setShowSitewideSale(false)}
                  className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                    !showSitewideSale 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-1">מבצע לפי פריט</h3>
                      <p className="text-sm text-muted-foreground">
                        הגדר הנחות שונות למוצרים ספציפיים
                      </p>
                      {productsOnSale.length > 0 && productsOnSale.length < products.length && (
                        <div className="flex items-center gap-2 mt-2 text-green-600">
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-medium">{productsOnSale.length} מוצרים במבצע</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content based on selection */}
              {showSitewideSale ? (
                <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Percent className="h-5 w-5 text-primary" />
                      הגדרת מבצע כללי
                    </h3>
                    {productsOnSale.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveSitewideSale}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                      >
                        <X className="h-4 w-4" />
                        הסר מבצעים
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sitewidePercent">אחוז הנחה (%)</Label>
                      <Input
                        id="sitewidePercent"
                        type="number"
                        min="1"
                        max="99"
                        value={sitewidePercent}
                        onChange={(e) => setSitewidePercent(e.target.value)}
                        placeholder="לדוגמה: 20"
                        dir="ltr"
                        className="text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>תאריך סיום (אופציונלי)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-right font-normal h-11",
                              !sitewideEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {sitewideEndDate ? format(sitewideEndDate, "dd/MM/yyyy", { locale: he }) : "ללא הגבלה"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={sitewideEndDate}
                            onSelect={setSitewideEndDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                          {sitewideEndDate && (
                            <div className="p-2 border-t">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSitewideEndDate(undefined)}
                                className="w-full text-destructive"
                              >
                                הסר תאריך סיום
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {sitewidePercent && parseFloat(sitewidePercent) > 0 && parseFloat(sitewidePercent) < 100 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-sm text-green-600 font-medium">
                        ✓ דוגמה: מוצר ב-{formatPrice(100)} יעלה {formatPrice(Math.round(100 * (1 - parseFloat(sitewidePercent) / 100)))}
                      </p>
                    </div>
                  )}

                  <Button onClick={handleApplySitewideSale} className="w-full gap-2 h-12 text-base">
                    <Check className="h-5 w-5" />
                    החל מבצע על {products.length} מוצרים
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">בחר מוצרים למבצע</h3>
                    {productsOnSale.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveSitewideSale}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                      >
                        <X className="h-4 w-4" />
                        הסר הכל
                      </Button>
                    )}
                  </div>
                  <ProductList showHotToggle={false} />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hot" className="space-y-6">
          {products.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">אין מוצרים עדיין</p>
              <p className="text-sm text-muted-foreground">הוסף מוצרים כדי לסמן מוצרים מובילים</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Explanation Card */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-500/10 p-3 rounded-xl">
                    <Flame className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">מוצרים בעדיפות עליונה</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      מוצרים אלו יוצגו בולטים יותר בראש רשימת המוצרים בחנות שלך.
                      <br />
                      השתמש בזה כדי לקדם מוצרים חדשים או פופולריים.
                    </p>
                    {hotProducts.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 text-orange-500">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">{hotProducts.length} מוצרים מובילים נבחרו</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Products List with better visual */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">בחר מוצרים להצגה בולטת</h3>
                <ProductList showHotToggle={true} />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Sale Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              הגדרת מחיר מבצע
            </DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded bg-background flex items-center justify-center">
                  {editingProduct.imageUrl ? (
                    <img src={editingProduct.imageUrl} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{editingProduct.name}</p>
                  <p className="text-sm text-muted-foreground">מחיר רגיל: {formatPrice(editingProduct.price)}</p>
                </div>
              </div>

              {/* Discount Type Selection */}
              <div className="space-y-3">
                <Label>סוג הנחה</Label>
                <RadioGroup
                  value={discountType}
                  onValueChange={(value) => setDiscountType(value as DiscountType)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    discountType === 'percentage' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}>
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Percent className="h-4 w-4 text-primary" />
                      אחוז הנחה
                    </Label>
                  </div>
                  <div className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    discountType === 'fixed' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}>
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed" className="flex items-center gap-2 cursor-pointer flex-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      מחיר קבוע
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Input based on discount type */}
              {discountType === 'percentage' ? (
                <div className="space-y-2">
                  <Label htmlFor="discountPercent">אחוז הנחה (%)</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    min="1"
                    max="99"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="לדוגמה: 20"
                    dir="ltr"
                  />
                  {discountPercent && parseFloat(discountPercent) > 0 && parseFloat(discountPercent) < 100 && (
                    <p className="text-sm text-green-600">
                      מחיר סופי: {formatPrice(Math.round(editingProduct.price * (1 - parseFloat(discountPercent) / 100)))}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="salePrice">מחיר מבצע (₪)</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="הזן מחיר מבצע"
                    dir="ltr"
                  />
                  {salePrice && parseFloat(salePrice) > 0 && parseFloat(salePrice) < editingProduct.price && (
                    <p className="text-sm text-green-600">
                      הנחה של {calculateDiscount(editingProduct.price, parseFloat(salePrice))}%
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveSale} className="flex-1 gap-2">
                  <Check className="h-4 w-4" />
                  הפעל מבצע
                </Button>
                <Button variant="outline" onClick={() => setEditingProduct(null)}>
                  ביטול
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardSales;
