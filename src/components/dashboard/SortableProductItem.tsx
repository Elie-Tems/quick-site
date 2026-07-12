import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, ToggleLeft, ToggleRight, Package } from "lucide-react";
import type { Product } from "./types";

interface SortableProductItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onToggleActive: (productId: string) => void;
  formatPrice: (price: number) => string;
  isSelected?: boolean;
  onToggleSelect?: (productId: string) => void;
}

const SortableProductItem = ({ 
  product, 
  onEdit, 
  onDelete, 
  onToggleActive,
  formatPrice,
  isSelected = false,
  onToggleSelect
}: SortableProductItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-lg border border-border shadow-soft p-2.5 flex flex-col gap-2 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
      }`}
    >
      {/* Top row: drag handle, sort badge, actions */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(product.id)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-muted rounded-md cursor-grab active:cursor-grabbing touch-none"
            title="גרור לשינוי סדר"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>

          {product.sortOrder !== undefined && product.sortOrder !== null && (
            <div className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              #{product.sortOrder}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <button 
            onClick={() => onToggleActive(product.id)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
            title={product.active ? 'השבת' : 'הפעל'}
          >
            {product.active ? (
              <ToggleRight className="h-5 w-5 text-green-600" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          <button 
            onClick={() => onEdit(product)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button 
            onClick={() => onDelete(product.id)}
            className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="w-full h-28 rounded-lg bg-muted overflow-hidden">
        {product.imageUrl?.trim() ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-foreground line-clamp-1 text-sm">{product.name}</h3>
          {product.sku && (
            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
              {product.sku}
            </span>
          )}
        </div>
        <p className="text-sm text-primary font-semibold">{formatPrice(product.price)}</p>
        
        {/* Custom Fields */}
        {product.customFields && product.customFields.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {product.customFields.map((field) => (
              <div 
                key={field.id} 
                className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded"
                title={`${field.fieldName}: ${field.fieldValue}`}
              >
                <span className="font-medium">{field.fieldName}:</span> {field.fieldValue}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={`w-2 h-2 rounded-full ${product.active ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="text-xs text-muted-foreground">
            {product.active ? 'פעיל' : 'לא פעיל'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SortableProductItem;
