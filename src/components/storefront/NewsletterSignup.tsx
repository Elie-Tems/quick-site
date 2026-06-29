import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Newsletter signup for the storefront. Explicit opt-in -> the email-subscribe
// function records consent and (if the merchant enabled it) fires the welcome
// email. Feeds the merchant's contacts/CRM backbone.
const NewsletterSignup = ({ businessId, primaryColor }: { businessId?: string; primaryColor?: string }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [err, setErr] = useState("");

  if (!businessId) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErr("נא להזין מייל תקין"); return; }
    if (!consent) { setErr("נא לאשר קבלת דיוור"); return; }
    setState("loading");
    try {
      const { data, error } = await supabase.functions.invoke("email-subscribe", { body: { businessId, email: email.trim(), name: name.trim() } });
      if (error || !data?.ok) throw new Error();
      setState("done");
    } catch { setErr("משהו השתבש, נסו שוב"); setState("idle"); }
  };

  const color = primaryColor || "#0E9F6E";

  if (state === "done") {
    return (
      <div dir="rtl" className="max-w-md mx-auto text-center py-6">
        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: `${color}22`, color }}>
          <Check className="w-6 h-6" />
        </div>
        <p className="font-medium">תודה שנרשמת! 🎉</p>
        <p className="text-sm opacity-70">נעדכן אותך במבצעים ובחדשות.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} dir="rtl" className="max-w-md mx-auto text-center py-6">
      <div className="flex items-center justify-center gap-2 mb-1">
        <Mail className="w-5 h-5" style={{ color }} />
        <h3 className="font-semibold">הצטרפו לרשימת התפוצה</h3>
      </div>
      <p className="text-sm opacity-70 mb-4">מבצעים, מוצרים חדשים ועדכונים - ישירות למייל</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם (אופציונלי)" className="flex-1 h-11 rounded-lg border border-black/15 bg-white text-zinc-900 px-3 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="כתובת מייל" dir="ltr" className="flex-1 h-11 rounded-lg border border-black/15 bg-white text-zinc-900 px-3 text-sm" />
        <button type="submit" disabled={state === "loading"} className="h-11 px-5 rounded-lg text-white font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: color }}>
          {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "הצטרפות"}
        </button>
      </div>
      <label className="flex items-center justify-center gap-2 text-xs opacity-70 mt-3">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        אני מאשר/ת קבלת דיוור פרסומי במייל (ניתן להסיר בכל עת)
      </label>
      {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
    </form>
  );
};

export default NewsletterSignup;
