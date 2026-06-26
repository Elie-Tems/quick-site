import { useEffect, useState } from "react";
import { gtm } from "@/lib/gtm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Loader2, Check, X, HelpCircle, ShieldCheck } from "lucide-react";
import {
  PAYPLUS_SIGNUP_URL,
  usePaymentCredentials,
  useSavePayplusCredentials,
  verifyPayplusCredentials,
} from "@/hooks/usePayplus";

interface Props {
  businessId: string;
}

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3 p-4 rounded-lg border border-border">
    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-medium">
      {n}
    </div>
    <div className="flex-1 space-y-2">
      <p className="font-medium text-foreground">{title}</p>
      {children}
    </div>
  </div>
);

const PayplusConnectForm = ({ businessId }: Props) => {
  const { data: saved } = usePaymentCredentials(businessId);
  const save = useSavePayplusCredentials();

  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [pageUid, setPageUid] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "ok" | "fail">("idle");
  const [verifyMsg, setVerifyMsg] = useState("");

  useEffect(() => {
    if (saved) {
      setApiKey(saved.api_key || "");
      setSecretKey(saved.secret_key || "");
      setPageUid(saved.page_uid || "");
      if (saved.verified_at) setVerifyState("ok");
    }
  }, [saved]);

  const filled = apiKey.trim() && secretKey.trim() && pageUid.trim();

  const handleVerify = async () => {
    if (!filled) return;
    setVerifying(true);
    setVerifyState("idle");
    setVerifyMsg("");
    const res = await verifyPayplusCredentials({
      businessId,
      api_key: apiKey.trim(),
      secret_key: secretKey.trim(),
      page_uid: pageUid.trim(),
    });
    setVerifyState(res.ok ? "ok" : "fail");
    if (!res.ok) setVerifyMsg(res.error || "המפתחות לא תקינים");
    setVerifying(false);
  };

  const handleSave = async () => {
    if (!filled) return;
    gtm.connectPaymentClick();
    await save.mutateAsync({
      businessId,
      api_key: apiKey.trim(),
      secret_key: secretKey.trim(),
      page_uid: pageUid.trim(),
      verified: verifyState === "ok",
    });
  };

  return (
    <div className="space-y-3" dir="rtl">
      <Step n={1} title="פתחו חשבון PayPlus">
        <p className="text-sm text-muted-foreground">
          הרשמה חד-פעמית: פרטי העסק וחשבון הבנק שאליו ייכנס הכסף. האישור בדרך כלל תוך יום-יומיים.
        </p>
        <a href={PAYPLUS_SIGNUP_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <ExternalLink className="h-4 w-4" /> פתח חשבון PayPlus
          </Button>
        </a>
      </Step>

      <Step n={2} title="העתיקו 3 מפתחות מ-PayPlus">
        <p className="text-sm text-muted-foreground">
          בלוח של PayPlus: הגדרות ← מפתחות API. ליד כל ערך יש כפתור העתקה.
        </p>
      </Step>

      <Step n={3} title="הדביקו כאן ובדקו חיבור">
        <div className="space-y-3 pt-1">
          {[
            { id: "api", label: "API Key", val: apiKey, set: setApiKey, type: "text", ph: "1a87cde2-..." },
            { id: "secret", label: "Secret Key", val: secretKey, set: setSecretKey, type: "password", ph: "••••••••" },
            { id: "page", label: "Payment Page UID", val: pageUid, set: setPageUid, type: "text", ph: "5b616e7e-..." },
          ].map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={f.id} className="flex items-center gap-1.5">
                {f.label}
                <span className="text-xs text-primary inline-flex items-center gap-0.5">
                  <HelpCircle className="h-3.5 w-3.5" /> איפה מוצאים?
                </span>
              </Label>
              <Input
                id={f.id}
                type={f.type}
                dir="ltr"
                value={f.val}
                placeholder={f.ph}
                onChange={(e) => {
                  f.set(e.target.value);
                  setVerifyState("idle");
                }}
              />
            </div>
          ))}

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleVerify} disabled={!filled || verifying} className="gap-2">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              בדוק חיבור
            </Button>
            {verifyState === "ok" && (
              <span className="flex items-center gap-1.5 text-green-600 text-sm">
                <Check className="h-4 w-4" /> החיבור תקין
              </span>
            )}
            {verifyState === "fail" && (
              <span className="flex items-center gap-1.5 text-destructive text-sm">
                <X className="h-4 w-4" /> {verifyMsg}
              </span>
            )}
          </div>
        </div>
      </Step>

      <Button onClick={handleSave} size="lg" className="w-full gap-2" disabled={!filled || save.isPending}>
        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        הפעל סליקה ושמור
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        🔒 המפתחות נשמרים מוצפנים בצד השרת בלבד ולעולם לא נחשפים באתר החנות.
      </p>
    </div>
  );
};

export default PayplusConnectForm;
