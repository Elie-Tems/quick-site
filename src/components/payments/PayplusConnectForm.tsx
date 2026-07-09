import { useEffect, useState } from "react";
import { gtm } from "@/lib/gtm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, Check, X, HelpCircle, ShieldCheck, Shield, Zap, Lock, Eye, EyeOff, ChevronDown } from "lucide-react";
import {
  PAYPLUS_SIGNUP_URL,
  usePaymentCredentials,
  useSavePayplusCredentials,
  verifyPayplusCredentials,
} from "@/hooks/usePayplus";

interface Props {
  businessId: string;
}

// One field's config + the plain-language "where do I find this in PayPlus?"
// explainer that its (now clickable) help toggle reveals.
const FIELDS = [
  {
    id: "api",
    label: "API Key",
    type: "text",
    ph: "1a87cde2-...",
    help: "בלוח PayPlus ← הגדרות ← מפתחות API. השורה הראשונה, ליד \"API Key\", עם כפתור העתקה.",
  },
  {
    id: "secret",
    label: "Secret Key",
    type: "password",
    ph: "••••••••",
    help: "באותו מסך (הגדרות ← מפתחות API), השורה \"Secret Key\". שמרו עליו - הוא כמו סיסמה.",
  },
  {
    id: "page",
    label: "Payment Page UID",
    type: "text",
    ph: "5b616e7e-...",
    help: "בלוח PayPlus ← הגדרות ← דפי תשלום. פתחו את דף התשלום שלכם - ה-UID מופיע למעלה ליד השם, עם כפתור העתקה.",
  },
] as const;

const PayplusConnectForm = ({ businessId }: Props) => {
  const { data: saved } = usePaymentCredentials(businessId);
  const save = useSavePayplusCredentials();

  const [values, setValues] = useState<Record<string, string>>({ api: "", secret: "", page: "" });
  const [openHelp, setOpenHelp] = useState<string | null>(null);
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
    if (!res.ok) setVerifyMsg(res.error || "המפתחות לא תקינים");
    setVerifying(false);
  };

  const handleSave = async () => {
    if (!filled) return;
    gtm.connectPaymentClick();
    await save.mutateAsync({ ...creds(), verified: verifyState === "ok" });
  };

  return (
    <div dir="rtl" className="rounded-2xl border border-border overflow-hidden">
      {/* Trust header band - a money screen should feel secure first. */}
      <div className="bg-[#0f6e56] px-6 py-5 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-white font-semibold text-lg leading-tight">סליקה מאובטחת</div>
          <div className="text-[#9fe1cb] text-xs mt-0.5">PayPlus · הכסף נכנס ישר לחשבון הבנק שלך</div>
        </div>
      </div>

      <div className="bg-card px-6 py-5 space-y-4">
        {/* 3-step guide strip */}
        <div className="flex items-center gap-1.5">
          <a href={PAYPLUS_SIGNUP_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0f6e56] bg-[#e1f5ee] rounded-full px-3 py-1.5 hover:bg-[#d0efe4] transition-colors">
            <ExternalLink className="w-3 h-3" /> פתחו חשבון
          </a>
          <div className="flex-1 h-0.5 rounded bg-[#9fe1cb]" />
          <span className="text-xs font-medium text-[#0f6e56] bg-[#e1f5ee] rounded-full px-3 py-1.5">העתיקו מפתחות</span>
          <div className="flex-1 h-0.5 rounded bg-border" />
          <span className="text-xs font-medium text-white bg-[#639922] rounded-full px-3 py-1.5">הדביקו</span>
        </div>

        <div>
          <p className="text-[15px] font-medium text-foreground">הדביקו את 3 המפתחות</p>
          <p className="text-xs text-muted-foreground mt-0.5">מלוח PayPlus ← הגדרות ← מפתחות API. ליד כל ערך יש כפתור העתקה.</p>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {FIELDS.map((f) => {
            const isSecret = f.id === "secret";
            const helpOpen = openHelp === f.id;
            return (
              <div key={f.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={f.id} className="text-xs text-muted-foreground">{f.label}</label>
                  <button
                    type="button"
                    onClick={() => setOpenHelp(helpOpen ? null : f.id)}
                    aria-expanded={helpOpen}
                    className="inline-flex items-center gap-1 text-[11px] text-[#3b6d11] hover:text-[#27500a] transition-colors"
                  >
                    {helpOpen ? <ChevronDown className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
                    איפה מוצאים?
                  </button>
                </div>

                {helpOpen && (
                  <div className="mb-2 rounded-lg bg-[#eaf3de] px-3 py-2 text-[12px] leading-relaxed text-[#27500a]">
                    {f.help}
                  </div>
                )}

                <div className="relative">
                  <Input
                    id={f.id}
                    type={isSecret && !showSecret ? "password" : "text"}
                    dir="ltr"
                    className="font-mono text-[13px] pl-9"
                    value={values[f.id]}
                    placeholder={f.ph}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [f.id]: e.target.value }));
                      setVerifyState("idle");
                    }}
                  />
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() => setShowSecret((s) => !s)}
                      aria-label={showSecret ? "הסתר" : "הצג"}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verify */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={handleVerify} disabled={!filled || verifying} className="gap-2">
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            בדוק חיבור
          </Button>
          {verifyState === "ok" && (
            <span className="flex items-center gap-1.5 text-[#0f6e56] text-sm font-medium">
              <Check className="w-4 h-4" /> החיבור תקין
            </span>
          )}
          {verifyState === "fail" && (
            <span className="flex items-center gap-1.5 text-destructive text-sm">
              <X className="w-4 h-4" /> {verifyMsg}
            </span>
          )}
        </div>

        {/* Activate */}
        <Button
          onClick={handleSave}
          size="lg"
          className="w-full gap-2 bg-[#1d9e75] hover:bg-[#178a65] text-white"
          disabled={!filled || save.isPending}
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          הפעל סליקה ושמור
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="w-3 h-3" /> המפתחות נשמרים מוצפנים בצד השרת בלבד ולעולם לא נחשפים באתר
        </p>
      </div>
    </div>
  );
};

export default PayplusConnectForm;
