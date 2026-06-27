import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShoppingCart, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  getDomainPaymentBaseUrl, buildIcountDomainCheckoutUrl,
} from "@/lib/publishPaymentConfig";

// Bump when the legal terms below change - stored with the order as proof of
// exactly which terms the customer agreed to.
export const DOMAIN_CONSENT_VERSION = "2026-06-25";

interface Prefill {
  name?: string;
  email?: string;
  phone?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  priceIls: number | null;
  businessId?: string;
  prefill?: Prefill;
}

/**
 * Domain purchase: collects the registrant (WHOIS owner) details + a clear,
 * lawyerly consent, then creates the order (domain-purchase) and sends the
 * customer to the iCount payment page. The domain is registered on the
 * CUSTOMER's name only after payment is confirmed.
 */
const DomainPurchaseDialog = ({ open, onOpenChange, domain, priceIls, businessId, prefill }: Props) => {
  const [name, setName] = useState(prefill?.name || "");
  const [email, setEmail] = useState(prefill?.email || "");
  const [phone, setPhone] = useState(prefill?.phone || "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    name.trim() && email.trim() && phone.trim() && address.trim() && city.trim() && zip.trim() && agreed && !submitting;

  const submit = async () => {
    if (!canSubmit || !businessId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("domain-purchase", {
        body: {
          businessId,
          domain,
          autoRenew,
          consentVersion: DOMAIN_CONSENT_VERSION,
          registrant: { name, email, phone, address, city, zip },
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "purchase failed");

      const base = getDomainPaymentBaseUrl();
      if (!base) {
        toast.error("התשלום עדיין לא מחובר. נשמח אם תנסו שוב בקרוב.");
        setSubmitting(false);
        return;
      }
      const url = buildIcountDomainCheckoutUrl(base, {
        sessionToken: data.sessionToken,
        orderId: data.orderId,
        businessId,
        sumIls: data.priceIls,
      });
      // Off to the hosted payment page; the IPN finishes the registration.
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "לא הצלחנו להתחיל את הרכישה. נסו שוב.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <ShoppingCart className="h-5 w-5 text-primary" />
            רכישת הדומיין <span dir="ltr" className="text-primary">{domain}</span>
          </DialogTitle>
          <DialogDescription className="text-right">
            {priceIls != null ? (
              <>מחיר: <b className="text-foreground">₪{priceIls}/שנה + מע"מ</b>. הדומיין יירשם על שמכם כבעלים.</>
            ) : (
              "הדומיין יירשם על שמכם כבעלים."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">פרטי בעל הדומיין (רישום רשמי)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="dn-name" className="text-xs">שם מלא / שם העסק</Label>
                <Input id="dn-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dn-email" className="text-xs">אימייל</Label>
                <Input id="dn-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dn-phone" className="text-xs">טלפון</Label>
                <Input id="dn-phone" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="dn-address" className="text-xs">כתובת (רחוב ומספר)</Label>
                <Input id="dn-address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dn-city" className="text-xs">עיר</Label>
                <Input id="dn-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dn-zip" className="text-xs">מיקוד</Label>
                <Input id="dn-zip" dir="ltr" value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              הפרטים נרשמים במאגר הבעלות הבינלאומי של הדומיין (WHOIS), לכן הם חייבים להיות מדויקים ועדכניים.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="text-sm">
              <div className="font-medium text-foreground">חידוש אוטומטי שנתי</div>
              <div className="text-xs text-muted-foreground">נחדש מדי שנה כדי שלא תאבדו את הכתובת. אפשר לבטל בכל עת.</div>
            </div>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>

          {/* Lawyerly disclosure - written like a registrar's T&C summary. */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" /> מה חשוב לדעת לפני הרכישה
            </div>
            <p><b>בעלות:</b> הדומיין נרשם על שמכם כבעלים הרשומים (Registrant). אתם הבעלים - לא Siango. Siango משמשת כרשם/מתווך הרישום בלבד.</p>
            <p><b>מחזור חיוב:</b> דומיין מושכר לתקופה שנתית. התשלום הנוכחי מכסה שנה אחת מיום הרישום. {autoRenew ? "בחרתם חידוש אוטומטי - נחייב ונחדש מדי שנה עד שתבטלו." : "בחרתם ללא חידוש אוטומטי - נשלח תזכורות, והאחריות לחדש בזמן עליכם."}</p>
            <p><b>אי-חידוש:</b> דומיין שלא יחודש עד מועד התפוגה יושעה ולאחר מכן ישוחרר לציבור, ואז כל אדם יוכל לתפוס אותו - ייתכן שלא נוכל להחזירו.</p>
            <p><b>עזיבה / ניוד:</b> הדומיין שלכם וניתן להעבירו (Transfer) לרשם אחר בכל עת בכפוף לכללי הרישום (בד"כ לאחר 60 יום מרישום ובאמצעות קוד העברה). עזיבת Siango אינה גורעת מבעלותכם בדומיין, אך עלולה לנתק את החיבור האוטומטי לאתר.</p>
            <p><b>החזרים:</b> רישום דומיין הוא בלתי הפיך מרגע הביצוע ולכן אינו ניתן להחזר.</p>
            <p><b>פרטיות:</b> פרטי הבעלות נשמרים במרשם ה-WHOIS בהתאם לכללי רשם הסיומת.</p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
            <span className="text-[12px] text-foreground leading-relaxed">
              קראתי והבנתי את התנאים לעיל, אני מאשר/ת את נכונות פרטי הבעלות, ומסכים/ה לרכישה ולמדיניות החידוש.
            </span>
          </label>

          <Button onClick={submit} disabled={!canSubmit} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <ShoppingCart className="h-4 w-4 ml-1" />}
            {priceIls != null ? `המשך לתשלום ₪${priceIls} + מע"מ` : "המשך לתשלום"}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">תשלום מאובטח. הדומיין נרשם רק לאחר אישור התשלום.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DomainPurchaseDialog;
