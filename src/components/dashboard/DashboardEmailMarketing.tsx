import { useState } from "react";
import {
  Mail, Users, Send, LayoutTemplate, Zap, BarChart3, Plus, Clock, Sparkles,
  CheckCircle2, MousePointerClick, TrendingUp, Tag,
} from "lucide-react";
import DashboardEmailEditor from "@/components/dashboard/DashboardEmailEditor";
import DashboardEmailSend from "@/components/dashboard/DashboardEmailSend";

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

  if (screen === "edit") {
    return <div dir="rtl"><DashboardEmailEditor onBack={() => setScreen("main")} onContinue={(b) => { setDraftBlocks(b); setScreen("send"); }} /></div>;
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

      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> דיוור ושיווק במייל</h2>
        <p className="text-sm text-muted-foreground">שליחת ניוזלטרים, מבצעים ואוטומציות ללקוחות - מסונכרן עם ה-CRM</p>
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
            <Stat label="אנשי קשר" value="1,240" icon={Users} />
            <Stat label="נשלחו החודש" value="1,240" icon={Send} />
            <Stat label="שיעור פתיחה" value="38%" icon={Mail} />
            <Stat label="שיעור הקלקה" value="9%" icon={MousePointerClick} />
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">קהלים וסגמנטים</p>
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
            <button className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary rounded-lg px-3 py-1.5"><Plus className="w-4 h-4" /> קמפיין חדש</button>
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
            <p className="text-sm font-medium">תבניות מייל (RTL בעברית)</p>
            <button onClick={() => setScreen("edit")} className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground rounded-lg px-3 py-1.5"><Plus className="w-4 h-4" /> צור דיוור חדש</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {["ניוזלטר", "מבצע / הנחה", "מוצר חדש", "ברכת הצטרפות", "החזרת לקוח", "קנבס ריק"].map((t) => (
              <button key={t} onClick={() => setScreen("edit")} className="rounded-xl border border-border bg-card p-3 aspect-[4/3] flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition-colors">
                <LayoutTemplate className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs font-medium">{t}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">עורך גרירה-ושחרור, שדות התאמה אישית (שם, מוצר אחרון), וכתיבת נושא/גוף ב-AI.</p>
        </div>
      )}

      {tab === "automations" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">אוטומציות מחזור-חיים</p>
          {SAMPLE_AUTOMATIONS.map((a) => (
            <div key={a.name} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <Zap className={`w-4 h-4 ${a.on ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${a.on ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{a.on ? "פעיל" : "כבוי"}</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">כל אוטומציה מופעלת באישור בעל החנות בלבד, ומכבדת הסרה.</p>
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="נשלחו" value="1,240" icon={Send} />
            <Stat label="נמסרו" value="98.5%" icon={CheckCircle2} />
            <Stat label="נפתחו" value="38%" icon={Mail} />
            <Stat label="הוקלקו" value="9%" icon={MousePointerClick} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium mb-1">הכנסה מיוחסת</p>
            <p className="text-2xl font-semibold">₪12,400</p>
            <p className="text-xs text-muted-foreground mt-0.5">מההזמנות שהגיעו מקמפיינים (היתרון שלנו - אנחנו מחזיקים את נתוני החנות).</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardEmailMarketing;
