import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, MailX } from "lucide-react";

/**
 * Shared, public unsubscribe flow (Chok HaSpam - Amendment 40).
 *
 * Compliance rules baked in:
 *  - One-click: if the recipient's email is in the link, we unsubscribe on load.
 *  - The unsubscribe is NEVER conditioned on giving a reason - the reason form
 *    appears only AFTER the recipient is already removed, and is optional.
 *  - Works fully logged-out (no auth), with a clear "removed successfully" state.
 *
 * `onUnsubscribe` does the actual removal (store RPC or platform RPC). It is
 * called once for the removal, and again (with a reason) if the user submits the
 * optional feedback.
 */

export interface UnsubscribeFlowProps {
  /** Legal sender shown in the copy (merchant name, or "Siango"). */
  senderName: string;
  /** Email pre-filled from the link (?email=). Empty if absent. */
  initialEmail: string;
  /** True once we can actually call the RPC (e.g. the store has loaded). */
  ready: boolean;
  /** Performs the removal / reason update. Returns an error if it failed. */
  onUnsubscribe: (email: string, reason?: string, detail?: string) => Promise<{ error: unknown }>;
}

const REASONS: { key: string; label: string }[] = [
  { key: "too_many", label: "אני מקבל/ת יותר מדי מיילים" },
  { key: "not_relevant", label: "התוכן לא רלוונטי עבורי" },
  { key: "never_signed_up", label: "לא נרשמתי לרשימה הזו" },
  { key: "no_longer_interested", label: "כבר לא מעוניין/ת בשירות" },
  { key: "other", label: "סיבה אחרת" },
];

type Status = "idle" | "loading" | "done" | "error";

const UnsubscribeFlow = ({ senderName, initialEmail, ready, onUnsubscribe }: UnsubscribeFlowProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<Status>("idle");

  // Optional post-removal reason feedback.
  const [reason, setReason] = useState<string>("");
  const [reasonDetail, setReasonDetail] = useState<string>("");
  const [reasonSent, setReasonSent] = useState(false);
  const [savingReason, setSavingReason] = useState(false);

  const doUnsubscribe = useCallback(
    async (target: string) => {
      if (!ready || !target.trim()) return;
      setStatus("loading");
      const { error } = await onUnsubscribe(target.trim());
      setStatus(error ? "error" : "done");
    },
    [ready, onUnsubscribe],
  );

  // One-click: an email in the link removes the recipient automatically.
  useEffect(() => {
    if (initialEmail && ready && status === "idle") {
      doUnsubscribe(initialEmail);
    }
  }, [initialEmail, ready, status, doUnsubscribe]);

  const submitReason = async () => {
    if (!reason || !email.trim()) return;
    setSavingReason(true);
    await onUnsubscribe(email.trim(), reason, reason === "other" ? reasonDetail.trim() : undefined);
    setSavingReason(false);
    setReasonSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md w-full text-center">
        {status === "done" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">הוסרת בהצלחה</h1>
            <p className="text-muted-foreground mb-8">
              לא תקבל/י יותר מיילים שיווקיים מ{senderName}. הבקשה נקלטה ותטופל מיידית, כנדרש בחוק.
            </p>

            {reasonSent ? (
              <p className="text-sm text-muted-foreground">תודה על המשוב - הוא עוזר לנו להשתפר. 🙏</p>
            ) : (
              <div className="text-right bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-medium text-foreground mb-1">רוצה לספר לנו למה? (לא חובה)</p>
                <p className="text-xs text-muted-foreground mb-4">המשוב אנונימי ועוזר לנו לשפר את התוכן.</p>
                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.key}
                      className="flex items-center gap-2 cursor-pointer text-sm text-foreground"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.key}
                        checked={reason === r.key}
                        onChange={() => setReason(r.key)}
                        className="accent-primary"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                {reason === "other" && (
                  <textarea
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    placeholder="ספר/י לנו..."
                    rows={2}
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:border-primary focus:outline-none"
                  />
                )}
                <button
                  onClick={submitReason}
                  disabled={!reason || savingReason}
                  className="mt-4 w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {savingReason && <Loader2 className="w-4 h-4 animate-spin" />}
                  שליחת משוב
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <MailX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">הסרה מרשימת התפוצה</h1>
            <p className="text-muted-foreground mb-6">
              להסרה מרשימת הדיוור של {senderName}, הזן/י את כתובת המייל שלך.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                doUnsubscribe(email);
              }}
              className="space-y-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
                required
                className="w-full h-12 px-4 rounded-lg bg-card border border-border text-foreground focus:border-primary focus:outline-none"
              />
              {status === "error" && (
                <p className="text-sm text-destructive">אירעה שגיאה. נסה/י שוב מאוחר יותר.</p>
              )}
              <button
                type="submit"
                disabled={status === "loading" || !ready}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
                הסר/י אותי מרשימת התפוצה
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribeFlow;
