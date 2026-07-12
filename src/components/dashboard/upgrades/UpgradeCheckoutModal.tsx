import { useState } from "react";
import { X, Loader2, Check, Tag, ShieldCheck, AlertTriangle, PartyPopper, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Confetti from "@/components/ui/confetti";
import { edgeErrorMessage } from "@/lib/edgeError";

/**
 * The add-on checkout. Charges each selected recurring add-on on the merchant's
 * ALREADY-SAVED Cardcom card via the server-authoritative `addon-subscribe`
 * function (proration + invoice handled there). Real charge, precise errors -
 * NOT a demo, NOT a silent "declined". A coupon is validated + applied on the
 * server (discount on the first charge). On success the feature flags flip and
 * the tax invoice is emailed by Cardcom.
 */

export interface CheckoutItem {
  addon: string;   // addon-subscribe key: 'crm' | 'reviews' | 'whatsapp' | 'email'
  title: string;
  netIls: number;  // pre-VAT monthly
  color: string;
}

type ItemState = { status: "idle" | "charging" | "done" | "failed"; msg?: string };

const vatGross = (net: number) => Math.round(net * 1.18);

const UpgradeCheckoutModal = ({
  open, onClose, items, businessId,
}: {
  open: boolean;
  onClose: () => void;
  items: CheckoutItem[];
  businessId?: string;
}) => {
  const qc = useQueryClient();
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [couponLabel, setCouponLabel] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [blocker, setBlocker] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState<string[]>([]);

  if (!open) return null;

  const monthlyNet = items.reduce((s, i) => s + i.netIls, 0);
  const monthlyGross = vatGross(monthlyNet);
  const allDone = succeeded.length > 0 && succeeded.length === items.length && !processing;

  const checkCoupon = async () => {
    const code = coupon.trim();
    if (!code) { setCouponState("idle"); setCouponLabel(""); return; }
    setCouponState("checking");
    // Validate against the primary add-on (server re-validates per item on charge).
    // RPC isn't in the generated types yet - call is granted to authenticated.
    const { data } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>)(
      "validate_subscription_coupon", { p_code: code, p_product: items[0]?.addon ?? "all" },
    );
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.valid) {
      setCouponState("valid");
      const v = Number(row.discount_value);
      setCouponLabel(row.discount_type === "percent" ? `הנחה של ${v}% על התשלום הראשון` : `הנחה של ₪${v} על התשלום הראשון`);
    } else {
      setCouponState("invalid");
      setCouponLabel("");
    }
  };

  const pay = async () => {
    if (!businessId) { toast.error("לא נמצא עסק פעיל."); return; }
    setProcessing(true);
    setBlocker(null);
    const done: string[] = [];
    for (const item of items) {
      setStates((s) => ({ ...s, [item.addon]: { status: "charging" } }));
      try {
        const { data, error } = await supabase.functions.invoke("addon-subscribe", {
          body: { addon: item.addon, businessId, couponCode: couponState === "valid" ? coupon.trim() : undefined },
        });
        if (error) {
          // Non-2xx from the function - surface the real reason from the body.
          const msg = await edgeErrorMessage(error, "בעיה זמנית - לא בוצע חיוב. נסו שוב.");
          setStates((s) => ({ ...s, [item.addon]: { status: "failed", msg } }));
          continue;
        }
        if (data?.needsSubscription) {
          setBlocker("כדי להוסיף תוספים צריך מנוי פרסום פעיל. פרסמו את האתר תחילה, ואז חזרו לכאן.");
          setStates((s) => ({ ...s, [item.addon]: { status: "failed", msg: "אין מנוי פעיל" } }));
          break;
        }
        if (data?.needsCard) {
          setBlocker("אין כרטיס אשראי שמור. פרסמו את האתר (שמירת כרטיס) ואז אפשר להפעיל תוספים בקליק.");
          setStates((s) => ({ ...s, [item.addon]: { status: "failed", msg: "אין כרטיס שמור" } }));
          break;
        }
        if (data?.declined) {
          setStates((s) => ({ ...s, [item.addon]: { status: "failed", msg: data.error || "הכרטיס נדחה. בדקו מול חברת האשראי." } }));
          continue;
        }
        if (!data?.ok) {
          setStates((s) => ({ ...s, [item.addon]: { status: "failed", msg: data?.error || "לא הצלחנו כרגע." } }));
          continue;
        }
        setStates((s) => ({ ...s, [item.addon]: { status: "done" } }));
        done.push(item.addon);
      } catch {
        setStates((s) => ({ ...s, [item.addon]: { status: "failed", msg: "בעיה זמנית - לא בוצע חיוב." } }));
      }
    }
    setSucceeded((prev) => Array.from(new Set([...prev, ...done])));
    setProcessing(false);
    if (done.length) {
      // Refresh entitlement + business so the newly-active add-ons show unlocked.
      qc.invalidateQueries({ queryKey: ["crm-entitled"] });
      qc.invalidateQueries({ queryKey: ["analytics-entitled"] });
      qc.invalidateQueries({ queryKey: ["my-business"] });
      qc.invalidateQueries({ queryKey: ["business"] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl" onClick={onClose}>
      {allDone && <Confetti />}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-lg flex items-center gap-2">
            {allDone ? <><PartyPopper className="w-5 h-5 text-emerald-500" /> הופעל!</> : <><CreditCard className="w-5 h-5 text-primary" /> הפעלת תוספים</>}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {allDone ? (
          /* ---- success ---- */
          <div className="p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-semibold text-foreground">התוספים הופעלו בהצלחה 🎉</p>
            <p className="text-sm text-muted-foreground">
              חשבונית המס נשלחה למייל שלכם מ-Cardcom. מהחודש הבא התוספים יצטרפו לחשבונית המנוי החודשית באופן אוטומטי.
            </p>
            <button onClick={onClose} className="w-full mt-2 rounded-xl py-2.5 font-semibold text-white bg-primary hover:opacity-90">מעולה, סגור</button>
          </div>
        ) : (
          /* ---- checkout ---- */
          <div className="p-5 space-y-4">
            {/* line items */}
            <div className="space-y-2">
              {items.map((item) => {
                const st = states[item.addon]?.status;
                return (
                  <div key={item.addon} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{item.title}</div>
                      {states[item.addon]?.msg && (
                        <div className="text-xs text-rose-500">{states[item.addon]?.msg}</div>
                      )}
                    </div>
                    <div className="text-sm font-bold text-foreground whitespace-nowrap">₪{item.netIls}<span className="text-xs font-normal text-muted-foreground">/ח'</span></div>
                    {st === "charging" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    {st === "done" && <Check className="w-4 h-4 text-emerald-500" />}
                    {st === "failed" && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                  </div>
                );
              })}
            </div>

            {/* coupon */}
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={coupon}
                    onChange={(e) => { setCoupon(e.target.value); setCouponState("idle"); }}
                    placeholder="קוד קופון (לא חובה)"
                    className="w-full h-10 pr-9 pl-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={checkCoupon}
                  disabled={!coupon.trim() || couponState === "checking"}
                  className="px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {couponState === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> : "החל"}
                </button>
              </div>
              {couponState === "valid" && <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> {couponLabel}</p>}
              {couponState === "invalid" && <p className="text-xs text-rose-500 mt-1.5">קוד לא תקף או לא בתוקף.</p>}
            </div>

            {/* total */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">סה"כ חודשי</span>
                <span className="text-xl font-bold text-foreground">₪{monthlyGross} <span className="text-xs font-normal text-muted-foreground">כולל מע"מ</span></span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                החיוב הראשון יחסי לימים שנותרו עד החיוב הבא של המנוי{couponState === "valid" ? " (בניכוי הקופון)" : ""}. מהחודש הבא - סכום מלא בחשבונית המנוי.
              </p>
            </div>

            {blocker && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {blocker}
              </div>
            )}

            <button
              onClick={pay}
              disabled={processing || !items.length}
              className="w-full rounded-xl py-3 font-semibold text-white bg-primary hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> מחייב...</> : <>שלם והפעל · ₪{monthlyGross}/חודש</>}
            </button>
            <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> חיוב מאובטח על הכרטיס השמור דרך Cardcom · סיאנגו לא רואה את פרטי הכרטיס
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpgradeCheckoutModal;
