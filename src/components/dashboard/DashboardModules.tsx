import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, CalendarClock, Building2, Heart, Landmark,
  Hotel, ClipboardList, Images, Check, Loader2, Blocks, Sparkles, Bell,
  FileText, HelpCircle, ArrowLeft, Award, AlertTriangle, Video, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getEnabledModules, getBusinessType, MODULES, type ModuleKey, type BusinessType,
} from "@/lib/businessModules";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * "המודולים שלי" - the dashboard module marketplace. A business_type sets a
 * default preset (kept), but here the merchant turns capabilities on/off and
 * adds new ones. Writing to businesses.enabled_modules; getEnabledModules()
 * honors it, so the nav + storefront react immediately. Onboarding stays simple
 * (no module picker) - all composition happens here, per product decision.
 */

interface Props {
  business?: { id?: string; business_type?: string | null; enabled_modules?: string[] | null } | null;
  onNavigate?: (view: string) => void;
}

type Live = {
  key: ModuleKey;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  title: string;
  desc: string;
};

const buildLive = (t: (key: string) => string): Live[] => [
  { key: "commerce",  icon: ShoppingBag,   color: "#0b9e77", title: t("dash.modules.live_commerce_title"),  desc: t("dash.modules.live_commerce_desc") },
  { key: "booking",   icon: CalendarClock, color: "#1785c2", title: t("dash.modules.live_booking_title"),   desc: t("dash.modules.live_booking_desc") },
  { key: "listings",  icon: Building2,     color: "#6d4bd0", title: t("dash.modules.live_listings_title"),  desc: t("dash.modules.live_listings_desc") },
  { key: "donations", icon: Heart,         color: "#c0392b", title: t("dash.modules.live_donations_title"), desc: t("dash.modules.live_donations_desc") },
  { key: "synagogue", icon: Landmark,      color: "#c07d12", title: t("dash.modules.live_synagogue_title"), desc: t("dash.modules.live_synagogue_desc") },
  { key: "gallery",   icon: Images,        color: "#0891b2", title: t("dash.modules.live_gallery_title"),   desc: t("dash.modules.live_gallery_desc") },
  { key: "lodging",        icon: Hotel,  color: "#6d4bd0", title: "חדרים / יחידות אירוח", desc: "יחידות עם זמינות בלוח, מחיר ללילה והזמנה - לצימרים ואירוח." },
  { key: "differentiation", icon: Award,  color: "#0f766e", title: "בידול ויתרונות", desc: "סקשן שמסביר למה לבחור בך - כותרת, תיאור ויתרונות עם צ'קמארקים." },
  { key: "video",           icon: Video,       color: "#dc2626", title: "וידאו",           desc: "הטמע סרטון YouTube או Vimeo עם בחירת סגנון ומיקום בדף." },
  { key: "faq",             icon: HelpCircle,  color: "#7c3aed", title: "שאלות נפוצות",    desc: "אקורדיון שאלות ותשובות שמופיע בעמוד החנות." },
  { key: "articles",        icon: FileText,    color: "#059669", title: "מאמרים",           desc: "מאמרים מקצועיים שמחזקים אמינות ומביאים לקוחות מגוגל." },
];

/** Which LIVE module keys make sense to offer per business type. */
const ALLOWED_LIVE: Record<BusinessType, ModuleKey[]> = {
  products:   ["commerce", "gallery", "differentiation", "video", "faq", "articles"],
  services:   ["commerce", "booking", "gallery", "differentiation", "video", "faq", "articles"],
  realestate: ["listings", "booking", "gallery", "differentiation", "video", "faq", "articles"],
  nonprofit:  ["donations", "commerce", "gallery", "video", "faq", "articles"],
  synagogue:  ["donations", "synagogue", "gallery", "video", "faq", "articles"],
  vacation:   ["commerce", "booking", "gallery", "lodging", "video", "faq", "differentiation", "articles"],
  kolel:      ["donations", "gallery", "video", "faq", "articles"],
};

type SoonItem = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  title: string;
  desc: string;
  types?: BusinessType[]; // if set, only show for these types
};

// Navigation target per module key — where to go to manage content
const MODULE_NAV: Partial<Record<ModuleKey, string>> = {
  gallery:   "content",
  commerce:  "products",
  booking:   "booking",
  listings:  "products",
  donations: "content",
  lodging:         "products",
  differentiation: "content",
  faq:             "content",
  articles:        "blog-posts",
};

// Phase-2 modules - shown as an invitation, not yet toggleable.
const buildSoon = (t: (key: string) => string): SoonItem[] => [
  { icon: ClipboardList, color: "#c07d12", title: t("dash.modules.soon_leads_title"),    desc: t("dash.modules.soon_leads_desc"),    types: ["products", "nonprofit", "synagogue"] },
];

/** The module that is the core identity of each business type. Disabling it shows a warning. */
const PRIMARY_MODULE: Record<BusinessType, ModuleKey> = {
  products:   "commerce",
  services:   "booking",
  realestate: "listings",
  nonprofit:  "donations",
  synagogue:  "donations",
  vacation:   "lodging",
};

const buildPrimaryWarning = (t: (key: string) => string): Partial<Record<ModuleKey, string>> => ({
  commerce:  t("dash.modules.warning_commerce"),
  booking:   t("dash.modules.warning_booking"),
  listings:  t("dash.modules.warning_listings"),
  donations: t("dash.modules.warning_donations"),
});

const fade = (d = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: d } });

const VIDEO_STYLES = [
  { key: "centered", label: "מרכזי נקי",      desc: "iframe בדף הלבן עם כותרת" },
  { key: "split",    label: "Split",           desc: "טקסט משמאל, וידאו מימין" },
  { key: "tinted",   label: "רקע צבעוני",     desc: "iframe על רקע בצבע העסק" },
] as const;

const VIDEO_POSITIONS = [
  { key: "top",    label: "אחרי ה-hero",      desc: "הסקשן הראשון שרואים" },
  { key: "bottom", label: "לפני אודות",       desc: "בסוף התוכן, לפני הביקורות" },
] as const;

const DashboardModules = ({ business, onNavigate }: Props) => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [pending, setPending] = useState<ModuleKey | null>(null);
  const [warnKey, setWarnKey] = useState<ModuleKey | null>(null);
  const [notified, setNotified] = useState<Set<string>>(new Set());

  // Video config local state
  const { data: videoCfg } = useQuery({
    queryKey: ["video-cfg", business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      const { data } = await (supabase.from("businesses") as any)
        .select("video_url, video_style, video_position, video_title")
        .eq("id", business.id).single();
      return data;
    },
    enabled: !!business?.id,
  });
  const [videoUrl,   setVideoUrl]   = useState("");
  const [videoStyle, setVideoStyle] = useState("centered");
  const [videoPos,   setVideoPos]   = useState("top");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoSaving, setVideoSaving] = useState(false);

  // Sync local state when server data arrives
  const [videoSynced, setVideoSynced] = useState(false);
  if (videoCfg && !videoSynced) {
    setVideoUrl(videoCfg.video_url ?? "");
    setVideoStyle(videoCfg.video_style ?? "centered");
    setVideoPos(videoCfg.video_position ?? "top");
    setVideoTitle(videoCfg.video_title ?? "");
    setVideoSynced(true);
  }

  const saveVideoConfig = async () => {
    if (!business?.id) return;
    setVideoSaving(true);
    try {
      const { error } = await (supabase.from("businesses") as any)
        .update({ video_url: videoUrl.trim() || null, video_style: videoStyle, video_position: videoPos, video_title: videoTitle.trim() || null })
        .eq("id", business.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my-business"] });
      qc.invalidateQueries({ queryKey: ["business"] });
      toast.success("הגדרות הוידאו נשמרו");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setVideoSaving(false);
    }
  };

  const handleNotify = (title: string) => {
    setNotified(prev => new Set(prev).add(title));
    toast.success(`נרשמת לרשימת ההמתנה עבור "${title}" — נעדכן אותך כשיהיה זמין`);
  };
  const current = getEnabledModules(business as { business_type?: BusinessType } | null);
  const bType = getBusinessType(business as { business_type?: BusinessType } | null);
  const allowedKeys = ALLOWED_LIVE[bType] ?? Object.keys(MODULES) as ModuleKey[];
  const LIVE = buildLive(t);
  const SOON = buildSoon(t);
  const PRIMARY_WARNING = buildPrimaryWarning(t);
  const visibleLive = LIVE.filter((m) => allowedKeys.includes(m.key));
  const visibleSoon = SOON.filter((m) => !m.types || m.types.includes(bType));

  const save = useMutation({
    mutationFn: async (next: ModuleKey[]) => {
      if (!business?.id) throw new Error("no business");
      // enabled_modules is a new column not yet in the generated types.
      const { error } = await (supabase.from("businesses") as unknown as {
        update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      }).update({ enabled_modules: next }).eq("id", business.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-business"] });
      qc.invalidateQueries({ queryKey: ["business"] });
    },
    onError: () => toast.error(t("dash.modules.update_error")),
    onSettled: () => setPending(null),
  });

  const doToggle = (key: ModuleKey) => {
    const on = current.includes(key);
    const next = on ? current.filter((k) => k !== key) : [...current, key];
    if (next.length === 0) { toast.error(t("dash.modules.min_one_required")); return; }
    setPending(key);
    save.mutate(next, { onSuccess: () => toast.success(`${MODULES[key].label} ${on ? t("dash.modules.toggle_off_suffix") : t("dash.modules.toggle_on_suffix")}`) });
  };

  const toggle = (key: ModuleKey) => {
    const on = current.includes(key);
    if (on && PRIMARY_MODULE[bType] === key && PRIMARY_WARNING[key]) {
      setWarnKey(key);
      return;
    }
    doToggle(key);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* Hero */}
      <motion.div {...fade()} className="rounded-2xl p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#0b9e77,#1785c2,#6d4bd0)" }}>
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Blocks className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{t("dash.modules.hero_title")}</h1>
            <p className="text-white/80 text-sm mt-0.5">{t("dash.modules.hero_subtitle")}</p>
          </div>
        </div>
      </motion.div>

      {/* Live modules */}
      <div className="grid sm:grid-cols-2 gap-4">
        {visibleLive.map((m, i) => {
          const on = current.includes(m.key);
          const Icon = m.icon;
          const busy = pending === m.key;
          return (
            <motion.div key={m.key} {...fade(0.03 * i)}
              className={`rounded-2xl border p-5 transition-colors ${on ? "border-transparent" : "border-border bg-card"}`}
              style={on ? { background: `linear-gradient(120deg, ${m.color}12, transparent)`, borderColor: `${m.color}55` } : undefined}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${m.color}1a` }}>
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{m.title}</h3>
                    {on && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${m.color}1f`, color: m.color }}><Check className="w-3 h-3" /> {t("dash.modules.active_badge")}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{m.desc}</p>
                  {on && MODULE_NAV[m.key] && onNavigate && m.key !== "video" && (
                    <button
                      onClick={() => onNavigate(MODULE_NAV[m.key]!)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      style={{ color: m.color }}
                    >
                      ערוך תוכן
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Toggle */}
                <button
                  onClick={() => toggle(m.key)}
                  disabled={busy}
                  role="switch"
                  aria-checked={on}
                  className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-60 ${on ? "" : "bg-muted"}`}
                  style={on ? { background: m.color } : undefined}
                  title={on ? t("dash.modules.toggle_off_title") : t("dash.modules.toggle_on_title")}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center ${on ? "right-1" : "right-6"}`}>
                    {busy && <Loader2 className="w-3 h-3 animate-spin" style={{ color: m.color }} />}
                  </span>
                </button>
              </div>

              {/* Video config panel — only for video module when active */}
              {m.key === "video" && on && (
                <div className="mt-4 pt-4 border-t border-border space-y-4" dir="rtl">
                  {/* URL */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">קישור YouTube / Vimeo</label>
                    <Input
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="text-sm"
                      dir="ltr"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">כותרת הסקשן (אופציונלי)</label>
                    <Input
                      value={videoTitle}
                      onChange={e => setVideoTitle(e.target.value)}
                      placeholder='למשל: "הכירו אותנו"'
                      className="text-sm"
                    />
                  </div>

                  {/* Style picker */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">סגנון תצוגה</label>
                    <div className="grid grid-cols-3 gap-2">
                      {VIDEO_STYLES.map(s => (
                        <button
                          key={s.key}
                          onClick={() => setVideoStyle(s.key)}
                          className={`rounded-xl border p-3 text-right transition-colors ${videoStyle === s.key ? "border-transparent" : "border-border bg-muted/40"}`}
                          style={videoStyle === s.key ? { background: `${m.color}14`, borderColor: `${m.color}55` } : undefined}
                        >
                          <div className="text-xs font-bold text-foreground">{s.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position picker */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">מיקום בדף</label>
                    <div className="grid grid-cols-2 gap-2">
                      {VIDEO_POSITIONS.map(p => (
                        <button
                          key={p.key}
                          onClick={() => setVideoPos(p.key)}
                          className={`rounded-xl border p-3 text-right transition-colors ${videoPos === p.key ? "border-transparent" : "border-border bg-muted/40"}`}
                          style={videoPos === p.key ? { background: `${m.color}14`, borderColor: `${m.color}55` } : undefined}
                        >
                          <div className="text-xs font-bold text-foreground">{p.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save */}
                  <button
                    onClick={saveVideoConfig}
                    disabled={videoSaving || !videoUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: m.color }}
                  >
                    {videoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    שמור הגדרות וידאו
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Coming soon */}
      <div>
        <div className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground bg-muted px-4 py-1.5 rounded-full mb-3">
          <Sparkles className="w-4 h-4" /> {t("dash.modules.soon_section_label")}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {visibleSoon.map((m) => {
            const Icon = m.icon;
            const isNotified = notified.has(m.title);
            return (
              <div key={m.title} className="rounded-2xl border border-border bg-card/60 p-4 flex flex-col gap-3">
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: `${m.color}14` }}>
                    <Icon className="w-5 h-5" style={{ color: m.color, opacity: 0.85 }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-sm">{m.title}</h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t("dash.modules.soon_badge")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mt-1">{m.desc}</p>
                </div>
                <button
                  onClick={() => !isNotified && handleNotify(m.title)}
                  disabled={isNotified}
                  className={`mt-auto flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors w-full
                    ${isNotified
                      ? "bg-muted text-muted-foreground cursor-default"
                      : "bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                    }`}
                >
                  {isNotified
                    ? <><Check className="w-3 h-3" /> נרשמת</>
                    : <><Bell className="w-3 h-3" /> עדכנו אותי</>
                  }
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t("dash.modules.footer_note")}
      </p>

      {/* Warning dialog for primary module disable */}
      {warnKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setWarnKey(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border shadow-xl max-w-sm w-full p-6 space-y-4"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="font-bold text-base">{t("dash.modules.warning_dialog_title")}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {PRIMARY_WARNING[warnKey]}
              <br /><br />
              {t("dash.modules.warning_confirm_text")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => { doToggle(warnKey); setWarnKey(null); }}
              >
                {t("dash.modules.warning_confirm_button")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setWarnKey(null)}>
                {t("dash.modules.cancel_button")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardModules;
