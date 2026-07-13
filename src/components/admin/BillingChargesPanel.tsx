import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, Receipt, ShieldCheck, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Charge {
  id: string;
  amount_ils: number;
  status: string;
  is_test: boolean;
  confirmation_code: string | null;
  coupon_code: string | null;
  payment_description: string | null;
  provider_transaction_id: string | null;
  refunded_amount: number | null;
  created_at: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: "שולם", cls: "text-green-700 bg-green-100" },
  pending: { label: "ממתין", cls: "text-amber-700 bg-amber-100" },
  failed: { label: "נכשל", cls: "text-red-700 bg-red-100" },
  refunded: { label: "זוכה", cls: "text-slate-600 bg-slate-100" },
};

const ils = (n: number) => `₪${Number(n).toFixed(2)}`;

/** Per-customer subscription charge history (from billing_charges) + admin refund
 *  with two gates: typed-amount confirmation + a 6-digit OTP emailed to the admin. */
export default function BillingChargesPanel({ userId }: { userId?: string }) {
  const qc = useQueryClient();

  const { data: charges, isLoading } = useQuery({
    queryKey: ["billing-charges", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("billing_charges")
        .select("id, amount_ils, status, is_test, confirmation_code, coupon_code, payment_description, provider_transaction_id, refunded_amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as Charge[];
    },
  });

  // ── refund modal state ──
  const [modal, setModal] = useState<Charge | null>(null);
  const [phase, setPhase] = useState<"amount" | "otp">("amount");
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partial, setPartial] = useState("");
  const [confirmAmount, setConfirmAmount] = useState("");
  const [needTxId, setNeedTxId] = useState(false);
  const [manualTxId, setManualTxId] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [lockedAmount, setLockedAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  const remainingOf = (c: Charge) => Math.round((Number(c.amount_ils) - Number(c.refunded_amount || 0)) * 100) / 100;

  const openRefund = (c: Charge) => {
    setModal(c); setPhase("amount"); setMode("full"); setPartial("");
    setConfirmAmount(""); setNeedTxId(false); setManualTxId(""); setCode(""); setSentTo(""); setLockedAmount(0);
  };
  const close = () => { if (!busy) setModal(null); };

  const targetAmount = () => (modal ? (mode === "full" ? remainingOf(modal) : Math.round(Number(partial || 0) * 100) / 100) : 0);

  const requestOtp = async () => {
    if (!modal) return;
    const amount = targetAmount();
    const remaining = remainingOf(modal);
    if (!(amount > 0) || amount > remaining) { toast.error(`הסכום חייב להיות בין 0 ל-${remaining}`); return; }
    if (Math.round(Number(confirmAmount || 0) * 100) / 100 !== amount) { toast.error("הקלדת הסכום לאישור אינה תואמת"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-refund", {
        body: { step: "request_otp", chargeId: modal.id, amount, transactionId: manualTxId.trim() || undefined },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.otp_sent) {
        setSentTo(d.to || ""); setLockedAmount(d.amount ?? amount); setPhase("otp");
        toast.success("נשלח קוד אישור למייל");
      } else if (d?.error === "no_transaction_id") {
        setNeedTxId(true);
        toast.error(d.message || "צריך מזהה עסקה (TranzactionId) מפאנל Cardcom");
      } else {
        toast.error(d?.error || "שליחת הקוד נכשלה");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally { setBusy(false); }
  };

  const confirmRefund = async () => {
    if (!modal) return;
    if (!/^\d{6}$/.test(code)) { toast.error("הזינו קוד בן 6 ספרות"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-refund", {
        body: { step: "confirm", chargeId: modal.id, code },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.ok) {
        toast.success(`זיכוי ${ils(d.amount)} בוצע ✓`);
        qc.invalidateQueries({ queryKey: ["billing-charges", userId] });
        setModal(null);
      } else {
        toast.error(d?.error || "הזיכוי נכשל");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה בזיכוי");
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
        <Receipt className="h-4 w-4 text-primary" /> פירוט חיובים (מנוי)
      </div>
      {isLoading ? (
        <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : !charges?.length ? (
        <p className="text-xs text-muted-foreground py-2">אין עדיין חיובים ללקוח זה.</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {charges.map((c) => {
            const s = STATUS[c.status] || STATUS.pending;
            const refunded = Number(c.refunded_amount || 0);
            const remaining = remainingOf(c);
            const canRefund = c.status === "success" && !c.is_test && remaining > 0 && Number(c.amount_ils) > 0;
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{ils(c.amount_ils)}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                    {refunded > 0 && c.status !== "refunded" && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">זוכה חלקית {ils(refunded)}</span>
                    )}
                    {c.is_test && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">בדיקה</span>}
                    {c.coupon_code && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{c.coupon_code}</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                    {c.confirmation_code ? ` · אישור ${c.confirmation_code}` : ""}
                    {c.payment_description ? ` · ${c.payment_description}` : ""}
                  </div>
                </div>
                {canRefund && (
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => openRefund(c)}>
                    <RotateCcw className="h-3.5 w-3.5" /> זיכוי
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Refund modal (two gates) ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
          <div dir="rtl" className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> זיכוי חיוב</h3>
              <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm mb-4 space-y-0.5">
              <div className="flex justify-between"><span className="text-muted-foreground">סכום החיוב</span><span className="font-medium">{ils(modal.amount_ils)}</span></div>
              {Number(modal.refunded_amount || 0) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">כבר זוכה</span><span>{ils(Number(modal.refunded_amount))}</span></div>
              )}
              <div className="flex justify-between font-semibold"><span>ניתן לזיכוי</span><span>{ils(remainingOf(modal))}</span></div>
            </div>

            {phase === "amount" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setMode("full")} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${mode === "full" ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"}`}>זיכוי מלא</button>
                  <button onClick={() => setMode("partial")} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${mode === "partial" ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"}`}>סכום חלקי</button>
                </div>
                {mode === "partial" && (
                  <div>
                    <label className="text-xs text-muted-foreground">סכום לזיכוי (₪)</label>
                    <Input type="number" min="0" step="0.01" value={partial} onChange={(e) => setPartial(e.target.value)} placeholder="0.00" dir="ltr" className="mt-1" />
                  </div>
                )}
                {needTxId && (
                  <div>
                    <label className="text-xs text-amber-700">לחיוב זה לא שמור מזהה עסקה. הזינו TranzactionId מפאנל Cardcom (עסקאות):</label>
                    <Input value={manualTxId} onChange={(e) => setManualTxId(e.target.value)} placeholder="TranzactionId" dir="ltr" className="mt-1" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">להקליד את סכום הזיכוי המדויק לאישור: <b>{ils(targetAmount())}</b></label>
                  <Input type="number" min="0" step="0.01" value={confirmAmount} onChange={(e) => setConfirmAmount(e.target.value)} placeholder={targetAmount().toFixed(2)} dir="ltr" className="mt-1" />
                </div>
                <p className="text-[11px] text-destructive">שים לב: הזיכוי בלתי הפיך - הכסף חוזר ללקוח.</p>
                <Button className="w-full" disabled={busy} onClick={requestOtp}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "שליחת קוד אישור למייל"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground">שלחנו קוד בן 6 ספרות ל-<b dir="ltr">{sentTo}</b>. הזינו אותו כדי לבצע זיכוי של <b>{ils(lockedAmount)}</b>:</p>
                <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="______" dir="ltr" className="text-center text-xl tracking-[0.4em] font-bold" inputMode="numeric" />
                <Button className="w-full" disabled={busy} onClick={confirmRefund}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `בצע זיכוי ${ils(lockedAmount)}`}
                </Button>
                <button onClick={() => setPhase("amount")} className="w-full text-xs text-muted-foreground hover:text-foreground">חזרה</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
