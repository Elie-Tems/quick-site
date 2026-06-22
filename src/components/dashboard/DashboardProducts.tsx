import { useState, useRef, useEffect, Fragment } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Package, X, Upload, FileSpreadsheet, Download, AlertCircle, Search, Sparkles, Loader2, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as XLSX from 'xlsx';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SortableProductItem from './SortableProductItem';
import type { Product, ProductCustomField } from './types';
import type { ProductCategory } from "@/hooks/useProductCategories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIImageSuggestion } from './AIImageUpsell';
import { AIImageGenerator } from './AIImageGenerator';
import { useBusinessUsage } from "@/hooks/useBusinessUsage";
import { ImageUploadBlocker, ImageUploadWarning, ImageUsageMeter } from "./ImageUploadBlocker";
import { supabase } from "@/integrations/supabase/client";

export type { Product, ProductCustomField };

interface DashboardProductsProps {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
  businessId?: string;
  categories?: ProductCategory[];
  onNavigateToAI?: () => void;
  onNavigateToSubscription?: () => void;
  /** סינון התחלתי לפי קטגוריה (כשמגיעים ממסך הקטגוריות) */
  initialCategoryFilterId?: string | null;
  /** ניווט חזרה למסך קטגוריות (כשמטפלים במוצרים ללא קטגוריה) */
  onNavigateToCategories?: () => void;
}

const DashboardProducts = ({
  products,
  onProductsChange,
  businessId,
  categories = [],
  onNavigateToAI,
  onNavigateToSubscription,
  initialCategoryFilterId,
  onNavigateToCategories,
}: DashboardProductsProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportInstructions, setShowImportInstructions] = useState(false);
  const [importPreview, setImportPreview] = useState<Product[]>([]);
  const [showAIUpsell, setShowAIUpsell] = useState(false);
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: usageStatus } = useBusinessUsage(businessId);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    imageUrl: '',
    sortOrder: '',
    categoryId: '',
  });
  const [customFields, setCustomFields] = useState<ProductCustomField[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all' | 'uncategorized'>('all');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', sku: '', imageUrl: '', sortOrder: '', categoryId: '' });
    setCustomFields([]);
    setEditingProduct(null);
    setIsFormOpen(false);
    setShowAIUpsell(false);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('נא לבחור קובץ תמונה');
      return;
    }
    if (usageStatus?.imageUploadBlocked) {
      setShowBlockerDialog(true);
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    setIsUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${businessId}/products/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('business-assets').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
      toast.success('התמונה הועלתה');
      if (!showAIUpsell) setShowAIUpsell(true);
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בהעלאת התמונה');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleZoneClick = () => {
    if (usageStatus?.imageUploadBlocked) {
      setShowBlockerDialog(true);
    } else {
      imageInputRef.current?.click();
    }
  };

  // עדכון סינון לפי קטגוריה כאשר מגיעים ממסך הקטגוריות
  if (initialCategoryFilterId && categoryFilter === 'all') {
    // נקבע רק פעם אחת על כניסה – לא נשנה שוב כשמשתמש מחליף ידנית
    setCategoryFilter(initialCategoryFilterId);
  }

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      sku: product.sku || '',
      imageUrl: product.imageUrl || '',
      sortOrder: product.sortOrder?.toString() || '',
      categoryId: product.categoryId || '',
    });
    setCustomFields(product.customFields || []);
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      // Update existing
      onProductsChange(products.map(p => 
        p.id === editingProduct.id 
          ? { 
              ...p, 
              ...formData, 
              price: parseFloat(formData.price) || 0,
              sku: formData.sku || undefined,
              sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : undefined,
              categoryId: formData.categoryId || undefined,
              customFields 
            }
          : p
      ));
    } else {
      // Add new - auto-assign next sort order
      const maxSortOrder = products.reduce((max, p) => Math.max(max, p.sortOrder || 0), 0);
      const newProduct: Product = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        sku: formData.sku || undefined,
        imageUrl: formData.imageUrl,
        active: true,
        sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : maxSortOrder + 1,
        categoryId: formData.categoryId || undefined,
        customFields,
      };
      onProductsChange([...products, newProduct]);
    }
    resetForm();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);

      const reorderedProducts = arrayMove(products, oldIndex, newIndex);
      
      // Update sortOrder for all products based on new positions
      const updatedProducts = reorderedProducts.map((product, index) => ({
        ...product,
        sortOrder: index + 1,
      }));

      onProductsChange(updatedProducts);
      toast.success('סדר המוצרים עודכן');
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { id: Date.now().toString(), fieldName: '', fieldValue: '' }]);
  };

  const updateCustomField = (id: string, field: 'fieldName' | 'fieldValue', value: string) => {
    setCustomFields(customFields.map(cf => 
      cf.id === id ? { ...cf, [field]: value } : cf
    ));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(cf => cf.id !== id));
  };

  const handleDelete = (productId: string) => {
    setDeleteProductId(productId);
  };

  const handleToggleSelect = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    const remainingProducts = products.filter(p => !selectedProducts.has(p.id));
    onProductsChange(remainingProducts);
    setSelectedProducts(new Set());
    toast.success(`נמחקו ${selectedProducts.size} מוצרים`);
  };

  const confirmDelete = () => {
    if (deleteProductId) {
      onProductsChange(products.filter(p => p.id !== deleteProductId));
      toast.success('המוצר נמחק בהצלחה');
      setDeleteProductId(null);
    }
  };

  const handleToggleActive = (productId: string) => {
    onProductsChange(products.map(p => 
      p.id === productId ? { ...p, active: !p.active } : p
    ));
  };

  // Excel Import functionality
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingExcel(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Define standard column names that are NOT custom fields
        const standardColumns = [
          'שם', 'שם המוצר', 'name', 'Name',
          'תיאור', 'description', 'Description',
          'מחיר', 'price', 'Price',
          'מק"ט', 'מקט', 'sku', 'SKU',
          'תמונה', 'קישור לתמונה', 'image', 'imageUrl',
          'מספר סידורי', 'סדר', 'sort', 'order',
          'קטגוריה', 'category', 'Category'
        ];

        // Helper to find category by name
        const findCategoryByName = (categoryName: string): string | undefined => {
          if (!categoryName || !categories) return undefined;
          const normalizedSearch = categoryName.toLowerCase().trim();
          
          const exactMatch = categories.find(
            cat => cat.name.toLowerCase().trim() === normalizedSearch
          );
          if (exactMatch) return exactMatch.id;
          
          const partialMatch = categories.find(
            cat => cat.name.toLowerCase().includes(normalizedSearch) || 
                   normalizedSearch.includes(cat.name.toLowerCase())
          );
          if (partialMatch) return partialMatch.id;
          
          return undefined;
        };

        const importedProducts: Product[] = jsonData.map((row: any, index: number) => {
          // Extract category
          const categoryName = row['קטגוריה'] || row['category'] || row['Category'];
          const categoryId = categoryName ? findCategoryByName(categoryName) : undefined;
          
          // Extract standard fields
          const product: Product = {
            id: `import-${Date.now()}-${index}`,
            name: row['שם'] || row['שם המוצר'] || row['name'] || row['Name'] || '',
            description: row['תיאור'] || row['description'] || row['Description'] || '',
            price: parseFloat(row['מחיר'] || row['price'] || row['Price'] || 0),
            sku: row['מק"ט'] || row['מקט'] || row['sku'] || row['SKU'] || '',
            imageUrl: row['תמונה'] || row['קישור לתמונה'] || row['image'] || row['imageUrl'] || '',
            active: true,
            sortOrder: parseInt(row['מספר סידורי'] || row['סדר'] || row['sort'] || row['order'] || (index + 1)),
            categoryId,
          };

          // Extract custom fields - any column not in standardColumns
          const customFields: ProductCustomField[] = [];
          Object.keys(row).forEach((key) => {
            if (!standardColumns.includes(key) && row[key] !== null && row[key] !== undefined && row[key] !== '') {
              customFields.push({
                id: `cf-${Date.now()}-${index}-${customFields.length}`,
                fieldName: key,
                fieldValue: String(row[key]),
              });
            }
          });

          if (customFields.length > 0) {
            product.customFields = customFields;
          }

          return product;
        }).filter(p => p.name && p.name.trim() !== '');

        if (importedProducts.length === 0) {
          toast.error('לא נמצאו מוצרים בקובץ');
          return;
        }

        setImportPreview(importedProducts);
        setShowImportModal(true);
        toast.success(`נמצאו ${importedProducts.length} מוצרים לייבוא`);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('שגיאה בקריאת הקובץ');
      } finally {
        setIsLoadingExcel(false);
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmImport = () => {
    onProductsChange([...products, ...importPreview]);
    setImportPreview([]);
    setShowImportModal(false);
    toast.success(`${importPreview.length} מוצרים יובאו בהצלחה`);
  };

  const cancelImport = () => {
    setImportPreview([]);
    setShowImportModal(false);
  };

  const downloadTemplate = () => {
    const templateData = [
      { 
        'שם': 'מוצר לדוגמה', 
        'מק"ט': 'SKU001', 
        'תיאור': 'תיאור המוצר', 
        'מחיר': 100, 
        'מספר סידורי': 1, 
        'תמונה': 'https://example.com/image.jpg',
        'קטגוריה': 'קטגוריה 1',
        'צבע': 'אדום',
        'מידה': 'L'
      },
      { 
        'שם': 'מוצר נוסף', 
        'מק"ט': 'SKU002', 
        'תיאור': 'תיאור נוסף', 
        'מחיר': 200, 
        'מספר סידורי': 2, 
        'תמונה': '',
        'קטגוריה': 'קטגוריה 2',
        'צבע': 'כחול',
        'מידה': 'M'
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'מוצרים');
    XLSX.writeFile(wb, 'תבנית_מוצרים.xlsx');
    toast.success('התבנית הורדה בהצלחה');
  };

  // סטטיסטיקות קטגוריות
  const uncategorizedCount = products.filter(p => !p.categoryId).length;

  // Filter products for display (but keep full list for DnD)
  const filteredProducts = products.filter(product => {
    // סינון לפי קטגוריה
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'uncategorized') {
        if (product.categoryId) return false;
      } else if (product.categoryId !== categoryFilter) {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      (product.sku && product.sku.toLowerCase().includes(query)) ||
      (product.description && product.description.toLowerCase().includes(query))
    );
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Import Instructions Modal
  if (showImportInstructions) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setShowImportInstructions(false)} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            ייבוא מוצרים מאקסל
          </h1>
        </div>

        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-3">📋 עמודות נדרשות בקובץ Excel:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">שם ✅</span>
                <span className="text-muted-foreground">שם המוצר (חובה) - ניתן להשתמש גם ב: name, Name, שם המוצר</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">מחיר ✅</span>
                <span className="text-muted-foreground">מחיר בשקלים (חובה) - ניתן להשתמש גם ב: price, Price</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">תיאור</span>
                <span className="text-muted-foreground">תיאור המוצר (אופציונלי) - ניתן להשתמש גם ב: description, Description</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">מק״ט</span>
                <span className="text-muted-foreground">מספר קטלוגי (אופציונלי) - ניתן להשתמש גם ב: sku, SKU, מקט</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">תמונה</span>
                <span className="text-muted-foreground">קישור לתמונה (אופציונלי) - ניתן להשתמש גם ב: image, imageUrl, קישור לתמונה</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">מספר סידורי</span>
                <span className="text-muted-foreground">סדר התצוגה (אופציונלי) - ניתן להשתמש גם ב: sort, order, סדר</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">קטגוריה</span>
                <span className="text-muted-foreground">שם הקטגוריה (אופציונלי) - ניתן להשתמש גם ב: category, קטגוריה</span>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">💡 טיפים:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>ניתן להשתמש בשמות עמודות בעברית או באנגלית</li>
              <li>רק עמודות "שם" ו"מחיר" הן חובה</li>
              <li>המוצרים שייובאו יתווספו לרשימת המוצרים הקיימת</li>
              <li>מומלץ להוריד את התבנית לדוגמה כדי לראות את המבנה המדויק</li>
              <li className="font-semibold text-primary">✨ כל עמודה נוספת (כמו "צבע", "מידה", "חומר") תיובא אוטומטית כשדה מותאם אישית!</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={downloadTemplate} variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              הורד תבנית לדוגמה
            </Button>
            <Button onClick={() => {
              setShowImportInstructions(false);
              setTimeout(() => fileInputRef.current?.click(), 100);
            }} className="flex-1 gap-2" disabled={isLoadingExcel}>
              {isLoadingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  מעלה קובץ...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  העלה קובץ Excel
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Import Preview Modal
  if (showImportModal) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={cancelImport} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            תצוגה מקדימה - ייבוא מאקסל
          </h1>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">נמצאו {importPreview.length} מוצרים</p>
            <p className="text-sm text-muted-foreground">בדוק את הנתונים לפני האישור. המוצרים יתווספו לרשימה הקיימת.</p>
          </div>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-6">
          {importPreview.map((product, index) => (
            <div 
              key={product.id}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground line-clamp-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{product.description || 'ללא תיאור'}</p>
              </div>
              <div className="text-primary font-semibold">
                {formatPrice(product.price)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button onClick={confirmImport} className="flex-1 gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            ייבא {importPreview.length} מוצרים
          </Button>
          <Button variant="outline" onClick={cancelImport}>
            ביטול
          </Button>
        </div>
      </div>
    );
  }

  // Form View
  if (isFormOpen) {
    return (
      <div className="p-4 md:p-6">
        {/* Image Upload Blocker Dialog */}
        <ImageUploadBlocker
          open={showBlockerDialog}
          onOpenChange={setShowBlockerDialog}
          currentImages={usageStatus?.usage?.stored_images_count || 0}
          imageLimit={usageStatus?.imageLimit || 50}
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
            {editingProduct ? 'עריכת מוצר' : 'הוספת מוצר'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-6 items-start">
            {/* Left side – text fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="!text-foreground">שם המוצר *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="הזן שם מוצר"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="!text-foreground">תיאור קצר</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תיאור המוצר"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="!text-foreground">מחיר (₪) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    required
                    dir="ltr"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sku" className="!text-foreground">מק"ט <span className="text-muted-foreground font-normal">(לא חובה)</span></Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="לדוגמה: 1001"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">מספר קטלוגי לזיהוי המוצר במלאי — אפשר להשאיר ריק.</p>
                </div>

                {categories.length > 0 && (
                  <div className="space-y-2 col-span-2">
                    <Label className="!text-foreground">קטגוריה</Label>
                    <Select
                      value={formData.categoryId || "none"}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="ללא קטגוריה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא קטגוריה</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Custom Fields Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="!text-foreground">שדות מותאמים אישית</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addCustomField} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    הוסף שדה
                  </Button>
                </div>
                
                {customFields.length > 0 && (
                  <div className="space-y-2">
                    {customFields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input
                          placeholder="שם השדה"
                          value={field.fieldName}
                          onChange={(e) => updateCustomField(field.id, 'fieldName', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="ערך"
                          value={field.fieldValue}
                          onChange={(e) => updateCustomField(field.id, 'fieldValue', e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeCustomField(field.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {customFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    הוסף שדות מותאמים כמו צבע, מידה, חומר וכו'
                  </p>
                )}
              </div>
            </div>

            {/* Right side – image upload */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="!text-foreground">תמונה</Label>
              
              {/* AI Image Generator - Prominent placement */}
              {businessId && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAIGenerator(!showAIGenerator)}
                    className="w-full gap-2 border-primary/30 hover:bg-primary/10"
                  >
                    <Sparkles className="h-4 w-4" />
                    {showAIGenerator ? 'הסתר יצירת תמונה AI' : 'צור תמונה באמצעות AI'}
                  </Button>
                  
                  {showAIGenerator && (
                    <AIImageGenerator
                      businessId={businessId}
                      onImageGenerated={(imageUrl) => {
                        setFormData({ ...formData, imageUrl });
                        setShowAIGenerator(false);
                        toast.success('התמונה נוספה למוצר');
                      }}
                      productName={formData.name}
                      productDescription={formData.description}
                    />
                  )}
                </div>
              )}
              
              {/* Always-visible quota meter + near-limit warning */}
              <ImageUsageMeter
                usagePercent={usageStatus?.imageUsagePercent || 0}
                currentImages={usageStatus?.usage?.stored_images_count || 0}
                imageLimit={usageStatus?.imageLimit || 50}
              />
              <ImageUploadWarning
                usagePercent={usageStatus?.imageUsagePercent || 0}
                currentImages={usageStatus?.usage?.stored_images_count || 0}
                imageLimit={usageStatus?.imageLimit || 50}
              />

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
                aria-label="העלאת תמונה"
              />
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  usageStatus?.imageUploadBlocked 
                    ? 'border-destructive/50 bg-destructive/5 cursor-not-allowed' 
                    : 'border-border hover:border-primary/50 cursor-pointer'
                } ${isUploadingImage ? 'pointer-events-none opacity-70' : ''}`}
                onClick={handleZoneClick}
                onDragOver={(e) => {
                  if (!usageStatus?.imageUploadBlocked) {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-primary', 'bg-primary/5');
                  }
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                  if (usageStatus?.imageUploadBlocked) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith('image/') && imageInputRef.current) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    imageInputRef.current.files = dt.files;
                    imageInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }}
              >
                {isUploadingImage ? (
                  <Loader2 className="h-8 w-8 mx-auto mb-2 text-primary animate-spin" />
                ) : (
                  <Upload className={`h-8 w-8 mx-auto mb-2 ${usageStatus?.imageUploadBlocked ? 'text-destructive/50' : 'text-muted-foreground'}`} />
                )}
                <p className={`text-sm ${usageStatus?.imageUploadBlocked ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {isUploadingImage ? 'מעלה תמונה...' : usageStatus?.imageUploadBlocked ? 'מכסת התמונות מלאה - לחץ לשדרוג' : 'גרור תמונה או לחץ להעלאה'}
                </p>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    if (usageStatus?.imageUploadBlocked) {
                      setShowBlockerDialog(true);
                      return;
                    }
                    const newUrl = e.target.value;
                    setFormData({ ...formData, imageUrl: newUrl });
                    if (newUrl && newUrl.trim() && !showAIUpsell) {
                      setShowAIUpsell(true);
                    }
                  }}
                  placeholder="או הזן URL לתמונה"
                  className="mt-3"
                  dir="ltr"
                  disabled={usageStatus?.imageUploadBlocked}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              {/* AI Image Upsell - contextual suggestion */}
              {showAIUpsell && formData.imageUrl && businessId && onNavigateToAI && (
                <AIImageSuggestion
                  businessId={businessId}
                  imageUrl={formData.imageUrl}
                  onAccept={() => {
                    onNavigateToAI();
                  }}
                  onDismiss={() => setShowAIUpsell(false)}
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingProduct ? 'שמור שינויים' : 'הוסף מוצר'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // List View with Drag & Drop
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Hidden file input for Excel upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleExcelUpload}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">מוצרים ({products.length})</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setShowImportInstructions(true)}
            className="gap-1.5 flex-1 sm:flex-none"
            disabled={isLoadingExcel}
          >
            {isLoadingExcel ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען קובץ...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                ייבוא מאקסל
              </>
            )}
          </Button>
          <Button onClick={openAddForm} className="gap-1.5 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            הוסף מוצר
          </Button>
        </div>
      </div>

      {/* סיכום קטגוריות וסינון */}
      {products.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {categories.length > 0 && (
              <>
                <span>סינון לפי קטגוריה:</span>
                <Button
                  type="button"
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  הכל ({products.length})
                </Button>
                {categories.map((c) => {
                  const count = products.filter(p => p.categoryId === c.id).length;
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      variant={categoryFilter === c.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategoryFilter(c.id)}
                    >
                      {c.name}{count ? ` (${count})` : ''}
                    </Button>
                  );
                })}
              </>
            )}
          </div>
          {uncategorizedCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>מוצרים ללא קטגוריה: {uncategorizedCount}</span>
              <Button
                type="button"
                size="sm"
                variant={categoryFilter === 'uncategorized' ? 'default' : 'outline'}
                onClick={() => setCategoryFilter('uncategorized')}
              >
                הצג אותם
              </Button>
              {onNavigateToCategories && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onNavigateToCategories}
                >
                  עבור לניהול קטגוריות
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedProducts.size === filteredProducts.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <span className="text-sm font-medium text-foreground">
              נבחרו {selectedProducts.size} מוצרים
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            מחק נבחרים
          </Button>
        </div>
      )}

      {/* Search Bar & View Toggle */}
      {products.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם או מק״ט..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="תצוגת גלריה"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-background shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="תצוגת רשימה"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          {!searchQuery && selectedProducts.size === 0 && viewMode === 'grid' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              💡 גרור את המוצרים כדי לשנות את סדר התצוגה
            </p>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-14 bg-muted/30 rounded-xl px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">בואו נוסיף את המוצר הראשון</p>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">המוצרים שתוסיפו יופיעו בחנות שלכם. אפשר להתחיל ממוצר אחד ולהוסיף עוד בהמשך.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={openAddForm} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף מוצר ראשון
            </Button>
            <span className="text-muted-foreground text-sm">או</span>
            <Button 
              variant="ghost" 
              onClick={() => setShowImportInstructions(true)}
              className="gap-2 text-primary"
            >
              <FileSpreadsheet className="h-4 w-4" />
              ייבוא מאקסל
            </Button>
          </div>
          <button 
            onClick={downloadTemplate}
            className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            הורד תבנית לדוגמה
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-xl">
          <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">לא נמצאו מוצרים בקטגוריה זו</p>
        </div>
      ) : viewMode === 'list' ? (
        // List View
        <div className="space-y-2">
          {paginatedProducts.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-lg border border-border shadow-soft p-3 flex items-center gap-4"
            >
              <input
                type="checkbox"
                checked={selectedProducts.has(product.id)}
                onChange={() => handleToggleSelect(product.id)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              
              <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                  {product.sku && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded whitespace-nowrap">
                      {product.sku}
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                )}
                {product.customFields && product.customFields.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.customFields.map((field) => (
                      <span 
                        key={field.id} 
                        className="text-xs bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded"
                      >
                        <span className="font-medium">{field.fieldName}:</span> {field.fieldValue}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <p className="text-lg font-semibold text-primary">{formatPrice(product.price)}</p>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleToggleActive(product.id)}
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                    title={product.active ? 'השבת' : 'הפעל'}
                  >
                    {product.active ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <button 
                    onClick={() => openEditForm(product)}
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-2 hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searchQuery ? (
        // Grid View - When searching, show simple grid (בלי גרירה)
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product) => (
            <SortableProductItem
              key={product.id}
              product={product}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              formatPrice={formatPrice}
              isSelected={selectedProducts.has(product.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      ) : (
        // Grid View - When not searching, enable drag & drop על גריד של כרטיסים
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={paginatedProducts.map(p => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {paginatedProducts.map((product) => (
                <SortableProductItem
                  key={product.id}
                  product={product}
                  onEdit={openEditForm}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                  formatPrice={formatPrice}
                  isSelected={selectedProducts.has(product.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            הקודם
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = 
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1);
              
              const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
              const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;
              
              return (
                <Fragment key={page}>
                  {showEllipsisBefore && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  {showPage && (
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[2.5rem]"
                    >
                      {page}
                    </Button>
                  )}
                  {showEllipsisAfter && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                </Fragment>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            הבא
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              מחיקת מוצר
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              {deleteProductId && (() => {
                const product = products.find(p => p.id === deleteProductId);
                return product ? (
                  <div className="space-y-3">
                    <p className="text-foreground font-medium">
                      האם אתה בטוח שברצונך למחוק את המוצר הבא?
                    </p>
                    
                    {/* Product Preview */}
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <div className="flex items-start gap-3">
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded border border-border"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-primary font-medium mt-0.5">
                            {formatPrice(product.price)}
                          </p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground mt-1">
                              מק"ט: {product.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        פעולה זו אינה ניתנת לביטול
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        המוצר יימחק לצמיתות מהמערכת
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0">ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              מחק מוצר
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardProducts;
