import { useEffect, useState } from "react";
import { Loader2, Check, X, ShieldCheck, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useIcountCredentials, useSaveIcountCredentials, verifyIcountCredentials } from "@/hooks/useIcount";

// Connect the merchant's own iCount account: they paste their API token + paypage
// id, we validate them against iCount (no charge), then store them so the storefront
// checkout runs on their account. Payment authenticity is verified server-side.
const IcountConnectForm = ({ businessId }: { businessId: string }) => {
  const { data: saved } = useIcountCredentials(businessId);
  const save = useSaveIcountCredentials();

  const [token, setToken] = useState("");
  const [page, setPage] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [verifyMsg, setVerifyMsg] = useState("");

  useEffect(() => {
    if (saved) {
      setToken(saved.api_key || "");
      setPage(saved.page_uid || "");
      if (saved.verified_at) setVerifyState("ok");
    }
  }, [saved]);

  const filled = token.trim().length > 0 && page.trim().length > 0;

  const handleVerify = async () => {
    if (!filled) return;
    setVerifyState("checking");
    setVerifyMsg("");
    const res = await verifyIcountCredentials({ businessId, api_key: token.trim(), page_uid: page.trim() });
    if (res.ok) { setVerifyState("ok"); setVerifyMsg("החיבור אומת בהצלחה ✓"); }
    else { setVerifyState("fail"); setVerifyMsg(res.error || "האימות נכשל - בדקו את הפרטים"); }
  };

  const handleSave = async () => {
    if (!filled) return;
    await save.mutateAsync({ businessId, api_key: token.trim(), page_uid: page.trim(), verified: verifyState === "ok" });
  };

  return (
    <div className="rounded-2xl border-2 border-[#639922] bg-[#f6faf0] p-5 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-[#3b6d11]" />
        <h3 className="font-semibold text-foreground">חיבור חשבון iCount</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        הזינו את פרטי ה-API של חשבון ה-iCount שלכם. הכסף נכנס ישירות לחשבון שלכם, וסיאנגו לא רואה ולא שומרת פרטי כרטיס אשראי.
        את ה-API Token מוצאים ב-iCount → הגדרות → API. {" "}
        <a href="https://app.icount.co.il" target="_blank" rel="noopener noreferrer" className="text-[#3b6d11] hover:underline inline-flex items-center gap-0.5">
          פתח iCount <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground">API Token</label>
          <div className="relative mt-1">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => { setToken(e.target.value); setVerifyState("idle"); }}
              placeholder="הדביקו את ה-API Token"
              className="w-full h-10 rounded-lg border border-border bg-background px-3 pl-9 text-sm focus:outline-none focus:border-[#639922]"
              dir="ltr"
            />
            <button type="button" onClick={() => setShowToken((s) => !s)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">מזהה עמוד סליקה (Paypage ID)</label>
          <input
            value={page}
            onChange={(e) => { setPage(e.target.value); setVerifyState("idle"); }}
            placeholder="למשל 12345"
            className="w-full h-10 mt-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-[#639922]"
            dir="ltr"
          />
        </div>
      </div>

      {verifyMsg && (
        <p className={`text-xs flex items-center gap-1.5 ${verifyState === "ok" ? "text-green-600" : "text-destructive"}`}>
          {verifyState === "ok" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} {verifyMsg}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleVerify}
          disabled={!filled || verifyState === "checking"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#639922] text-[#3b6d11] text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-[#eaf3de] transition-colors"
        >
          {verifyState === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} בדיקת חיבור
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!filled || save.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#639922] text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-[#557f1d] transition-colors"
        >
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} שמירה והפעלה
        </button>
      </div>
    </div>
  );
};

export default IcountConnectForm;
