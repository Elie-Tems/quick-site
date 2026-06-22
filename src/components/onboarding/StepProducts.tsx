import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData, ProductCategory } from "@/pages/Onboarding";
import { ArrowLeft, ArrowRight, Plus, Trash2, Package, FileSpreadsheet, Upload, X, Download, AlertCircle, ImageIcon, Sparkles, Loader2, LayoutGrid, List, FolderOpen, Wand2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import ProductCategoryManager from "./ProductCategoryManager";
import { StepNavigation } from "./StepNavigation";

interface StepProductsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  sku: string;
  imageUrl?: string;
  imageFile?: File | null;
  imagePreview?: string;
  categoryId?: string;
}

interface ExcelProduct {
  name: string;
  description?: string;
  price: number;
  sku?: string;
  imageUrl?: string;
  categoryName?: string;
}

const StepProducts = ({ data, updateData, onNext, onBack }: StepProductsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ExcelProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatingProductId, setGeneratingProductId] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [defaultCategoryForExcel, setDefaultCategoryForExcel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<ProductForm>({
    name: "",
    description: "",
    price: "",
    sku: "",
    imageUrl: "",
    imageFile: null,
    imagePreview: "",
    categoryId: undefined,
  });

  // Calculate products count per category
  const productsCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    data.products.forEach(p => {
      const catId = p.categoryId || "uncategorized";
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [data.products]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (data.productOrganization === "free" || selectedCategoryId === null) {
      return data.products;
    }
    return data.products.filter(p => p.categoryId === selectedCategoryId);
  }, [data.products, selectedCategoryId, data.productOrganization]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("אנא העלה קובץ תמונה בלבד");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("גודל התמונה חייב להיות עד 5MB");
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setForm(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: previewUrl,
      imageUrl: "", // Clear URL when uploading file
    }));
  };

  const removeImage = () => {
    if (form.imagePreview) {
      URL.revokeObjectURL(form.imagePreview);
    }
    setForm(prev => ({
      ...prev,
      imageFile: null,
      imagePreview: "",
    }));
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Generate AI product image
  const handleGenerateAIImage = async () => {
    if (!form.name) {
      toast.error("יש להזין שם מוצר לפני יצירת תמונה");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-product-image', {
        body: {
          productName: form.name,
          productDescription: form.description,
          businessCategory: data.businessCategory,
          brandStyle: data.extractedBranding?.brandStyle,
          primaryColor: data.extractedBranding?.primaryColor,
          customPrompt: customPrompt.trim() || undefined,
        }
      });

      if (error) throw error;

      if (result?.imageUrl) {
        setForm(prev => ({
          ...prev,
          imagePreview: result.imageUrl,
          imageUrl: "",
          imageFile: null,
        }));
        toast.success("תמונת המוצר נוצרה בהצלחה!");
      } else {
        throw new Error("לא התקבלה תמונה מהשרת");
      }
    } catch (error) {
      console.error("Error generating product image:", error);
      toast.error("שגיאה ביצירת התמונה. נסה שוב.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Generate AI image for existing product
  const handleGenerateImageForProduct = async (productId: string) => {
    const product = data.products.find(p => p.id === productId);
    if (!product) return;

    setGeneratingProductId(productId);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-product-image', {
        body: {
          productName: product.name,
          productDescription: product.description,
          businessCategory: data.businessCategory,
          brandStyle: data.extractedBranding?.brandStyle,
          primaryColor: data.extractedBranding?.primaryColor,
          customPrompt: customPrompt.trim() || undefined,
        }
      });

      if (error) throw error;

      if (result?.imageUrl) {
        updateData({
          products: data.products.map(p => 
            p.id === productId ? { ...p, imageUrl: result.imageUrl } : p
          )
        });
        toast.success(`תמונה נוצרה עבור "${product.name}"`);
      } else {
        throw new Error("לא התקבלה תמונה מהשרת");
      }
    } catch (error) {
      console.error("Error generating product image:", error);
      toast.error("שגיאה ביצירת התמונה. נסה שוב.");
    } finally {
      setGeneratingProductId(null);
    }
  };

  // Generate AI images for all products without images
  const handleGenerateAllImages = async () => {
    const productsWithoutImages = data.products.filter(p => !p.imageUrl);
    
    if (productsWithoutImages.length === 0) {
      toast.info("לכל המוצרים כבר יש תמונות");
      return;
    }

    setIsGeneratingAllImages(true);
    setGeneratingProgress({ current: 0, total: productsWithoutImages.length });

    let successCount = 0;
    let failCount = 0;
    const updatedProducts = [...data.products];

    for (let i = 0; i < productsWithoutImages.length; i++) {
      const product = productsWithoutImages[i];
      setGeneratingProgress({ current: i + 1, total: productsWithoutImages.length });
      setGeneratingProductId(product.id);

      try {
        const { data: result, error } = await supabase.functions.invoke('generate-product-image', {
          body: {
            productName: product.name,
            productDescription: product.description,
            businessCategory: data.businessCategory,
            brandStyle: data.extractedBranding?.brandStyle,
            primaryColor: data.extractedBranding?.primaryColor,
            customPrompt: customPrompt.trim() || undefined,
          }
        });

        if (error) throw error;

        if (result?.imageUrl) {
          const productIndex = updatedProducts.findIndex(p => p.id === product.id);
          if (productIndex !== -1) {
            updatedProducts[productIndex] = { ...updatedProducts[productIndex], imageUrl: result.imageUrl };
          }
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error generating image for ${product.name}:`, error);
        failCount++;
      }

      // Small delay between requests to avoid rate limiting
      if (i < productsWithoutImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update all products at once
    updateData({ products: updatedProducts });

    setIsGeneratingAllImages(false);
    setGeneratingProductId(null);
    setGeneratingProgress({ current: 0, total: 0 });

    if (successCount > 0 && failCount === 0) {
      toast.success(`נוצרו ${successCount} תמונות בהצלחה!`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`נוצרו ${successCount} תמונות, ${failCount} נכשלו`);
    } else {
      toast.error("לא הצלחנו ליצור תמונות. נסה שוב מאוחר יותר.");
    }
  };

  const handleAddProduct = () => {
    if (!form.name || !form.price) return;
    
    // Use image preview (from file upload) or imageUrl
    const finalImageUrl = form.imagePreview || form.imageUrl || undefined;
    
    // Use selected category if in category mode
    const categoryId = data.productOrganization === "categories" ? selectedCategoryId || undefined : undefined;
    
    const newProduct = {
      id: Date.now().toString(),
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      sku: form.sku || undefined,
      imageUrl: finalImageUrl,
      image: form.imageFile || undefined,
      categoryId,
    };
    
    updateData({ products: [...data.products, newProduct] });
    
    // Clean up and reset form
    if (form.imagePreview) {
      // Don't revoke here since product is using it - will be handled later
    }
    setForm({ name: "", description: "", price: "", sku: "", imageUrl: "", imageFile: null, imagePreview: "", categoryId: undefined });
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setShowForm(false);
  };

  const handleRemoveProduct = (id: string) => {
    updateData({ products: data.products.filter(p => p.id !== id) });
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setExcelFile(file);
    setParseError(null);
    parseExcelFile(file);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length < 2) {
        setParseError("הקובץ ריק או לא מכיל נתונים");
        return;
      }
      
      // Find column indices by header names (flexible matching)
      const headers = jsonData[0].map((h: any) => String(h || "").toLowerCase().trim());
      
      const nameIndex = headers.findIndex((h: string) => 
        h.includes("שם") || h.includes("name") || h.includes("מוצר") || h.includes("product")
      );
      const descIndex = headers.findIndex((h: string) => 
        h.includes("תיאור") || h.includes("description") || h.includes("desc")
      );
      const priceIndex = headers.findIndex((h: string) => 
        h.includes("מחיר") || h.includes("price") || h.includes("עלות") || h.includes("cost")
      );
      const imageIndex = headers.findIndex((h: string) => 
        h.includes("תמונה") || h.includes("image") || h.includes("url") || h.includes("קישור")
      );
      const skuIndex = headers.findIndex((h: string) => 
        h.includes("מק\"ט") || h.includes("מקט") || h.includes("sku") || h.includes("קוד")
      );
      const categoryIndex = headers.findIndex((h: string) => 
        h.includes("קטגוריה") || h.includes("category") || h.includes("קטגוריות")
      );
      
      if (nameIndex === -1 || priceIndex === -1) {
        setParseError("הקובץ חייב להכיל עמודות: שם מוצר ומחיר");
        return;
      }
      
      const products: ExcelProduct[] = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const name = row[nameIndex];
        const price = row[priceIndex];
        
        if (!name || price === undefined || price === null) continue;
        
        const parsedPrice = typeof price === "number" ? price : parseFloat(String(price).replace(/[^\d.]/g, ""));
        
        if (isNaN(parsedPrice)) continue;
        
        products.push({
          name: String(name).trim(),
          description: descIndex !== -1 ? String(row[descIndex] || "").trim() : "",
          price: parsedPrice,
          sku: skuIndex !== -1 ? String(row[skuIndex] || "").trim() : undefined,
          imageUrl: imageIndex !== -1 ? String(row[imageIndex] || "").trim() : undefined,
          categoryName: categoryIndex !== -1 ? String(row[categoryIndex] || "").trim() : undefined,
        });
      }
      
      if (products.length === 0) {
        setParseError("לא נמצאו מוצרים תקינים בקובץ");
        return;
      }
      
      setParsedProducts(products);
      toast.success(`נמצאו ${products.length} מוצרים בקובץ`);
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      setParseError("שגיאה בקריאת הקובץ. אנא ודא שזהו קובץ אקסל תקין");
    }
  };

  // Helper function to find category by name (case-insensitive, fuzzy match)
  const findCategoryByName = (categoryName: string): string | undefined => {
    if (!categoryName || data.productOrganization !== "categories") return undefined;
    
    const normalizedSearch = categoryName.toLowerCase().trim();
    
    // Exact match first
    const exactMatch = data.productCategories.find(
      cat => cat.name.toLowerCase().trim() === normalizedSearch
    );
    if (exactMatch) return exactMatch.id;
    
    // Partial match (contains)
    const partialMatch = data.productCategories.find(
      cat => cat.name.toLowerCase().includes(normalizedSearch) || 
             normalizedSearch.includes(cat.name.toLowerCase())
    );
    if (partialMatch) return partialMatch.id;
    
    return undefined;
  };

  const handleImportProducts = () => {
    if (parsedProducts.length === 0) return;
    
    const newProducts = parsedProducts.map((p, index) => {
      let categoryId: string | undefined;
      
      if (data.productOrganization === "categories") {
        // Priority: 1. Category from Excel column, 2. Default category selected in UI, 3. Selected category filter
        if (p.categoryName) {
          categoryId = findCategoryByName(p.categoryName);
          if (!categoryId) {
            console.warn(`Category "${p.categoryName}" not found for product "${p.name}"`);
          }
        }
        
        if (!categoryId) {
          categoryId = defaultCategoryForExcel || selectedCategoryId || undefined;
        }
      }
      
      return {
        id: `${Date.now()}-${index}`,
        name: p.name,
        description: p.description || "",
        price: p.price,
        sku: p.sku,
        imageUrl: p.imageUrl,
        categoryId,
      };
    });
    
    updateData({ products: [...data.products, ...newProducts] });
    toast.success(`יובאו ${newProducts.length} מוצרים בהצלחה`);
    
    // Reset state
    setExcelFile(null);
    setParsedProducts([]);
    setShowExcelUpload(false);
    setDefaultCategoryForExcel(null);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      ["שם מוצר", "מק\"ט", "תיאור", "מחיר", "קישור לתמונה", "קטגוריה"],
      ["מוצר לדוגמה 1", "SKU001", "תיאור קצר של המוצר", "99", "https://example.com/image1.jpg", "קטגוריה 1"],
      ["מוצר לדוגמה 2", "SKU002", "תיאור קצר נוסף", "149", "https://example.com/image2.jpg", "קטגוריה 2"],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מוצרים");
    
    // Set column widths
    ws["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 40 },
      { wch: 20 },
    ];
    
    XLSX.writeFile(wb, "תבנית_מוצרים.xlsx");
    toast.success("התבנית הורדה בהצלחה");
  };

  // Category management handlers
  const handleAddCategory = (category: ProductCategory) => {
    updateData({ productCategories: [...data.productCategories, category] });
  };

  const handleRemoveCategory = (id: string) => {
    // Remove category and unassign products
    updateData({
      productCategories: data.productCategories.filter(c => c.id !== id),
      products: data.products.map(p => p.categoryId === id ? { ...p, categoryId: undefined } : p),
    });
    if (selectedCategoryId === id) {
      setSelectedCategoryId(null);
    }
  };

  const handleUpdateCategory = (id: string, updates: Partial<ProductCategory>) => {
    updateData({
      productCategories: data.productCategories.map(c => c.id === id ? { ...c, ...updates } : c),
    });
  };

  // Products are no longer required to proceed — let users reach a live store +
  // payment without the chore, and add products later via the dashboard launch
  // checklist. Skipping is explicit ("דלג בינתיים") so it's intentional.
  const hasProducts = data.products.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          שלב 6
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          הוספת מוצרים או שירותים
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          הוסיפו את המוצרים שלכם — או דלגו עכשיו ותוסיפו בכל רגע מלוח הניהול.
        </p>
      </div>

      {/* Step 1: Organization mode selector - show only when no products yet */}
      {data.products.length === 0 && !showForm && !showExcelUpload && (
        <div className="space-y-6">
          {/* <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-foreground">שלב 1: בחרו איך לארגן את המוצרים</h2>
            <p className="text-sm text-muted-foreground">בחרו את הדרך המתאימה לכם לארגן את המוצרים באתר</p>
          </div> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <button
              onClick={() => updateData({ productOrganization: "free" })}
              className={`p-3 rounded-lg border-2 transition-all text-center group hover:shadow-lg ${
                data.productOrganization === "free"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <List className={`w-5 h-5 mx-auto mb-1.5 transition-transform group-hover:scale-110 ${data.productOrganization === "free" ? "text-primary" : "text-muted-foreground"}`} />
              <p className="font-semibold text-foreground text-sm">רשימה חופשית</p>
              {data.productOrganization === "free" && (
                <div className="mt-1 text-xs text-primary font-medium">✓ נבחר</div>
              )}
            </button>
            <button
              onClick={() => updateData({ productOrganization: "categories" })}
              className={`p-3 rounded-lg border-2 transition-all text-center group hover:shadow-lg ${
                data.productOrganization === "categories"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <LayoutGrid className={`w-5 h-5 mx-auto mb-1.5 transition-transform group-hover:scale-110 ${data.productOrganization === "categories" ? "text-primary" : "text-muted-foreground"}`} />
              <p className="font-semibold text-foreground text-sm">לפי קטגוריות</p>
              {data.productOrganization === "categories" && (
                <div className="mt-1 text-xs text-primary font-medium">✓ נבחר</div>
              )}
            </button>
          </div>

          {/* Example for categories */}
          {/* {data.productOrganization === "categories" && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-foreground mb-2">💡 דוגמה לחנות מוצרי חשמל:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-background rounded-full text-sm border border-border">📦 מקררים</span>
                <span className="px-3 py-1.5 bg-background rounded-full text-sm border border-border">🧺 מכונות כביסה</span>
                <span className="px-3 py-1.5 bg-background rounded-full text-sm border border-border">❄️ מזגנים</span>
                <span className="px-3 py-1.5 bg-background rounded-full text-sm border border-border">📺 טלוויזיות</span>
              </div>
            </div>
          )} */}
        </div>
      )}

      {/* Categories mode layout - show as soon as user chooses categories so they can add categories/products */}
      {data.productOrganization === "categories" && (
        <div className="grid md:grid-cols-[280px,1fr] gap-6">
          {/* Categories sidebar */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              קטגוריות
            </h3>
            <ProductCategoryManager
              categories={data.productCategories}
              selectedCategoryId={selectedCategoryId}
              onAddCategory={handleAddCategory}
              onRemoveCategory={handleRemoveCategory}
              onSelectCategory={setSelectedCategoryId}
              onUpdateCategory={handleUpdateCategory}
              productsCountByCategory={productsCountByCategory}
            />
          </div>

          {/* Products section — טופס מוצר חדש ליד הקטגוריות (לא מתחת) */}
          <div className="space-y-4">
            {showForm && !showExcelUpload ? (
              /* טופס מוצר חדש בעמודה הימנית (ליד הקטגוריות) */
              <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">מוצר חדש</h3>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setShowExcelUpload(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">העלה אקסל</span>
                    </button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>ביטול</Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-name">שם המוצר *</Label>
                  <Input id="cat-name" name="name" placeholder="למשל: קורס בסיסי" value={form.name} onChange={handleFormChange} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-description">תיאור קצר</Label>
                  <Input id="cat-description" name="description" placeholder="תיאור המוצר בקצרה" value={form.description} onChange={handleFormChange} className="h-11" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="cat-price">מחיר (₪) *</Label>
                    <Input id="cat-price" name="price" type="number" placeholder="99" value={form.price} onChange={handleFormChange} className="h-11" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-sku">מק"ט</Label>
                    <Input id="cat-sku" name="sku" placeholder="SKU001" value={form.sku} onChange={handleFormChange} className="h-11" dir="ltr" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>תמונת מוצר (אופציונלי)</Label>
                  {form.imagePreview ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                      <img src={form.imagePreview} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
                      <button type="button" onClick={removeImage} className="absolute top-2 left-2 p-1.5 bg-background/80 hover:bg-background rounded-full" aria-label="הסר תמונה">
                        <X className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" aria-label="העלאת תמונה" />
                      
                      {/* AI Generation Section */}
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <button 
                            type="button" 
                            onClick={() => {
                              if (!form.name) {
                                toast.error("יש להזין שם מוצר קודם");
                                return;
                              }
                              setShowCustomPrompt(true);
                            }} 
                            disabled={!form.name}
                            className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 hover:border-primary/50 text-center disabled:opacity-50 flex items-center gap-2 text-sm"
                          >
                            <Sparkles className="w-4 h-4" />
                            ניצור עם AI
                          </button>
                          <button type="button" onClick={() => imageInputRef.current?.click()} className="p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex items-center gap-2 text-sm">
                            <ImageIcon className="w-4 h-4" /> העלה תמונה
                          </button>
                        </div>
                        
                        {showCustomPrompt && (
                          <div className="space-y-2">
                            <Input
                              placeholder="תארו את התמונה: סגנון, צבעים, רקע וכו' (אופציונלי)"
                              value={customPrompt}
                              onChange={(e) => setCustomPrompt(e.target.value)}
                              className="h-11"
                            />
                            <button 
                              type="button" 
                              onClick={handleGenerateAIImage} 
                              disabled={isGeneratingImage}
                              className="w-full px-4 py-2 rounded-lg border-2 border-primary/30 bg-primary/5 hover:border-primary/50 text-center disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                              {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                              {isGeneratingImage ? "יוצר..." : "צור עכשיו"}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {showUrlInput && (
                        <Input id="cat-imageUrl" name="imageUrl" type="url" placeholder="https://..." value={form.imageUrl} onChange={handleFormChange} className="h-11" dir="ltr" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">ביטול</Button>
                  <Button onClick={handleAddProduct} disabled={!form.name || !form.price} className="flex-1">
                    <Plus className="w-4 h-4" /> הוסף מוצר
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {selectedCategoryId && (
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">
                      {data.productCategories.find(c => c.id === selectedCategoryId)?.name || "קטגוריה"}
                    </h3>
                    <span className="text-sm text-muted-foreground">({filteredProducts.length} מוצרים)</span>
                  </div>
                )}

                {!selectedCategoryId && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mb-3 opacity-50" />
                    <p>בחר קטגוריה מהרשימה כדי להוסיף אליה מוצרים</p>
                  </div>
                )}

                {selectedCategoryId && filteredProducts.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground space-y-4">
                    <p>אין מוצרים בקטגוריה זו</p>
                    {!showForm && !showExcelUpload && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="w-full p-4 rounded-lg border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all text-center group"
                      >
                        <Plus className="w-6 h-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <p className="font-semibold text-foreground">הוסף מוצר</p>
                      </button>
                    )}
                  </div>
                )}

                {/* Products list in category mode */}
                {filteredProducts.length > 0 && (
              <div className="space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 rounded-xl bg-card border border-border flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-lg bg-surface-1 flex items-center justify-center shrink-0 overflow-hidden relative group">
                      {generatingProductId === product.id ? (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        </div>
                      ) : product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                      <Package className={`w-6 h-6 text-muted-foreground ${product.imageUrl || generatingProductId === product.id ? 'hidden' : ''}`} />
                      
                      {!product.imageUrl && generatingProductId !== product.id && (
                        <button
                          onClick={() => handleGenerateImageForProduct(product.id)}
                          className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="צור תמונה עם AI"
                        >
                          <Sparkles className="w-5 h-5 text-primary-foreground" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                        {product.sku && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                            {product.sku}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{product.description || "ללא תיאור"}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="font-semibold text-foreground">₪{product.price}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(product.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                      aria-label={`הסר ${product.name}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-primary group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">הוסף מוצר</span>
                </button>
              </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Free mode - original layout */}
      {data.productOrganization === "free" && (
        <>
          {/* Add product button */}
          {!showForm && data.products.length === 0 && (
            <div className="max-w-md mx-auto space-y-3">
              <button
                onClick={() => setShowForm(true)}
                className="w-full p-6 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all text-center group"
              >
                <Plus className="w-10 h-10 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-foreground text-lg mb-1">הוסף מוצר ראשון</p>
                <p className="text-sm text-muted-foreground">לחץ כאן להוספת מוצר או שירות</p>
              </button>
              <button
                onClick={() => setShowExcelUpload(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>או העלה קובץ אקסל עם מספר מוצרים</span>
              </button>
            </div>
          )}

      {/* Product list */}
      {data.products.length > 0 && !showExcelUpload && (
        <div className="space-y-3">
          {data.products.map((product) => (
            <div
              key={product.id}
              className="p-4 rounded-xl bg-card border border-border flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-lg bg-surface-1 flex items-center justify-center shrink-0 overflow-hidden relative group">
                {generatingProductId === product.id ? (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ) : product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <Package className={`w-6 h-6 text-muted-foreground ${product.imageUrl || generatingProductId === product.id ? 'hidden' : ''}`} />
                
                {/* AI generate button overlay */}
                {!product.imageUrl && generatingProductId !== product.id && (
                  <button
                    onClick={() => handleGenerateImageForProduct(product.id)}
                    className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="צור תמונה עם AI"
                  >
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </button>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                  {product.sku && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {product.sku}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{product.description || "ללא תיאור"}</p>
              </div>
              <div className="text-left shrink-0">
                <p className="font-semibold text-foreground">₪{product.price}</p>
              </div>
              {!product.imageUrl && generatingProductId !== product.id && (
                <button
                  onClick={() => handleGenerateImageForProduct(product.id)}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors shrink-0 text-primary"
                  aria-label={`צור תמונה עבור ${product.name}`}
                  title="צור תמונה עם AI"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleRemoveProduct(product.id)}
                className="p-2 hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                aria-label={`הסר ${product.name}`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
          
          {/* Generate all images button */}
          {data.products.some(p => !p.imageUrl) && (
            <button
              onClick={handleGenerateAllImages}
              disabled={isGeneratingAllImages || generatingProductId !== null}
              className="w-full p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 hover:border-primary/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingAllImages ? (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="font-medium text-primary">
                    יוצר תמונות... ({generatingProgress.current}/{generatingProgress.total})
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-medium text-primary">
                    צור תמונות לכל המוצרים ({data.products.filter(p => !p.imageUrl).length})
                  </span>
                </>
              )}
            </button>
          )}
          
          <button
            onClick={() => setShowForm(true)}
            className="w-full p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-primary group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">הוסף מוצר</span>
          </button>
        </div>
      )}

      </>
      )}

      {/* Excel Upload UI - shown in both free and categories mode */}
      {showExcelUpload && (
        <div className="p-6 rounded-xl bg-card border border-border space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              ייבוא מוצרים מאקסל
            </h3>
            <button 
              onClick={() => {
                setShowExcelUpload(false);
                setExcelFile(null);
                setParsedProducts([]);
                setParseError(null);
              }}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-foreground mb-3">
              <strong>שלב 1:</strong> הורד את התבנית, מלא את המוצרים שלך ושמור
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadTemplate}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              הורד תבנית אקסל
            </Button>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              <strong>שלב 2:</strong> העלה את הקובץ המלא
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelFileChange}
              className="hidden"
              aria-label="העלאת קובץ אקסל"
            />
            
            {!excelFile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-all hover:bg-primary/5 text-center group"
              >
                <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary mx-auto mb-3 transition-colors" />
                <p className="font-medium text-foreground mb-1">לחץ להעלאת קובץ</p>
                <p className="text-sm text-muted-foreground">
                  תומך ב: XLSX, XLS, CSV
                </p>
              </button>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{excelFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(excelFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setExcelFile(null);
                    setParsedProducts([]);
                    setParseError(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            )}
          </div>
          
          {parseError && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{parseError}</p>
            </div>
          )}
          
          {parsedProducts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-foreground font-medium">
                תצוגה מקדימה ({parsedProducts.length} מוצרים):
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-border p-3">
                {parsedProducts.slice(0, 10).map((product, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30"
                  >
                    <span className="font-medium text-foreground truncate flex-1">{product.name}</span>
                    <span className="text-muted-foreground shrink-0 mr-3">₪{product.price}</span>
                  </div>
                ))}
                {parsedProducts.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    + {parsedProducts.length - 10} מוצרים נוספים...
                  </p>
                )}
              </div>
              
              {data.productOrganization === "categories" && data.productCategories.length > 0 && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                  <Label className="text-sm font-medium">קטגוריה ברירת מחדל (אופציונלי)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    אם בקובץ יש עמודת "קטגוריה" - היא תגבר על הבחירה הזו
                  </p>
                  <select
                    value={defaultCategoryForExcel || ""}
                    onChange={(e) => setDefaultCategoryForExcel(e.target.value || null)}
                    className="w-full p-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="">ללא קטגוריה ברירת מחדל</option>
                    {data.productCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <Button
                variant="default"
                onClick={handleImportProducts}
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                ייבא {parsedProducts.length} מוצרים
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Product form - בתחתית רק במצב חופשי; במצב קטגוריות הטופס מוצג ליד הקטגוריות */}
      {showForm && !showExcelUpload && data.productOrganization === "free" && (
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <h3 className="font-semibold text-foreground">מוצר חדש</h3>
          
          <div className="space-y-2">
            <Label htmlFor="name">שם המוצר *</Label>
            <Input
              id="name"
              name="name"
              placeholder="למשל: קורס בסיסי"
              value={form.name}
              onChange={handleFormChange}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור קצר</Label>
            <Input
              id="description"
              name="description"
              placeholder="תיאור המוצר בקצרה"
              value={form.description}
              onChange={handleFormChange}
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">מחיר (₪) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                placeholder="99"
                value={form.price}
                onChange={handleFormChange}
                className="h-11"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku">מק"ט</Label>
              <Input
                id="sku"
                name="sku"
                placeholder="SKU001"
                value={form.sku}
                onChange={handleFormChange}
                className="h-11"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>תמונת מוצר (אופציונלי)</Label>
            
            {form.imagePreview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                <img 
                  src={form.imagePreview} 
                  alt="תצוגה מקדימה" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 left-2 p-1.5 bg-background/80 hover:bg-background rounded-full transition-colors"
                  aria-label="הסר תמונה"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  aria-label="העלאת תמונה"
                />

<div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!form.name) {
                          toast.error("יש להזין שם מוצר קודם");
                          return;
                        }
                        setShowCustomPrompt(true);
                      }}
                      disabled={!form.name}
                      className="p-3 rounded-xl border-2 border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center min-h-[100px]"
                    >
                      <Sparkles className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-xs font-medium text-primary leading-tight">ניצור עבורך</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center group flex flex-col items-center justify-center min-h-[100px]"
                    >
                      <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground leading-tight">העלה תמונה</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(true)}
                      className="p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center group flex flex-col items-center justify-center min-h-[100px]"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                      <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground leading-tight">הזן קישור</p>
                    </button>
                  </div>
                  
                  {showCustomPrompt && (
                    <div className="space-y-2">
                      <Input
                        placeholder="תארו את התמונה: סגנון, צבעים, רקע וכו' (אופציונלי)"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="h-11"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateAIImage}
                        disabled={isGeneratingImage}
                        className="w-full p-3 rounded-lg border-2 border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 transition-all text-center disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGeneratingImage ? (
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : (
                          <Wand2 className="w-5 h-5 text-primary" />
                        )}
                        <span className="font-medium text-primary">
                          {isGeneratingImage ? "יוצר..." : "צור עכשיו"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                
                {showUrlInput && (
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    onChange={handleFormChange}
                    className="h-11"
                    dir="ltr"
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            {data.products.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                ביטול
              </Button>
            )}
            <Button
              variant="default"
              onClick={handleAddProduct}
              disabled={!form.name || !form.price}
              className="flex-1"
            >
              <Plus className="w-4 h-4" />
              הוסף מוצר
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel={hasProducts ? "הבא" : "דלג בינתיים"}
        saveLabel="שמור והמשך"
        nextDisabled={false}
        saveDisabled={false}
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepProducts;
