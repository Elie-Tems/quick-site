import { useEffect, useRef, useState } from "react";
import { Heart, ShieldCheck, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NEDARIM_ORIGIN, nedarimIframeSrc, buildFinishTransaction2,
  parseNedarimResponse, type NedarimIframeParams,
} from "@/lib/nedarim";

/**
 * Nedarim Plus (נדרים פלוס) embedded checkout.
 *
 * The donor types the card INSIDE Nedarim's iframe (PCI stays with them); our page
 * only sends the transaction data via postMessage and reads the result. The
 * authoritative "paid" record is written server-side by the nedarim-webhook IPN -
 * this screen's OK result is for the donor's UX (thank-you) only.
 *
 * Double-charge safety (per Nedarim's docs): the message listener and the iframe
 * src are mounted EXACTLY ONCE (useEffect [] + removeEventListener cleanup), and
 * the pay button is locked from send until a TransactionResponse arrives.
 */

const NedarimCheckout = ({ params, onCancel }: { params: NedarimIframeParams; onCancel: () => void }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = (data: unknown) => frameRef.current?.contentWindow?.postMessage(data, NEDARIM_ORIGIN);

  // Register the postMessage listener ONCE. `params` is fixed for the lifetime of
  // this checkout (a new donation remounts the component), so the handler can close
  // over it safely; the state setters are stable. Registering per-render would make
  // the browser run TransactionResponse twice = double charge.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== NEDARIM_ORIGIN) return; // ignore anything not from Nedarim
      const name = e.data?.Name;
      if (name === "Height") {
        const h = parseInt(e.data.Value, 10);
        if (Number.isFinite(h) && h > 0) setHeight(h + 15);
      } else if (name === "TransactionResponse") {
        const res = parseNedarimResponse(e.data.Value);
        if (res.ok) {
          setDone(true);
        } else {
          setError(res.error || "התשלום לא הושלם");
          setSending(false); // allow retry
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = () => {
    if (sending || done) return; // guard against a double click
    setError(null);
    setSending(true);
    post({ Name: "FinishTransaction2", Value: buildFinishTransaction2(params) });
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-9 h-9 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">תודה על תרומתך! ❤️</h2>
        <p className="text-muted-foreground text-sm">
          התרומה בסך ₪{params.amount.toLocaleString()} התקבלה בהצלחה. קבלה תישלח למייל שהזנת.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <button onClick={onCancel} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowRight className="w-4 h-4" /> חזרה
      </button>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-gradient-to-l from-primary/10 to-accent/10 text-center text-sm font-medium text-foreground flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          תשלום מאובטח דרך נדרים פלוס · פרטי הכרטיס לא עוברים דרכנו
        </div>

        <iframe
          ref={frameRef}
          title="תשלום מאובטח נדרים פלוס"
          src={nedarimIframeSrc()}
          onLoad={() => post({ Name: "GetHeight" })}
          className="w-full border-0 bg-white block"
          style={{ height }}
        />

        <div className="p-4 border-t border-border">
          {error && <p className="text-sm text-destructive text-center mb-3">{error}</p>}
          <Button className="w-full" onClick={pay} disabled={sending}>
            {sending
              ? <><Loader2 className="w-4 h-4 animate-spin ml-1" /> מבצע תשלום...</>
              : <><Heart className="w-4 h-4 ml-1" /> תרום ₪{params.amount.toLocaleString()}{params.recurring ? " לחודש" : ""}</>}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            מלאו את פרטי הכרטיס למעלה ואז לחצו על כפתור התרומה
          </p>
        </div>
      </div>
    </div>
  );
};

export default NedarimCheckout;
