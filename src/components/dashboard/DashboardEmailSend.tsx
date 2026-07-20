import { useState, useEffect } from "react";
import { ArrowRight, Send, Clock, Users, UserMinus, Filter, Plus, X, Mail, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

// Campaign send settings (build-only v1): sender identity, subject, audience
// include/exclude, engagement conditions, and scheduling. Local state only;
// real send wires up with the shared backbone + Resend. Designed channel-agnostic
// and NOT coupled to a store, so the same engine can be sold standalone.

interface Props { onBack?: () => void; blocks?: any[]; }

const SEGMENTS = ["כל אנשי הקשר", "VIP", "רדומים 60 יום", "נרשמו לניוזלטר", "קנו החודש"];

// Values are matched by the email-campaign-send edge function (it checks for
// "לא" prefix / "הקליק" substring), so the underlying value must stay Hebrew -
// only the displayed label is translated.
const getConditionVerbs = (t: (key: string) => string) => [
  { value: "לא פתחו", label: t("dash.emailsend.verb_not_opened") },
  { value: "פתחו", label: t("dash.emailsend.verb_opened") },
  { value: "לא הקליקו", label: t("dash.emailsend.verb_not_clicked") },
  { value: "הקליקו", label: t("dash.emailsend.verb_clicked") },
];

const DashboardEmailSend = ({ onBack, blocks = [] }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const CONDITION_VERBS = getConditionVerbs(t);
  const [scheduledAt, setScheduledAt] = useState("");
  const [tags, setTags] = useState<string[]>([]);          // real distinct tags
  const [include, setInclude] = useState<string[]>([]);    // empty = all active
  const [exclude, setExclude] = useState<string[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<{ id: string; subject: string | null }[]>([]);
  useEffect(() => {
    supabase.from("mkt_contacts").select("tags").limit(1000).then(({ data }) => {
      const set = new Set<string>();
      (data || []).forEach((r: any) => (r.tags || []).forEach((t: string) => t && set.add(t)));
      setTags(Array.from(set));
    });
    supabase.from("mkt_campaigns").select("id, subject").eq("status", "sent").order("sent_at", { ascending: false }).limit(20)
      .then(({ data }) => setPastCampaigns((data as any) || []));
  }, []);
  const [conditions, setConditions] = useState<{ verb: string; ref: string }[]>([]);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [fromName, setFromName] = useState("החנות שלי");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const campaignPayload = () => ({
    blocks, subject, from_name: fromName, reply_to: replyTo || undefined,
    includeTags: include, excludeTags: exclude,
    conditions: conditions.filter((c) => c.ref).map((c) => ({ verb: c.verb, campaignId: c.ref })),
  });

  const sendTest = async () => {
    const to = prompt(t("dash.emailsend.test_send_prompt"));
    if (!to) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-campaign-send", { body: { campaign: campaignPayload(), testTo: to } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message);
      toast.success(`${t("dash.emailsend.test_sent_toast_prefix")}${to}`);
    } catch (e: any) { toast.error(t("dash.emailsend.test_send_failed_prefix") + (e?.message || "")); }
    finally { setSending(false); }
  };

  const sendReal = async () => {
    if (!subject.trim()) { toast.error(t("dash.emailsend.fill_subject_error")); return; }
    if (when === "schedule" && !scheduledAt) { toast.error(t("dash.emailsend.pick_date_error")); return; }
    if (!confirm(when === "now" ? t("dash.emailsend.confirm_send_now") : t("dash.emailsend.confirm_schedule"))) return;
    setSending(true);
    try {
      if (when === "schedule") {
        // Persist a scheduled campaign; the email-scheduled-run cron sends it at its time.
        if (!user) throw new Error(t("dash.emailsend.login_required_error"));
        const { error } = await supabase.from("mkt_campaigns").insert({
          owner_id: user.id, name: subject, subject, from_name: fromName, reply_to: replyTo || null,
          blocks, status: "scheduled", scheduled_at: new Date(scheduledAt).toISOString(),
          conditions: { includeTags: include, excludeTags: exclude },
        });
        if (error) throw error;
        toast.success(t("dash.emailsend.scheduled_toast"));
      } else {
        const { data, error } = await supabase.functions.invoke("email-campaign-send", { body: { campaign: campaignPayload() } });
        if (error || !data?.ok) throw new Error(data?.error || error?.message);
        toast.success(`${t("dash.emailsend.sent_toast_prefix")}${data.sent ?? 0}${t("dash.emailsend.sent_toast_suffix")}`);
      }
      onBack?.();
    } catch (e: any) { toast.error(t("dash.emailsend.action_failed_prefix") + (e?.message || "")); }
    finally { setSending(false); }
  };

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div dir="rtl" className="space-y-4 max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> {t("dash.emailsend.back_to_edit")}
      </button>
      <h2 className="text-lg font-semibold flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> {t("dash.emailsend.heading")}</h2>

      {/* Sender + subject */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> {t("dash.emailsend.sender_subject_title")}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t("dash.emailsend.sender_name_label")}><input value={fromName} onChange={(e) => setFromName(e.target.value)} className="inp" /></Field>
          <Field label={t("dash.emailsend.reply_to_label")}><input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="office@my-store.co.il" dir="ltr" className="inp" /></Field>
        </div>
        <Field label={t("dash.emailsend.subject_label")}><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("dash.emailsend.subject_placeholder")} className="inp" /></Field>
        <Field label={t("dash.emailsend.preview_text_label")}><input placeholder={t("dash.emailsend.preview_text_placeholder")} className="inp" /></Field>
      </div>

      {/* Audience - by real contact tags */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> {t("dash.emailsend.audience_title")}</p>
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("dash.emailsend.no_tags_prefix")}<b>{t("dash.emailsend.no_tags_bold")}</b>{t("dash.emailsend.no_tags_suffix")}</p>
        ) : (
          <>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">{t("dash.emailsend.send_to_label")} {include.length === 0 && <span>{t("dash.emailsend.empty_means_all")}</span>}</div>
              <div className="flex flex-wrap gap-2">
                {tags.map((s) => (
                  <button key={s} onClick={() => toggle(include, setInclude, s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${include.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>{s}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Advanced options - kept tucked away so the default flow stays clean. */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        {t("dash.emailsend.advanced_options_toggle")} {showAdvanced ? "" : t("dash.emailsend.advanced_options_hint")}
      </button>

      {showAdvanced && (
        <>
          {tags.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2"><UserMinus className="w-4 h-4 text-primary" /> {t("dash.emailsend.exclude_groups_title")}</p>
              <div className="text-xs text-muted-foreground mb-1.5">{t("dash.emailsend.exclude_hint")}</div>
              <div className="flex flex-wrap gap-2">
                {tags.map((s) => (
                  <button key={s} onClick={() => toggle(exclude, setExclude, s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${exclude.includes(s) ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground hover:border-destructive/40"}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

      {/* Conditions */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /> {t("dash.emailsend.conditions_title")}</p>
          <button onClick={() => setConditions((c) => [...c, { verb: "לא פתחו", ref: pastCampaigns[0]?.id || "" }])} disabled={!pastCampaigns.length} className="flex items-center gap-1 text-xs text-primary disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> {t("dash.emailsend.add_condition")}</button>
        </div>
        {!pastCampaigns.length ? (
          <p className="text-xs text-muted-foreground">{t("dash.emailsend.conditions_empty_no_campaigns")}</p>
        ) : conditions.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("dash.emailsend.conditions_example_prefix")}<b>{t("dash.emailsend.conditions_example_bold")}</b>{t("dash.emailsend.conditions_example_suffix")}</p>
        ) : (
          <div className="space-y-2">
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{t("dash.emailsend.condition_send_only_to")}</span>
                <select value={c.verb} onChange={(e) => setConditions((arr) => arr.map((x, j) => j === i ? { ...x, verb: e.target.value } : x))} className="inp h-8 w-auto text-xs">
                  {CONDITION_VERBS.map((cv) => <option key={cv.value} value={cv.value}>{cv.label}</option>)}
                </select>
                <select value={c.ref} onChange={(e) => setConditions((arr) => arr.map((x, j) => j === i ? { ...x, ref: e.target.value } : x))} className="inp h-8 flex-1 text-xs">
                  {pastCampaigns.map((pc) => <option key={pc.id} value={pc.id}>{pc.subject || t("dash.emailsend.campaign_fallback")}</option>)}
                </select>
                <button onClick={() => setConditions((arr) => arr.filter((_, j) => j !== i))}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {t("dash.emailsend.schedule_title")}</p>
        <div className="flex gap-2">
          <button onClick={() => setWhen("now")} className={`flex-1 h-10 rounded-lg border text-sm ${when === "now" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{t("dash.emailsend.send_now")}</button>
          <button onClick={() => setWhen("schedule")} className={`flex-1 h-10 rounded-lg border text-sm ${when === "schedule" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{t("dash.emailsend.schedule_for_toggle")}</button>
        </div>
        {when === "schedule" && <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="inp" />}
      </div>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <button onClick={sendTest} disabled={sending} className="text-sm text-primary disabled:opacity-50">{t("dash.emailsend.send_test_button")}</button>
        <button onClick={sendReal} disabled={sending} className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 h-11 text-sm font-medium disabled:opacity-60">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : when === "now" ? <><Send className="w-4 h-4" /> {t("dash.emailsend.send_now")}</> : <><Clock className="w-4 h-4" /> {t("dash.emailsend.schedule_send_button")}</>}
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
