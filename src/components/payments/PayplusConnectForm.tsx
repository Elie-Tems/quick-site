import { useEffect, useState } from "react";
import { gtm } from "@/lib/gtm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, Check, X, ShieldCheck, Zap, Lock, Eye, EyeOff, ImageIcon } from "lucide-react";
import {
  PAYPLUS_SIGNUP_URL,
  usePaymentCredentials,
  useSavePayplusCredentials,
  verifyPayplusCredentials,
} from "@/hooks/usePayplus";

interface Props {
  businessId: string;
}

// Each step = one copy-paste from PayPlus. No technical jargon in labels.
// screenshot: path under /public/payplus-guide/ — swap in real images when ready.
const STEPS = [
  {
    id: "api",
    step: 1,
    title: "הקוד הראשי",
    where: "PayPlus ← הגדרות ← מפתחות",
    instruction: 'בלוח PayPlus, לחצו על "הגדרות" בתפריט הצדדי, בחרו "מפתחות". ליד השורה הראשונה יש כפתור העתקה — לחצו עליו.',
    screenshot: "/payplus-guide/step1-api-key.png",
    ph: "1a87cde2-...",
    secret: false,
  },
  {
    id: "secret",
    step: 2,
    title: "קוד האימות",
    where: "PayPlus ← הגדרות ← מפתחות",
    instruction: 'באותו מסך בדיוק, ליד השורה השנייה — לחצו העתקה שוב.',
    screenshot: "/payplus-guide/step2-secret-key.png",
    ph: "••••••••",
    secret: true,
  },
  {
    id: "page",
    step: 3,
    title: "קוד דף התשלום",
    where: "PayPlus ← הגדרות ← דפי תשלום",
    instruction: 'בתפריט לחצו "הגדרות" ← "דפי תשלום". פתחו את דף התשלום שלכם — הקוד מופיע למעלה עם כפתור העתקה.',
    screenshot: "/payplus-guide/step3-page-uid.png",
    ph: "5b616e7e-...",
    secret: false,
  },
] as const;

// Placeholder shown when screenshot hasn't been dropped in yet.
const ScreenshotPlaceholder = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!error && !loaded) {
    return (
      <>
        <img
          src={src}
          alt={alt}
          className="hidden"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
        <div className="w-full rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <ImageIcon className="w-7 h-7 opacity-40" />
          <p className="text-xs">תמונת הדרכה — בקרוב</p>
        </div>
      </>
    );
  }

  if (error) return null;

  return (
    <img
      src={src}
      alt={alt}
      className="w-full rounded-xl border border-border shadow-sm"
    />
  );
};

const PayplusConnectForm = ({ businessId }: Props) => {
  const { data: saved } = usePaymentCredentials(businessId);
  const save = useSavePayplusCredentials();

  const [values, setValues] = useState<Record<string, string>>({ api: "", secret: "", page: "" });
  const [showSecret, setShowSecret] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "ok" | "fail">("idle");
  const [verifyMsg, setVerifyMsg] = useState("");

  useEffect(() => {
    if (saved) {
      setValues({ api: saved.api_key || "", secret: saved.secret_key || "", page: saved.page_uid || "" });
      if (saved.verified_at) setVerifyState("ok");
    }
  }, [saved]);

  const filled = values.api.trim() && values.secret.trim() && values.page.trim();

  const creds = () => ({
    businessId,
    api_key: values.api.trim(),
    secret_key: values.secret.trim(),
    page_uid: values.page.trim(),
  });

  const handleVerify = async () => {
    if (!filled) return;
    setVerifying(true);
    setVerifyState("idle");
    setVerifyMsg("");
    const res = await verifyPayplusCredentials(creds());
    setVerifyState(res.ok ? "ok" : "fail");
    if (!res.ok) setVerifyMsg(res.error || "הקודים לא תקינים — בדקו שהעתקתם נכון");
    setVerifying(false);
  };

  const handleSave = async () => {
    if (!filled) return;
    gtm.connectPaymentClick();
    await save.mutateAsync({ ...creds(), verified: verifyState === "ok" });
  };

  return (
    <div dir="rtl" className="space-y-4">

      {/* Header */}
      <div className="rounded-2xl bg-[#0f6e56] px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold">3 העתק-הדבק — וזהו</p>
          <p className="text-[#9fe1cb] text-xs mt-0.5">פותחים PayPlus בטאב נוסף, מעתיקים 3 קודים, חוזרים לכאן</p>
        </div>
        <a
          href={PAYPLUS_SIGNUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mr-auto shrink-0 inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
        >
          פתח PayPlus <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Steps */}
      {STEPS.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Step header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <div className="w-6 h-6 rounded-full bg-[#0f6e56] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{s.step}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{s.where}</p>
            </div>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* Instruction */}
            <p className="text-sm text-muted-foreground leading-relaxed">{s.instruction}</p>

            {/* Screenshot with arrow */}
            <ScreenshotPlaceholder src={s.screenshot} alt={`הדרכה שלב ${s.step}`} />

            {/* Input */}
            <div className="relative">
              <Input
                id={s.id}
                type={s.secret && !showSecret ? "password" : "text"}
                dir="ltr"
                className="font-mono text-[13px] bg-background"
                value={values[s.id]}
                placeholder={s.ph}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [s.id]: e.target.value }));
                  setVerifyState("idle");
                }}
              />
              {s.secret && (
                <button
                  type="button"
                  onClick={() => setShowSecret((x) => !x)}
                  aria-label={showSecret ? "הסתר" : "הצג"}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Verify + Save */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleVerify}
            disabled={!filled || verifying}
            className="gap-2"
          >
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            בדוק שהכל תקין
          </Button>
          {verifyState === "ok" && (
            <span className="flex items-center gap-1.5 text-[#0f6e56] text-sm font-medium">
              <Check className="w-4 h-4" /> הכל תקין, מוכנים להפעיל
            </span>
          )}
          {verifyState === "fail" && (
            <span className="flex items-center gap-1.5 text-destructive text-sm">
              <X className="w-4 h-4" /> {verifyMsg}
            </span>
          )}
        </div>

        <Button
          onClick={handleSave}
          size="lg"
          className="w-full gap-2 bg-[#1d9e75] hover:bg-[#178a65] text-white"
          disabled={!filled || save.isPending}
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          הפעל סליקה
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="w-3 h-3" /> הקודים נשמרים מוצפנים ולעולם לא נחשפים באתר
        </p>
      </div>
    </div>
  );
};

export default PayplusConnectForm;
