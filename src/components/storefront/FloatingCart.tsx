import { ShoppingCart, X, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Product } from "./StoreProducts";

export interface CartItem extends Product {
  quantity: number;
}

interface FloatingCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  hasPayment?: boolean;
}

const FloatingCart = ({ 
  items, 
  onUpdateQuantity, 
  onRemove, 
  onCheckout,
  hasPayment = false 
}: FloatingCartProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Don't show if cart is empty
  if (items.length === 0) return null;

  return (
    <>
      {/* Expanded Cart Panel */}
      {isExpanded && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsExpanded(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[70vh] overflow-hidden animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-lg">סל הקניות</h3>
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[40vh] p-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                  {/* Product Image */}
                  <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-sm text-primary font-semibold">{formatPrice(item.price)}</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Checkout */}
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">סה״כ לתשלום</span>
                <span className="text-xl font-bold">{formatPrice(totalPrice)}</span>
              </div>
              <button
                onClick={() => {
                  setIsExpanded(false);
                  onCheckout();
                }}
                className="w-full bg-foreground text-background py-4 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-foreground/85 active:bg-foreground/75 transition-colors"
              >
                {hasPayment ? 'המשך לתשלום ←' : 'שלח הזמנה ←'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 left-4 right-4 z-30 bg-foreground text-background rounded-xl shadow-glow p-4 flex items-center justify-between hover:bg-foreground/85 active:bg-foreground/75 transition-colors md:left-auto md:right-4 md:w-auto md:min-w-[280px]"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background text-foreground text-xs font-bold flex items-center justify-center border-2 border-foreground">
              {totalItems}
            </span>
          </div>
          <span className="font-medium">{hasPayment ? 'לתשלום' : 'שלח הזמנה'}</span>
        </div>
        <span className="font-bold text-lg">{formatPrice(totalPrice)}</span>
      </button>
    </>
  );
};

export default FloatingCart;
