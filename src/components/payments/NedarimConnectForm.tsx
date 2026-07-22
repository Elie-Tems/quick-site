import { useEffect, useState } from "react";
import { Loader2, Check, ShieldCheck, ExternalLink, HelpCircle, ChevronDown, Heart } from "lucide-react";
import { useNedarimCredentials, useSaveNedarimCredentials } from "@/hooks/useNedarim";

// Nedarim Plus donation gateway (נדרים פלוס) - built for gabbaim / nonprofit staff
// who are NOT technical. They need only two values from their existing Nedarim
// account: the 7-digit מספר מוסד and the public ApiValid. No CallBack coordination
// with Nedarim is needed - Siango sends the confirmation URL on every transaction.

// Pull the 7-digit mosad from whatever they paste: a bare number, or the admin URL
// (reports.matara.pro/?MosadId=7002708), or a donation link (?mosad=7002708).
const extractMosad = (raw: string): string => {
  const s = (raw || "").trim();
  const m = s.match(/(?:mosad(?:id)?=)(\d{5,9})/i);
  if (m) return m[1];
  const digits = s.replace(/\D/g, "");
  return digits.length >= 5 && digits.length <= 9 ? digits : s;
};

const NedarimConnectForm = ({ businessId }: { businessId: string }) => {
  const { data: saved } = useNedarimCredentials(businessId);
  const save = useSaveNedarimCredentials();

  const [mosad, setMosad] = useState("");
  const [apiValid, setApiValid] = useState("");
  const [showHelp, setShowHelp] = useState<"mosad" | "apivalid" | null>(null);

  useEffect(() => {
    if (saved) {
      setMosad(saved.mosad_id || "");
      setApiValid(saved.api_valid || "");
    }
  }, [saved]);

  const cleanMosad = extractMosad(mosad);
  const filled = /^\d{5,9}$/.test(cleanMosad) && apiValid.trim().length > 0;

  const handleSave = async () => {
    if (!filled) return;
    await save.mutateAsync({ businessId, mosad_id: cleanMosad, api_valid: apiValid.trim() });
  };

  return (
    <div className="rounded-2xl border-2 border-[#639922] bg-[#f6faf0] p-5 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-[#3b6d11]" />
        <h3 className="font-semibold text-foreground">חיבור סליקת תרומות - נדרים פלוס</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        מחברים את חשבון נדרים פלוס הקיים שלכם. התרומות נכנסות <b>ישירות לחשבון שלכם</b>, סיאנגו לא רואה ולא שומרת
        פרטי כרטיס אשראי, והקבלות מופקות דרך נדרים פלוס כרגיל. צריך רק שני פרטים מהחשבון שלכם:{" "}
        <a href="https://reports.matara.pro" target="_blank" rel="noopener noreferrer" className="text-[#3b6d11] hover:underline inline-flex items-center gap-0.5">
          פתיחת נדרים פלוס <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      <div className="space-y-3">
        {/* מספר מוסד */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">מספר מוסד (7 ספרות)</label>
            <button type="button" onClick={() => setShowHelp((s) => (s === "mosad" ? null : "mosad"))}
              className="inline-flex items-center gap-1 text-[11px] text-[#3b6d11] hover:underline">
              <HelpCircle className="w-3 h-3" /> איפה מוצאים את זה?
              <ChevronDown className={`w-3 h-3 transition-transform ${showHelp === "mosad" ? "rotate-180" : ""}`} />
            </button>
          </div>
          {showHelp === "mosad" && (
            <div className="mt-1.5 rounded-lg bg-white border border-[#639922]/30 p-3 text-xs text-muted-foreground leading-relaxed">
              <ol className="list-decimal pr-4 space-y-1">
                <li>היכנסו לממשק הניהול של נדרים פלוס.</li>
                <li>מספר המוסד מופיע <b>למעלה מימין</b>, ליד שם המוסד (למשל: <span dir="ltr" className="bg-muted px-1 rounded">מוסד 7002708</span>).</li>
                <li>הקלידו את 7 הספרות כאן. אפשר גם פשוט להדביק את כתובת האתר שלכם בנדרים - אנחנו נזהה את המספר לבד.</li>
              </ol>
            </div>
          )}
          <input value={mosad} onChange={(e) => setMosad(e.target.value)}
            placeholder="לדוגמה 7002708"
            className="w-full h-10 mt-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-[#639922]" dir="ltr" />
          {mosad && cleanMosad !== mosad.trim() && /^\d{5,9}$/.test(cleanMosad) && (
            <p className="text-[11px] text-[#3b6d11] mt-1">זיהינו את מספר המוסד: <b dir="ltr">{cleanMosad}</b></p>
          )}
        </div>

        {/* ApiValid */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">טקסט אימות (ApiValid)</label>
            <button type="button" onClick={() => setShowHelp((s) => (s === "apivalid" ? null : "apivalid"))}
              className="inline-flex items-center gap-1 text-[11px] text-[#3b6d11] hover:underline">
              <HelpCircle className="w-3 h-3" /> איפה מוצאים את זה?
              <ChevronDown className={`w-3 h-3 transition-transform ${showHelp === "apivalid" ? "rotate-180" : ""}`} />
            </button>
          </div>
          {showHelp === "apivalid" && (
            <div className="mt-1.5 rounded-lg bg-white border border-[#639922]/30 p-3 text-xs text-muted-foreground leading-relaxed">
              <ol className="list-decimal pr-4 space-y-1">
                <li>בממשק נדרים פלוס, בתפריט העליון לחצו על <b>"עוד"</b>.</li>
                <li>בחרו <b>"מפתחות API"</b>.</li>
                <li>העתיקו את הערך שמופיע תחת <b>"טקסט אימות"</b> (ApiValid) - זהו טקסט קצר (עד 10 תווים).</li>
                <li>הדביקו אותו כאן. (זה מפתח ציבורי ולא סודי - הוא רק מאשר שהתרומות מגיעות מהאתר שלכם.)</li>
              </ol>
            </div>
          )}
          <input value={apiValid} onChange={(e) => setApiValid(e.target.value)}
            placeholder="הדביקו את טקסט האימות"
            className="w-full h-10 mt-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-[#639922]" dir="ltr" />
        </div>
      </div>

      <div className="rounded-lg bg-white/70 border border-[#639922]/20 p-3 text-[11px] text-muted-foreground leading-relaxed flex gap-2">
        <ShieldCheck className="w-4 h-4 text-[#3b6d11] shrink-0 mt-0.5" />
        <span>זהו! אין צורך להגדיר שום דבר נוסף אצל נדרים. אחרי השמירה, התורמים יוכלו לתרום ישירות מהאתר שלכם, ותקבלו חיווי אוטומטי על כל תרומה שהתקבלה.</span>
      </div>

      <button type="button" onClick={handleSave} disabled={!filled || save.isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#639922] text-white text-sm font-medium px-4 py-2 disabled:opacity-50 hover:bg-[#557f1d] transition-colors">
        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} שמירה והפעלה
      </button>
    </div>
  );
};

export default NedarimConnectForm;
