import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MessageCircle, Check, Users, Megaphone, Settings as SettingsIcon,
  Plus, Upload, Loader2, BadgeCheck, ShieldCheck, Bell,
  Sparkles, Send, Image as ImageIcon, ChevronDown, ArrowLeft, Eye, CheckCheck,
  MessagesSquare, FileText, Bot, Smartphone, Facebook, FileSpreadsheet, Wand2, Mic,
} from "lucide-react";

interface Props { businessId?: string; forceConnected?: boolean }
type Tab = "chat" | "contacts" | "campaigns" | "templates" | "bot" | "settings";

interface Account { id: string; status: string; phone_number: string | null; display_name: string | null; messaging_limit: number | null; bot_enabled?: boolean; bot_prompt?: string | null; }
interface Contact { id: string; phone: string; name: string | null; opted_in: boolean; tags: string[] | null; source: string | null; }
interface Campaign { id: string; name: string; status: string; audience_tag: string | null; total_count: number; sent_count: number; delivered_count: number; read_count: number; }

const WA = "#25D366";        // bright accent (used sparingly)
const DEEP = "#075E54";      // classic WhatsApp deep green - the primary, designerly tone
const fade = (d = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: d } });

/**
 * Merchant WhatsApp area - premium UX. Guidance (what to prepare + sells it),
 * then a full workspace: live chat inbox, mailing list, broadcasts with
 * analytics, message templates, and an AI service bot. BUILD-ONLY (flag-gated).
 */
const DashboardWhatsApp = ({ businessId, forceConnected }: Props) => {
  const [tab, setTab] = useState<Tab>("chat");

  const { data: account, isLoading } = useQuery({
    queryKey: ["wa-account", businessId],
    enabled: !!businessId && !forceConnected,
    queryFn: async () => {
      const { data } = await (supabase as any).from("whatsapp_accounts").select("id, status, phone_number, display_name, messaging_limit, bot_enabled, bot_prompt").eq("business_id", businessId).maybeSingle();
      return data as Account | null;
    },
  });

  const previewAccount: Account = { id: "preview", status: "connected", phone_number: "+972 50-123-4567", display_name: "החנות שלי", messaging_limit: 1000, bot_enabled: true, bot_prompt: "" };
  const connected = forceConnected ? true : account?.status === "connected";
  const shownAccount = forceConnected ? previewAccount : account;

  if (isLoading) return <div className="container max-w-5xl mx-auto px-4 py-16 text-center" dir="rtl"><Loader2 className="w-7 h-7 animate-spin mx-auto" style={{ color: WA }} /></div>;

  const tabs: [Tab, string, any][] = [
    ["chat", "צ'אט", MessagesSquare], ["contacts", "רשימת תפוצה", Users], ["campaigns", "קמפיינים", Megaphone],
    ["templates", "תבניות", FileText], ["bot", "בוט AI", Bot], ["settings", "הגדרות", SettingsIcon],
  ];

  return (
    <div className="relative" dir="rtl">
      <div className="container relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-8">
        <motion.div {...fade()} className="flex items-center gap-4 pb-2 border-b border-border">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: DEEP }}>
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-foreground">וואטסאפ עסקי</h1>
            <p className="text-sm text-muted-foreground mt-0.5">הערוץ שכל לקוח ישראלי כבר נמצא בו - עכשיו עובד בשבילכם.</p>
          </div>
        </motion.div>

        {!connected ? (
          <GuidanceScreen />
        ) : (
          <>
            <motion.div {...fade(0.05)} className="flex items-center gap-3 rounded-2xl border px-5 py-4 backdrop-blur-sm" style={{ borderColor: `${WA}40`, background: `${WA}0d` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${WA}22` }}><BadgeCheck className="h-5 w-5" style={{ color: WA }} /></div>
              <div className="text-sm"><span className="font-semibold text-foreground">מחובר ופעיל</span>{shownAccount?.phone_number && <span className="text-muted-foreground"> · <span dir="ltr" className="font-medium">{shownAccount.phone_number}</span></span>}</div>
            </motion.div>

            <motion.div {...fade(0.1)} className="flex gap-1.5 p-1.5 rounded-2xl bg-muted/60 backdrop-blur w-full overflow-x-auto">
              {tabs.map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${tab === id ? "bg-background shadow-md font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </motion.div>

            <motion.div key={tab} {...fade()}>
              {tab === "chat" && <ChatTab businessId={businessId} preview={forceConnected} />}
              {tab === "contacts" && <ContactsTab businessId={businessId} preview={forceConnected} />}
              {tab === "campaigns" && <CampaignsTab businessId={businessId} preview={forceConnected} />}
              {tab === "templates" && <TemplatesTab businessId={businessId} preview={forceConnected} />}
              {tab === "bot" && <BotTab account={shownAccount} preview={forceConnected} />}
              {tab === "settings" && <SettingsTab account={shownAccount} />}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- Guidance: what to prepare + sells it ---------- */
const GuidanceScreen = () => {
  const [connecting, setConnecting] = useState(false);
  const [showLimits, setShowLimits] = useState(false);

  const connect = async () => {
    if (!import.meta.env.VITE_META_APP_ID) { toast.info("החיבור לוואטסאפ ייפתח כאן ברגע שנשלים את ההגדרה מול Meta. תכף תכף 🙏"); return; }
    setConnecting(true);
    try { toast.info("פותח את חלון החיבור של Meta..."); } finally { setConnecting(false); }
  };

  const benefits = [
    { icon: Bell, title: "התראות אוטומטיות", desc: "הזמנה אושרה, נשלחה, בדרך - הלקוח מקבל עדכון בוואטסאפ בלי שתעשו כלום.", grad: "from-emerald-400/15 to-teal-400/10" },
    { icon: Megaphone, title: "דיוור שיווקי", desc: "מבצע חדש? שלחו לכל רשימת התפוצה בלחיצה - לאנשים שכבר אוהבים אתכם.", grad: "from-green-400/15 to-emerald-400/10" },
    { icon: Bot, title: "בוט שירות חכם", desc: "בוט AI שעונה ללקוחות 24/7 לפי ההנחיות שלכם - אנחנו נעזור לחדד אותו.", grad: "from-teal-400/15 to-cyan-400/10", badge: "AI" },
    { icon: ImageIcon, title: "ניהול חנות מהוואטסאפ", desc: "שולחים תמונת מוצר + כיתוב לבוט - והוא מוסיף אותו לחנות. בלי מחשב.", grad: "from-lime-400/15 to-green-400/10", badge: "בלעדי" },
  ];
  const prepare = [
    { icon: Smartphone, title: "מספר טלפון ייעודי", desc: "מספר פנוי שיכול לקבל SMS/שיחה (לא חסום במענה קולי, ולא רשום כבר בוואטסאפ). אין לכם? אפשר להזמין מאיתנו מספר מוכן (למטה)." },
    { icon: Facebook, title: "פייסבוק + חשבון עסקי ב-Meta", desc: "החיבור דרך Meta Business Manager (חינם). אין לכם פייסבוק? פתחו חשבון ב-facebook.com. אנחנו מלווים בפתיחת החשבון העסקי." },
    { icon: FileText, title: "פרטי העסק + כתובת", desc: "שם העסק, כתובת ופרטי קשר - לרישום ולאימות מול Meta. אפשר להתחיל מיד; אימות עסק מלא (לתקרות שליחה גבוהות) נעשה בהמשך ולוקח ~1-2 שבועות אצל Meta." },
  ];
  const limits = [
    "המספר שמתחבר יוצא מאפליקציית וואטסאפ הרגילה (לכן מספר ייעודי).",
    "שיווק נשלח רק למי שאישר לקבל (opt-in) - שומר עליכם מול החוק.",
    "תבניות הודעות שיווקיות מאושרות מראש ע\"י Meta (אנחנו מטפלים בזה).",
    "להודעת שיווק יש עלות קטנה; התראות שירות לרוב חינם.",
    "מכסת השליחה מתחילה נמוכה וגדלה אוטומטית עם הזמן (מדיניות Meta).",
  ];

  return (
    <div className="space-y-7">
      <motion.div {...fade(0.05)} className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-white" style={{ background: DEEP }}>
        {/* subtle classic texture - a single faint diagonal sheen, no neon glow */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(135deg, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-white/70 uppercase mb-5" style={{ letterSpacing: "0.12em" }}>וואטסאפ עסקי · Siango</div>
          <h2 className="text-3xl md:text-[40px] font-bold leading-[1.15]">הערוץ שבו הלקוחות שלכם<br/>כבר מחכים לכם</h2>
          <p className="mt-4 text-white/80 text-base leading-relaxed max-w-xl">עדכוני הזמנה, תזכורות ומבצעים - ישירות לוואטסאפ של הלקוח, אוטומטית. ובוט שירות שעונה במקומכם, מסביב לשעון.</p>
          <button onClick={connect} disabled={connecting} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white text-[#075E54] font-semibold px-7 py-3.5 hover:bg-white/95 active:scale-[0.98] transition-all disabled:opacity-60">
            {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />} חברו וואטסאפ <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* What to prepare BEFORE connecting */}
      <motion.div {...fade(0.1)} className="rounded-3xl border-2 border-dashed p-6" style={{ borderColor: `${WA}55` }}>
        <h3 className="font-bold text-foreground text-lg mb-1 flex items-center gap-2"><CheckCheck className="w-5 h-5" style={{ color: WA }} /> מה צריך להכין לפני שמתחילים</h3>
        <p className="text-sm text-muted-foreground mb-4">2 דקות הכנה ואתם מוכנים. הנה הרשימה:</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {prepare.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="rounded-2xl bg-card border border-border p-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5" style={{ background: `${WA}1a` }}><Icon className="w-5 h-5" style={{ color: "#0f8c6e" }} /></div>
                <div className="font-semibold text-foreground text-sm mb-1">{i + 1}. {p.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Pricing + number ordering */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div {...fade(0.12)} className="rounded-3xl border border-border bg-card p-6">
          <h3 className="font-bold text-foreground text-lg mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5" style={{ color: WA }} /> כמה זה עולה</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-baseline justify-between"><span className="text-muted-foreground">הקמה חד-פעמית</span><span className="font-extrabold text-foreground text-lg">₪190</span></div>
            <div className="flex items-baseline justify-between"><span className="text-muted-foreground">מנוי חודשי</span><span className="font-extrabold text-foreground text-lg">₪89<span className="text-xs font-normal text-muted-foreground">/חודש</span></span></div>
            <div className="flex items-baseline justify-between pt-1 border-t border-border"><span className="text-muted-foreground">הודעות שיווק</span><span className="font-medium text-foreground">לפי שימוש (~₪0.26 להודעה)</span></div>
            <p className="text-xs text-muted-foreground pt-1">התראות שירות ללקוח - לרוב חינם. ללא התחייבות, אפשר לבטל בכל עת.</p>
          </div>
        </motion.div>

        <motion.div {...fade(0.16)} className="rounded-3xl border p-6 relative overflow-hidden" style={{ borderColor: `${WA}40`, background: `${WA}08` }}>
          <div className="flex items-center gap-2 mb-2"><Smartphone className="w-5 h-5" style={{ color: "#0f8c6e" }} /><h3 className="font-bold text-foreground text-lg">אין לכם מספר פנוי?</h3></div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">נספק לכם <b className="text-foreground">מספר וואטסאפ מוכן</b> ייעודי לעסק - בלי להוציא SIM נוסף. תוספת חודשית קטנה, ואנחנו מטפלים בהכל.</p>
          <button onClick={() => toast.info("נרשמה בקשה למספר מוכן - ניצור קשר להשלמה 🙏")} className="rounded-2xl px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2 shadow-sm hover:scale-[1.02] transition-transform" style={{ background: WA }}>
            <Plus className="w-4 h-4" /> הזמנת מספר מוכן · ₪19/חודש
          </button>
        </motion.div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div key={i} {...fade(0.12 + i * 0.05)} className="group rounded-2xl border border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ borderColor: `${DEEP}25`, background: `${DEEP}0a` }}><Icon className="w-5 h-5" style={{ color: DEEP }} /></div>
                <h3 className="font-semibold text-foreground text-lg">{b.title}</h3>
                {b.badge && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ color: DEEP, borderColor: `${DEEP}30` }}>{b.badge}</span>}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div {...fade(0.45)} className="rounded-3xl border border-border bg-card/60 backdrop-blur overflow-hidden">
        <button onClick={() => setShowLimits((s) => !s)} className="w-full flex items-center justify-between gap-3 px-6 py-4 text-right">
          <div className="flex items-center gap-2.5"><ShieldCheck className="w-5 h-5 text-primary" /><span className="font-semibold text-foreground">שקיפות מלאה - מה שכדאי לדעת לפני שמחברים</span></div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showLimits ? "rotate-180" : ""}`} />
        </button>
        {showLimits && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-6 pb-5">
            <ul className="space-y-2.5 pt-1">{limits.map((l, i) => (<li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: WA }} /><span>{l}</span></li>))}</ul>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

/* ---------- Chat inbox ---------- */
const ChatTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const [active, setActive] = useState(0);
  const sample = [
    { name: "דנה כהן", phone: "+972 50-111-2222", unread: 2, msgs: [
      { from: "in", text: "היי, ההזמנה שלי בדרך?", time: "09:14" },
      { from: "out", text: "היי דנה! ההזמנה יצאה הבוקר ותגיע מחר 🚚", time: "09:20" },
      { from: "in", text: "מעולה, תודה!", time: "09:21" },
    ] },
    { name: "יוסי לוי", phone: "+972 52-333-4444", unread: 0, msgs: [
      { from: "in", text: "יש מידה L לחולצה הכחולה?", time: "אתמול" },
      { from: "out", text: "כן! במלאי. רוצה שאשמור לך אחת?", time: "אתמול" },
    ] },
    { name: "מאיה", phone: "+972 54-555-6666", unread: 1, msgs: [
      { from: "in", text: "אפשר לקבל חשבונית?", time: "08:02" },
    ] },
  ];
  const [reply, setReply] = useState("");
  const conv = sample[active];

  if (!preview && !businessId) return null;

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-4 rounded-3xl border border-border bg-card overflow-hidden" style={{ minHeight: 460 }}>
      {/* conversation list */}
      <div className="border-l border-border md:max-h-[460px] overflow-y-auto">
        {sample.map((c, i) => (
          <button key={i} onClick={() => setActive(i)} className={`w-full flex items-center gap-3 p-3.5 text-right transition-colors ${i === active ? "bg-muted/60" : "hover:bg-muted/30"}`}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${WA}, #0f8c6e)` }}>{c.name.slice(0, 2)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2"><span className="font-semibold text-foreground text-sm truncate">{c.name}</span>{c.unread > 0 && <span className="text-[10px] font-bold text-white rounded-full px-1.5" style={{ background: WA }}>{c.unread}</span>}</div>
              <div className="text-xs text-muted-foreground truncate">{c.msgs[c.msgs.length - 1].text}</div>
            </div>
          </button>
        ))}
      </div>
      {/* thread */}
      <div className="flex flex-col">
        <div className="flex items-center gap-3 p-3.5 border-b border-border">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${WA}, #0f8c6e)` }}>{conv.name.slice(0, 2)}</div>
          <div><div className="font-semibold text-foreground text-sm">{conv.name}</div><div className="text-xs text-muted-foreground" dir="ltr">{conv.phone}</div></div>
        </div>
        <div className="flex-1 p-4 space-y-2.5 overflow-y-auto" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.015), transparent)" }}>
          {conv.msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === "out" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.from === "out" ? "text-white rounded-bl-sm" : "bg-muted text-foreground rounded-br-sm"}`} style={m.from === "out" ? { background: WA } : undefined}>
                {m.text}<div className={`text-[10px] mt-0.5 ${m.from === "out" ? "text-white/70" : "text-muted-foreground"}`}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border flex items-center gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="כתבו תשובה..." className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
          <button onClick={() => { if (reply.trim()) { toast.success("נשלח ✓ (בתצוגה מקדימה)"); setReply(""); } }} className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: WA }}><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Contacts ---------- */
const ContactsTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const qc = useQueryClient();
  const [phone, setPhone] = useState(""); const [name, setName] = useState("");
  const [importText, setImportText] = useState(""); const [showImport, setShowImport] = useState(false);

  const { data: contactsData } = useQuery({
    queryKey: ["wa-contacts", businessId], enabled: !!businessId && !preview,
    queryFn: async () => { const { data } = await (supabase as any).from("whatsapp_contacts").select("id, phone, name, opted_in, tags, source").eq("business_id", businessId).order("created_at", { ascending: false }).limit(2000); return (data || []) as Contact[]; },
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
  const toggleOptIn = async (c: Contact) => { if (preview) return; await (supabase as any).from("whatsapp_contacts").update({ opted_in: !c.opted_in, opt_in_at: !c.opted_in ? new Date().toISOString() : null }).eq("id", c.id); refresh(); };
  const doImport = async () => {
    if (!businessId) return;
    const rows = importText.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => /\d{6,}/.test(s));
    if (!rows.length) return toast.error("לא זוהו מספרים");
    const { error } = await (supabase as any).from("whatsapp_contacts").upsert(rows.map((phone) => ({ business_id: businessId, phone, opt_in_source: "import", source: "import" })), { onConflict: "business_id,phone", ignoreDuplicates: true });
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
          <button onClick={() => setShowImport((s) => !s)} className="rounded-xl border border-border px-4 py-2.5 text-sm flex items-center gap-1.5 hover:bg-muted/50"><Upload className="w-4 h-4" /> ייבוא מקובץ</button>
        </div>
        {showImport && (
          <div className="space-y-3 rounded-2xl bg-muted/40 p-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4 mt-0.5 shrink-0" style={{ color: WA }} />
              <div>
                <b className="text-foreground">איך מייבאים קובץ:</b> פתחו את הקובץ (Excel/Google Sheets), העתיקו את עמודת המספרים, והדביקו כאן. אפשר גם מספר בכל שורה או מופרדים בפסיק.<br/>
                פורמט מספר: <span dir="ltr">050-1234567</span> או <span dir="ltr">+972501234567</span>. כפילויות מסוננות אוטומטית.
              </div>
            </div>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={4} dir="ltr" placeholder={"050-1234567\n052-7654321\n+972541112222"} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
            <button onClick={doImport} className="rounded-xl text-white px-5 py-2.5 text-sm font-semibold" style={{ background: WA }}>ייבא רשימה</button>
            <p className="text-xs text-muted-foreground">⚠️ ייבוא לא הופך אנשי קשר ל"מאושרים לשיווק" - opt-in נדרש לפי חוק. שיווק יישלח רק למי שאישר.</p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card divide-y divide-border overflow-hidden">
        {total === 0 ? (<p className="text-sm text-muted-foreground p-8 text-center">עדיין אין אנשי קשר. הוסיפו או ייבאו למעלה.</p>) : (contacts || []).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${WA}, #0f8c6e)` }}>{(c.name || c.phone).replace(/\D/g, "").slice(-2)}</div>
              <div className="min-w-0"><div className="text-sm font-medium text-foreground truncate">{c.name || <span dir="ltr">{c.phone}</span>}</div>{c.name && <div className="text-xs text-muted-foreground" dir="ltr">{c.phone}</div>}</div>
            </div>
            <button onClick={() => toggleOptIn(c)} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${c.opted_in ? "text-[#0f8c6e]" : "bg-muted text-muted-foreground"}`} style={c.opted_in ? { background: `${WA}1f` } : undefined}>{c.opted_in ? "מאושר ✓" : "ללא אישור"}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Campaigns + analytics ---------- */
const CampaignsTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [tag, setTag] = useState(""); const [sending, setSending] = useState<string | null>(null);

  const { data: campaignsData } = useQuery({
    queryKey: ["wa-campaigns", businessId], enabled: !!businessId && !preview,
    queryFn: async () => { const { data } = await (supabase as any).from("whatsapp_campaigns").select("id, name, status, audience_tag, total_count, sent_count, delivered_count, read_count").eq("business_id", businessId).order("created_at", { ascending: false }).limit(200); return (data || []) as Campaign[]; },
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
    try { const { data, error } = await supabase.functions.invoke("whatsapp-broadcast", { body: { campaignId: id } }); if (error) throw error; if (data?.skipped) toast.info(data.reason === "twilio not configured" ? "השליחה תופעל אחרי חיבור הספק." : "צריך תבנית מאושרת לפני שליחה."); else toast.success(`נשלח ל-${data?.sent || 0} אנשי קשר ✓`); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "שגיאה"); } finally { setSending(null); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-5 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הקמפיין" className="flex-1 min-w-[170px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="קהל לפי תגית (ריק = כל המאושרים)" className="flex-1 min-w-[170px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
        <button onClick={create} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform" style={{ background: WA }}><Plus className="w-4 h-4" /> צור קמפיין</button>
      </div>

      <div className="space-y-3">
        {(campaigns || []).length === 0 ? (<p className="text-sm text-muted-foreground p-8 text-center rounded-3xl border border-border bg-card">אין עדיין קמפיינים.</p>) : (campaigns || []).map((c) => {
          const dlvPct = c.sent_count ? Math.round((c.delivered_count / c.sent_count) * 100) : 0;
          const readPct = c.sent_count ? Math.round((c.read_count / c.sent_count) * 100) : 0;
          return (
            <div key={c.id} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="font-semibold text-foreground">{c.name}</div><div className="text-xs text-muted-foreground mt-0.5">{c.audience_tag ? `קהל: ${c.audience_tag}` : "כל המאושרים"} · <span className={c.status === "sent" ? "" : "text-amber-600"}>{c.status === "sent" ? "נשלח" : c.status === "draft" ? "טיוטה" : c.status}</span></div></div>
                {(c.status === "draft" || c.status === "scheduled") ? (
                  <button onClick={() => send(c.id)} disabled={sending === c.id} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 shadow-sm hover:scale-[1.02] transition-transform" style={{ background: WA }}>{sending === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} שלח</button>
                ) : (<span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: `${WA}1f`, color: "#0f8c6e" }}>הסתיים</span>)}
              </div>
              {c.status === "sent" && (
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                  <AnalyticBox label="נשלחו" value={c.sent_count} sub="100%" icon={Send} />
                  <AnalyticBox label="נמסרו" value={c.delivered_count} sub={`${dlvPct}%`} icon={Check} />
                  <AnalyticBox label="נפתחו" value={c.read_count} sub={`${readPct}%`} icon={Eye} accent />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">דיוור נשלח רק לאנשי קשר שאישרו (opt-in). אחוז הפתיחה מתעדכן בזמן אמת לפי אישורי הקריאה של וואטסאפ.</p>
    </div>
  );
};

/* ---------- Templates ---------- */
const TemplatesTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [category, setCategory] = useState("marketing"); const [body, setBody] = useState("");

  const { data: tplData } = useQuery({
    queryKey: ["wa-templates", businessId], enabled: !!businessId && !preview,
    queryFn: async () => { const { data } = await (supabase as any).from("whatsapp_templates").select("id, name, category, body, status").eq("business_id", businessId).order("created_at", { ascending: false }).limit(200); return data || []; },
  });
  const sample = [
    { id: "t1", name: "עדכון הזמנה", category: "utility", body: "היי {{1}}, ההזמנה שלך מספר {{2}} בדרך! 🚚", status: "approved" },
    { id: "t2", name: "מבצע סוף שבוע", category: "marketing", body: "{{1}}, סוף שבוע = 20% הנחה! קוד: WEEKEND", status: "pending" },
    { id: "t3", name: "תזכורת תור", category: "utility", body: "תזכורת: התור שלך מחר ב-{{1}}. נתראה!", status: "approved" },
  ];
  const templates = preview ? sample : (tplData || []);
  const refresh = () => qc.invalidateQueries({ queryKey: ["wa-templates", businessId] });

  const create = async () => {
    if (!name.trim() || !body.trim() || !businessId) return;
    const { error } = await (supabase as any).from("whatsapp_templates").insert({ business_id: businessId, name: name.trim(), category, body: body.trim(), status: "draft" });
    if (error) return toast.error(error.message);
    setName(""); setBody(""); refresh(); toast.success("התבנית נשמרה ותישלח לאישור Meta ✓");
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      approved: { label: "אושר ✓", cls: "text-[#0f8c6e]" },
      pending: { label: "ממתין לאישור", cls: "text-amber-600 bg-amber-500/10" },
      rejected: { label: "נדחה", cls: "text-red-600 bg-red-500/10" },
      draft: { label: "טיוטה", cls: "text-muted-foreground bg-muted" },
    };
    const m = map[s] || map.draft;
    return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.cls}`} style={s === "approved" ? { background: `${WA}1f` } : undefined}>{m.label}</span>;
  };

  const starters = [
    { name: "אישור הזמנה", category: "utility", body: "היי {{1}}, קיבלנו את ההזמנה שלך (מס' {{2}}) ✅ נעדכן אותך בכל שלב." },
    { name: "ההזמנה בדרך", category: "utility", body: "{{1}}, ההזמנה שלך יצאה ובדרך אליך 🚚 צפי הגעה: {{2}}." },
    { name: "מבצע ללקוחות", category: "marketing", body: "{{1}}, מבצע מיוחד רק לכם! {{2}} בתוקף עד סוף השבוע 🎁" },
    { name: "תזכורת תור", category: "utility", body: "תזכורת: יש לך תור מחר ב-{{1}}. נשמח לראותך! לאישור השב/י 1." },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" style={{ color: DEEP }} /> בניית תבנית חדשה</h3>

        <div>
          <div className="text-xs text-muted-foreground mb-2">התחל מתבנית מוכנה:</div>
          <div className="flex flex-wrap gap-2">
            {starters.map((s, i) => (
              <button key={i} onClick={() => { setName(s.name); setCategory(s.category); setBody(s.body); }} className="text-xs rounded-lg border border-border bg-background px-3 py-1.5 text-foreground hover:border-foreground/30 transition-colors">{s.name}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם התבנית" className="flex-1 min-w-[160px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
            <option value="marketing">שיווק</option><option value="utility">שירות / עדכון</option>
          </select>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="תוכן ההודעה. אפשר משתנים: {{1}} שם, {{2}} מספר הזמנה..." className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/30 p-3">
          <ImageIcon className="w-4 h-4 shrink-0" style={{ color: DEEP }} />
          <span>אפשר לצרף לתבנית כותרת מדיה - <b className="text-foreground">תמונה עד 5MB</b> או <b className="text-foreground">וידאו עד 16MB</b> (מגבלות Meta). מסמך עד 100MB.</span>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">תבניות שיווק עוברות אישור של Meta (לרוב דקות עד שעות). אנחנו שולחים לאישור אוטומטית.</p>
          <button onClick={create} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5" style={{ background: DEEP }}><Plus className="w-4 h-4" /> שמור ושלח לאישור</button>
        </div>
      </div>

      <div className="space-y-3">
        {templates.length === 0 ? (<p className="text-sm text-muted-foreground p-8 text-center rounded-3xl border border-border bg-card">אין עדיין תבניות.</p>) : templates.map((t: any) => (
          <div key={t.id} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2"><span className="font-semibold text-foreground">{t.name}</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t.category === "marketing" ? "שיווק" : "שירות"}</span></div>
              {statusBadge(t.status)}
            </div>
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3" dir="rtl">{t.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- AI service bot (classic look + voice prompt) ---------- */
const BotTab = ({ account, preview }: { account: Account | null; preview?: boolean }) => {
  const [enabled, setEnabled] = useState(account?.bot_enabled ?? false);
  const [prompt, setPrompt] = useState(account?.bot_prompt ?? "");
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const examples = [
    "ענה בנימוס וקצר. שעות פתיחה: א'-ה' 9:00-18:00, ו' 9:00-13:00. משלוחים: עד 3 ימי עסקים, חינם מעל ₪200.",
    "את/ה נציג/ת השירות של חנות התכשיטים. הציעו לקבוע פגישת התרשמות. אל תתחייבו למחירים - הפנו לבעלים.",
  ];

  // Send the prompt (typed text or recorded audio) to our agent, which turns it
  // into a professional bot instruction. Build-only: graceful in preview.
  const refine = async (audioBase64?: string) => {
    if (preview) { toast.info("שכלול חכם של ההנחיה יופעל כשנעלה לאוויר 🙂"); return; }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-bot-prompt", { body: audioBase64 ? { audio: audioBase64 } : { text: prompt } });
      if (error) throw error;
      if (data?.prompt) { setPrompt(data.prompt); toast.success("ההנחיה שוכללה ✓"); }
      else toast.info("השכלול יופעל בקרוב.");
    } catch { toast.info("השכלול יופעל כשנחבר את המנוע."); } finally { setProcessing(false); }
  };

  const startRec = async () => {
    if (preview) { toast.info("הקלטה תופעל כשנעלה לאוויר 🎙️"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const b64 = await new Promise<string>((res) => { const r = new FileReader(); r.onloadend = () => res((r.result as string).split(",")[1] || ""); r.readAsDataURL(blob); });
        await refine(b64);
      };
      mediaRef.current = mr; mr.start(); setRecording(true);
    } catch { toast.error("לא ניתן לגשת למיקרופון"); }
  };
  const stopRec = () => { mediaRef.current?.stop(); setRecording(false); };

  const save = async () => {
    if (preview || !account || account.id === "preview") { toast.success("נשמר ✓ (בתצוגה מקדימה)"); return; }
    setSaving(true);
    try { await (supabase as any).from("whatsapp_accounts").update({ bot_enabled: enabled, bot_prompt: prompt, updated_at: new Date().toISOString() }).eq("id", account.id); toast.success("הבוט עודכן ✓"); } catch { toast.error("שגיאה"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-7 text-white" style={{ background: DEEP }}>
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center"><Bot className="w-6 h-6" /></div>
          <div>
            <h3 className="font-semibold text-lg">בוט שירות חכם</h3>
            <p className="text-sm text-white/80 mt-1 leading-relaxed max-w-lg">תארו במילים שלכם איך הבוט צריך לענות - בכתב או בהקלטה קולית. הסוכן שלנו ינסח את זה להנחיה מקצועית, והבוט יענה ללקוחות 24/7.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div><div className="font-semibold text-foreground">הפעלת הבוט</div><div className="text-xs text-muted-foreground">כשהבוט פעיל, הוא עונה ללקוחות לפי ההנחיה.</div></div>
          <button onClick={() => setEnabled((e) => !e)} className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? "" : "bg-muted"}`} style={enabled ? { background: DEEP } : undefined}>
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? "right-1" : "right-6"}`} />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">ההנחיה לבוט</label>
            <div className="flex items-center gap-2">
              <button onClick={recording ? stopRec : startRec} className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors ${recording ? "border-red-300 text-red-600 bg-red-50" : "border-border text-foreground hover:bg-muted/50"}`}>
                <Mic className="w-3.5 h-3.5" /> {recording ? "עצור הקלטה" : "הקלטה קולית"}
              </button>
              <button onClick={() => refine()} disabled={processing || !prompt.trim()} className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 text-white disabled:opacity-50" style={{ background: DEEP }}>
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} שכלל עם AI
              </button>
            </div>
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} placeholder="לדוגמה: ענה בנימוס וקצר. שעות פתיחה א'-ה' 9-18. משלוח חינם מעל ₪200. אם לא יודע - הפנה לבעלים." className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-[#075E54]/20 focus:border-[#075E54] focus:outline-none" />
          {recording && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> מקליט... דברו ולחצו "עצור" כשתסיימו, ונהפוך את זה להנחיה מקצועית.</p>}
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">דוגמאות (לחצו לשימוש):</div>
          <div className="space-y-2">
            {examples.map((ex, i) => (
              <button key={i} onClick={() => setPrompt(ex)} className="w-full text-right text-xs text-muted-foreground bg-muted/30 hover:bg-muted/60 rounded-lg p-3 transition-colors leading-relaxed">{ex}</button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving} className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: DEEP }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} שמירת הבוט
        </button>
      </div>
    </div>
  );
};

/* ---------- Settings ---------- */
const SettingsTab = ({ account }: { account: Account | null }) => {
  const [notif, setNotif] = useState({ order: true, shipping: true, reminders: true });
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`relative w-12 h-7 rounded-full transition-colors ${on ? "" : "bg-muted"}`} style={on ? { background: WA } : undefined}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "right-1" : "right-6"}`} />
    </button>
  );
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-6 space-y-4 text-sm">
        {[["מספר מחובר", account?.phone_number, true], ["שם תצוגה", account?.display_name, false], ["מכסת שליחה", account?.messaging_limit ? String(account.messaging_limit) : "—", false]].map(([label, value, ltr], i) => (
          <div key={i} className="flex justify-between items-center pb-3 border-b border-border last:border-0 last:pb-0">
            <span className="text-muted-foreground">{label as string}</span><span dir={ltr ? "ltr" : "rtl"} className="font-semibold text-foreground">{(value as string) || "-"}</span>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Bell className="w-4 h-4" style={{ color: WA }} /> אילו אירועים שולחים וואטסאפ אוטומטי</h3>
        {[["הזמנה חדשה", "order"], ["עדכון משלוח", "shipping"], ["תזכורות (תורים)", "reminders"]].map(([label, key]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{label}</span>
            <Toggle on={(notif as any)[key]} onClick={() => setNotif((n) => ({ ...n, [key as string]: !(n as any)[key as string] }))} />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- small UI bits ---------- */
const StatChip = ({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: boolean }) => (
  <div className="rounded-3xl border border-border bg-card p-5 flex items-center gap-3">
    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: accent ? `${WA}1f` : "hsl(var(--muted))" }}><Icon className="w-5 h-5" style={{ color: accent ? WA : "hsl(var(--muted-foreground))" }} /></div>
    <div><div className="text-2xl font-extrabold text-foreground">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
  </div>
);
const AnalyticBox = ({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: number; sub: string; accent?: boolean }) => (
  <div className="rounded-2xl bg-muted/40 p-3 text-center">
    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: accent ? WA : "hsl(var(--muted-foreground))" }} />
    <div className="text-lg font-extrabold text-foreground">{value}</div>
    <div className="text-[11px] text-muted-foreground">{label} · {sub}</div>
  </div>
);

export default DashboardWhatsApp;
