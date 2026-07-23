import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Link2, Copy, Check, Crown } from "lucide-react";
import { CUSTOM_DOMAIN_ADDON, withVat } from "@/lib/pricingConfig";

interface Props {
  businessId?: string;
  /** Called after a successful connect so the parent can refresh its domain list. */
  onConnected?: () => void;
}

/**
 * "Bring your own domain": the merchant already owns a domain elsewhere (not
 * bought through Siango) and wants it pointed at their store. We can't touch
 * their DNS - the one unavoidable manual step is the merchant adding ONE CNAME
 * record at their own registrar. Everything else (Cloudflare connection, SSL,
 * billing) is automatic - see addon-subscribe's 'custom_domain' entry.
 */
// Returns null if domain looks valid, or a Hebrew error string if not.
function validateDomain(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null; // empty — no error shown until submit
  if (/^https?:\/\//i.test(raw)) return 'הסר את "http://" — הכנס רק את שם הדומיין, למשל: shop.co.il';
  if (v.startsWith("www.")) return 'אין צורך ב-www — הכנס רק shop.co.il';
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(v))
    return "כתובת דומיין לא תקינה — השתמש רק באותיות אנגליות, מספרים ונקודות (למשל: shop.co.il)";
  if (!v.includes(".")) return "חסרה סיומת — למשל .co.il או .com";
  const tld = v.split(".").pop() || "";
  if (tld.length < 2) return "סיומת הדומיין קצרה מדי";
  return null;
}

const ConnectOwnDomain = ({ businessId, onConnected }: Props) => {
  const [domain, setDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cnameTarget, setCnameTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDomainChange = (val: string) => {
    setDomain(val);
    setDomainError(val.trim() ? validateDomain(val) : null);
  };

  const connect = async () => {
    const value = domain.trim().toLowerCase();
    if (!value || !businessId) return;
    const err = validateDomain(value);
    if (err) { setDomainError(err); return; }
    setDomainError(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("addon-subscribe", {
        body: { addon: "custom_domain", businessId, domain: value },
      });
      if (error) throw error;
      if (data?.needsSubscription) {
        toast.error(data.message || "צריך מנוי פרסום פעיל כדי לחבר דומיין.");
        return;
      }
      if (data?.needsCard) {
        toast.error(data.message || "אין כרטיס שמור. יש לפרסם אתר תחילה.");
        return;
      }
      if (data?.declined) {
        toast.error(data.error || "התשלום נדחה. בדקו את הכרטיס ונסו שוב.");
        return;
      }
      if (!data?.ok) throw new Error(data?.error || "failed");
      setCnameTarget(data.cnameTarget || null);
      toast.success(data.alreadyActive || data.alreadyCharged ? "הדומיין כבר מחובר!" : "התשלום בוצע! נשאר רק צעד אחד קטן למטה 👇");
      onConnected?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "לא הצלחנו לחבר את הדומיין. נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    if (!cnameTarget) return;
    try {
      await navigator.clipboard.writeText(cnameTarget);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable - the value is still selectable */ }
  };

  if (cnameTarget) {
    return (
      <div dir="rtl" className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <p className="font-semibold text-foreground">כמעט סיימנו - נשאר רק שלב אחד</p>
        <p className="text-sm text-muted-foreground">
          היכנסו לניהול הדומיין אצל הספק שממנו קניתם אותו (למשל GoDaddy, Namecheap, domains.co.il),
          והוסיפו רשומת <b>CNAME</b> אחת:
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm rounded-lg bg-background border border-border p-3">
          <span className="text-muted-foreground">שם (Name):</span>
          <span dir="ltr" className="font-mono text-right">www</span>
          <span className="text-muted-foreground">ערך (Value):</span>
          <div className="flex items-center gap-2 justify-end">
            <span dir="ltr" className="font-mono">{cnameTarget}</span>
            <button onClick={copy} className="text-primary hover:opacity-70 shrink-0" title="העתק">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          אם הדומיין שלכם ללא www (למשל <span dir="ltr">shop.co.il</span>) - כדאי גם להגדיר אצל הספק
          "הפניה" (Forward/Redirect) מהדומיין הריק ל-www. ברגע שהעדכון נקלט (בד"כ דקות עד כמה שעות) החנות
          תעלה אוטומטית על הכתובת החדשה - תראו את הסטטוס למטה מתעדכן לבד, בלי שתצטרכו לעשות עוד כלום.
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">יש לי כבר דומיין</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        קניתם דומיין במקום אחר? אפשר לחבר אותו לחנות. {CUSTOM_DOMAIN_ADDON.description}
      </p>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input
            value={domain}
            onChange={(e) => handleDomainChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connect()}
            placeholder="shop.co.il"
            dir="ltr"
            className={`flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 ${domainError ? "border-destructive" : "border-border"}`}
          />
          <button
            onClick={connect}
            disabled={submitting || !domain.trim() || !!domainError}
            className="rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
            חבר · {withVat(CUSTOM_DOMAIN_ADDON.label)}/חודש
          </button>
        </div>
        {domainError && <p className="text-xs text-destructive" dir="rtl">{domainError}</p>}
      </div>
    </div>
  );
};

export default ConnectOwnDomain;
