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
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-muted/40 to-background flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-sm bg-card border border-border rounded-3xl shadow-2xl px-8 py-12" role="status" aria-live="polite">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">ההזמנה התקבלה! 🎉</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            {hasPayment ? 'התשלום התקבל בהצלחה. ניצור איתך קשר בהקדם.' : 'תודה רבה! ניצור איתך קשר לתיאום התשלום.'}
          </p>
          <button onClick={onBack} className="rounded-2xl bg-primary text-primary-foreground font-bold px-8 py-3 hover:scale-[1.03] active:scale-95 transition-transform shadow-lg shadow-primary/25">
            חזרה לחנות
          </button>
        </div>
      </div>
    );
  }

  const fieldCls = (err?: string) =>
    `rounded-xl border-border bg-background h-12 px-4 text-[15px] focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-shadow ${err ? 'border-destructive' : ''}`;
  const lbl = "text-sm font-medium text-foreground mb-1.5 block";

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      <div className="fixed inset-0 z-50 bg-gradient-to-b from-muted/30 to-background overflow-y-auto" dir="rtl">
        <div className="container max-w-3xl py-8 px-4 md:px-6">

          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:shadow-sm transition-all mb-6" aria-label="חזרה לחנות">
            <ArrowRight className="h-4 w-4" /> חזרה לחנות
          </button>

          <div className="flex items-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center"><ShoppingBag className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-foreground leading-tight">השלמת הזמנה</h1>
              <p className="text-sm text-muted-foreground">עוד כמה פרטים ואנחנו על זה 🚀</p>
            </div>
          </div>

          <FormErrorSummary errors={errors} />

          <form onSubmit={handleSubmit} noValidate className="grid md:grid-cols-[1.45fr_1fr] gap-6 items-start">
            {/* Honeypot */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="company">Company</label>
              <input type="text" id="company" name="company" ref={honeypotRef} tabIndex={-1} autoComplete="off" />
            </div>

            {/* ── Details card ── */}
            <div className="bg-card border border-border rounded-3xl shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-foreground text-lg">הפרטים שלך</h2>

              {([
                { id: 'fullName', label: 'שם מלא', type: 'text', placeholder: 'איך קוראים לך?', autoComplete: 'name', dir: undefined, ref: firstFieldRef },
                { id: 'phone', label: 'טלפון', type: 'tel', placeholder: '050-0000000', autoComplete: 'tel', dir: 'ltr' as const, ref: undefined },
                { id: 'email', label: 'אימייל', type: 'email', placeholder: 'email@example.com', autoComplete: 'email', dir: 'ltr' as const, ref: undefined },
              ] as any[]).map(({ id, label, type, placeholder, autoComplete, dir, ref }) => (
                <div key={id}>
                  <label htmlFor={id} className={lbl}>{label} *</label>
                  <Input id={id} ref={ref} type={type} dir={dir} value={(formData as any)[id]} onChange={(e) => handleChange(id as keyof CheckoutData, e.target.value)} placeholder={placeholder} autoComplete={autoComplete} className={fieldCls((errors as any)[id])} aria-invalid={!!(errors as any)[id]} required />
                  {(errors as any)[id] && <p className="text-xs text-destructive mt-1" role="alert">{(errors as any)[id]}</p>}
                </div>
              ))}

              <div>
                <label htmlFor="notes" className={lbl}>הערות להזמנה</label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="משהו שכדאי שנדע? (אופציונלי)" rows={3} className="rounded-xl border-border bg-background px-4 py-3 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary resize-none" />
              </div>

              {deliveryMode === 'pickup_and_delivery' && (
                <div className="space-y-3">
                  <label className={lbl}>אופן אספקה</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['pickup', 'delivery'] as const).map((method) => (
                      <button key={method} type="button" onClick={() => setDeliveryMethod(method)}
                        className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${deliveryMethod === method ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                        {method === 'pickup' ? '🏬 איסוף עצמי' : '🚚 משלוח'}
                      </button>
                    ))}
                  </div>
                  {deliveryMethod === 'delivery' && shippingCost > 0 && <p className="text-xs text-muted-foreground">עלות משלוח: {formatPrice(shippingCost)}</p>}
                  {deliveryMethod === 'delivery' && (
                    <div>
                      <label htmlFor="deliveryAddress" className={lbl}>כתובת למשלוח *</label>
                      <Input id="deliveryAddress" value={formData.deliveryAddress || ''} onChange={(e) => handleChange('deliveryAddress', e.target.value)} placeholder="רחוב, מספר בית, עיר" autoComplete="street-address" className={fieldCls(errors.deliveryAddress)} />
                      {errors.deliveryAddress && <p className="text-xs text-destructive mt-1" role="alert">{errors.deliveryAddress}</p>}
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-start gap-2.5 cursor-pointer text-sm text-foreground/80">
                <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0 accent-primary" />
                <span>אני מאשר/ת לקבל עדכונים והצעות בדוא"ל מ{businessName || 'העסק'}. ניתן להסיר בכל עת.
                  <span className="block text-xs text-muted-foreground mt-1">{databaseDisclosure(businessName || 'העסק')}</span>
                </span>
              </label>
              <FormConsentNotice />
            </div>

            {/* ── Sticky summary card ── */}
            <div className="bg-card border border-border rounded-3xl shadow-lg p-6 md:sticky md:top-6 space-y-4">
              <div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /><h2 className="font-bold text-foreground">סיכום הזמנה</h2></div>

              <ul className="space-y-2.5 max-h-48 overflow-y-auto pl-1">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-foreground/90 truncate">{item.name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                    <span className="font-semibold tabular-nums shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-border pt-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2 text-primary"><Ticket className="h-4 w-4" /><span className="text-sm font-bold">{appliedCoupon.coupon.code}</span><span className="text-xs">(-{formatPrice(appliedCoupon.discount)})</span></div>
                    <button type="button" onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <Input placeholder="קוד קופון" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} dir="ltr" className="rounded-xl border-border bg-background h-11 text-sm focus-visible:ring-2 focus-visible:ring-primary/30" />
                      <button type="button" onClick={handleApplyCoupon} disabled={validateCoupon.isPending || !couponCode.trim()} className="px-4 rounded-xl bg-muted text-sm font-semibold text-foreground hover:bg-muted/70 disabled:opacity-40 transition-colors whitespace-nowrap">
                        {validateCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "הפעל"}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between text-muted-foreground"><span>סכום ביניים</span><span className="tabular-nums">{formatPrice(subtotal)}</span></div>
                {discount > 0 && <div className="flex items-center justify-between text-primary"><span>הנחה</span><span className="tabular-nums">-{formatPrice(discount)}</span></div>}
                {shippingCost > 0 && <div className="flex items-center justify-between text-muted-foreground"><span>משלוח</span><span className="tabular-nums">{formatPrice(shippingCost)}</span></div>}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-bold text-foreground">סה״כ לתשלום</span>
                  <span className="text-2xl font-extrabold text-primary tabular-nums">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}
                className="w-full rounded-2xl bg-primary text-primary-foreground py-4 text-base font-bold hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-transform shadow-lg shadow-primary/25 flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{hasPayment ? `לתשלום מאובטח · ${formatPrice(totalPrice)}` : 'שליחת הזמנה'}<ShoppingBag className="h-5 w-5" /></>}
              </button>
              <p className="text-[11px] text-center text-muted-foreground">בלחיצה על הכפתור את/ה מאשר/ת את ההזמנה.</p>
            </div>
          </form>

        </div>
      </div>
    </>
  );
};

export default StoreCheckout;