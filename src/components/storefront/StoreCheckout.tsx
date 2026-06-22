import { useState, useRef, useEffect } from "react";
import { Helmet } from 'react-helmet-async';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FormConsentNotice from "@/components/FormConsentNotice";
import FormErrorSummary from "@/components/FormErrorSummary";
import { supabase } from "@/integrations/supabase/client";
import { databaseDisclosure } from "@/lib/email/compliance";
import { ShoppingBag, ArrowRight, CheckCircle, Ticket, X, Loader2 } from "lucide-react";
import { useValidateCoupon, type Coupon } from "@/hooks/useCoupons";
import type { CartItem } from "./FloatingCart";

interface CheckoutData {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  deliveryAddress?: string;
  deliveryMethod?: 'pickup' | 'delivery';
}

interface StoreCheckoutProps {
  items: CartItem[];
  hasPayment?: boolean;
  businessId: string;
  deliveryMode?: 'pickup_only' | 'pickup_and_delivery';
  deliveryFee?: number | null;
  businessName?: string;
  onSubmit: (data: CheckoutData, couponId?: string, total?: number) => Promise<void>;
  onBack: () => void;
}

const StoreCheckout = ({ items, hasPayment = false, businessId, businessName, deliveryMode, deliveryFee, onSubmit, onBack }: StoreCheckoutProps) => {
  const [formData, setFormData] = useState<CheckoutData>({
    fullName: '', phone: '', email: '', notes: '', deliveryAddress: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Partial<CheckoutData>>({});
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: Coupon; discount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
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
    if (!formData.fullName.trim()) newErrors.fullName = 'שם מלא ושם עסק חייבים להיות שדות חובה';
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
      await onSubmit({ ...formData, deliveryMethod: deliveryMode === 'pickup_and_delivery' ? deliveryMethod : 'pickup' }, appliedCoupon?.coupon.id, totalPrice);
      // Record explicit marketing opt-in (Chok HaSpam evidence). Fire-and-forget.
      if (marketingConsent && formData.email.trim() && businessId) {
        supabase
          .from('email_consents')
          .insert({
            business_id: businessId,
            email: formData.email.trim(),
            source: 'checkout',
            disclosure_text: databaseDisclosure(businessName || 'העסק'),
          } as any)
          .then(({ error }) => { if (error) console.warn('consent insert failed:', error.message); });
      }
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const result = await validateCoupon.mutateAsync({ code: couponCode, businessId, orderTotal: subtotal });
      setAppliedCoupon(result);
    } catch (error: any) {
      setCouponError(error.message || "קוד קופון לא תקין");
    }
  };

  const handleRemoveCoupon = () => { setAppliedCoupon(null); setCouponCode(""); setCouponError(""); };
  const handleChange = (field: keyof CheckoutData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  /* ── Success ── */
  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-sm" role="status" aria-live="polite">
          <CheckCircle className="w-10 h-10 text-foreground mx-auto mb-6" />
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground mb-3">ההזמנה התקבלה!</p>
          <h2 className="text-xl font-bold text-foreground mb-3">תודה רבה</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            {hasPayment ? 'התשלום התקבל בהצלחה. ניצור איתך קשר בהקדם.' : 'ניצור איתך קשר לתיאום התשלום.'}
          </p>
          <button
            onClick={onBack}
            className="text-[10px] font-bold tracking-[0.25em] uppercase border border-foreground/20 px-8 py-3 hover:bg-foreground hover:text-background transition-all"
          >
            חזרה לחנות
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="fixed inset-0 z-50 bg-background overflow-y-auto" dir="rtl">
        <div className="container max-w-lg py-10 px-4 md:px-6">

          {/* ── Back ── */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10"
            aria-label="חזרה לחנות"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            חזרה
          </button>

          {/* ── Header ── */}
          <div className="flex items-baseline justify-between border-b border-foreground/10 pb-4 mb-8">
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-foreground">השלמת הזמנה</h1>
          </div>

          <FormErrorSummary errors={errors} />

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Honeypot */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="company">Company</label>
              <input type="text" id="company" name="company" ref={honeypotRef} tabIndex={-1} autoComplete="off" />
            </div>

            {/* Field helper */}
            {(
              [
                { id: 'fullName', label: 'שם מלא', type: 'text', placeholder: 'הזן שם מלא', autoComplete: 'name', dir: undefined, ref: firstFieldRef },
                { id: 'phone', label: 'טלפון', type: 'tel', placeholder: '050-0000000', autoComplete: 'tel', dir: 'ltr' as const, ref: undefined },
                { id: 'email', label: 'אימייל', type: 'email', placeholder: 'email@example.com', autoComplete: 'email', dir: 'ltr' as const, ref: undefined },
              ] as any[]
            ).map(({ id, label, type, placeholder, autoComplete, dir, ref }) => (
              <div key={id} className="space-y-1.5">
                <label htmlFor={id} className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  {label} *
                </label>
                <Input
                  id={id}
                  ref={ref}
                  type={type}
                  dir={dir}
                  value={(formData as any)[id]}
                  onChange={(e) => handleChange(id as keyof CheckoutData, e.target.value)}
                  placeholder={placeholder}
                  autoComplete={autoComplete}
                  className={`rounded-none border-foreground/15 focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 ${(errors as any)[id] ? 'border-destructive' : ''}`}
                  aria-invalid={!!(errors as any)[id]}
                  required
                />
                {(errors as any)[id] && (
                  <p className="text-xs text-destructive" role="alert">{(errors as any)[id]}</p>
                )}
              </div>
            ))}

            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                הערות להזמנה
              </label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="הערות נוספות (אופציונלי)"
                rows={3}
                className="rounded-none border-foreground/15 focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
              />
            </div>

            {/* Delivery mode */}
            {deliveryMode === 'pickup_and_delivery' && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  אופן אספקה
                </label>
                <div className="flex gap-2">
                  {(['pickup', 'delivery'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setDeliveryMethod(method)}
                      className={`flex-1 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase border transition-colors ${
                        deliveryMethod === method
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-foreground/15 text-muted-foreground hover:border-foreground/40'
                      }`}
                    >
                      {method === 'pickup' ? 'איסוף עצמי' : 'משלוח'}
                    </button>
                  ))}
                </div>
                {deliveryMethod === 'delivery' && shippingCost > 0 && (
                  <p className="text-[10px] tracking-wide text-muted-foreground">עלות משלוח: {formatPrice(shippingCost)}</p>
                )}
                {deliveryMethod === 'delivery' && (
                  <div className="space-y-1.5">
                    <label htmlFor="deliveryAddress" className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                      כתובת למשלוח *
                    </label>
                    <Input
                      id="deliveryAddress"
                      value={formData.deliveryAddress || ''}
                      onChange={(e) => handleChange('deliveryAddress', e.target.value)}
                      placeholder="רחוב, מספר בית, עיר"
                      autoComplete="street-address"
                      className={`rounded-none border-foreground/15 focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 ${errors.deliveryAddress ? 'border-destructive' : ''}`}
                    />
                    {errors.deliveryAddress && (
                      <p className="text-xs text-destructive" role="alert">{errors.deliveryAddress}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Marketing opt-in (explicit consent, per Chok HaSpam) */}
            <label className="flex items-start gap-2.5 cursor-pointer text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-foreground"
              />
              <span>
                אני מאשר/ת לקבל עדכונים והצעות בדוא"ל מ{businessName || 'העסק'}. ניתן להסיר בכל עת.
                <span className="block text-xs text-muted-foreground mt-1">
                  {databaseDisclosure(businessName || 'העסק')}
                </span>
              </span>
            </label>

            <FormConsentNotice />

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="w-full bg-foreground text-background py-4 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-foreground/85 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  {hasPayment ? `לתשלום — ${formatPrice(totalPrice)}` : 'שלח הזמנה'}
                </>
              )}
            </button>
          </form>

          {/* ── Order Summary ── */}
          <section aria-labelledby="order-summary-title" className="mt-10 border-t border-foreground/10 pt-8">
            <div className="flex items-center gap-3 mb-6">
              <span id="order-summary-title" className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground">
                סיכום הזמנה
              </span>
              <div className="h-px flex-1 bg-foreground/10" />
            </div>

            <ul className="space-y-2.5 mb-5">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.name} × {item.quantity}</span>
                  <span className="text-xs font-medium tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>

            {/* Coupon */}
            <div className="border-t border-foreground/10 pt-4 mb-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between py-2 px-3 border border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Ticket className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase">{appliedCoupon.coupon.code}</span>
                    <span className="text-xs">(-{formatPrice(appliedCoupon.discount)})</span>
                  </div>
                  <button type="button" onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <Input
                      placeholder="קוד קופון"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      dir="ltr"
                      className="rounded-none border-foreground/15 focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validateCoupon.isPending || !couponCode.trim()}
                      className="px-4 border border-foreground/15 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {validateCoupon.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "הפעל"}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t border-foreground/10 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wide text-muted-foreground">סכום ביניים</span>
                <span className="text-xs tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <span className="text-[10px] tracking-wide">הנחה</span>
                  <span className="text-xs tabular-nums">-{formatPrice(discount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-wide text-muted-foreground">משלוח</span>
                  <span className="text-xs tabular-nums">{formatPrice(shippingCost)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">סה״כ לתשלום</span>
                <span className="text-base font-bold text-foreground tabular-nums">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

export default StoreCheckout;