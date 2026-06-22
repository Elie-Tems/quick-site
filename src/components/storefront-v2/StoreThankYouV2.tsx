import { CheckCircle, Home, Package, Sparkles } from "lucide-react";

interface StoreThankYouV2Props {
  orderNumber?: string;
  customerName?: string;
  total?: number;
  onContinueShopping: () => void;
  businessName: string;
}

const StoreThankYouV2 = ({
  orderNumber,
  customerName,
  total,
  onContinueShopping,
  businessName,
}: StoreThankYouV2Props) => {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex items-center justify-center p-4" dir="rtl">
      <div className="container max-w-2xl">
        <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-8 md:p-12 shadow-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Success Icon */}
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/50">
              <CheckCircle className="h-12 w-12 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>

          {/* Main Message */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">הזמנה התקבלה בהצלחה</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              תודה על ההזמנה{customerName ? `, ${customerName}` : ''}!
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              ההזמנה שלך נקלטה במערכת ותטופל בהקדם האפשרי
            </p>
          </div>

          {/* Order Details */}
          <div className="rounded-2xl border border-border bg-muted/30 p-6 space-y-4">
            {orderNumber && (
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <span className="text-sm text-muted-foreground">מספר הזמנה</span>
                <span className="text-lg font-bold text-foreground font-mono">#{orderNumber}</span>
              </div>
            )}
            
            {total !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">סכום כולל</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
              </div>
            )}
          </div>

          {/* Next Steps */}
          <div className="rounded-2xl border border-border bg-card/50 p-6 text-right space-y-4">
            <h3 className="text-lg font-bold text-foreground mb-4 text-center">מה הלאה?</h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">קיבלת אישור</p>
                  <p className="text-xs text-muted-foreground">פרטי ההזמנה נשלחו אליך</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">מעבדים את ההזמנה</p>
                  <p className="text-xs text-muted-foreground">הצוות שלנו מכין את המוצרים</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">משלוח עד הבית</p>
                  <p className="text-xs text-muted-foreground">נעדכן אותך כשההזמנה בדרך</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <button
              onClick={onContinueShopping}
              className="w-full py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/50 flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              חזרה לחנות
            </button>

            <p className="text-xs text-muted-foreground">
              שאלות? צור קשר עם {businessName}
            </p>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -z-10" />
        </div>
      </div>
    </div>
  );
};

export default StoreThankYouV2;
