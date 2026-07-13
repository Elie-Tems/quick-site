import { useEffect, useState } from "react";
import { Loader2, Check, X, ShieldCheck, ExternalLink, Eye, EyeOff, HelpCircle, ChevronDown } from "lucide-react";
import { useIcountCredentials, useSaveIcountCredentials, verifyIcountCredentials } from "@/hooks/useIcount";

// Merchants aren't technical - they paste whatever iCount shows them. Handle:
//   - numeric id:      "98"
//   - admin/edit URL:  "app.icount.co.il/m/edit.php?id=98"  (id in the query!)
//   - public URL:      "app.icount.co.il/m/31ff3/abc..."    (slug after /m/)
// A slug is resolved to its numeric id server-side. Mirrors normalizePaypageId.
const extractPaypageId = (raw: string): string => {
  const s = (raw || "").trim();
  const idParam = s.match(/[?&]id=(\d+)/i);
  if (idParam) return idParam[1];
  const m = s.match(/\/m\/([^/?\s#]+)/i);
  if (m && m[1] && !/\.php$/i.test(m[1])) return m[1];
  return s;
};

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
  const [showHelp, setShowHelp] = useState<"token" | "page" | null>(null);

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
    const pageId = extractPaypageId(page);
    setPage(pageId);
    setVerifyState("checking");
    setVerifyMsg("");
    const res = await verifyIcountCredentials({ businessId, api_key: token.trim(), page_uid: pageId });
    if (res.ok) {
      setVerifyState("ok");
      // Show + store the RESOLVED numeric paypage_id (a URL/slug like 31ff3 resolves to
      // e.g. 98) so the merchant sees the real id, not the public slug.
      if (res.paypageId != null) {
        setPage(String(res.paypageId));
        setVerifyMsg(`החיבור אומת ✓ - עמוד הסליקה שזוהה: מספר ${res.paypageId}`);
      } else {
        setVerifyMsg("החיבור אומת בהצלחה ✓");
      }
    } else { setVerifyState("fail"); setVerifyMsg(res.error || "האימות נכשל - בדקו את הפרטים"); }
  };

  const handleSave = async () => {
    if (!filled) return;
    await save.mutateAsync({ businessId, api_key: token.trim(), page_uid: extractPaypageId(page), verified: verifyState === "ok" });
  };

  return (
    <div className="rounded-2xl border-2 border-[#639922] bg-[#f6faf0] p-5 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-[#3b6d11]" />
        <h3 className="font-semibold text-foreground">חיבור חשבון iCount</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        הזינו את פרטי ה-API של חשבון ה-iCount שלכם. הכסף נכנס ישירות לחשבון שלכם, וסיאנגו לא רואה ולא שומרת פרטי כרטיס אשראי.
        את ה-API Token מוצאים ב-iCount → הגדרות → אוטומציה → לשונית "API Tokens". {" "}
        <a href="https://app.icount.co.il" target="_blank" rel="noopener noreferrer" className="text-[#3b6d11] hover:underline inline-flex items-center gap-0.5">
          פתח iCount <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">API Token</label>
            <button
              type="button"
              onClick={() => setShowHelp((s) => (s === "token" ? null : "token"))}
              className="inline-flex items-center gap-1 text-[11px] text-[#3b6d11] hover:underline"
            >
              <HelpCircle className="w-3 h-3" /> איך מוצאים את זה?
              <ChevronDown className={`w-3 h-3 transition-transform ${showHelp === "token" ? "rotate-180" : ""}`} />
            </button>
          </div>
          {showHelp === "token" && (
            <div className="mt-1.5 rounded-lg bg-white border border-[#639922]/30 p-3 text-xs text-muted-foreground leading-relaxed space-y-1">
              <ol className="list-decimal pr-4 space-y-1">
                <li>היכנסו לחשבון ה-iCount שלכם.</li>
                <li>בתפריט לכו ל-<b>הגדרות</b> ← <b>אוטומציה</b> ← לשונית <b>"API Tokens"</b>.</li>
                <li>לחצו <b>"יצירת טוקן API"</b> (או העתיקו טוקן קיים) והדביקו כאן.</li>
              </ol>
              <a
                href="https://apiv3.icount.co.il/"
                target="_blank" rel="noopener noreferrer"
                className="text-[#3b6d11] hover:underline inline-flex items-center gap-0.5 mt-1"
              >
                תיעוד ה-API הרשמי של iCount <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
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
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">מזהה עמוד סליקה (Paypage ID)</label>
            <button
              type="button"
              onClick={() => setShowHelp((s) => (s === "page" ? null : "page"))}
              className="inline-flex items-center gap-1 text-[11px] text-[#3b6d11] hover:underline"
            >
              <HelpCircle className="w-3 h-3" /> איך מוצאים את זה?
              <ChevronDown className={`w-3 h-3 transition-transform ${showHelp === "page" ? "rotate-180" : ""}`} />
            </button>
          </div>
          {showHelp === "page" && (
            <div className="mt-1.5 rounded-lg bg-white border border-[#639922]/30 p-3 text-xs text-muted-foreground leading-relaxed space-y-1">
              <ol className="list-decimal pr-4 space-y-1">
                <li>אם עדיין אין לכם "עמוד סליקה" ב-iCount: <b>מערכת</b> ← <b>הגדרות</b> ← <b>מודולים</b>, והפעילו את מודול <b>"עמודי סליקה"</b>.</li>
                <li>אחרי ההפעלה יופיע פריט תפריט חדש בשם <b>"עמודי סליקה"</b> - היכנסו אליו וצרו עמוד סליקה (או פתחו קיים).</li>
                <li><b>הכי אמין:</b> ברשימת "עמודי סליקה" מופיע לכל עמוד <b>מזהה מספרי (ID)</b> בעמודה ייעודית - העתיקו אותו (למשל <code dir="ltr" className="bg-muted px-1 rounded">123456</code>) והדביקו כאן.</li>
                <li>לחלופין אפשר להדביק את <b>כתובת עמוד הסליקה</b> המלאה (למשל <code dir="ltr" className="bg-muted px-1 rounded">app.icount.co.il/m/31ff3/abc...</code>) - אנחנו נאתר את המזהה המספרי אוטומטית מול iCount.</li>
              </ol>
              <p className="text-destructive/90">
                שימו לב: לא כל קישור תשלום מ-iCount הוא "עמוד סליקה" - קישורים אחרים (כמו קישור לתשלום חד-פעמי) לא יעבדו כאן.
              </p>
              <a
                href="https://help.icount.co.il/credit-card-processing/create-cc-page/"
                target="_blank" rel="noopener noreferrer"
                className="text-[#3b6d11] hover:underline inline-flex items-center gap-0.5 mt-1"
              >
                המדריך המלא ליצירת עמוד סליקה (מרכז הידע של iCount) <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          <input
            value={page}
            onChange={(e) => { setPage(e.target.value); setVerifyState("idle"); }}
            onBlur={() => setPage((p) => extractPaypageId(p))}
            placeholder="מזהה מספרי (למשל 123456) או כל הקישור לעמוד הסליקה"
            className="w-full h-10 mt-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-[#639922]"
            dir="ltr"
          />
          {page && extractPaypageId(page) !== page.trim() && (
            <p className="text-[11px] text-[#3b6d11] mt-1">זיהינו את המזהה: <b dir="ltr">{extractPaypageId(page)}</b></p>
          )}
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
