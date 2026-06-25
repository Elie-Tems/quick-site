import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MessageCircle, Check, Users, Megaphone, Settings as SettingsIcon,
  Plus, Upload, Loader2, BadgeCheck, ShieldCheck, Bell, CalendarClock,
  Sparkles, Send, Image as ImageIcon, ChevronDown, ArrowLeft, Eye, CheckCheck,
} from "lucide-react";

interface Props { businessId?: string; forceConnected?: boolean }
type Tab = "contacts" | "campaigns" | "settings";

interface Account { id: string; status: string; phone_number: string | null; display_name: string | null; messaging_limit: number | null; }
interface Contact { id: string; phone: string; name: string | null; opted_in: boolean; tags: string[] | null; source: string | null; }
interface Campaign { id: string; name: string; status: string; audience_tag: string | null; total_count: number; sent_count: number; delivered_count: number; read_count: number; }

const WA = "#25D366";
const fade = (d = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: d } });

/**
 * Merchant WhatsApp area - premium UX. A guidance screen that SELLS the feature
 * (benefits + honest limits), then the connected workspace (mailing list,
 * broadcasts, settings). BUILD-ONLY: gated by a feature flag until approved.
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

  const previewAccount: Account = { id: "preview", status: "connected", phone_number: "+972 50-123-4567", display_name: "החנות שלי", messaging_limit: 1000 };
  const connected = forceConnected ? true : account?.status === "connected";
  const shownAccount = forceConnected ? previewAccount : account;

  if (isLoading) {
    return <div className="container max-w-5xl mx-auto px-4 py-16 text-center" dir="rtl"><Loader2 className="w-7 h-7 animate-spin mx-auto" style={{ color: WA }} /></div>;
  }

  return (
    <div className="relative overflow-hidden" dir="rtl">
      {/* Ambient WhatsApp-green glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[460px] h-[460px] rounded-full blur-[160px]" style={{ background: `${WA}1f` }} />
      <div className="pointer-events-none absolute top-1/2 -left-20 w-[360px] h-[360px] rounded-full blur-[150px]" style={{ background: "#128C7E18" }} />

      <div className="container relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <motion.div {...fade()} className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${WA}, #128C7E)`, boxShadow: `0 10px 30px ${WA}40` }}>
            <MessageCircle className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">וואטסאפ עסקי</h1>
            <p className="text-sm text-muted-foreground mt-0.5">הערוץ שכל לקוח ישראלי כבר נמצא בו - עכשיו עובד בשבילכם, אוטומטית.</p>
          </div>
        </motion.div>

        {!connected ? (
          <GuidanceScreen />
        ) : (
          <>
            <motion.div {...fade(0.05)} className="flex items-center gap-3 rounded-2xl border px-5 py-4 backdrop-blur-sm" style={{ borderColor: `${WA}40`, background: `${WA}0d` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${WA}22` }}>
                <BadgeCheck className="h-5 w-5" style={{ color: WA }} />
              </div>
              <div className="text-sm">
                <span className="font-semibold text-foreground">מחובר ופעיל</span>
                {shownAccount?.phone_number && <span className="text-muted-foreground"> · <span dir="ltr" className="font-medium">{shownAccount.phone_number}</span></span>}
              </div>
            </motion.div>

            {/* Tabs - pill style */}
            <motion.div {...fade(0.1)} className="flex gap-1.5 p-1.5 rounded-2xl bg-muted/60 backdrop-blur w-fit">
              {([["contacts", "רשימת תפוצה", Users], ["campaigns", "קמפיינים", Megaphone], ["settings", "הגדרות", SettingsIcon]] as const).map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all ${tab === id ? "bg-background shadow-md font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </motion.div>

            <motion.div key={tab} {...fade()}>
              {tab === "contacts" && <ContactsTab businessId={businessId} preview={forceConnected} />}
              {tab === "campaigns" && <CampaignsTab businessId={businessId} preview={forceConnected} />}
              {tab === "settings" && <SettingsTab account={shownAccount} />}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- Guidance (before connecting) - sells the feature ---------- */
const GuidanceScreen = () => {
  const [connecting, setConnecting] = useState(false);
  const [showLimits, setShowLimits] = useState(false);

  const connect = async () => {
    const metaAppId = import.meta.env.VITE_META_APP_ID;
    if (!metaAppId) { toast.info("החיבור לוואטסאפ ייפתח כאן ברגע שנשלים את ההגדרה מול Meta. תכף תכף 🙏"); return; }
    setConnecting(true);
    try { toast.info("פותח את חלון החיבור של Meta..."); } finally { setConnecting(false); }
  };

  const benefits = [
    { icon: Bell, title: "התראות אוטומטיות", desc: "הזמנה אושרה, נשלחה, בדרך - הלקוח מקבל עדכון בוואטסאפ בלי שתעשו כלום.", grad: "from-emerald-400/15 to-teal-400/10" },
    { icon: Megaphone, title: "דיוור שיווקי", desc: "מבצע חדש? שלחו לכל רשימת התפוצה בלחיצה - לאנשים שכבר אוהבים אתכם.", grad: "from-green-400/15 to-emerald-400/10" },
    { icon: CalendarClock, title: "תזכורות תורים", desc: "לעסקי שירות - תזכורת אוטומטית שמורידה ביטולים ומ\"נשכח\".", grad: "from-teal-400/15 to-cyan-400/10" },
    { icon: ImageIcon, title: "ניהול חנות מהוואטסאפ", desc: "שולחים תמונת מוצר + כיתוב לבוט - והוא מוסיף אותו לחנות. בלי מחשב.", grad: "from-lime-400/15 to-green-400/10", badge: "בלעדי" },
  ];
  const limits = [
    "צריך מספר ייעודי - המספר שמתחבר יוצא מאפליקציית וואטסאפ הרגילה (כדאי SIM/מספר נפרד).",
    "שיווק נשלח רק למי שאישר לקבל (opt-in) - שומר עליכם מול החוק.",
    "תבניות הודעות שיווקיות מאושרות מראש ע\"י Meta (אנחנו מטפלים בזה).",
    "להודעת שיווק יש עלות קטנה; התראות שירות לרוב חינם.",
    "מכסת השליחה מתחילה נמוכה וגדלה אוטומטית עם הזמן (מדיניות Meta).",
  ];

  return (
    <div className="space-y-7">
      {/* Hero card */}
      <motion.div {...fade(0.05)}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white shadow-2xl"
        style={{ background: `linear-gradient(135deg, ${WA}, #0f8c6e 55%, #0b6e5a)`, boxShadow: `0 24px 60px ${WA}40` }}>
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-black/10 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" /> שדרוג הערך הכי גבוה לעסק שלכם
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">הפכו את הוואטסאפ למכונת המכירות של העסק</h2>
          <p className="mt-3 text-white/90 text-base leading-relaxed">
            בישראל כולם בוואטסאפ. עם חיבור אחד - הלקוחות מקבלים עדכוני הזמנה, תזכורות ומבצעים ישירות לצ'אט. יותר חזרה, יותר מכירות, פחות עבודה ידנית.
          </p>
          <button onClick={connect} disabled={connecting}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white text-[#0b6e5a] font-bold px-7 py-3.5 shadow-lg hover:scale-[1.03] active:scale-95 transition-transform disabled:opacity-60">
            {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
            חברו וואטסאפ עכשיו
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Benefit cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div key={i} {...fade(0.1 + i * 0.06)}
              className={`group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${b.grad} p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: `${WA}1f` }}>
                  <Icon className="w-5.5 h-5.5" style={{ color: "#0f8c6e" }} />
                </div>
                <h3 className="font-bold text-foreground text-lg">{b.title}</h3>
                {b.badge && <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: WA }}>{b.badge}</span>}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Honest "what to know" - elegant, calm, collapsible */}
      <motion.div {...fade(0.4)} className="rounded-3xl border border-border bg-card/60 backdrop-blur overflow-hidden">
        <button onClick={() => setShowLimits((s) => !s)} className="w-full flex items-center justify-between gap-3 px-6 py-4 text-right">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">שקיפות מלאה - מה שכדאי לדעת לפני שמחברים</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showLimits ? "rotate-180" : ""}`} />
        </button>
        {showLimits && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-6 pb-5">
            <ul className="space-y-2.5 pt-1">
              {limits.map((l, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: WA }} /><span>{l}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

/* ---------- Contacts (mailing list) ---------- */
const ContactsTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(""); const [name, setName] = useState("");
  const [importText, setImportText] = useState(""); const [showImport, setShowImport] = useState(false);

  const { data: contactsData } = useQuery({
    queryKey: ["wa-contacts", businessId], enabled: !!businessId && !preview,
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
    const { error } = await (supabase as any).from("whatsapp_contacts").upsert({ business_id: businessId, phone: phone.trim(), name: name.trim() || null, opt_in_source: "manual", source: "manual" }, { onConflict: "business_id,phone" });
    if (error) return toast.error(error.message);
    setPhone(""); setName(""); refresh(); toast.success("נוסף ✓");
  };
  const toggleOptIn = async (c: Contact) => {
    if (preview) return;
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

  const total = contacts?.length || 0;
  const optedIn = (contacts || []).filter((c) => c.opted_in).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <StatChip label="אנשי קשר" value={total} icon={Users} />
        <StatChip label="מאושרים לשיווק" value={optedIn} icon={CheckCheck} accent />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="מספר טלפון" dir="ltr" className="flex-1 min-w-[150px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם (לא חובה)" className="flex-1 min-w-[130px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
          <button onClick={add} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform" style={{ background: WA }}><Plus className="w-4 h-4" /> הוסף</button>
          <button onClick={() => setShowImport((s) => !s)} className="rounded-xl border border-border px-4 py-2.5 text-sm flex items-center gap-1.5 hover:bg-muted/50"><Upload className="w-4 h-4" /> ייבוא</button>
        </div>
        {showImport && (
          <div className="space-y-2">
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={4} dir="ltr" placeholder="הדבק/י מספרים, מופרדים בפסיק או שורה חדשה" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
            <button onClick={doImport} className="rounded-xl text-white px-5 py-2.5 text-sm font-semibold" style={{ background: WA }}>ייבא רשימה</button>
            <p className="text-xs text-muted-foreground">ייבוא לא הופך אנשי קשר ל"מאושרים" אוטומטית - opt-in נדרש לפי חוק.</p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card divide-y divide-border overflow-hidden">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground p-8 text-center">עדיין אין אנשי קשר. הוסיפו או ייבאו למעלה.</p>
        ) : (contacts || []).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${WA}, #0f8c6e)` }}>
                {(c.name || c.phone).replace(/\D/g, "").slice(-2)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{c.name || <span dir="ltr">{c.phone}</span>}</div>
                {c.name && <div className="text-xs text-muted-foreground" dir="ltr">{c.phone}</div>}
              </div>
            </div>
            <button onClick={() => toggleOptIn(c)} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${c.opted_in ? "text-[#0f8c6e]" : "bg-muted text-muted-foreground"}`} style={c.opted_in ? { background: `${WA}1f` } : undefined}>
              {c.opted_in ? "מאושר ✓" : "ללא אישור"}
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
  const [name, setName] = useState(""); const [tag, setTag] = useState(""); const [sending, setSending] = useState<string | null>(null);

  const { data: campaignsData } = useQuery({
    queryKey: ["wa-campaigns", businessId], enabled: !!businessId && !preview,
    queryFn: async () => {
      const { data } = await (supabase as any).from("whatsapp_campaigns").select("id, name, status, audience_tag, total_count, sent_count, delivered_count, read_count").eq("business_id", businessId).order("created_at", { ascending: false }).limit(200);
      return (data || []) as Campaign[];
    },
  });
  const sampleCampaigns: Campaign[] = [
    { id: "c1", name: "מבצע סוף עונה 🔥", status: "sent", audience_tag: "לקוחות", total_count: 120, sent_count: 120, delivered_count: 118, read_count: 94 },
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
    if (preview) { toast.info("בתצוגה מקדימה לא נשלח בפועל 🙂"); return; }
    setSending(id);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-broadcast", { body: { campaignId: id } });
      if (error) throw error;
      if (data?.skipped) toast.info(data.reason === "twilio not configured" ? "השליחה תופעל אחרי חיבור הספק." : "צריך תבנית מאושרת לפני שליחה.");
      else toast.success(`נשלח ל-${data?.sent || 0} אנשי קשר ✓`);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "שגיאה"); } finally { setSending(null); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-5 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הקמפיין" className="flex-1 min-w-[170px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="קהל לפי תגית (ריק = כל המאושרים)" className="flex-1 min-w-[170px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
        <button onClick={create} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform" style={{ background: WA }}><Plus className="w-4 h-4" /> צור קמפיין</button>
      </div>

      <div className="space-y-3">
        {(campaigns || []).length === 0 ? (
          <p className="text-sm text-muted-foreground p-8 text-center rounded-3xl border border-border bg-card">אין עדיין קמפיינים.</p>
        ) : (campaigns || []).map((c) => {
          const readPct = c.sent_count ? Math.round((c.read_count / c.sent_count) * 100) : 0;
          return (
            <div key={c.id} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.audience_tag ? `קהל: ${c.audience_tag}` : "כל המאושרים"} · <span className={c.status === "sent" ? "" : "text-amber-600"}>{c.status === "sent" ? "נשלח" : c.status === "draft" ? "טיוטה" : c.status}</span></div>
                </div>
                {(c.status === "draft" || c.status === "scheduled") ? (
                  <button onClick={() => send(c.id)} disabled={sending === c.id} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 shadow-sm hover:scale-[1.02] transition-transform" style={{ background: WA }}>
                    {sending === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} שלח
                  </button>
                ) : (
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: `${WA}1f`, color: "#0f8c6e" }}>הסתיים</span>
                )}
              </div>
              {c.status === "sent" && (
                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border text-sm">
                  <Metric icon={Send} label="נשלח" value={c.sent_count} />
                  <Metric icon={Check} label="נמסר" value={c.delivered_count} />
                  <Metric icon={Eye} label="נקרא" value={`${c.read_count} · ${readPct}%`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">דיוור נשלח רק לאנשי קשר שאישרו (opt-in), בהתאם לחוק ולמדיניות Meta.</p>
    </div>
  );
};

/* ---------- Settings ---------- */
const SettingsTab = ({ account }: { account: Account | null }) => (
  <div className="rounded-3xl border border-border bg-card p-6 space-y-4 text-sm">
    {[["מספר מחובר", account?.phone_number, true], ["שם תצוגה", account?.display_name, false], ["מכסת שליחה", account?.messaging_limit ? String(account.messaging_limit) : "—", false]].map(([label, value, ltr], i) => (
      <div key={i} className="flex justify-between items-center pb-3 border-b border-border last:border-0 last:pb-0">
        <span className="text-muted-foreground">{label as string}</span>
        <span dir={ltr ? "ltr" : "rtl"} className="font-semibold text-foreground">{(value as string) || "-"}</span>
      </div>
    ))}
    <p className="text-xs text-muted-foreground pt-1">בחירת האירועים שמפעילים וואטסאפ (הזמנה חדשה, משלוח, תזכורת) תתווסף כאן.</p>
  </div>
);

/* ---------- small UI bits ---------- */
const StatChip = ({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: boolean }) => (
  <div className="rounded-3xl border border-border bg-card p-5 flex items-center gap-3">
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: accent ? `${WA}1f` : "hsl(var(--muted))" }}>
      <Icon className="w-5 h-5" style={{ color: accent ? WA : "hsl(var(--muted-foreground))" }} />
    </div>
    <div>
      <div className="text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  </div>
);
const Metric = ({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) => (
  <div className="flex items-center gap-1.5 text-muted-foreground">
    <Icon className="w-4 h-4" /> <span className="text-foreground font-semibold">{value}</span> <span className="text-xs">{label}</span>
  </div>
);

export default DashboardWhatsApp;
