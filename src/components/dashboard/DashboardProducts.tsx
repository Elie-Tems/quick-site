import { useState, useRef, useEffect, Fragment } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Package, X, Upload, FileSpreadsheet, Download, AlertCircle, Search, Wand2, Loader2, LayoutGrid, List, Video, Play, Images, Shirt } from "lucide-react";
import ProductVariantsEditor from "@/components/dashboard/products/ProductVariantsEditor";
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
import { useLanguage } from "@/contexts/LanguageContext";

export type { Product, ProductCustomField };

interface DashboardProductsProps {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
  businessId?: string;
  categories?: ProductCategory[];
  onNavigateToAI?: () => void;
  onNavigateToSubscription?: () => void;
  initialCategoryFilterId?: string | null;
  onNavigateToCategories?: () => void;
  businessType?: import("@/lib/businessModules").BusinessType;
}

const getSectionConfig = (t: (key: string) => string): Record<string, { emoji: string; title: string; description: string; addLabel: string }> => ({
  products:   { emoji: "🛍️", title: t("dash.products.section_products_title"), description: t("dash.products.section_products_desc"), addLabel: "הוסף מוצר" },
  services:   { emoji: "⚡",  title: t("dash.products.section_services_title"), description: t("dash.products.section_services_desc"), addLabel: "הוסף שירות" },
  realestate: { emoji: "🏘️", title: t("dash.products.section_realestate_title"), description: t("dash.products.section_realestate_desc"), addLabel: "הוסף נכס" },
  vacation:   { emoji: "🛏️", title: t("dash.products.section_vacation_title"), description: t("dash.products.section_vacation_desc"), addLabel: "הוסף חדר / יחידה" },
  nonprofit:  { emoji: "💙",  title: t("dash.products.section_nonprofit_title"), description: t("dash.products.section_nonprofit_desc"), addLabel: "הוסף פעילות" },
  synagogue:  { emoji: "✡️",  title: t("dash.products.section_synagogue_title"), description: t("dash.products.section_synagogue_desc"), addLabel: "הוסף פעילות" },
});

// Per-type label overrides for DashboardProducts
const getProductLabels = (t: (key: string) => string): Record<import("@/lib/businessModules").BusinessType, { title: string; addBtn: string; addForm: string; editForm: string; emptyFirst: string }> => ({
  products:   { title: t("dash.products.label_products_title"),   addBtn: t("dash.products.label_products_addbtn"),   addForm: t("dash.products.label_products_addform"),   editForm: t("dash.products.label_products_editform"),   emptyFirst: t("dash.products.label_products_emptyfirst") },
  services:   { title: t("dash.products.label_services_title"),   addBtn: t("dash.products.label_services_addbtn"),   addForm: t("dash.products.label_services_addform"),   editForm: t("dash.products.label_services_editform"),   emptyFirst: t("dash.products.label_services_emptyfirst") },
  vacation:   { title: t("dash.products.label_vacation_title"),   addBtn: t("dash.products.label_vacation_addbtn"),   addForm: t("dash.products.label_vacation_addform"),   editForm: t("dash.products.label_vacation_editform"),   emptyFirst: t("dash.products.label_vacation_emptyfirst") },
  nonprofit:  { title: t("dash.products.label_nonprofit_title"),  addBtn: t("dash.products.label_nonprofit_addbtn"),  addForm: t("dash.products.label_nonprofit_addform"),  editForm: t("dash.products.label_nonprofit_editform"),  emptyFirst: t("dash.products.label_nonprofit_emptyfirst") },
  synagogue:  { title: t("dash.products.label_synagogue_title"),  addBtn: t("dash.products.label_synagogue_addbtn"),  addForm: t("dash.products.label_synagogue_addform"),  editForm: t("dash.products.label_synagogue_editform"),  emptyFirst: t("dash.products.label_synagogue_emptyfirst") },
  realestate: { title: t("dash.products.label_realestate_title"), addBtn: t("dash.products.label_realestate_addbtn"), addForm: t("dash.products.label_realestate_addform"), editForm: t("dash.products.label_realestate_editform"), emptyFirst: t("dash.products.label_realestate_emptyfirst") },
});

const DashboardProducts = ({
  products,
  onProductsChange,
  businessId,
  categories = [],
  onNavigateToAI,
  onNavigateToSubscription,
  initialCategoryFilterId,
  onNavigateToCategories,
  businessType = 'products',
}: DashboardProductsProps) => {
  const { t } = useLanguage();
  const PRODUCT_LABELS = getProductLabels(t);
  const SECTION_CONFIG = getSectionConfig(t);
  const pl = PRODUCT_LABELS[businessType];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportInstructions, setShowImportInstructions] = useState(false);
  const [importPreview, setImportPreview] = useState<Product[]>([]);
  const [showAIUpsell, setShowAIUpsell] = useState(false);
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const additionalImagesInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAdditional, setIsUploadingAdditional] = useState(false);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);

  const { data: usageStatus } = useBusinessUsage(businessId);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    imageUrl: '',
    videoUrl: '',
    sortOrder: '',
    categoryId: '',
  });
  const [vacationForm, setVacationForm] = useState<{
    price_per_night: string;
    price_weekend: string;
    max_guests: string;
    min_nights: string;
  }>({ price_per_night: '', price_weekend: '', max_guests: '', min_nights: '1' });
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
    setFormData({ name: '', description: '', price: '', sku: '', imageUrl: '', videoUrl: '', sortOrder: '', categoryId: '' });
    setVacationForm({ price_per_night: '', price_weekend: '', max_guests: '', min_nights: '1' });
    setCustomFields([]);
    setAdditionalImages([]);
    setEditingProduct(null);
    setIsFormOpen(false);
    setShowAIUpsell(false);
  };

  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    if (!file.type.startsWith('video/')) {
      toast.error(t("dash.products.toast_select_video_file"));
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error(t("dash.products.toast_video_too_large"));
      return;
    }
    setIsUploadingVideo(true);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const filePath = `${businessId}/products/videos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('business-assets').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, videoUrl: data.publicUrl }));
      toast.success(t("dash.products.toast_video_uploaded"));
    } catch (err) {
      toast.error(t("dash.products.toast_video_upload_error"));
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t("dash.products.toast_select_image_file"));
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
      toast.success(t("dash.products.toast_image_uploaded"));
      if (!showAIUpsell) setShowAIUpsell(true);
    } catch (err) {
      console.error(err);
      toast.error(t("dash.products.toast_image_upload_error"));
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

  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !businessId) return;
    if (usageStatus?.imageUploadBlocked) {
      setShowBlockerDialog(true);
      if (additionalImagesInputRef.current) additionalImagesInputRef.current.value = '';
      return;
    }
    setIsUploadingAdditional(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const ext = file.name.split('.').pop() || 'jpg';
        const filePath = `${businessId}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from('business-assets')
          .upload(filePath, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('business-assets').getPublicUrl(filePath);
        uploaded.push(data.publicUrl);
      }
      setAdditionalImages(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} ${t("dash.products.toast_images_added_suffix")}`);
    } catch {
      toast.error(t("dash.products.toast_additional_images_error"));
    } finally {
      setIsUploadingAdditional(false);
      if (additionalImagesInputRef.current) additionalImagesInputRef.current.value = '';
    }
  };

  // עדכון סינון לפי קטגוריה כאשר מגיעים ממסך הקטגוריות
  useEffect(() => {
    if (initialCategoryFilterId) setCategoryFilter(initialCategoryFilterId);
  }, [initialCategoryFilterId]);

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
      videoUrl: product.videoUrl || '',
      sortOrder: product.sortOrder?.toString() || '',
      categoryId: product.categoryId || '',
    });
    setCustomFields(product.customFields || []);
    setAdditionalImages(product.additionalImages || []);
    const p = product as any;
    setVacationForm({
      price_per_night: p.price_per_night != null ? String(p.price_per_night) : '',
      price_weekend: p.price_weekend != null ? String(p.price_weekend) : '',
      max_guests: p.max_guests != null ? String(p.max_guests) : '',
      min_nights: p.min_nights != null ? String(p.min_nights) : '1',
    });
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const vacationExtra = businessType === 'vacation' ? {
      price_per_night: vacationForm.price_per_night ? Number(vacationForm.price_per_night) : undefined,
      price_weekend: vacationForm.price_weekend ? Number(vacationForm.price_weekend) : undefined,
      max_guests: vacationForm.max_guests ? Number(vacationForm.max_guests) : undefined,
      min_nights: vacationForm.min_nights ? Number(vacationForm.min_nights) : 1,
    } : {};

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
              customFields,
              additionalImages,
              ...vacationExtra,
            } as any
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
        videoUrl: formData.videoUrl || undefined,
        active: true,
        sortOrder: formData.sortOrder ? parseInt(formData.sortOrder) : maxSortOrder + 1,
        categoryId: formData.categoryId || undefined,
        customFields,
        additionalImages,
        ...vacationExtra,
      } as any;
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
      toast.success(t("dash.products.toast_order_updated"));
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
    toast.success(`${t("dash.products.toast_bulk_deleted_prefix")} ${selectedProducts.size} ${t("dash.products.toast_bulk_deleted_suffix")}`);
  };

  const confirmDelete = () => {
    if (deleteProductId) {
      onProductsChange(products.filter(p => p.id !== deleteProductId));
      toast.success(t("dash.products.toast_product_deleted"));
      setDeleteProductId(null);
    }
  };

  const handleToggleActive = (productId: string) => {
    onProductsChange(products.map(p => 
      p.id === productId ? { ...p, active: !p.active } : p
    ));
  };

  // Excel Import functionality
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingExcel(true);
    const XLSX = await import('xlsx');
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
          toast.error(t("dash.products.toast_no_products_in_file"));
          return;
        }

        setImportPreview(importedProducts);
        setShowImportModal(true);
        toast.success(`${t("dash.products.toast_import_found_prefix")} ${importedProducts.length} ${t("dash.products.toast_import_found_suffix")}`);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error(t("dash.products.toast_file_read_error"));
      } finally {
        setIsLoadingExcel(false);
      }
    };
    reader.onerror = () => setIsLoadingExcel(false);
    reader.readAsBinaryString(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    onProductsChange([...products, ...importPreview]);
    setImportPreview([]);
    setShowImportModal(false);
    toast.success(`${importPreview.length} ${t("dash.products.toast_import_success_suffix")}`);
  };

  const cancelImport = () => {
    setImportPreview([]);
    setShowImportModal(false);
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
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
    toast.success(t("dash.products.toast_template_downloaded"));
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
            {t("dash.products.import_title")}
          </h1>
        </div>

        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-3">{t("dash.products.import_columns_heading")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">{t("dash.products.import_col_name_label")}</span>
                <span className="text-muted-foreground">{t("dash.products.import_col_name_desc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">{t("dash.products.import_col_price_label")}</span>
                <span className="text-muted-foreground">{t("dash.products.import_col_price_desc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">{t("dash.products.import_col_desc_label")}</span>
                <span className="text-muted-foreground">{t("dash.products.import_col_desc_desc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">{t("dash.products.import_col_sku_label")}</span>
                <span className="text-muted-foreground">{t("dash.products.import_col_sku_desc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">{t("dash.products.import_col_image_label")}</span>
                <span className="text-muted-foreground">{t("dash.products.import_col_image_desc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">{t("dash.products.import_col_sort_label")}</span>
                <span className="text-muted-foreground">{t("dash.products.import_col_sort_desc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-foreground min-w-[120px]">{t("dash.products.category_label")}</span>
                <span className="text-muted-foreground">{t("dash.products.import_col_category_desc")}</span>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-2">{t("dash.products.import_tips_heading")}</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t("dash.products.import_tip1")}</li>
              <li>{t("dash.products.import_tip2")}</li>
              <li>{t("dash.products.import_tip3")}</li>
              <li>{t("dash.products.import_tip4")}</li>
              <li className="font-semibold text-primary">{t("dash.products.import_tip5")}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button onClick={downloadTemplate} variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              {t("dash.products.download_template_btn")}
            </Button>
            <Button onClick={() => {
              setShowImportInstructions(false);
              setTimeout(() => fileInputRef.current?.click(), 100);
            }} className="flex-1 gap-2" disabled={isLoadingExcel}>
              {isLoadingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("dash.products.uploading_file")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t("dash.products.upload_excel_btn")}
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
            {t("dash.products.import_preview_title")}
          </h1>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">{t("dash.products.import_preview_found_prefix")} {importPreview.length} {t("dash.products.import_preview_found_suffix")}</p>
            <p className="text-sm text-muted-foreground">{t("dash.products.import_preview_desc")}</p>
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
                <p className="text-sm text-muted-foreground line-clamp-1">{product.description || t("dash.products.no_description_fallback")}</p>
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
            {t("dash.products.import_confirm_prefix")} {importPreview.length} {t("dash.products.import_confirm_suffix")}
          </Button>
          <Button variant="outline" onClick={cancelImport}>
            {t("dash.products.cancel_btn")}
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
            {editingProduct ? pl.editForm : pl.addForm}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-6 items-start">
            {/* Left side - text fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="!text-foreground">{t("dash.products.field_name_label")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("dash.products.field_name_placeholder")}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="!text-foreground">{t("dash.products.field_description_label")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("dash.products.field_description_placeholder")}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  {/* Vacation listings are priced per-night (below), not by this generic
                      field - a room saved without price_per_night silently falls
                      through into the commerce cart/quantity flow instead of the
                      check-in/out booking flow on the storefront. */}
                  <Label htmlFor="price" className="!text-foreground">{t("dash.products.field_price_label")}{businessType !== "vacation" && " *"}</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    required={businessType !== "vacation"}
                    dir="ltr"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sku" className="!text-foreground">{t("dash.products.field_sku_label")} <span className="text-muted-foreground font-normal">{t("dash.products.optional_hint_parens")}</span></Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder={t("dash.products.field_sku_placeholder")}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">{t("dash.products.field_sku_hint")}</p>
                </div>

                {categories.length > 0 && (
                  <div className="space-y-2 col-span-2">
                    <Label className="!text-foreground">{t("dash.products.category_label")}</Label>
                    <Select
                      value={formData.categoryId || "none"}
                      onValueChange={(v) => setFormData({ ...formData, categoryId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("dash.products.none_category_label")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("dash.products.none_category_label")}</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Vacation fields */}
              {businessType === "vacation" && (
                <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/30">
                  <p className="text-sm font-medium">{t("dash.products.vacation_details_heading")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t("dash.products.vacation_price_per_night_label")}</label>
                      <Input
                        type="number"
                        value={vacationForm.price_per_night}
                        onChange={e => setVacationForm(v => ({ ...v, price_per_night: e.target.value }))}
                        required={businessType === "vacation"}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t("dash.products.vacation_price_weekend_label")}</label>
                      <Input
                        type="number"
                        value={vacationForm.price_weekend}
                        onChange={e => setVacationForm(v => ({ ...v, price_weekend: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t("dash.products.vacation_max_guests_label")}</label>
                      <Input
                        type="number"
                        value={vacationForm.max_guests}
                        onChange={e => setVacationForm(v => ({ ...v, max_guests: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t("dash.products.vacation_min_nights_label")}</label>
                      <Input
                        type="number"
                        value={vacationForm.min_nights}
                        onChange={e => setVacationForm(v => ({ ...v, min_nights: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Fields Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="!text-foreground">{t("dash.products.custom_fields_label")}</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addCustomField} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    {t("dash.products.add_field_btn")}
                  </Button>
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-2">
                    {customFields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input
                          placeholder={t("dash.products.custom_field_name_placeholder")}
                          value={field.fieldName}
                          onChange={(e) => updateCustomField(field.id, 'fieldName', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder={t("dash.products.custom_field_value_placeholder")}
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
                    {t("dash.products.custom_fields_empty_hint")}
                  </p>
                )}
              </div>
            </div>

            {/* Right side - image upload */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="!text-foreground">{t("dash.products.image_label")}</Label>
              
              {/* AI Image Generator - Prominent placement */}
              {businessId && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAIGenerator(!showAIGenerator)}
                    className="w-full gap-2 border-primary/30 hover:bg-primary/10"
                  >
                    <Wand2 className="h-4 w-4" />
                    {showAIGenerator ? t("dash.products.hide_ai_image_gen_btn") : t("dash.products.create_ai_image_btn")}
                  </Button>
                  
                  {showAIGenerator && (
                    <AIImageGenerator
                      businessId={businessId}
                      onImageGenerated={(imageUrl) => {
                        setFormData({ ...formData, imageUrl });
                        setShowAIGenerator(false);
                        toast.success(t("dash.products.toast_image_added_to_product"));
                      }}
                      productName={formData.name}
                      productDescription={formData.description}
                      productId={editingProduct?.id}
                      currentImageUrl={formData.imageUrl}
                      onBuyCredits={onNavigateToAI}
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
                aria-label={t("dash.products.upload_image_aria")}
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
                  {isUploadingImage ? t("dash.products.uploading_image_text") : usageStatus?.imageUploadBlocked ? t("dash.products.quota_full_text") : t("dash.products.drag_drop_image_text")}
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
                  placeholder={t("dash.products.image_url_placeholder")}
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

              {/* Additional images */}
              <div className="pt-2 border-t border-border space-y-2">
                <Label className="!text-foreground flex items-center gap-1.5">
                  <Images className="h-4 w-4 text-muted-foreground" />
                  {t("dash.products.additional_images_label")} <span className="text-muted-foreground font-normal text-xs">{t("dash.products.additional_images_hint")}</span>
                </Label>
                <input
                  ref={additionalImagesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalImageUpload}
                  className="hidden"
                  aria-label={t("dash.products.upload_additional_images_aria")}
                />
                {additionalImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {additionalImages.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAdditionalImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => additionalImagesInputRef.current?.click()}
                  disabled={isUploadingAdditional || usageStatus?.imageUploadBlocked}
                >
                  {isUploadingAdditional ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {isUploadingAdditional ? t("dash.products.uploading_generic_text") : t("dash.products.add_gallery_images_btn")}
                </Button>
              </div>

              {/* Video upload */}
              <div className="pt-2 border-t border-border space-y-2">
                <Label className="!text-foreground flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  {t("dash.products.product_video_label")} <span className="text-muted-foreground font-normal text-xs">{t("dash.products.optional_hint_simple")}</span>
                </Label>

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoFileSelect}
                  className="hidden"
                  aria-label={t("dash.products.upload_video_aria")}
                />

                {formData.videoUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                    <video
                      src={formData.videoUrl}
                      controls
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, videoUrl: '' }))}
                      className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                      aria-label={t("dash.products.remove_video_aria")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-5 text-center cursor-pointer transition-colors"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    {isUploadingVideo ? (
                      <Loader2 className="h-7 w-7 mx-auto mb-1.5 text-primary animate-spin" />
                    ) : (
                      <Play className="h-7 w-7 mx-auto mb-1.5 text-muted-foreground" />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {isUploadingVideo ? t("dash.products.uploading_video_text") : t("dash.products.click_upload_video_text")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Variants (colors / sizes / stock) - for clothing etc. Only on a saved
              product, since variants attach to a product_id. */}
          {editingProduct?.id && businessId ? (
            <div className="border-t border-border pt-4 mt-2">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Shirt className="w-4 h-4 text-primary" /> {t("dash.products.variants_heading")}</h3>
              <ProductVariantsEditor productId={editingProduct.id} businessId={businessId} />
            </div>
          ) : (
            <div className="border-t border-border pt-4 mt-2 text-sm text-muted-foreground flex items-start gap-2">
              <Shirt className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
              {t("dash.products.variants_save_first_hint")}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingProduct ? t("dash.products.save_changes_btn") : pl.addBtn}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              {t("dash.products.cancel_btn")}
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

      {/* Colorful section header */}
      {(() => {
        const cfg = SECTION_CONFIG[businessType ?? "products"] ?? SECTION_CONFIG["products"];
        return (
          <div className="rounded-2xl bg-gradient-to-l from-violet-500/15 to-violet-500/5 border border-violet-500/20 p-5 flex items-center gap-4">
            <div className="text-4xl">{cfg.emoji}</div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{cfg.title}</h1>
              <p className="text-sm text-muted-foreground">{cfg.description}</p>
            </div>
          </div>
        );
      })()}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{products.length} {t("dash.products.items_count_suffix")}</p>
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
                {t("dash.products.loading_file_text")}
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                {t("dash.products.import_excel_btn")}
              </>
            )}
          </Button>
          <Button onClick={openAddForm} className="gap-1.5 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            {pl.addBtn}
          </Button>
        </div>
      </div>

      {/* סיכום קטגוריות וסינון */}
      {products.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {categories.length > 0 && (
              <>
                <span>{t("dash.products.filter_by_category_label")}</span>
                <Button
                  type="button"
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  {t("dash.products.all_categories_label")} ({products.length})
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
              <span>{t("dash.products.uncategorized_products_label")}: {uncategorizedCount}</span>
              <Button
                type="button"
                size="sm"
                variant={categoryFilter === 'uncategorized' ? 'default' : 'outline'}
                onClick={() => setCategoryFilter('uncategorized')}
              >
                {t("dash.products.show_them_btn")}
              </Button>
              {onNavigateToCategories && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onNavigateToCategories}
                >
                  {t("dash.products.go_to_categories_btn")}
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
              {t("dash.products.selected_count_prefix")} {selectedProducts.size} {t("dash.products.selected_count_suffix")}
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t("dash.products.delete_selected_btn")}
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
                placeholder={t("dash.products.search_placeholder")}
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
                title={t("dash.products.gallery_view_title")}
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
                title={t("dash.products.list_view_title")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          {!searchQuery && selectedProducts.size === 0 && viewMode === 'grid' && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {t("dash.products.drag_reorder_hint")}
            </p>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="text-6xl mb-4">{(SECTION_CONFIG[businessType ?? "products"] ?? SECTION_CONFIG["products"]).emoji}</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("dash.products.empty_state_heading_prefix")} {(SECTION_CONFIG[businessType ?? "products"] ?? SECTION_CONFIG["products"]).title.replace(/^ה/, "")}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {t("dash.products.empty_state_desc")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={openAddForm} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              {pl.emptyFirst}
            </Button>
            <span className="text-muted-foreground text-sm">{t("dash.products.or_text")}</span>
            <Button
              variant="ghost"
              onClick={() => setShowImportInstructions(true)}
              className="gap-2 text-primary"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t("dash.products.import_excel_btn")}
            </Button>
          </div>
          <button
            onClick={downloadTemplate}
            className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {t("dash.products.download_template_btn")}
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 bg-muted/30 rounded-xl">
          <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">{t("dash.products.no_products_in_category")}</p>
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
                    title={product.active ? t("dash.products.disable_btn_title") : t("dash.products.enable_btn_title")}
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
            {t("dash.products.prev_page_btn")}
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
            {t("dash.products.next_page_btn")}
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {t("dash.products.delete_product_title")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              {deleteProductId && (() => {
                const product = products.find(p => p.id === deleteProductId);
                return product ? (
                  <div className="space-y-3">
                    <p className="text-foreground font-medium">
                      {t("dash.products.delete_confirm_question")}
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
                              {t("dash.products.field_sku_label")}: {product.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {t("dash.products.action_cannot_be_undone")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("dash.products.product_permanently_deleted_hint")}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0">{t("dash.products.cancel_btn")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              {t("dash.products.delete_product_btn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardProducts;
