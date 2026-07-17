import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "./FloatingCart";

interface StoreCartPageProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  onBack: () => void;
  hasPayment?: boolean;
}

const StoreCartPage = ({
  items,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onBack,
  hasPayment = false,
}: StoreCartPageProps) => {
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  /* ── Empty State ── */
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container max-w-3xl py-10 px-4 md:px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-12"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            חזרה לחנות
          </button>

          <div className="border-t border-foreground/10 pt-16 pb-24 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/20 mx-auto mb-6" />
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground mb-3">הסל ריק</p>
            <p className="text-sm text-muted-foreground/60 mb-8">הוסף מוצרים מהחנות כדי להמשיך</p>
            <button
              onClick={onBack}
              className="text-[10px] font-bold tracking-[0.25em] uppercase border border-foreground/20 px-6 py-2.5 hover:border-foreground hover:bg-foreground hover:text-background transition-all"
            >
              חזרה לחנות
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container max-w-3xl py-10 px-4 md:px-6">

        {/* ── Back link ── */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה לחנות
        </button>

        {/* ── Header ── */}
        <div className="flex items-baseline justify-between border-b border-foreground/10 pb-4 mb-8">
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-foreground">
            סל הקניות
          </h1>
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
            {totalItems} פריטים
          </span>
        </div>

        {/* ── Items ── */}
        <div className="divide-y divide-foreground/8">
          {items.map((item) => (
            <div
              key={item.cartLineId ?? item.id}
              className="flex items-start gap-4 py-5 group"
            >
              {/* Thumbnail */}
              <div className="w-20 h-24 md:w-24 md:h-28 bg-muted shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col gap-1 pt-0.5">
                <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                  {item.name}
                </h3>
                {(item.variantColor || item.variantSize) && (
                  <p className="text-xs text-muted-foreground">{[item.variantColor, item.variantSize].filter(Boolean).join(" · ")}</p>
                )}
                <p className="text-sm font-bold text-foreground mt-1">
                  {formatPrice(item.price)}
                </p>

                {/* Quantity controls - editorial minimal */}
                <div className="flex items-center gap-0 mt-3 border border-foreground/15 w-fit">
                  <button
                    onClick={() => onUpdateQuantity(item.cartLineId ?? item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                    aria-label="הפחת"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 h-8 flex items-center justify-center text-xs font-bold border-x border-foreground/15">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.cartLineId ?? item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                    aria-label="הוסף"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Line total + remove */}
              <div className="flex flex-col items-end gap-2 pt-0.5 shrink-0">
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {formatPrice(item.price * item.quantity)}
                </span>
                <button
                  onClick={() => onRemove(item.cartLineId ?? item.id)}
                  aria-label="הסר מהסל"
                  className="text-muted-foreground/40 hover:text-foreground transition-colors mt-auto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Summary ── */}
        <div className="mt-8 border-t border-foreground/10 pt-6 space-y-5">
          {/* Subtotals row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
              סה״כ לתשלום
            </span>
            <span className="text-lg font-bold text-foreground tabular-nums">
              {formatPrice(totalPrice)}
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={onCheckout}
            className="w-full bg-foreground text-background py-4 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-foreground/85 active:bg-foreground/75 transition-colors"
          >
            {hasPayment ? "המשך לתשלום ←" : "שלח הזמנה ←"}
          </button>

          {/* Continue shopping */}
          <div className="text-center">
            <button
              onClick={onBack}
              className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              המשך בקניות
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StoreCartPage;