import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MessageCircle, Check, AlertTriangle, Users, Megaphone, Settings as SettingsIcon,
  Plus, Upload, Loader2, BadgeCheck, ShieldCheck,
} from "lucide-react";

interface Props { businessId?: string; forceConnected?: boolean }

type Tab = "contacts" | "campaigns" | "settings";

interface Account {
  id: string; status: string; phone_number: string | null; display_name: string | null;
  messaging_limit: number | null;
}
interface Contact {
  id: string; phone: string; name: string | null; opted_in: boolean; tags: string[] | null; source: string | null;
}
interface Campaign {
  id: string; name: string; status: string; audience_tag: string | null;
  total_count: number; sent_count: number; delivered_count: number; read_count: number;
}

/**
 * Merchant WhatsApp area: a clear guidance screen BEFORE connecting (benefits +
 * honest limitations), then - once connected - the mailing list, broadcasts, and
 * settings. The store-bot revenue layer. BUILD-ONLY: gated by a feature flag so
 * it isn't surfaced to merchants until Moti approves.
 */
const DashboardWhatsApp = ({ businessId, forceConnected }: Props) => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("contacts");

  const { data: account, isLoading } = useQuery({
    queryKey: ["wa-account", businessId],
    enabled: !!businessId && !forceConnected,
    queryFn: async () => {
      const { data } = await (supabase as any).from("whatsapp_accounts").select("id, status, phone_number, display_name, messaging_limit").eq("business_id", businessId).maybeSingle();
      return data as Account | null;
    },
  });

  // Preview mode (private link): show the connected layout with sample data.
  const previewAccount: Account = { id: "preview", status: "connected", phone_number: "+972 50-123-4567", display_name: "החנות שלי", messaging_limit: 1000 };
  const connected = forceConnected ? true : account?.status === "connected";
  const shownAccount = forceConnected ? previewAccount : account;

  if (isLoading) {
    return <div className="container max-w-4xl mx-auto px-4 py-10 text-center" dir="rtl"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#25D366]/15 flex items-center justify-center">
          <MessageCircle className="h-6 w-6 text-[#25D366]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">וואטסאפ עסקי</h1>
          <p className="text-sm text-muted-foreground">התראות אוטומטיות ללקוחות, דיוור שיווקי, וניהול החנות - הכל בוואטסאפ.</p>
        </div>
      </div>

      {!connected ? (
        <GuidanceScreen businessId={businessId} onConnected={() => qc.invalidateQueries({ queryKey: ["wa-account", businessId] })} />
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 px-4 py-3">
            <BadgeCheck className="h-5 w-5 text-[#25D366]" />
            <span className="text-sm text-foreground">מחובר{shownAccount?.phone_number ? <> · <span dir="ltr" className="font-medium">{shownAccount.phone_number}</span></> : null}</span>
          </div>

          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
            {([["contacts", "רשימת תפוצה", Users], ["campaigns", "קמפיינים", Megaphone], ["settings", "הגדרות", SettingsIcon]] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors ${tab === id ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {tab === "contacts" && <ContactsTab businessId={businessId} preview={forceConnected} />}
          {tab === "campaigns" && <CampaignsTab businessId={businessId} preview={forceConnected} />}
          {tab === "settings" && <SettingsTab account={shownAccount} />}
        </>
      )}
    </div>
  );
};

/* ---------- Guidance (before connecting) ---------- */
const GuidanceScreen = ({ businessId, onConnected }: { businessId?: string; onConnected: () => void }) => {
  const [connecting, setConnecting] = useState(false);

  const connect = async () => {
    const metaAppId = import.meta.env.VITE_META_APP_ID;
    if (!metaAppId) {
      toast.info("החיבור לוואטסאפ ייפתח כאן ברגע שנשלים את ההגדרה מול Meta. תכף תכף 🙏");
      return;
    }
    // Embedded Signup launches here once the Meta app is configured (build-only stub).
    setConnecting(true);
    try {
      // window.FB.login(... whatsapp embedded signup ...) -> on success post to whatsapp-connect
      toast.info("פותח את חלון החיבור של Meta...");
    } finally {
      setConnecting(false);
    }
  };

  const benefits = [
    "התראות הזמנה ומשלוח אוטומטיות ללקוחות",
    "תזכורות תורים (לעסקי שירות)",
    "דיוור שיווקי לרשימת התפוצה שלך",
    "ניהול החנות דרך וואטסאפ - הוספת מוצר בשליחת תמונה + כיתוב",
  ];
  const limits = [
    "צריך מספר ייעודי - המספר שמתחבר מפסיק לעבוד באפליקציית וואטסאפ הרגילה (שמור/י את הוואטסאפ האישי בנפרד)",
    "שיווק דורש אישור הלקוח (opt-in) - אי אפשר לשלוח לכל אחד",
    "תבניות הודעה מאושרות מראש על ידי Meta",
    "להודעת שיווק יש עלות קטנה; התראות שירות לרוב חינם",
    "מכסת השליחה מתחילה נמוכה וגדלה עם הזמן (מדיניות Meta)",
  ];

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Check className="w-5 h-5 text-[#25D366]" /> מה מקבלים</h3>
          <ul className="space-y-2">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground"><Check className="w-4 h-4 text-[#25D366] mt-0.5 shrink-0" /><span>{b}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-300/40 bg-amber-50/40 dark:bg-amber-500/5 p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> חשוב לדעת (בכנות)</h3>
          <ul className="space-y-2">
            {limits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><span className="text-amber-500 mt-0.5">•</span><span>{b}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-5 h-5 text-primary" /> החיבור מאובטח ומתבצע מול Meta. אנחנו לא רואים את הסיסמה שלך.
        </div>
        <button onClick={connect} disabled={connecting}
          className="rounded-lg bg-[#25D366] text-white font-medium px-6 py-2.5 flex items-center gap-2 disabled:opacity-50">
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
          הבנתי, בוא נחבר
        </button>
      </div>
    </div>
  );
};

/* ---------- Contacts (mailing list) ---------- */
const ContactsTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const { data: contactsData } = useQuery({
    queryKey: ["wa-contacts", businessId],
    enabled: !!businessId && !preview,
    queryFn: async () => {
      const { data } = await (supabase as any).from("whatsapp_contacts").select("id, phone, name, opted_in, tags, source").eq("business_id", businessId).order("created_at", { ascending: false }).limit(2000);
      return (data || []) as Contact[];
    },
  });
  const sampleContacts: Contact[] = [
    { id: "s1", phone: "+972 50-111-2222", name: "דנה כהן", opted_in: true, tags: ["לקוחות"], source: "checkout" },
    { id: "s2", phone: "+972 52-333-4444", name: "יוסי לוי", opted_in: true, tags: [], source: "import" },
    { id: "s3", phone: "+972 54-555-6666", name: null, opted_in: false, tags: [], source: "manual" },
  ];
  const contacts = preview ? sampleContacts : contactsData;
  const refresh = () => qc.invalidateQueries({ queryKey: ["wa-contacts", businessId] });

  const add = async () => {
    if (!phone.trim() || !businessId) return;
    const { error } = await (supabase as any).from("whatsapp_contacts").upsert(
      { business_id: businessId, phone: phone.trim(), name: name.trim() || null, opt_in_source: "manual", source: "manual" },
      { onConflict: "business_id,phone" });
    if (error) return toast.error(error.message);
    setPhone(""); setName(""); refresh(); toast.success("נוסף ✓");
  };

  const toggleOptIn = async (c: Contact) => {
    await (supabase as any).from("whatsapp_contacts").update({ opted_in: !c.opted_in, opt_in_at: !c.opted_in ? new Date().toISOString() : null }).eq("id", c.id);
    refresh();
  };

  const doImport = async () => {
    if (!businessId) return;
    const rows = importText.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => /\d{6,}/.test(s));
    if (!rows.length) return toast.error("לא זוהו מספרים");
    const payload = rows.map((phone) => ({ business_id: businessId, phone, opt_in_source: "import", source: "import" }));
    const { error } = await (supabase as any).from("whatsapp_contacts").upsert(payload, { onConflict: "business_id,phone", ignoreDuplicates: true });
    if (error) return toast.error(error.message);
    setImportText(""); setShowImport(false); refresh(); toast.success(`יובאו ${rows.length} אנשי קשר ✓`);
  };

  const optedIn = (contacts || []).filter((c) => c.opted_in).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{contacts?.length || 0} אנשי קשר</span>
        <span className="text-[#25D366]">{optedIn} מאושרים לשיווק</span>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="מספר טלפון" dir="ltr" className="flex-1 min-w-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם (לא חובה)" className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={add} className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium flex items-center gap-1.5"><Plus className="w-4 h-4" /> הוסף</button>
          <button onClick={() => setShowImport((s) => !s)} className="rounded-lg border border-border px-4 py-2 text-sm flex items-center gap-1.5"><Upload className="w-4 h-4" /> ייבוא</button>
        </div>
        {showImport && (
          <div className="space-y-2">
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={4} dir="ltr"
              placeholder="הדבק/י מספרים, מופרדים בפסיק או שורה חדשה" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={doImport} className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium">ייבא רשימה</button>
            <p className="text-xs text-muted-foreground">שים/י לב: ייבוא לא הופך אנשי קשר ל"מאושרים לשיווק" אוטומטית - opt-in נדרש לפי חוק.</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {(contacts || []).length === 0 ? (
          <p className="text-sm text-muted-foreground p-5 text-center">עדיין אין אנשי קשר. הוסיפו או ייבאו למעלה.</p>
        ) : (contacts || []).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <span dir="ltr" className="font-medium text-foreground">{c.phone}</span>
              {c.name && <span className="text-muted-foreground mr-2">· {c.name}</span>}
              {c.source && <span className="text-xs text-muted-foreground/70 mr-2">({c.source})</span>}
            </div>
            <button onClick={() => toggleOptIn(c)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.opted_in ? "bg-[#25D366]/15 text-[#1a9c4b]" : "bg-muted text-muted-foreground"}`}>
              {c.opted_in ? "מאושר לשיווק ✓" : "ללא אישור"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Campaigns ---------- */
const CampaignsTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const { data: campaignsData } = useQuery({
    queryKey: ["wa-campaigns", businessId],
    enabled: !!businessId && !preview,
    queryFn: async () => {
      const { data } = await (supabase as any).from("whatsapp_campaigns").select("id, name, status, audience_tag, total_count, sent_count, delivered_count, read_count").eq("business_id", businessId).order("created_at", { ascending: false }).limit(200);
      return (data || []) as Campaign[];
    },
  });
  const sampleCampaigns: Campaign[] = [
    { id: "c1", name: "מבצע סוף עונה", status: "sent", audience_tag: "לקוחות", total_count: 120, sent_count: 120, delivered_count: 118, read_count: 94 },
    { id: "c2", name: "השקת מוצר חדש", status: "draft", audience_tag: null, total_count: 0, sent_count: 0, delivered_count: 0, read_count: 0 },
  ];
  const campaigns = preview ? sampleCampaigns : campaignsData;
  const refresh = () => qc.invalidateQueries({ queryKey: ["wa-campaigns", businessId] });

  const create = async () => {
    if (!name.trim() || !businessId) return;
    const { error } = await (supabase as any).from("whatsapp_campaigns").insert({ business_id: businessId, name: name.trim(), audience_tag: tag.trim() || null, status: "draft" });
    if (error) return toast.error(error.message);
    setName(""); setTag(""); refresh(); toast.success("קמפיין נוצר (טיוטה) ✓");
  };

  const send = async (id: string) => {
    setSending(id);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-broadcast", { body: { campaignId: id } });
      if (error) throw error;
      if (data?.skipped) toast.info(data.reason === "twilio not configured" ? "השליחה תופעל אחרי חיבור הספק (Twilio)." : "צריך תבנית מאושרת לפני שליחה.");
      else toast.success(`נשלח ל-${data?.sent || 0} אנשי קשר ✓`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הקמפיין" className="flex-1 min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="קהל לפי תגית (ריק = כל המאושרים)" className="flex-1 min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={create} className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium flex items-center gap-1.5"><Plus className="w-4 h-4" /> צור קמפיין</button>
      </div>

      <div className="space-y-2">
        {(campaigns || []).length === 0 ? (
          <p className="text-sm text-muted-foreground p-5 text-center rounded-xl border border-border bg-card">אין עדיין קמפיינים.</p>
        ) : (campaigns || []).map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-foreground">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.audience_tag ? `קהל: ${c.audience_tag}` : "כל המאושרים"} · {c.status} · נשלח {c.sent_count}/{c.total_count}</div>
            </div>
            {(c.status === "draft" || c.status === "scheduled") && (
              <button onClick={() => send(c.id)} disabled={sending === c.id} className="rounded-lg bg-[#25D366] text-white px-4 py-2 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {sending === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} שלח
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">דיוור נשלח רק לאנשי קשר שאישרו (opt-in), בהתאם לחוק ולמדיניות Meta.</p>
    </div>
  );
};

/* ---------- Settings ---------- */
const SettingsTab = ({ account }: { account: Account | null }) => (
  <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
    <div className="flex justify-between"><span className="text-muted-foreground">מספר מחובר</span><span dir="ltr" className="font-medium text-foreground">{account?.phone_number || "-"}</span></div>
    <div className="flex justify-between"><span className="text-muted-foreground">שם תצוגה</span><span className="font-medium text-foreground">{account?.display_name || "-"}</span></div>
    <div className="flex justify-between"><span className="text-muted-foreground">מכסת שליחה</span><span className="font-medium text-foreground">{account?.messaging_limit || "—"}</span></div>
    <p className="text-xs text-muted-foreground pt-2 border-t border-border">בחירת האירועים שמפעילים וואטסאפ (הזמנה חדשה, משלוח, תזכורת) תתווסף כאן.</p>
  </div>
);

export default DashboardWhatsApp;
