import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  MessageCircle, Check, Users, Megaphone, Settings as SettingsIcon,
  Plus, Upload, Loader2, BadgeCheck, ShieldCheck, Bell,
  Send, Coins, Image as ImageIcon, ChevronDown, ArrowLeft, Eye, CheckCheck,
  MessagesSquare, FileText, Bot, Smartphone, Facebook, FileSpreadsheet, Wand2, Mic, Paperclip, X,
} from "lucide-react";

interface Props { businessId?: string; forceConnected?: boolean; platformBot?: boolean }
type Tab = "chat" | "contacts" | "campaigns" | "templates" | "bot" | "settings";

interface Account { id: string; status: string; phone_number: string | null; display_name: string | null; messaging_limit: number | null; bot_enabled?: boolean; bot_prompt?: string | null; notify_new_order?: boolean; notify_shipping?: boolean; notify_reminders?: boolean; }
interface Contact { id: string; phone: string; name: string | null; opted_in: boolean; tags: string[] | null; source: string | null; }
interface Campaign { id: string; name: string; status: string; audience_tag: string | null; template_id: string | null; total_count: number; sent_count: number; delivered_count: number; read_count: number; }

const WA = "#25D366";        // bright accent (used sparingly)
const DEEP = "#075E54";      // classic WhatsApp deep green - the primary, designerly tone
const fade = (d = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: d } });

/**
 * Merchant WhatsApp area - premium UX. Guidance (what to prepare + sells it),
 * then a full workspace: live chat inbox, mailing list, broadcasts with
 * analytics, message templates, and an AI service bot. BUILD-ONLY (flag-gated).
 */
const DashboardWhatsApp = ({ businessId, forceConnected, platformBot }: Props) => {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("chat");
  const forced = forceConnected || platformBot;

  const { data: account, isLoading } = useQuery({
    queryKey: ["wa-account", businessId],
    enabled: !!businessId && !forced,
    queryFn: async () => {
      const { data } = await (supabase as any).from("whatsapp_accounts").select("id, status, phone_number, display_name, messaging_limit, bot_enabled, bot_prompt, notify_new_order, notify_shipping, notify_reminders").eq("business_id", businessId).maybeSingle();
      return data as Account | null;
    },
  });

  const previewAccount: Account = { id: "preview", status: "connected", phone_number: platformBot ? "Siango +972 50-000-0000" : "+972 50-123-4567", display_name: platformBot ? "Siango" : "החנות שלי", messaging_limit: 1000, bot_enabled: true, bot_prompt: "" };
  const connected = forced ? true : account?.status === "connected";
  const shownAccount = forced ? previewAccount : account;

  if (isLoading) return <div className="container max-w-5xl mx-auto px-4 py-16 text-center" dir="rtl"><Loader2 className="w-7 h-7 animate-spin mx-auto" style={{ color: WA }} /></div>;

  const tabs: [Tab, string, any][] = [
    ["chat", t("dash.whatsapp.tabs.chat"), MessagesSquare], ["contacts", t("dash.whatsapp.tabs.contacts"), Users], ["campaigns", t("dash.whatsapp.tabs.campaigns"), Megaphone],
    ["templates", t("dash.whatsapp.tabs.templates"), FileText], ["bot", t("dash.whatsapp.tabs.bot"), Bot], ["settings", t("dash.whatsapp.tabs.settings"), SettingsIcon],
  ];

  return (
    <div className="relative" dir="rtl">
      <div className="container relative z-10 max-w-5xl mx-auto px-4 py-8 space-y-8">
        <motion.div {...fade()} className="flex items-center gap-4 pb-2 border-b border-border">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: DEEP }}>
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-foreground">{platformBot ? t("dash.whatsapp.title_bot") : t("dash.whatsapp.title_business")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{platformBot ? t("dash.whatsapp.subtitle_bot") : t("dash.whatsapp.subtitle_business")}</p>
          </div>
        </motion.div>

        {!connected ? (
          <GuidanceScreen />
        ) : (
          <>
            <motion.div {...fade(0.05)} className="flex items-center gap-3 rounded-2xl border px-5 py-4 backdrop-blur-sm" style={{ borderColor: `${WA}40`, background: `${WA}0d` }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${WA}22` }}><BadgeCheck className="h-5 w-5" style={{ color: WA }} /></div>
              <div className="text-sm"><span className="font-semibold text-foreground">{t("dash.whatsapp.connected_active")}</span>{shownAccount?.phone_number && <span className="text-muted-foreground"> · <span dir="ltr" className="font-medium">{shownAccount.phone_number}</span></span>}</div>
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
              {tab === "chat" && <ChatTab businessId={businessId} preview={forced} />}
              {tab === "contacts" && <ContactsTab businessId={businessId} preview={forced} />}
              {tab === "campaigns" && <CampaignsTab businessId={businessId} preview={forced} />}
              {tab === "templates" && <TemplatesTab businessId={businessId} preview={forced} />}
              {tab === "bot" && <BotTab account={shownAccount} preview={forced} />}
              {tab === "settings" && <SettingsTab account={shownAccount} businessId={businessId} preview={forced} />}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- Guidance: what to prepare + sells it ---------- */
const GuidanceScreen = () => {
  const { t } = useLanguage();
  const [connecting, setConnecting] = useState(false);
  const [showLimits, setShowLimits] = useState(false);

  const connect = async () => {
    if (!import.meta.env.VITE_META_APP_ID) { toast.info(t("dash.whatsapp.guide.connect_soon_toast")); return; }
    setConnecting(true);
    try { toast.info(t("dash.whatsapp.guide.opening_meta_toast")); } finally { setConnecting(false); }
  };

  const benefits = [
    { icon: Bell, title: t("dash.whatsapp.guide.benefit1_title"), desc: t("dash.whatsapp.guide.benefit1_desc"), grad: "from-emerald-400/15 to-teal-400/10" },
    { icon: Megaphone, title: t("dash.whatsapp.guide.benefit2_title"), desc: t("dash.whatsapp.guide.benefit2_desc"), grad: "from-green-400/15 to-emerald-400/10" },
    { icon: Bot, title: t("dash.whatsapp.guide.benefit3_title"), desc: t("dash.whatsapp.guide.benefit3_desc"), grad: "from-teal-400/15 to-cyan-400/10", badge: "AI" },
    { icon: ImageIcon, title: t("dash.whatsapp.guide.benefit4_title"), desc: t("dash.whatsapp.guide.benefit4_desc"), grad: "from-lime-400/15 to-green-400/10", badge: t("dash.whatsapp.guide.benefit4_badge") },
  ];
  const prepare = [
    { icon: Smartphone, title: t("dash.whatsapp.guide.prepare1_title"), desc: t("dash.whatsapp.guide.prepare1_desc") },
    { icon: Facebook, title: t("dash.whatsapp.guide.prepare2_title"), desc: t("dash.whatsapp.guide.prepare2_desc") },
    { icon: FileText, title: t("dash.whatsapp.guide.prepare3_title"), desc: t("dash.whatsapp.guide.prepare3_desc") },
  ];
  const steps = [
    { title: t("dash.whatsapp.guide.step1_title"), desc: t("dash.whatsapp.guide.step1_desc") },
    { title: t("dash.whatsapp.guide.step2_title"), desc: t("dash.whatsapp.guide.step2_desc") },
    { title: t("dash.whatsapp.guide.step3_title"), desc: t("dash.whatsapp.guide.step3_desc") },
    { title: t("dash.whatsapp.guide.step4_title"), desc: t("dash.whatsapp.guide.step4_desc") },
    { title: t("dash.whatsapp.guide.step5_title"), desc: t("dash.whatsapp.guide.step5_desc") },
  ];
  const limits = [
    t("dash.whatsapp.guide.limit1"),
    t("dash.whatsapp.guide.limit2"),
    t("dash.whatsapp.guide.limit3"),
    t("dash.whatsapp.guide.limit4"),
    t("dash.whatsapp.guide.limit5"),
  ];

  return (
    <div className="space-y-7">
      <motion.div {...fade(0.05)} className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-white" style={{ background: DEEP }}>
        {/* subtle classic texture - a single faint diagonal sheen, no neon glow */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(135deg, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-white/70 uppercase mb-5" style={{ letterSpacing: "0.12em" }}>{t("dash.whatsapp.guide.hero_eyebrow")}</div>
          <h2 className="text-3xl md:text-[40px] font-bold leading-[1.15]">{t("dash.whatsapp.guide.hero_title_1")}<br/>{t("dash.whatsapp.guide.hero_title_2")}</h2>
          <p className="mt-4 text-white/80 text-base leading-relaxed max-w-xl">{t("dash.whatsapp.guide.hero_desc")}</p>
          <button onClick={connect} disabled={connecting} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white text-[#075E54] font-semibold px-7 py-3.5 hover:bg-white/95 active:scale-[0.98] transition-all disabled:opacity-60">
            {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />} {t("dash.whatsapp.guide.hero_cta")} <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* What to prepare BEFORE connecting */}
      <motion.div {...fade(0.1)} className="rounded-3xl border-2 border-dashed p-6" style={{ borderColor: `${WA}55` }}>
        <h3 className="font-bold text-foreground text-lg mb-1 flex items-center gap-2"><CheckCheck className="w-5 h-5" style={{ color: WA }} /> {t("dash.whatsapp.guide.prepare_heading")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("dash.whatsapp.guide.prepare_sub")}</p>
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

      {/* Critical: the number must be free of any existing WhatsApp */}
      <motion.div {...fade(0.11)} className="rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/5 p-5 flex items-start gap-3">
        <Smartphone className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <b className="text-foreground">{t("dash.whatsapp.guide.warning_label")}</b> {t("dash.whatsapp.guide.warning_prefix")} <b className="text-foreground">{t("dash.whatsapp.guide.warning_bold")}</b>{t("dash.whatsapp.guide.warning_suffix")}
        </div>
      </motion.div>

      {/* How connecting works - step by step */}
      <motion.div {...fade(0.12)} className="rounded-3xl border border-border bg-card p-6">
        <h3 className="font-bold text-foreground text-lg mb-1 flex items-center gap-2"><MessageCircle className="w-5 h-5" style={{ color: DEEP }} /> {t("dash.whatsapp.guide.how_heading")}</h3>
        <p className="text-sm text-muted-foreground mb-5">{t("dash.whatsapp.guide.how_sub")}</p>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: DEEP }}>{i + 1}</div>
              <div className="pt-0.5">
                <div className="font-semibold text-foreground text-sm">{s.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pricing + number ordering */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div {...fade(0.12)} className="rounded-3xl border border-border bg-card p-6">
          <h3 className="font-bold text-foreground text-lg mb-3 flex items-center gap-2"><Coins className="w-5 h-5" style={{ color: WA }} /> {t("dash.whatsapp.guide.pricing_heading")}</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-baseline justify-between"><span className="text-muted-foreground">{t("dash.whatsapp.guide.pricing_setup")}</span><span className="font-extrabold text-foreground text-lg">₪190</span></div>
            <div className="flex items-baseline justify-between"><span className="text-muted-foreground">{t("dash.whatsapp.guide.pricing_monthly")}</span><span className="font-extrabold text-foreground text-lg">₪89<span className="text-xs font-normal text-muted-foreground">{t("dash.whatsapp.guide.pricing_per_month")}</span></span></div>
            <div className="flex items-baseline justify-between pt-1 border-t border-border"><span className="text-muted-foreground">{t("dash.whatsapp.guide.pricing_marketing_msgs")}</span><span className="font-medium text-foreground">{t("dash.whatsapp.guide.pricing_usage")}</span></div>
            <p className="text-xs text-muted-foreground pt-1">{t("dash.whatsapp.guide.pricing_note")}</p>
          </div>
        </motion.div>

        <motion.div {...fade(0.16)} className="rounded-3xl border p-6 relative overflow-hidden" style={{ borderColor: `${WA}40`, background: `${WA}08` }}>
          <div className="flex items-center gap-2 mb-2"><Smartphone className="w-5 h-5" style={{ color: "#0f8c6e" }} /><h3 className="font-bold text-foreground text-lg">{t("dash.whatsapp.guide.number_heading")}</h3></div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t("dash.whatsapp.guide.number_prefix")} <b className="text-foreground">{t("dash.whatsapp.guide.number_bold")}</b> {t("dash.whatsapp.guide.number_suffix")}</p>
          <button onClick={() => toast.info(t("dash.whatsapp.guide.number_toast"))} className="rounded-2xl px-5 py-2.5 text-sm font-bold text-white inline-flex items-center gap-2 shadow-sm hover:scale-[1.02] transition-transform" style={{ background: WA }}>
            <Plus className="w-4 h-4" /> {t("dash.whatsapp.guide.number_cta")}
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
          <div className="flex items-center gap-2.5"><ShieldCheck className="w-5 h-5 text-primary" /><span className="font-semibold text-foreground">{t("dash.whatsapp.guide.transparency_heading")}</span></div>
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
  const { t } = useLanguage();
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
  const [attached, setAttached] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const conv = sample[active];

  // WhatsApp media limits: image 5MB, video 16MB.
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith("video");
    const maxMb = isVideo ? 16 : 5;
    if (f.size > maxMb * 1024 * 1024) { toast.error(`${t("dash.whatsapp.chat.file_too_big_prefix")} ${isVideo ? t("dash.whatsapp.chat.file_too_big_video") : t("dash.whatsapp.chat.file_too_big_image")}.`); e.target.value = ""; return; }
    setAttached(f.name);
  };

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
        <div className="px-3 pt-2 border-t border-border">
          {attached && <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5"><Paperclip className="w-3 h-3" /> {attached} <button onClick={() => setAttached(null)} className="text-muted-foreground hover:text-foreground">✕</button></div>}
          <div className="flex items-center gap-2 pb-3">
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={pickFile} />
            <button onClick={() => fileRef.current?.click()} title={t("dash.whatsapp.chat.attach_tooltip")} className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"><Paperclip className="w-4.5 h-4.5" /></button>
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("dash.whatsapp.chat.reply_placeholder")} className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
            <button onClick={() => { if (reply.trim() || attached) { toast.success(t("dash.whatsapp.chat.sent_preview_toast")); setReply(""); setAttached(null); } }} className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: WA }}><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Contacts ---------- */
const ContactsTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [phone, setPhone] = useState(""); const [name, setName] = useState("");
  const [importText, setImportText] = useState(""); const [showImport, setShowImport] = useState(false); const [importConsent, setImportConsent] = useState(false);
  const [unsubText, setUnsubText] = useState(""); const [showUnsub, setShowUnsub] = useState(false);

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
    setPhone(""); setName(""); refresh(); toast.success(t("dash.whatsapp.contacts.added_toast"));
  };
  const toggleOptIn = async (c: Contact) => { if (preview) return; await (supabase as any).from("whatsapp_contacts").update({ opted_in: !c.opted_in, opt_in_at: !c.opted_in ? new Date().toISOString() : null }).eq("id", c.id); refresh(); };
  const parseNumbers = (raw: string) => raw.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => /\d{6,}/.test(s));
  const doImport = async () => {
    if (preview) { toast.info(t("dash.whatsapp.contacts.preview_no_import_toast")); return; }
    if (!businessId) return;
    if (!importConsent) return toast.error(t("dash.whatsapp.contacts.consent_required_toast"));
    const rows = parseNumbers(importText);
    if (!rows.length) return toast.error(t("dash.whatsapp.contacts.no_numbers_toast"));
    // The merchant attested consent -> mark as opted-in for marketing.
    const { error } = await (supabase as any).from("whatsapp_contacts").upsert(rows.map((phone) => ({ business_id: businessId, phone, opted_in: true, opt_in_at: new Date().toISOString(), opt_in_source: "import-consent", source: "import" })), { onConflict: "business_id,phone", ignoreDuplicates: false });
    if (error) return toast.error(error.message);
    setImportText(""); setShowImport(false); setImportConsent(false); refresh(); toast.success(`${t("dash.whatsapp.contacts.import_success_prefix")} ${rows.length} ${t("dash.whatsapp.contacts.import_success_suffix")}`);
  };
  // Upload a suppression / unsubscribe list: mark these numbers as opted-out.
  const doUnsubImport = async () => {
    if (preview) { toast.info(t("dash.whatsapp.contacts.preview_no_import_toast")); return; }
    if (!businessId) return;
    const rows = parseNumbers(unsubText);
    if (!rows.length) return toast.error(t("dash.whatsapp.contacts.no_numbers_toast"));
    const { error } = await (supabase as any).from("whatsapp_contacts").upsert(rows.map((phone) => ({ business_id: businessId, phone, opted_in: false, opt_in_source: "unsubscribe-list", source: "unsubscribe" })), { onConflict: "business_id,phone", ignoreDuplicates: false });
    if (error) return toast.error(error.message);
    setUnsubText(""); setShowUnsub(false); refresh(); toast.success(`${rows.length} ${t("dash.whatsapp.contacts.unsub_success_suffix")}`);
  };

  const total = contacts?.length || 0;
  const optedIn = (contacts || []).filter((c) => c.opted_in).length;
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const shown = (contacts || []).filter((c) => filter === "all" ? true : filter === "in" ? c.opted_in : !c.opted_in);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatChip label={t("dash.whatsapp.contacts.stat_total")} value={total} icon={Users} />
        <StatChip label={t("dash.whatsapp.contacts.stat_opted_in")} value={optedIn} icon={CheckCheck} accent />
        <StatChip label={t("dash.whatsapp.contacts.stat_removed")} value={total - optedIn} icon={Users} />
      </div>
      <div className="flex gap-1.5 p-1 rounded-xl bg-muted/60 w-fit">
        {([["all", t("dash.whatsapp.contacts.filter_all")], ["in", t("dash.whatsapp.contacts.filter_in")], ["out", t("dash.whatsapp.contacts.filter_out")]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === id ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("dash.whatsapp.contacts.phone_placeholder")} dir="ltr" className="flex-1 min-w-[150px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("dash.whatsapp.contacts.name_placeholder")} className="flex-1 min-w-[130px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
          <button onClick={add} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform" style={{ background: WA }}><Plus className="w-4 h-4" /> {t("dash.whatsapp.contacts.add_btn")}</button>
          <button onClick={() => { setShowImport((s) => !s); setShowUnsub(false); }} className="rounded-xl border border-border px-4 py-2.5 text-sm flex items-center gap-1.5 hover:bg-muted/50"><Upload className="w-4 h-4" /> {t("dash.whatsapp.contacts.import_btn")}</button>
          <button onClick={() => { setShowUnsub((s) => !s); setShowImport(false); }} className="rounded-xl border border-border px-4 py-2.5 text-sm flex items-center gap-1.5 hover:bg-muted/50"><X className="w-4 h-4" /> {t("dash.whatsapp.contacts.unsub_btn")}</button>
        </div>
        {showImport && (
          <div className="space-y-3 rounded-2xl bg-muted/40 p-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4 mt-0.5 shrink-0" style={{ color: WA }} />
              <div>
                <b className="text-foreground">{t("dash.whatsapp.contacts.import_how_label")}</b> {t("dash.whatsapp.contacts.import_how_desc")}<br/>
                {t("dash.whatsapp.contacts.import_format_prefix")} <span dir="ltr">050-1234567</span> {t("dash.whatsapp.contacts.import_or")} <span dir="ltr">+972501234567</span>. {t("dash.whatsapp.contacts.import_duplicates_note")}
              </div>
            </div>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={4} dir="ltr" placeholder={"050-1234567\n052-7654321\n+972541112222"} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
            <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-3">
              <input type="checkbox" checked={importConsent} onChange={(e) => setImportConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-amber-500" />
              <span>{t("dash.whatsapp.contacts.consent_prefix")}<b>{t("dash.whatsapp.contacts.consent_bold")}</b>{t("dash.whatsapp.contacts.consent_suffix")}</span>
            </label>
            <button onClick={doImport} disabled={!importConsent} className="rounded-xl text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: WA }}>{t("dash.whatsapp.contacts.import_submit_btn")}</button>
          </div>
        )}
        {showUnsub && (
          <div className="space-y-3 rounded-2xl bg-muted/40 p-4">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <X className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <div><b className="text-foreground">{t("dash.whatsapp.contacts.unsub_label")}</b> {t("dash.whatsapp.contacts.unsub_desc")}</div>
            </div>
            <textarea value={unsubText} onChange={(e) => setUnsubText(e.target.value)} rows={4} dir="ltr" placeholder={"050-1234567\n052-7654321"} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
            <button onClick={doUnsubImport} className="rounded-xl text-white px-5 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600">{t("dash.whatsapp.contacts.unsub_submit_btn")}</button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card divide-y divide-border overflow-hidden">
        {shown.length === 0 ? (<p className="text-sm text-muted-foreground p-8 text-center">{total === 0 ? t("dash.whatsapp.contacts.empty_none") : t("dash.whatsapp.contacts.empty_filtered")}</p>) : shown.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${WA}, #0f8c6e)` }}>{(c.name || c.phone).replace(/\D/g, "").slice(-2)}</div>
              <div className="min-w-0"><div className="text-sm font-medium text-foreground truncate">{c.name || <span dir="ltr">{c.phone}</span>}</div>{c.name && <div className="text-xs text-muted-foreground" dir="ltr">{c.phone}</div>}</div>
            </div>
            <button onClick={() => toggleOptIn(c)} className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${c.opted_in ? "text-[#0f8c6e]" : "bg-muted text-muted-foreground"}`} style={c.opted_in ? { background: `${WA}1f` } : undefined}>{c.opted_in ? t("dash.whatsapp.contacts.opted_in_badge") : t("dash.whatsapp.contacts.opted_out_badge")}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Campaigns + analytics ---------- */
const CampaignsTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [tag, setTag] = useState(""); const [templateId, setTemplateId] = useState(""); const [sending, setSending] = useState<string | null>(null);

  const { data: campaignsData } = useQuery({
    queryKey: ["wa-campaigns", businessId], enabled: !!businessId && !preview,
    queryFn: async () => { const { data } = await (supabase as any).from("whatsapp_campaigns").select("id, name, status, audience_tag, template_id, total_count, sent_count, delivered_count, read_count").eq("business_id", businessId).order("created_at", { ascending: false }).limit(200); return (data || []) as Campaign[]; },
  });
  // Broadcasts can only be sent with an APPROVED template (whatsapp-broadcast
  // refuses otherwise). Offer only approved templates as the campaign's message.
  const { data: approvedTplData } = useQuery({
    queryKey: ["wa-approved-templates", businessId], enabled: !!businessId && !preview,
    queryFn: async () => { const { data } = await (supabase as any).from("whatsapp_templates").select("id, name").eq("business_id", businessId).eq("status", "approved").order("created_at", { ascending: false }).limit(100); return (data || []) as { id: string; name: string }[]; },
  });
  const approvedTemplates = preview ? [{ id: "t1", name: "עדכון הזמנה" }] : (approvedTplData || []);
  const sampleCampaigns: Campaign[] = [
    { id: "c1", name: "מבצע סוף עונה 🔥", status: "sent", audience_tag: "לקוחות", template_id: "t1", total_count: 120, sent_count: 120, delivered_count: 118, read_count: 94 },
    { id: "c2", name: "השקת מוצר חדש", status: "draft", audience_tag: null, template_id: "t1", total_count: 0, sent_count: 0, delivered_count: 0, read_count: 0 },
  ];
  const campaigns = preview ? sampleCampaigns : campaignsData;
  const refresh = () => qc.invalidateQueries({ queryKey: ["wa-campaigns", businessId] });

  const create = async () => {
    if (!name.trim() || !businessId) return;
    if (!templateId) return toast.error(t("dash.whatsapp.campaigns.template_required_toast"));
    const { error } = await (supabase as any).from("whatsapp_campaigns").insert({ business_id: businessId, name: name.trim(), audience_tag: tag.trim() || null, template_id: templateId, status: "draft" });
    if (error) return toast.error(error.message);
    setName(""); setTag(""); setTemplateId(""); refresh(); toast.success(t("dash.whatsapp.campaigns.created_toast"));
  };
  const send = async (id: string) => {
    if (preview) { toast.info(t("dash.whatsapp.campaigns.preview_no_send_toast")); return; }
    setSending(id);
    try { const { data, error } = await supabase.functions.invoke("whatsapp-broadcast", { body: { campaignId: id } }); if (error) throw error; if (data?.skipped) toast.info(data.reason === "twilio not configured" ? t("dash.whatsapp.campaigns.provider_pending_toast") : t("dash.whatsapp.campaigns.template_needed_toast")); else toast.success(`${t("dash.whatsapp.campaigns.sent_prefix")}${data?.sent || 0} ${t("dash.whatsapp.campaigns.sent_suffix")}`); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : t("dash.whatsapp.common.error_generic")); } finally { setSending(null); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-5 flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("dash.whatsapp.campaigns.name_placeholder")} className="flex-1 min-w-[170px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder={t("dash.whatsapp.campaigns.tag_placeholder")} className="flex-1 min-w-[170px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none" />
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={approvedTemplates.length === 0} className="flex-1 min-w-[170px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-50">
          <option value="">{approvedTemplates.length === 0 ? t("dash.whatsapp.campaigns.no_template_option") : t("dash.whatsapp.campaigns.choose_template_option")}</option>
          {approvedTemplates.map((tpl) => (<option key={tpl.id} value={tpl.id}>{tpl.name}</option>))}
        </select>
        <button onClick={create} disabled={!name.trim() || !templateId} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100" style={{ background: WA }}><Plus className="w-4 h-4" /> {t("dash.whatsapp.campaigns.create_btn")}</button>
      </div>
      {approvedTemplates.length === 0 && <p className="text-xs text-amber-600 -mt-3">{t("dash.whatsapp.campaigns.need_template_note")}</p>}

      <div className="space-y-3">
        {(campaigns || []).length === 0 ? (<p className="text-sm text-muted-foreground p-8 text-center rounded-3xl border border-border bg-card">{t("dash.whatsapp.campaigns.empty")}</p>) : (campaigns || []).map((c) => {
          const dlvPct = c.sent_count ? Math.round((c.delivered_count / c.sent_count) * 100) : 0;
          const readPct = c.sent_count ? Math.round((c.read_count / c.sent_count) * 100) : 0;
          return (
            <div key={c.id} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="font-semibold text-foreground">{c.name}</div><div className="text-xs text-muted-foreground mt-0.5">{c.audience_tag ? `${t("dash.whatsapp.campaigns.audience_prefix")} ${c.audience_tag}` : t("dash.whatsapp.campaigns.audience_all")} · <span className={c.status === "sent" ? "" : "text-amber-600"}>{c.status === "sent" ? t("dash.whatsapp.campaigns.status_sent") : c.status === "draft" ? t("dash.whatsapp.campaigns.status_draft") : c.status}</span></div></div>
                {(c.status === "draft" || c.status === "scheduled") ? (
                  <button onClick={() => send(c.id)} disabled={sending === c.id || !c.template_id} title={!c.template_id ? t("dash.whatsapp.campaigns.send_disabled_tooltip") : undefined} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 shadow-sm hover:scale-[1.02] transition-transform disabled:hover:scale-100" style={{ background: WA }}>{sending === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {t("dash.whatsapp.campaigns.send_btn")}</button>
                ) : (<span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: `${WA}1f`, color: "#0f8c6e" }}>{t("dash.whatsapp.campaigns.finished_badge")}</span>)}
              </div>
              {c.status === "sent" && (
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                  <AnalyticBox label={t("dash.whatsapp.campaigns.stat_sent")} value={c.sent_count} sub="100%" icon={Send} />
                  <AnalyticBox label={t("dash.whatsapp.campaigns.stat_delivered")} value={c.delivered_count} sub={`${dlvPct}%`} icon={Check} />
                  <AnalyticBox label={t("dash.whatsapp.campaigns.stat_read")} value={c.read_count} sub={`${readPct}%`} icon={Eye} accent />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t("dash.whatsapp.campaigns.footer_note")}</p>
    </div>
  );
};

/* ---------- Templates ---------- */
interface TplButton { type: "quick_reply" | "url" | "call"; text: string; value?: string }
const TemplatesTab = ({ businessId, preview }: { businessId?: string; preview?: boolean }) => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [category, setCategory] = useState("marketing");
  const [header, setHeader] = useState(""); const [body, setBody] = useState(""); const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<TplButton[]>([]);

  const { data: tplData } = useQuery({
    queryKey: ["wa-templates", businessId], enabled: !!businessId && !preview,
    queryFn: async () => { const { data } = await (supabase as any).from("whatsapp_templates").select("id, name, category, header_text, body, footer_text, buttons, status").eq("business_id", businessId).order("created_at", { ascending: false }).limit(200); return data || []; },
  });
  const sample = [
    { id: "t1", name: "עדכון הזמנה", category: "utility", header_text: "ההזמנה שלך אצלנו", body: "היי {{1}}, ההזמנה שלך מספר {{2}} בדרך! 🚚", footer_text: "תודה שקנית אצלנו", buttons: [{ type: "url", text: "מעקב הזמנה", value: "https://" }], status: "approved" },
    { id: "t2", name: "מבצע סוף שבוע", category: "marketing", header_text: "", body: "{{1}}, סוף שבוע = 20% הנחה! קוד: WEEKEND", footer_text: "להסרה השב/י הסר", buttons: [{ type: "url", text: "לחנות", value: "https://" }, { type: "quick_reply", text: "לא מעוניין" }], status: "pending" },
  ];
  const templates = preview ? sample : (tplData || []);
  const refresh = () => qc.invalidateQueries({ queryKey: ["wa-templates", businessId] });

  const addButton = () => { if (buttons.length < 3) setButtons([...buttons, { type: "url", text: "", value: "" }]); };
  const updateButton = (i: number, patch: Partial<TplButton>) => setButtons(buttons.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const removeButton = (i: number) => setButtons(buttons.filter((_, idx) => idx !== i));

  const create = async () => {
    if (preview) { toast.info(t("dash.whatsapp.templates.preview_no_save_toast")); return; }
    if (!name.trim() || !body.trim() || !businessId) return;
    const { error } = await (supabase as any).from("whatsapp_templates").insert({ business_id: businessId, name: name.trim(), category, header_text: header.trim() || null, body: body.trim(), footer_text: footer.trim() || null, buttons, status: "draft" });
    if (error) return toast.error(error.message);
    setName(""); setHeader(""); setBody(""); setFooter(""); setButtons([]); refresh(); toast.success(t("dash.whatsapp.templates.saved_toast"));
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      approved: { label: t("dash.whatsapp.templates.status_approved"), cls: "text-[#0f8c6e]" }, pending: { label: t("dash.whatsapp.templates.status_pending"), cls: "text-amber-600 bg-amber-500/10" },
      rejected: { label: t("dash.whatsapp.templates.status_rejected"), cls: "text-red-600 bg-red-500/10" }, draft: { label: t("dash.whatsapp.templates.status_draft"), cls: "text-muted-foreground bg-muted" },
    };
    const m = map[s] || map.draft;
    return <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.cls}`} style={s === "approved" ? { background: `${WA}1f` } : undefined}>{m.label}</span>;
  };

  const starters = [
    { name: "אישור הזמנה", category: "utility", header: "ההזמנה התקבלה", body: "היי {{1}}, קיבלנו את ההזמנה שלך (מס' {{2}}) ✅", footer: "תודה שקנית אצלנו", buttons: [{ type: "url" as const, text: "מעקב הזמנה", value: "https://" }] },
    { name: "מבצע ללקוחות", category: "marketing", header: "מבצע מיוחד 🎁", body: "{{1}}, מבצע רק לכם! {{2}} עד סוף השבוע.", footer: "להסרה השב/י הסר", buttons: [{ type: "url" as const, text: "לחנות", value: "https://" }, { type: "quick_reply" as const, text: "לא מעוניין" }] },
  ];

  // WhatsApp-style live preview bubble
  const bubble = (tpl: { header_text?: string; body: string; footer_text?: string; buttons?: TplButton[] }) => (
    <div className="rounded-2xl rounded-bl-sm bg-[#e8fce4] border border-[#cdeec4] p-3 max-w-sm text-right" dir="rtl">
      {tpl.header_text && <div className="font-bold text-foreground text-sm mb-1">{tpl.header_text}</div>}
      <div className="text-sm text-foreground whitespace-pre-wrap">{tpl.body || t("dash.whatsapp.templates.bubble_placeholder")}</div>
      {tpl.footer_text && <div className="text-[11px] text-muted-foreground mt-1.5">{tpl.footer_text}</div>}
      {!!tpl.buttons?.length && (
        <div className="mt-2 pt-2 border-t border-[#cdeec4] space-y-1">
          {tpl.buttons.map((b, i) => (
            <div key={i} className="text-center text-sm font-medium py-1.5 rounded-lg" style={{ color: "#0a7", background: "#fff" }}>
              {b.type === "url" ? "🔗 " : b.type === "call" ? "📞 " : ""}{b.text || t("dash.whatsapp.templates.bubble_button_fallback")}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Editor */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" style={{ color: DEEP }} /> {t("dash.whatsapp.templates.editor_heading")}</h3>

          <div>
            <div className="text-xs text-muted-foreground mb-2">{t("dash.whatsapp.templates.starters_label")}</div>
            <div className="flex flex-wrap gap-2">
              {starters.map((s, i) => (
                <button key={i} onClick={() => { setName(s.name); setCategory(s.category); setHeader(s.header); setBody(s.body); setFooter(s.footer); setButtons(s.buttons); }} className="text-xs rounded-lg border border-border bg-background px-3 py-1.5 text-foreground hover:border-foreground/30 transition-colors">{s.name}</button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("dash.whatsapp.templates.name_placeholder")} className="flex-1 min-w-[160px] rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
              <option value="marketing">{t("dash.whatsapp.templates.category_marketing_option")}</option><option value="utility">{t("dash.whatsapp.templates.category_service_option")}</option>
            </select>
          </div>

          <div><label className="text-xs font-medium text-muted-foreground">{t("dash.whatsapp.templates.header_label")}</label>
            <input value={header} onChange={(e) => setHeader(e.target.value)} placeholder={t("dash.whatsapp.templates.header_placeholder")} className="w-full mt-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">{t("dash.whatsapp.templates.body_label")}</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={t("dash.whatsapp.templates.body_placeholder")} className="w-full mt-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm" /></div>
          <div><label className="text-xs font-medium text-muted-foreground">{t("dash.whatsapp.templates.footer_label")}</label>
            <input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder={t("dash.whatsapp.templates.footer_placeholder")} className="w-full mt-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm" /></div>

          {/* Buttons builder */}
          <div>
            <div className="flex items-center justify-between mb-2"><label className="text-xs font-medium text-muted-foreground">{t("dash.whatsapp.templates.buttons_label")}</label>
              {buttons.length < 3 && <button onClick={addButton} className="text-xs font-medium inline-flex items-center gap-1" style={{ color: DEEP }}><Plus className="w-3 h-3" /> {t("dash.whatsapp.templates.add_button_btn")}</button>}</div>
            <div className="space-y-2">
              {buttons.map((b, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center bg-muted/30 rounded-lg p-2">
                  <select value={b.type} onChange={(e) => updateButton(i, { type: e.target.value as any })} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                    <option value="url">{t("dash.whatsapp.templates.button_type_url")}</option><option value="call">{t("dash.whatsapp.templates.button_type_call")}</option><option value="quick_reply">{t("dash.whatsapp.templates.button_type_quick_reply")}</option>
                  </select>
                  <input value={b.text} onChange={(e) => updateButton(i, { text: e.target.value })} placeholder={t("dash.whatsapp.templates.button_text_placeholder")} className="flex-1 min-w-[100px] rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />
                  {b.type !== "quick_reply" && <input value={b.value || ""} onChange={(e) => updateButton(i, { value: e.target.value })} dir="ltr" placeholder={b.type === "call" ? t("dash.whatsapp.templates.button_phone_placeholder") : "https://"} className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-3 py-1.5 text-xs" />}
                  <button onClick={() => removeButton(i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/30 p-3">
            <ImageIcon className="w-4 h-4 shrink-0" style={{ color: DEEP }} />
            <span>{t("dash.whatsapp.templates.media_note_prefix")} <b className="text-foreground">{t("dash.whatsapp.templates.media_image")}</b> / <b className="text-foreground">{t("dash.whatsapp.templates.media_video")}</b> / {t("dash.whatsapp.templates.media_doc")}</span>
          </div>
          <button onClick={create} className="w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: DEEP }}><Plus className="w-4 h-4" /> {t("dash.whatsapp.templates.save_btn")}</button>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-6">
          <div className="text-xs text-muted-foreground mb-2">{t("dash.whatsapp.templates.preview_label")}</div>
          <div className="rounded-2xl p-4" style={{ background: "#d9dbd5" }}>{bubble({ header_text: header, body, footer_text: footer, buttons })}</div>
        </div>
      </div>

      <div className="space-y-3">
        {templates.length === 0 ? (<p className="text-sm text-muted-foreground p-8 text-center rounded-2xl border border-border bg-card">{t("dash.whatsapp.templates.empty")}</p>) : templates.map((tpl: any) => (
          <div key={tpl.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2"><span className="font-semibold text-foreground">{tpl.name}</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tpl.category === "marketing" ? t("dash.whatsapp.templates.category_marketing_badge") : t("dash.whatsapp.templates.category_service_badge")}</span></div>
              {statusBadge(tpl.status)}
            </div>
            {bubble(tpl)}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- AI service bot (classic look + voice prompt) ---------- */
const BotTab = ({ account, preview }: { account: Account | null; preview?: boolean }) => {
  const { t } = useLanguage();
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
    if (preview) { toast.info(t("dash.whatsapp.bot.refine_pending_toast")); return; }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-bot-prompt", { body: audioBase64 ? { audio: audioBase64 } : { text: prompt } });
      if (error) throw error;
      if (data?.prompt) { setPrompt(data.prompt); toast.success(t("dash.whatsapp.bot.refined_toast")); }
      else toast.info(t("dash.whatsapp.bot.refine_soon_toast"));
    } catch { toast.info(t("dash.whatsapp.bot.refine_engine_toast")); } finally { setProcessing(false); }
  };

  const startRec = async () => {
    if (preview) { toast.info(t("dash.whatsapp.bot.record_pending_toast")); return; }
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
    } catch { toast.error(t("dash.whatsapp.bot.mic_error_toast")); }
  };
  const stopRec = () => { mediaRef.current?.stop(); setRecording(false); };

  const save = async () => {
    if (preview || !account || account.id === "preview") { toast.success(t("dash.whatsapp.common.saved_preview_toast")); return; }
    setSaving(true);
    try { await (supabase as any).from("whatsapp_accounts").update({ bot_enabled: enabled, bot_prompt: prompt, updated_at: new Date().toISOString() }).eq("id", account.id); toast.success(t("dash.whatsapp.bot.updated_toast")); } catch { toast.error(t("dash.whatsapp.common.error_generic")); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-7 text-white" style={{ background: DEEP }}>
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center"><Bot className="w-6 h-6" /></div>
          <div>
            <h3 className="font-semibold text-lg">{t("dash.whatsapp.bot.heading")}</h3>
            <p className="text-sm text-white/80 mt-1 leading-relaxed max-w-lg">{t("dash.whatsapp.bot.desc")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div><div className="font-semibold text-foreground">{t("dash.whatsapp.bot.enable_label")}</div><div className="text-xs text-muted-foreground">{t("dash.whatsapp.bot.enable_desc")}</div></div>
          <button onClick={() => setEnabled((e) => !e)} className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? "" : "bg-muted"}`} style={enabled ? { background: DEEP } : undefined}>
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? "right-1" : "right-6"}`} />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">{t("dash.whatsapp.bot.prompt_label")}</label>
            <div className="flex items-center gap-2">
              <button onClick={recording ? stopRec : startRec} className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors ${recording ? "border-red-300 text-red-600 bg-red-50" : "border-border text-foreground hover:bg-muted/50"}`}>
                <Mic className="w-3.5 h-3.5" /> {recording ? t("dash.whatsapp.bot.stop_recording_btn") : t("dash.whatsapp.bot.start_recording_btn")}
              </button>
              <button onClick={() => refine()} disabled={processing || !prompt.trim()} className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 text-white disabled:opacity-50" style={{ background: DEEP }}>
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} {t("dash.whatsapp.bot.refine_btn")}
              </button>
            </div>
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} placeholder={t("dash.whatsapp.bot.prompt_placeholder")} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-[#075E54]/20 focus:border-[#075E54] focus:outline-none" />
          {recording && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {t("dash.whatsapp.bot.recording_note")}</p>}
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">{t("dash.whatsapp.bot.examples_label")}</div>
          <div className="space-y-2">
            {examples.map((ex, i) => (
              <button key={i} onClick={() => setPrompt(ex)} className="w-full text-right text-xs text-muted-foreground bg-muted/30 hover:bg-muted/60 rounded-lg p-3 transition-colors leading-relaxed">{ex}</button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving} className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: DEEP }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t("dash.whatsapp.bot.save_btn")}
        </button>
      </div>
    </div>
  );
};

/* ---------- Settings ---------- */
const SettingsTab = ({ account, businessId, preview }: { account: Account | null; businessId?: string; preview?: boolean }) => {
  const { t } = useLanguage();
  // Initialize from the account row - these map to whatsapp_accounts columns that
  // the DB order trigger reads. Default ON when the column hasn't been set yet.
  const [notif, setNotif] = useState({
    order: account?.notify_new_order ?? true,
    shipping: account?.notify_shipping ?? true,
    reminders: account?.notify_reminders ?? true,
  });
  const [saving, setSaving] = useState(false);
  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`relative w-12 h-7 rounded-full transition-colors ${on ? "" : "bg-muted"}`} style={on ? { background: WA } : undefined}>
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "right-1" : "right-6"}`} />
    </button>
  );
  const save = async () => {
    if (preview || !businessId || account?.id === "preview") { toast.success(t("dash.whatsapp.common.saved_preview_toast")); return; }
    setSaving(true);
    try {
      await (supabase as any).from("whatsapp_accounts").update({ notify_new_order: notif.order, notify_shipping: notif.shipping, notify_reminders: notif.reminders, updated_at: new Date().toISOString() }).eq("business_id", businessId);
      toast.success(t("dash.whatsapp.settings.saved_toast"));
    } catch { toast.error(t("dash.whatsapp.common.error_generic")); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card p-6 space-y-4 text-sm">
        {[[t("dash.whatsapp.settings.connected_number_label"), account?.phone_number, true], [t("dash.whatsapp.settings.display_name_label"), account?.display_name, false], [t("dash.whatsapp.settings.messaging_limit_label"), account?.messaging_limit ? String(account.messaging_limit) : "—", false]].map(([label, value, ltr], i) => (
          <div key={i} className="flex justify-between items-center pb-3 border-b border-border last:border-0 last:pb-0">
            <span className="text-muted-foreground">{label as string}</span><span dir={ltr ? "ltr" : "rtl"} className="font-semibold text-foreground">{(value as string) || "-"}</span>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Bell className="w-4 h-4" style={{ color: WA }} /> {t("dash.whatsapp.settings.events_heading")}</h3>
        {[[t("dash.whatsapp.settings.event_order"), "order"], [t("dash.whatsapp.settings.event_shipping"), "shipping"], [t("dash.whatsapp.settings.event_reminders"), "reminders"]].map(([label, key]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{label}</span>
            <Toggle on={(notif as any)[key]} onClick={() => setNotif((n) => ({ ...n, [key as string]: !(n as any)[key as string] }))} />
          </div>
        ))}
        <button onClick={save} disabled={saving} className="w-full rounded-xl py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: WA }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t("dash.whatsapp.settings.save_btn")}
        </button>
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
