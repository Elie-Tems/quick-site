import { ArrowRight, Minus, Plus, ShoppingBag, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "../storefront/FloatingCart";

interface StoreCartPageV2Props {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  onBack: () => void;
  hasPayment?: boolean;
}

const StoreCartPageV2 = ({
  items,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onBack,
  hasPayment = false,
}: StoreCartPageV2Props) => {
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  /* Empty State */
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
        <div className="container max-w-4xl py-12 px-4 md:px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium text-foreground transition-all duration-300 hover:scale-105 mb-12"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לחנות
          </button>

          <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-12 md:p-16 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">הסל ריק</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              הוסף מוצרים מהחנות כדי להמשיך בתהליך הרכישה
            </p>
            <button
              onClick={onBack}
              className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/50"
            >
              התחל לקנות
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      <div className="container max-w-5xl py-12 px-4 md:px-6">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium text-foreground transition-all duration-300 hover:scale-105 mb-8"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לחנות
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  סל הקניות
                </h1>
                <p className="text-muted-foreground">
                  {totalItems} {totalItems === 1 ? 'פריט' : 'פריטים'} בסל
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">משלוח חינם</span>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-4 md:p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="w-24 h-28 md:w-28 md:h-32 bg-muted rounded-xl shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-foreground leading-snug mb-2 line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="text-xl font-bold text-primary mb-4">
                        {formatPrice(item.price)}
                      </p>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0 rounded-full border-2 border-border overflow-hidden">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                            aria-label="הפחת"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-12 h-10 flex items-center justify-center text-sm font-bold border-x-2 border-border">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-10 h-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                            aria-label="הוסף"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          סה"כ: <span className="font-bold text-foreground">{formatPrice(item.price * item.quantity)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => onRemove(item.id)}
                      aria-label="הסר מהסל"
                      className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 md:p-8 shadow-xl space-y-6">
              <h2 className="text-xl font-bold text-foreground">סיכום הזמנה</h2>

              <div className="space-y-4 py-6 border-y border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">סכום ביניים</span>
                  <span className="font-medium text-foreground">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">משלוח</span>
                  <span className="font-medium text-primary">חינם</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">סה"כ לתשלום</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
              </div>

              <button
                onClick={onCheckout}
                className="w-full py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/50"
              >
                {hasPayment ? "המשך לתשלום" : "שלח הזמנה"}
              </button>

              <button
                onClick={onBack}
                className="w-full py-3 rounded-full border-2 border-border text-sm font-medium text-foreground hover:bg-muted transition-all duration-300"
              >
                המשך בקניות
              </button>

              {/* Trust badges */}
              <div className="pt-6 space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>תשלום מאובטח ב-SSL</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>משלוח מהיר עד הבית</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>החזרה עד 14 יום</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreCartPageV2;
