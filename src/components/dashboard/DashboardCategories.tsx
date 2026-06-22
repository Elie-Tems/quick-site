import { useState } from "react";
import { FolderOpen, Plus, Pencil, Trash2, Loader2, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useProductCategories,
  type ProductCategory,
} from "@/hooks/useProductCategories";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BusinessCategory } from "@/lib/categoryConfig";
import type { Product } from "./types";

interface DashboardCategoriesProps {
  businessId: string | undefined;
  /** סוג העסק – מאפשר ייבוא קטגוריות מומלצות שיישמרו ב-DB ויופיעו כאן בניהול */
  businessCategory?: string | null;
  /** מעבר למסך מוצרים עם סינון לפי קטגוריה שנבחרה */
  onViewCategoryProducts?: (categoryId: string, categoryName: string) => void;
  /** רשימת מוצרים לשיוך קטגוריות */
  products?: Product[];
  /** פונקציה לעדכון מוצר */
  onProductUpdate?: (productId: string, categoryId: string) => void;
}

export default function DashboardCategories({ businessId, businessCategory, onViewCategoryProducts, products = [], onProductUpdate }: DashboardCategoriesProps) {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    seedFromBusinessCategory,
    isSeedingFromBusinessCategory,
  } = useProductCategories(businessId);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");

  const handleStartAdd = () => {
    setEditing(null);
    setIsAdding(true);
    setFormName("");
    setFormDescription("");
  };

  const handleStartEdit = (cat: ProductCategory) => {
    setIsAdding(false);
    setEditing(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
  };

  const handleSaveNew = async () => {
    if (!businessId || !formName.trim()) return;
    await createCategory({
      business_id: businessId,
      name: formName.trim(),
      description: formDescription.trim() || null,
      sort_order: categories.length,
    });
    setIsAdding(false);
    setFormName("");
    setFormDescription("");
  };

  const handleSaveEdit = async () => {
    if (!editing || !formName.trim()) return;
    await updateCategory({
      id: editing.id,
      name: formName.trim(),
      description: formDescription.trim() || null,
    });
    setEditing(null);
  };

  const handleDelete = (id: string) => setDeleteId(id);
  const confirmDelete = async () => {
    if (!deleteId || !businessId) return;
    await deleteCategory({ id: deleteId, businessId });
    setDeleteId(null);
  };

  const uncategorizedProducts = products.filter(p => !p.categoryId);

  const handleAssignCategory = (productId: string, categoryId: string) => {
    if (onProductUpdate) {
      onProductUpdate(productId, categoryId);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === uncategorizedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(uncategorizedProducts.map(p => p.id)));
    }
  };

  const handleBulkAssign = () => {
    if (!bulkCategoryId || selectedProducts.size === 0 || !onProductUpdate) return;
    
    selectedProducts.forEach(productId => {
      onProductUpdate(productId, bulkCategoryId);
    });
    
    setSelectedProducts(new Set());
    setBulkCategoryId("");
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">קטגוריות ({categories.length})</h1>
          <p className="text-muted-foreground mt-1">
            נהל קטגוריות למוצרים. שייך מוצרים לקטגוריות בטאב מוצרים, והן יופיעו בחנות.
          </p>
        </div>
        <Button onClick={handleStartAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          הוסף קטגוריה
        </Button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-medium text-foreground">קטגוריה חדשה</h3>
          <div className="space-y-2">
            <Label>שם הקטגוריה</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="למשל: משקאות קרים"
            />
          </div>
          <div className="space-y-2">
            <Label>תיאור (אופציונלי)</Label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="תיאור קצר"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveNew} disabled={!formName.trim()}>
              שמור
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-medium text-foreground">עריכת קטגוריה</h3>
          <div className="space-y-2">
            <Label>שם הקטגוריה</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="שם"
            />
          </div>
          <div className="space-y-2">
            <Label>תיאור (אופציונלי)</Label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveEdit} disabled={!formName.trim()}>
              עדכן
            </Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {categories.length === 0 && !isAdding ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">סדרו את המוצרים בקטגוריות</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              הקטגוריות שמופיעות באתר (לפי סוג העסק) לא נשמרות כאן – ייבא אותן כדי לערוך, למחוק או לשייך מוצרים.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {businessId && businessCategory && businessCategory !== "other" && (
                <Button
                  onClick={() =>
                    seedFromBusinessCategory({
                      businessId,
                      businessCategory: businessCategory as BusinessCategory,
                    })
                  }
                  disabled={isSeedingFromBusinessCategory}
                  variant="default"
                  className="gap-2"
                >
                  {isSeedingFromBusinessCategory ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  ייבא קטגוריות מסוג העסק שלי
                </Button>
              )}
              <Button onClick={handleStartAdd} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                הוסף קטגוריה ראשונה ידנית
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-soft transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{cat.name}</p>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  {onViewCategoryProducts && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onViewCategoryProducts(cat.id, cat.name)}
                    >
                      מוצרים בקטגוריה
                    </Button>
                  )}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleStartEdit(cat)}
                      aria-label="ערוך"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(cat.id)}
                      aria-label="מחק"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uncategorized Products Section - Below Categories */}
      {uncategorizedProducts.length > 0 && categories.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium text-foreground">
                מוצרים ללא קטגוריה ({uncategorizedProducts.length})
              </h3>
            </div>
            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-2">
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleBulkAssign} 
                  disabled={!bulkCategoryId}
                  size="sm"
                >
                  שייך {selectedProducts.size} מוצרים
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            בחר מוצרים ושייך אותם לקטגוריה במקבץ, או שייך כל מוצר בנפרד
          </p>
          
          {uncategorizedProducts.length > 1 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedProducts.size === uncategorizedProducts.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground">
                בחר הכל ({uncategorizedProducts.length} מוצרים)
              </span>
            </div>
          )}

          <div className="space-y-2">
            {uncategorizedProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.id)}
                  onChange={() => toggleProductSelection(product.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{product.name}</p>
                  {product.sku && (
                    <p className="text-sm text-muted-foreground">מק"ט: {product.sku}</p>
                  )}
                </div>
                <Select
                  value=""
                  onValueChange={(categoryId) => handleAssignCategory(product.id, categoryId)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קטגוריה</AlertDialogTitle>
            <AlertDialogDescription>
              מוצרים בשיוך לקטגוריה זו יישארו ללא קטגוריה. להמשיך?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
