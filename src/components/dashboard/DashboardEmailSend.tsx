import { useState } from "react";
import { ArrowRight, Send, Clock, Users, UserMinus, Filter, Plus, X, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Campaign send settings (build-only v1): sender identity, subject, audience
// include/exclude, engagement conditions, and scheduling. Local state only;
// real send wires up with the shared backbone + Resend. Designed channel-agnostic
// and NOT coupled to a store, so the same engine can be sold standalone.

interface Props { onBack?: () => void; blocks?: any[]; }

const SEGMENTS = ["כל אנשי הקשר", "VIP", "רדומים 60 יום", "נרשמו לניוזלטר", "קנו החודש"];
const CONDITION_VERBS = ["לא פתחו", "פתחו", "לא הקליקו", "הקליקו"];

const DashboardEmailSend = ({ onBack, blocks = [] }: Props) => {
  const { user } = useAuth();
  const [scheduledAt, setScheduledAt] = useState("");
  const [include, setInclude] = useState<string[]>(["כל אנשי הקשר"]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [conditions, setConditions] = useState<{ verb: string; ref: string }[]>([]);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [fromName, setFromName] = useState("החנות שלי");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);

  const campaignPayload = () => ({ blocks, subject, from_name: fromName, reply_to: replyTo || undefined });

  const sendTest = async () => {
    const to = prompt("שליחת מבחן לכתובת:");
    if (!to) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-campaign-send", { body: { campaign: campaignPayload(), testTo: to } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success(`נשלח מייל בדיקה ל-${to}`);
    } catch (e: any) { toast.error("שליחת המבחן נכשלה: " + (e?.message || "")); }
    finally { setSending(false); }
  };

  const sendReal = async () => {
    if (!subject.trim()) { toast.error("נא למלא שורת נושא"); return; }
    if (when === "schedule" && !scheduledAt) { toast.error("נא לבחור מועד"); return; }
    if (!confirm(when === "now" ? "לשלוח עכשיו לכל אנשי הקשר הפעילים?" : "לתזמן את השליחה?")) return;
    setSending(true);
    try {
      if (when === "schedule") {
        // Persist a scheduled campaign; the email-scheduled-run cron sends it at its time.
        if (!user) throw new Error("נדרשת התחברות");
        const { error } = await supabase.from("mkt_campaigns").insert({
          owner_id: user.id, name: subject, subject, from_name: fromName, reply_to: replyTo || null,
          blocks, status: "scheduled", scheduled_at: new Date(scheduledAt).toISOString(),
        });
        if (error) throw error;
        toast.success("הדיוור תוזמן ✓");
      } else {
        const { data, error } = await supabase.functions.invoke("email-campaign-send", { body: { campaign: campaignPayload() } });
        if (error || !data?.ok) throw new Error(data?.error || error?.message);
        toast.success(`נשלח ל-${data.sent ?? 0} אנשי קשר`);
      }
      onBack?.();
    } catch (e: any) { toast.error("הפעולה נכשלה: " + (e?.message || "")); }
    finally { setSending(false); }
  };

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div dir="rtl" className="space-y-4 max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> חזרה לעריכה
      </button>
      <h2 className="text-lg font-semibold flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> הגדרות שליחה</h2>

      {/* Sender + subject */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> שולח ונושא</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="שם השולח"><input value={fromName} onChange={(e) => setFromName(e.target.value)} className="inp" /></Field>
          <Field label="מייל למענה (Reply-To)"><input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="office@my-store.co.il" dir="ltr" className="inp" /></Field>
        </div>
        <Field label="שורת נושא"><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="מבצע סוף עונה - עד 50% הנחה" className="inp" /></Field>
        <Field label="טקסט תצוגה מקדימה (preview)"><input placeholder="השורה שמופיעה ליד הנושא בתיבת הדואר" className="inp" /></Field>
      </div>

      {/* Audience */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> קהל יעד</p>
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">שלח אל</div>
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((s) => (
              <button key={s} onClick={() => toggle(include, setInclude, s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${include.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><UserMinus className="w-3.5 h-3.5" /> החרג (לא ישלח אליהם)</div>
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((s) => (
              <button key={s} onClick={() => toggle(exclude, setExclude, s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${exclude.includes(s) ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:border-destructive/40"}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /> תנאים (לפי מעורבות)</p>
          <button onClick={() => setConditions((c) => [...c, { verb: "לא פתחו", ref: "הקמפיין הקודם" }])} className="flex items-center gap-1 text-xs text-primary"><Plus className="w-3.5 h-3.5" /> תנאי</button>
        </div>
        {conditions.length === 0 ? (
          <p className="text-xs text-muted-foreground">למשל: שלח רק למי ש<b>לא פתח</b> את הקמפיין הקודם. הוסיפו תנאי כדי למקד.</p>
        ) : (
          <div className="space-y-2">
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">שלח רק למי ש-</span>
                <select value={c.verb} onChange={(e) => setConditions((arr) => arr.map((x, j) => j === i ? { ...x, verb: e.target.value } : x))} className="inp h-8 w-auto text-xs">
                  {CONDITION_VERBS.map((v) => <option key={v}>{v}</option>)}
                </select>
                <input value={c.ref} onChange={(e) => setConditions((arr) => arr.map((x, j) => j === i ? { ...x, ref: e.target.value } : x))} className="inp h-8 flex-1 text-xs" />
                <button onClick={() => setConditions((arr) => arr.filter((_, j) => j !== i))}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> תזמון</p>
        <div className="flex gap-2">
          <button onClick={() => setWhen("now")} className={`flex-1 h-10 rounded-lg border text-sm ${when === "now" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>שלח עכשיו</button>
          <button onClick={() => setWhen("schedule")} className={`flex-1 h-10 rounded-lg border text-sm ${when === "schedule" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>תזמן למועד</button>
        </div>
        {when === "schedule" && <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="inp" />}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button onClick={sendTest} disabled={sending} className="text-sm text-primary disabled:opacity-50">שליחת מבחן</button>
        <button onClick={sendReal} disabled={sending} className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 h-11 text-sm font-medium disabled:opacity-60">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : when === "now" ? <><Send className="w-4 h-4" /> שלח עכשיו</> : <><Clock className="w-4 h-4" /> תזמן שליחה</>}
        </button>
      </div>

      <style>{`.inp{width:100%;height:40px;border:0.5px solid hsl(var(--border));background:hsl(var(--background));border-radius:8px;padding:0 12px;font-size:14px;color:hsl(var(--foreground))}`}</style>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</div>
);

export default DashboardEmailSend;
