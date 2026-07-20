import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Mail, ShieldCheck, Inbox, Smartphone, Users, Check, Loader2, Plus, ArrowLeft, Globe, AtSign,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props { businessId?: string; forceConnected?: boolean; onGoToDomains?: () => void }

const fade = (d = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: d } });
const PRICE = 19; // ₪/mailbox/mo (admin-editable in email_settings)

interface Mailbox { id: string; address: string; display_name: string | null; status: string; }

/**
 * Business email (reseller): sell merchants a professional mailbox on their own
 * domain (info@theirbrand.co.il). Classic, professional UI. Pairs with the domain
 * marketplace - needs an owned domain first. BUILD-ONLY (flag-gated, preview).
 */
const getBenefits = (t: (key: string) => string) => [
  { icon: ShieldCheck, title: t("dash.email.benefit_trust_title"), desc: t("dash.email.benefit_trust_desc") },
  { icon: Inbox, title: t("dash.email.benefit_org_title"), desc: t("dash.email.benefit_org_desc") },
  { icon: Smartphone, title: t("dash.email.benefit_device_title"), desc: t("dash.email.benefit_device_desc") },
  { icon: Users, title: t("dash.email.benefit_grow_title"), desc: t("dash.email.benefit_grow_desc") },
];

const getSteps = (t: (key: string) => string) => [
  { n: "1", t: t("dash.email.step1_title"), d: t("dash.email.step1_desc") },
  { n: "2", t: t("dash.email.step2_title"), d: t("dash.email.step2_desc") },
  { n: "3", t: t("dash.email.step3_title"), d: t("dash.email.step3_desc") },
  { n: "4", t: t("dash.email.step4_title"), d: t("dash.email.step4_desc") },
];

const DashboardEmail = ({ businessId, forceConnected, onGoToDomains }: Props) => {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [localPart, setLocalPart] = useState("info");
  const [domain, setDomain] = useState("");
  const [ordering, setOrdering] = useState(false);

  const { data: domains } = useQuery({
    queryKey: ["email-owned-domains", businessId],
    enabled: !!businessId && !forceConnected,
    queryFn: async () => {
      const { data } = await (supabase as any).from("domains").select("domain").eq("business_id", businessId).eq("status", "active");
      return (data || []).map((d: any) => d.domain) as string[];
    },
  });
  const { data: mailboxesData } = useQuery({
    queryKey: ["email-mailboxes", businessId],
    enabled: !!businessId && !forceConnected,
    queryFn: async () => {
      const { data } = await (supabase as any).from("email_mailboxes").select("id, address, display_name, status").eq("business_id", businessId).order("created_at", { ascending: false });
      return (data || []) as Mailbox[];
    },
  });

  const ownedDomains = forceConnected ? ["mystore.co.il", "mystore.com"] : (domains || []);
  const mailboxes = forceConnected
    ? [{ id: "m1", address: "info@mystore.co.il", display_name: t("dash.email.mock_general_inquiries"), status: "active" }, { id: "m2", address: "orders@mystore.co.il", display_name: t("dash.email.mock_orders_label"), status: "active" }]
    : (mailboxesData || []);
  const activeDomain = domain || ownedDomains[0] || "";

  const order = async () => {
    if (forceConnected) { toast.info(t("dash.email.toast_preview_no_order")); return; }
    if (!localPart.trim() || !activeDomain || !businessId) return;
    setOrdering(true);
    try {
      const address = `${localPart.trim().toLowerCase()}@${activeDomain}`;
      const { error } = await (supabase as any).from("email_mailboxes").insert({ business_id: businessId, domain: activeDomain, address, price_ils: PRICE, status: "pending" });
      if (error) throw error;
      toast.success(t("dash.email.toast_order_success"));
      qc.invalidateQueries({ queryKey: ["email-mailboxes", businessId] });
      setLocalPart("");
    } catch (e) { toast.error(e instanceof Error ? e.message : t("dash.email.toast_error_generic")); } finally { setOrdering(false); }
  };

  const benefits = getBenefits(t);

  return (
    <div className="relative" dir="rtl">
      <div className="container relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-8">
        <motion.div {...fade()} className="flex items-center gap-4 pb-2 border-b border-border">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary"><Mail className="h-6 w-6 text-primary-foreground" /></div>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-foreground">{t("dash.email.page_title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t("dash.email.page_subtitle")}</p>
          </div>
        </motion.div>

        {/* Hero */}
        <motion.div {...fade(0.05)} className="rounded-2xl p-8 md:p-10 bg-foreground text-background relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="relative z-10 max-w-xl">
            <div className="text-xs font-medium tracking-[0.12em] uppercase opacity-60 mb-4">{t("dash.email.hero_label")}</div>
            <h2 className="text-3xl md:text-[38px] font-bold leading-[1.15]">{t("dash.email.hero_title_line1")}<br/>{t("dash.email.hero_title_line2")}</h2>
            <p className="mt-4 text-background/70 leading-relaxed">{t("dash.email.hero_desc")}</p>
          </div>
        </motion.div>

        {/* Order box */}
        {ownedDomains.length === 0 ? (
          <motion.div {...fade(0.1)} className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
            <Globe className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground text-lg mb-1">{t("dash.email.no_domain_title")}</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">{t("dash.email.no_domain_desc")}</p>
            <button onClick={onGoToDomains} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold px-6 py-3 hover:opacity-90 transition-opacity">
              <Globe className="w-4 h-4" /> {t("dash.email.go_to_domains_button")} <ArrowLeft className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div {...fade(0.1)} className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2"><AtSign className="w-5 h-5 text-primary" /> {t("dash.email.create_mailbox_title")}</h3>
            <div className="flex flex-wrap items-stretch gap-2">
              <input value={localPart} onChange={(e) => setLocalPart(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ""))} placeholder="info" dir="ltr" className="flex-1 min-w-[120px] rounded-xl border border-border bg-background px-4 h-12 text-[15px] text-left focus:ring-2 focus:ring-primary/25 focus:border-primary focus:outline-none" />
              <div className="flex items-center px-2 text-muted-foreground font-medium">@</div>
              <select value={activeDomain} onChange={(e) => setDomain(e.target.value)} dir="ltr" className="flex-1 min-w-[160px] rounded-xl border border-border bg-background px-4 h-12 text-[15px] text-left focus:ring-2 focus:ring-primary/25 focus:outline-none">
                {ownedDomains.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={order} disabled={ordering || !localPart.trim()} className="rounded-xl bg-primary text-primary-foreground font-semibold px-6 h-12 inline-flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity">
                {ordering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t("dash.email.create_button_prefix")} · ₪{PRICE}{t("dash.email.create_button_suffix")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{t("dash.email.mailbox_will_be_prefix")} <b className="text-foreground" dir="ltr">{localPart || "info"}@{activeDomain}</b> · {PRICE} {t("dash.email.mailbox_will_be_suffix")}</p>
          </motion.div>
        )}

        {/* Existing mailboxes */}
        {mailboxes.length > 0 && (
          <motion.div {...fade(0.15)} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold text-foreground">{t("dash.email.my_mailboxes_title")}</h3></div>
            <div className="divide-y divide-border">
              {mailboxes.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-primary" /></div>
                    <div className="min-w-0"><div className="text-sm font-medium text-foreground truncate" dir="ltr">{m.address}</div>{m.display_name && <div className="text-xs text-muted-foreground">{m.display_name}</div>}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.status === "active" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"}`}>{m.status === "active" ? t("dash.email.status_active") : t("dash.email.status_pending")}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* What happens after you order - for non-technical merchants */}
        <motion.div {...fade(0.18)} className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground text-lg mb-4">{t("dash.email.steps_title")}</h3>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            {getSteps(t).map((s) => (
              <div key={s.n} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">{s.n}</div>
                <div><div className="font-medium text-foreground text-sm">{s.t}</div><p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.d}</p></div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">💡 {t("dash.email.steps_footer_tip")}</p>
        </motion.div>

        {/* Benefits */}
        <div className="grid sm:grid-cols-2 gap-4">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div key={i} {...fade(0.15 + i * 0.05)} className="rounded-2xl border border-border bg-card p-6 hover:border-foreground/20 transition-colors">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></div>
                  <h3 className="font-semibold text-foreground text-lg">{b.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Pricing note */}
        <motion.div {...fade(0.35)} className="rounded-2xl border border-border bg-muted/30 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3"><Check className="w-5 h-5 text-primary" /><span className="text-sm text-foreground">{t("dash.email.pricing_prefix")} <b>₪{PRICE} {t("dash.email.pricing_bold_suffix")}</b> {t("dash.email.pricing_suffix")}</span></div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardEmail;
