import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderOpen, Trash2, Edit2, Check, X, ChevronDown, ChevronUp } from "lucide-react";

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

interface ProductCategoryManagerProps {
  categories: ProductCategory[];
  selectedCategoryId: string | null;
  onAddCategory: (category: ProductCategory) => void;
  onRemoveCategory: (id: string) => void;
  onSelectCategory: (id: string | null) => void;
  onUpdateCategory: (id: string, updates: Partial<ProductCategory>) => void;
  productsCountByCategory: Record<string, number>;
}

const EXAMPLE_CATEGORIES = [
  { industry: "חנות בגדים", examples: ["חולצות", "מכנסיים", "שמלות", "אביזרים"] },
];

const ProductCategoryManager = ({
  categories,
  selectedCategoryId,
  onAddCategory,
  onRemoveCategory,
  onSelectCategory,
  onUpdateCategory,
  productsCountByCategory,
}: ProductCategoryManagerProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showExamples, setShowExamples] = useState(true);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory: ProductCategory = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
    };
    
    onAddCategory(newCategory);
    setNewCategoryName("");
    setShowAddForm(false);
    onSelectCategory(newCategory.id);
  };

  const handleStartEdit = (category: ProductCategory) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    onUpdateCategory(editingId, { name: editingName.trim() });
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleQuickAddExample = (categoryName: string) => {
    const newCategory: ProductCategory = {
      id: `cat-${Date.now()}`,
      name: categoryName,
    };
    onAddCategory(newCategory);
    onSelectCategory(newCategory.id);
  };

  return (
    <div className="space-y-4">
      {/* Categories list */}
      <div className="space-y-2">
        {/* All products option */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full px-3 py-2 rounded-lg border transition-all flex items-center gap-2 text-right ${
            selectedCategoryId === null
              ? "border-primary bg-primary/5 text-primary"
              : "border-border pv-muted pv-text-hover hover:border-primary/30"
          }`}
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium flex-1">כל המוצרים</span>
          <span className="text-xs opacity-60">
            {Object.values(productsCountByCategory).reduce((a, b) => a + b, 0)}
          </span>
        </button>

        {/* Category items */}
        {categories.map((category) => (
          <div
            key={category.id}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedCategoryId === category.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            {editingId === category.id ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="h-9"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 pv-muted hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSelectCategory(category.id)}
                  className="flex-1 flex items-center gap-2 text-right"
                >
                  <FolderOpen className={`w-4 h-4 shrink-0 ${selectedCategoryId === category.id ? "text-primary" : "pv-muted"}`} />
                  <span className="text-sm font-medium flex-1 truncate pv-strong">{category.name}</span>
                  <span className="text-xs pv-muted shrink-0">{productsCountByCategory[category.id] || 0}</span>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleStartEdit(category)}
                    className="p-2 pv-muted pv-text-hover hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemoveCategory(category.id)}
                    className="p-2 pv-muted hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add category */}
      {showAddForm ? (
        <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
          <Input
            placeholder="שם הקטגוריה (למשל: מקררים)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCategory();
              if (e.key === "Escape") setShowAddForm(false);
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="flex-1"
            >
              ביטול
            </Button>
            <Button
              size="sm"
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="flex-1 gap-1"
            >
              <Plus className="w-4 h-4" />
              הוסף
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-primary"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">הוסף קטגוריה</span>
        </button>
      )}

      {/* Examples section */}
      {categories.length === 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="w-full flex items-center justify-between text-sm pv-muted pv-text-hover transition-colors"
          >
            <span>💡 דוגמאות לקטגוריות לפי תחום</span>
            {showExamples ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showExamples && (
            <div className="mt-3 space-y-3">
              {EXAMPLE_CATEGORIES.map((item) => (
                <div key={item.industry} className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs font-medium pv-muted mb-2">{item.industry}:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.examples.map((example) => (
                      <button
                        key={example}
                        onClick={() => handleQuickAddExample(example)}
                        className="px-3 py-1.5 text-sm bg-background border border-border rounded-full hover:border-primary hover:text-primary transition-colors"
                      >
                        + {example}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCategoryManager;
