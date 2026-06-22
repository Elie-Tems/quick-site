import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FormConsentNotice from "@/components/FormConsentNotice";
import FormErrorSummary from "@/components/FormErrorSummary";
import { ShoppingBag, ArrowRight, CheckCircle, Ticket, X, Loader2, Package, CreditCard, Truck } from "lucide-react";
import { useValidateCoupon, type Coupon } from "@/hooks/useCoupons";
import type { CartItem } from "../storefront/FloatingCart";

interface CheckoutData {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  deliveryAddress?: string;
  deliveryMethod?: 'pickup' | 'delivery';
}

interface StoreCheckoutV2Props {
  items: CartItem[];
  hasPayment?: boolean;
  businessId: string;
  deliveryMode?: 'pickup_only' | 'pickup_and_delivery';
  deliveryFee?: number | null;
  onSubmit: (data: CheckoutData, couponId?: string, total?: number) => Promise<void>;
  onBack: () => void;
}

const StoreCheckoutV2 = ({ items, hasPayment = false, businessId, deliveryMode, deliveryFee, onSubmit, onBack }: StoreCheckoutV2Props) => {
  const [formData, setFormData] = useState<CheckoutData>({
    fullName: '', phone: '', email: '', notes: '', deliveryAddress: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<CheckoutData>>({});
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const validateCoupon = useValidateCoupon();
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstFieldRef.current?.focus(); }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedCoupon?.discount || 0;
  const shippingCost = deliveryMode === 'pickup_and_delivery' && deliveryMethod === 'delivery' ? deliveryFee || 0 : 0;
  const totalPrice = Math.max(0, subtotal - discount + shippingCost);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);

  const validate = (): boolean => {
    const newErrors: Partial<CheckoutData> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'שם מלא הוא שדה חובה';
    else if (formData.fullName.length < 2) newErrors.fullName = 'שם מלא חייב להכיל לפחות 2 תווים';
    if (!formData.phone.trim()) newErrors.phone = 'מספר טלפון הוא שדה חובה';
    else if (!/^0\d{8,9}$/.test(formData.phone.replace(/[-\s]/g, ''))) newErrors.phone = 'מספר טלפון לא תקין';
    if (!formData.email.trim()) newErrors.email = 'כתובת אימייל היא שדה חובה';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'כתובת אימייל לא תקינה';
    if (deliveryMode === 'pickup_and_delivery' && deliveryMethod === 'delivery') {
      if (!formData.deliveryAddress?.trim()) newErrors.deliveryAddress = 'יש להזין כתובת למשלוח';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypotRef.current?.value) return;
    const now = Date.now();
    if (now - lastSubmitTime < 5000) return;
    setLastSubmitTime(now);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ ...formData, deliveryMethod }, appliedCoupon?.coupon.id, totalPrice);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const result = await validateCoupon.mutateAsync({ code: couponCode, businessId, orderTotal: subtotal });
      if (result.valid && result.coupon) {
        setAppliedCoupon({ coupon: result.coupon, discount: result.discount });
        setCouponCode("");
      } else {
        setCouponError(result.message || "קוד קופון לא תקין");
      }
    } catch (error) {
      setCouponError("שגיאה באימות הקופון");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      <div className="container max-w-6xl py-12 px-4 md:px-6">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium text-foreground transition-all duration-300 hover:scale-105 mb-8"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לסל
        </button>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">פרטי משלוח</h1>
              <p className="text-muted-foreground">מלא את הפרטים להשלמת ההזמנה</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot */}
              <input ref={honeypotRef} type="text" name="website" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              {/* Error Summary */}
              {Object.keys(errors).length > 0 && <FormErrorSummary errors={Object.values(errors)} />}

              {/* Contact Info */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 space-y-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  פרטי קשר
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">שם מלא *</Label>
                    <Input
                      ref={firstFieldRef}
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`mt-1.5 ${errors.fullName ? 'border-destructive' : ''}`}
                      placeholder="הזן שם מלא"
                    />
                    {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <Label htmlFor="phone">טלפון *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`mt-1.5 ${errors.phone ? 'border-destructive' : ''}`}
                      placeholder="050-1234567"
                      dir="ltr"
                    />
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email">אימייל *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`mt-1.5 ${errors.email ? 'border-destructive' : ''}`}
                      placeholder="example@email.com"
                      dir="ltr"
                    />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              {deliveryMode === 'pickup_and_delivery' && (
                <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 space-y-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    אופן קבלה
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        deliveryMethod === 'pickup'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">איסוף עצמי</p>
                      <p className="text-xs text-muted-foreground mt-1">חינם</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('delivery')}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        deliveryMethod === 'delivery'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">משלוח</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatPrice(deliveryFee || 0)}</p>
                    </button>
                  </div>

                  {deliveryMethod === 'delivery' && (
                    <div>
                      <Label htmlFor="deliveryAddress">כתובת למשלוח *</Label>
                      <Input
                        id="deliveryAddress"
                        value={formData.deliveryAddress || ''}
                        onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                        className={`mt-1.5 ${errors.deliveryAddress ? 'border-destructive' : ''}`}
                        placeholder="רחוב, מספר בית, עיר"
                      />
                      {errors.deliveryAddress && <p className="text-xs text-destructive mt-1">{errors.deliveryAddress}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 space-y-4">
                <Label htmlFor="notes">הערות להזמנה (אופציונלי)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1.5 min-h-[100px]"
                  placeholder="הערות מיוחדות, בקשות, וכו'"
                />
              </div>

              <FormConsentNotice />
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-6">
              {/* Summary */}
              <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 shadow-xl space-y-6">
                <h2 className="text-xl font-bold text-foreground">סיכום הזמנה</h2>

                {/* Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 pb-3 border-b border-border last:border-0">
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">כמות: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="space-y-3">
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="קוד קופון"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={validateCoupon.isPending}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:scale-105 transition-all duration-300 disabled:opacity-50"
                      >
                        {validateCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'החל'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">{appliedCoupon.coupon.code}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAppliedCoupon(null)}
                        className="text-primary hover:text-primary/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">סכום ביניים</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">הנחה</span>
                      <span className="font-medium text-primary">-{formatPrice(discount)}</span>
                    </div>
                  )}
                  {shippingCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">משלוח</span>
                      <span className="font-medium">{formatPrice(shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-border">
                    <span className="text-lg font-bold">סה"כ</span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      מעבד...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      {hasPayment ? 'המשך לתשלום' : 'שלח הזמנה'}
                    </>
                  )}
                </button>

                {/* Trust badges */}
                <div className="pt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    <span>תשלום מאובטח ב-SSL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    <span>פרטיות מובטחת</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreCheckoutV2;
