import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CalendarX, Check, AlertCircle } from "lucide-react";

/**
 * Public appointment self-cancel page. The customer reaches it from the cancel
 * link in their booking-confirmation email (`/booking/cancel?a=<id>&t=<token>`).
 * Auth is the HMAC token in the URL (no account) - verified by booking-cancel-public.
 */
type State = "idle" | "loading" | "done" | "already" | "error";

const BookingCancel = () => {
  const [params] = useSearchParams();
  const appointmentId = params.get("a") || "";
  const token = params.get("t") || "";
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const missing = !appointmentId || !token;

  const cancel = async () => {
    if (missing) return;
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("booking-cancel-public", {
        body: { appointmentId, token },
      });
      if (error) throw error;
      if (data?.alreadyCancelled) { setState("already"); return; }
      if (data?.ok) { setState("done"); return; }
      setErrorMsg(
        data?.error === "cannot_cancel_past"
          ? "לא ניתן לבטל תור שכבר עבר."
          : "הקישור אינו תקין או שהתור לא נמצא.",
      );
      setState("error");
    } catch {
      setErrorMsg("אירעה תקלה. נסו שוב מאוחר יותר.");
      setState("error");
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {state === "done" || state === "already" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              {state === "already" ? "התור כבר בוטל" : "התור בוטל"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {state === "already"
                ? "התור הזה כבר לא פעיל. אין צורך בפעולה נוספת."
                : "ביטלנו את התור שלך. תודה שעדכנת אותנו - נשמח לראותך בפעם אחרת."}
            </p>
          </>
        ) : state === "error" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground">לא הצלחנו לבטל</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CalendarX className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">ביטול תור</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {missing
                ? "הקישור חסר פרטים. פתחו את קישור הביטול מתוך מייל האישור."
                : "רוצים לבטל את התור? לחצו על הכפתור לאישור."}
            </p>
            <button
              onClick={cancel}
              disabled={missing || state === "loading"}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarX className="h-4 w-4" />}
              אישור ביטול התור
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingCancel;
