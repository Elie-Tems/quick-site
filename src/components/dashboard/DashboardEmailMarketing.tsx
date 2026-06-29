import { useState, useEffect } from "react";
import {
  Mail, Users, Send, LayoutTemplate, Zap, BarChart3, Plus, Clock, Sparkles,
  CheckCircle2, MousePointerClick, TrendingUp, Tag,
} from "lucide-react";
import DashboardEmailEditor from "@/components/dashboard/DashboardEmailEditor";
import DashboardEmailSend from "@/components/dashboard/DashboardEmailSend";
import { supabase } from "@/integrations/supabase/client";
import DashboardEmailContacts from "@/components/dashboard/DashboardEmailContacts";
import { EMAIL_TEMPLATES, type TemplateBlock } from "@/lib/emailTemplates";

// Email-marketing module (ESP) - BUILD-ONLY preview. Not wired to a backend yet;
// shows the full UX with sample data so Moti can review and we can pick a sending
// provider later. Mirror of the WhatsApp build-only approach. See
// docs/communications-suite-plan.md. Channel sending is gated until a provider
// (Resend / SES) + the shared contacts backbone go live.

type Tab = "overview" | "audiences" | "campaigns" | "templates" | "automations" | "analytics";

const TABS: { id: Tab; label: string; icon: typeof Mail }[] = [
  { id: "overview", label: "סקירה", icon: BarChart3 },
  { id: "audiences", label: "קהלים", icon: Users },
  { id: "campaigns", label: "קמפיינים", icon: Send },
  { id: "templates", label: "תבניות", icon: LayoutTemplate },
  { id: "automations", label: "אוטומציות", icon: Zap },
  { id: "analytics", label: "אנליטיקה", icon: TrendingUp },
];

const SAMPLE_SEGMENTS = [
  { name: "כל הלקוחות", count: 1240, dynamic: false },
  { name: "VIP (הוציאו מעל ₪500)", count: 86, dynamic: true },
  { name: "רדומים (לא קנו 60 יום)", count: 142, dynamic: true },
  { name: "נרשמו לניוזלטר", count: 503, dynamic: false },
];

const SAMPLE_CAMPAIGNS = [
  { name: "מבצע סוף עונה", status: "נשלח", sent: 1240, open: 38, click: 9, channel: "מייל" },
  { name: "ניוזלטר חודשי", status: "מתוזמן", sent: 0, open: 0, click: 0, channel: "מייל" },
  { name: "החזרת לקוחות רדומים", status: "טיוטה", sent: 0, open: 0, click: 0, channel: "מייל + SMS" },
];

const SAMPLE_AUTOMATIONS = [
  { name: "ברכת הצטרפות", desc: "מייל אוטומטי ללקוח חדש", on: true },
  { name: "שחזור עגלה נטושה", desc: "תזכורת אחרי שעה + 24 שעות", on: true },
  { name: "יום הולדת", desc: "הטבה אוטומטית ביום ההולדת", on: false },
  { name: "רצף onboarding (drip)", desc: "סדרת 3 מיילים על פני שבוע", on: false },
  { name: "בקשת ביקורת אחרי קנייה", desc: "מייל 3 ימים אחרי משלוח", on: false },
];

const Stat = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Mail }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Icon className="w-3.5 h-3.5" />{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

const DashboardEmailMarketing = () => {
  const [tab, setTab] = useState<Tab>("overview");
  const [screen, setScreen] = useState<"main" | "edit" | "send">("main");
  const [draftBlocks, setDraftBlocks] = useState<any[]>([]);
  const [editorSeed, setEditorSeed] = useState<TemplateBlock[] | undefined>(undefined);
  // Open the editor, optionally seeded from a chosen template (undefined = blank/default).
  const openEditor = (seed?: TemplateBlock[]) => { setEditorSeed(seed); setScreen("edit"); };
  // Real automations (opt-in) loaded from the backend when signed in; falls back
  // to the standard list (read-only) in the public preview.
  const [autos, setAutos] = useState<{ type: string; label: string; desc: string; enabled: boolean }[]>(
    SAMPLE_AUTOMATIONS.map((a, i) => ({ type: `s${i}`, label: a.name, desc: a.desc, enabled: a.on })),
  );
  const [autosLive, setAutosLive] = useState(false);
  useEffect(() => {
    supabase.functions.invoke("email-automations", { method: "GET" as any })
      .then(({ data }) => { if (data?.automations) { setAutos(data.automations); setAutosLive(true); } })
      .catch(() => {});
  }, []);
  const toggleAuto = async (type: string, enabled: boolean) => {
    if (!autosLive) return;
    setAutos((prev) => prev.map((a) => (a.type === type ? { ...a, enabled } : a)));
    await supabase.functions.invoke("email-automations", { body: { type, enabled } });
  };

  // Real stats from the backbone (contacts + tracked events). Null until loaded.
  const [stats, setStats] = useState<{ contacts: number; sent: number; openRate: number; clickRate: number } | null>(null);
  useEffect(() => {
    (async () => {
      const { count: contacts } = await supabase.from("mkt_contacts").select("id", { count: "exact", head: true });
      const { data: ev } = await supabase.from("mkt_campaign_events").select("type, contact_id").limit(10000);
      if (ev) {
        const sent = ev.filter((e: any) => e.type === "sent").length;
        const opened = new Set(ev.filter((e: any) => e.type === "opened").map((e: any) => e.contact_id)).size;
        const clicked = new Set(ev.filter((e: any) => e.type === "clicked").map((e: any) => e.contact_id)).size;
        setStats({
          contacts: contacts ?? 0, sent,
          openRate: sent ? Math.round((opened / sent) * 100) : 0,
          clickRate: sent ? Math.round((clicked / sent) * 100) : 0,
        });
      }
    })().catch(() => {});
  }, []);
  const fmtPct = (n?: number) => (n == null ? "—" : `${n}%`);
  const fmtNum = (n?: number) => (n == null ? "—" : n.toLocaleString());

  if (screen === "edit") {
    return <div dir="rtl"><DashboardEmailEditor initialBlocks={editorSeed} onBack={() => setScreen("main")} onContinue={(b) => { setDraftBlocks(b); setScreen("send"); }} /></div>;
  }
  if (screen === "send") {
    return <div dir="rtl"><DashboardEmailSend onBack={() => setScreen("edit")} blocks={draftBlocks} /></div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Coming-soon banner */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">מערכת דיוור - בקרוב</p>
          <p className="text-xs text-muted-foreground mt-0.5">תצוגה מקדימה של המערכת. השליחה בפועל תופעל כשנחבר ספק שליחה. הנתונים כאן לדוגמה.</p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> דיוור ושיווק במייל</h2>
          <p className="text-sm text-muted-foreground">שליחת ניוזלטרים, מבצעים ואוטומציות ללקוחות - מסונכרן עם ה-CRM</p>
        </div>
        <button onClick={() => openEditor()} className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground rounded-lg px-4 py-2 font-medium shrink-0">
          <Plus className="w-4 h-4" /> צור דיוור חדש
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="אנשי קשר" value={fmtNum(stats?.contacts)} icon={Users} />
            <Stat label="נשלחו" value={fmtNum(stats?.sent)} icon={Send} />
            <Stat label="שיעור פתיחה" value={fmtPct(stats?.openRate)} icon={Mail} />
            <Stat label="שיעור הקלקה" value={fmtPct(stats?.clickRate)} icon={MousePointerClick} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium mb-3">קמפיינים אחרונים</p>
            <div className="space-y-2">
              {SAMPLE_CAMPAIGNS.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "audiences" && (
        <div className="space-y-5">
          <DashboardEmailContacts />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-sm font-medium">סגמנטים</p>
            <button className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary rounded-lg px-3 py-1.5"><Plus className="w-4 h-4" /> סגמנט חדש</button>
          </div>
          {SAMPLE_SEGMENTS.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{s.name}</span>
                {s.dynamic && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">דינמי</span>}
              </div>
              <span className="text-sm text-muted-foreground">{s.count.toLocaleString()} אנשי קשר</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">הסגמנטים מסונכרנים עם ה-CRM. הסכמה והסרה (חוק הספאם) מנוהלות מרכזית לכל הערוצים.</p>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">קמפיינים</p>
            <button onClick={() => openEditor()} className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary rounded-lg px-3 py-1.5"><Plus className="w-4 h-4" /> קמפיין חדש</button>
          </div>
          {SAMPLE_CAMPAIGNS.map((c) => (
            <div key={c.name} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{c.name}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.status === "נשלח" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>ערוץ: {c.channel}</span>
                {c.status === "נשלח" && <><span>נשלחו: {c.sent.toLocaleString()}</span><span>פתיחה: {c.open}%</span><span>הקלקה: {c.click}%</span></>}
                {c.status === "מתוזמן" && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> מתוזמן ל-1 בחודש</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">תבניות מייל מוכנות (RTL)</p>
            <button onClick={() => openEditor()} className="flex items-center gap-1.5 text-sm border border-border text-foreground rounded-lg px-3 py-1.5 hover:border-primary/40"><Plus className="w-4 h-4" /> קנבס ריק</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EMAIL_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => openEditor(t.blocks)} className="rounded-xl border border-border bg-card overflow-hidden text-right hover:border-primary/40 transition-colors">
                <div className="p-2 bg-[#eef0f2]">
                  <div className="bg-white rounded overflow-hidden">
                    <div style={{ background: t.accent }} className="h-5" />
                    <div className="p-2 space-y-1.5">
                      <div className="h-1.5 bg-black/10 rounded w-3/4" />
                      <div className="h-1.5 bg-black/10 rounded w-1/2" />
                      <div style={{ background: t.accent }} className="h-3 w-14 rounded mx-auto mt-1.5" />
                    </div>
                  </div>
                </div>
                <div className="px-2.5 py-2">
                  <div className="text-xs font-medium truncate">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.category}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">בוחרים תבנית, והיא נטענת לעורך לעריכה חופשית - טקסט, תמונות, מוצרים וצבעים.</p>
        </div>
      )}

      {tab === "automations" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">אוטומציות מחזור-חיים</p>
          {autos.map((a) => (
            <div key={a.type} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <Zap className={`w-4 h-4 ${a.enabled ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
              </div>
              <button
                onClick={() => toggleAuto(a.type, !a.enabled)}
                disabled={!autosLive}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors disabled:opacity-60 ${a.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
              >{a.enabled ? "פעיל" : "כבוי"}</button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">כל אוטומציה מופעלת באישור בעל החנות בלבד, ומכבדת הסרה.</p>
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="נשלחו" value={fmtNum(stats?.sent)} icon={Send} />
            <Stat label="אנשי קשר" value={fmtNum(stats?.contacts)} icon={Users} />
            <Stat label="נפתחו" value={fmtPct(stats?.openRate)} icon={Mail} />
            <Stat label="הוקלקו" value={fmtPct(stats?.clickRate)} icon={MousePointerClick} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium mb-1">הכנסה מיוחסת</p>
            <p className="text-2xl font-semibold text-muted-foreground">בקרוב</p>
            <p className="text-xs text-muted-foreground mt-0.5">ייחוס הכנסה מהזמנות שהגיעו מקמפיינים (היתרון שלנו - אנחנו מחזיקים את נתוני החנות). יתחבר בשלב הבא.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardEmailMarketing;
