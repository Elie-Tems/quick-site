import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Star, Globe, Wand2, MessageCircle, Mail, Tag, Target, Clock, Crown,
  Check, Eye, ShoppingCart, ArrowLeft, Sparkles,
} from "lucide-react";
import type { DashboardView } from "@/components/dashboard/DashboardNav";
import { whatsappEnabled, emailEnabled } from "@/lib/featureFlags";
import { useCrmEntitled } from "@/hooks/useCrmEntitled";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import UpgradeCheckoutModal, { type CheckoutItem } from "./upgrades/UpgradeCheckoutModal";

/**
 * "תוספות וכלים" - direction ו (vivid vitrine). Add-ons are grouped under plain
 * business goals ("למכור יותר" / "להכיר לקוחות"...), each a colored band with a
 * rich row + a live preview of the feature. Recurring add-ons drop into a sticky
 * cart with a running monthly total; "המשך לתשלום" opens the real Cardcom
 * checkout. Every card also has a secondary "צפייה בדמו" link - the primary
 * button always goes to purchase, never to a demo dead-end.
 */

interface Props {
  onNavigate: (v: DashboardView) => void;
  business?: { id?: string; reviews_paid?: boolean; tracking_paid?: boolean } | null;
}

type Goal = "sell" | "know" | "pro" | "time";
type TFunc = (key: string) => string;

const buildGoals = (t: TFunc): Record<Goal, { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; color2: string }> => ({
  sell: { label: t("dash.upgrades.goal_sell"), icon: Target, color: "#e8820e", color2: "#f4a12e" },
  know: { label: t("dash.upgrades.goal_know"), icon: Users, color: "#0b9e77", color2: "#16c294" },
  pro:  { label: t("dash.upgrades.goal_pro"), icon: Crown, color: "#6d4bd0", color2: "#8a63f0" },
  time: { label: t("dash.upgrades.goal_time"), icon: Clock, color: "#1785c2", color2: "#33a6e0" },
});

type Product = {
  view: DashboardView;       // dedicated screen / demo target
  addon?: string;            // addon-subscribe key (recurring, cart-able)
  navigateLabel?: string;    // for non-cart products (domain / AI): primary CTA label
  title: string;
  desc: string;
  netIls?: number;           // pre-VAT monthly (recurring add-ons)
  priceLabel: string;
  goal: Goal;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  preview: "stars" | "bars" | "domain" | "gallery" | "chat" | "mail" | "tag";
  show: boolean;
  comingSoon?: boolean;
};

const buildProducts = (t: TFunc): Product[] => {
  const perMonth = t("dash.upgrades.price_per_month");
  const vatSuffix = t("dash.upgrades.price_vat_suffix");
  return [
    {
      view: "reviews", addon: "reviews", title: t("dash.upgrades.reviews_title"), netIls: 14, priceLabel: `₪14${perMonth}${vatSuffix}`,
      desc: t("dash.upgrades.reviews_desc"),
      goal: "sell", icon: Star, preview: "stars", show: true,
    },
    {
      view: "tracking", title: t("dash.upgrades.tracking_title"), priceLabel: `${t("dash.upgrades.price_onetime_prefix")}₪149${vatSuffix}`,
      desc: t("dash.upgrades.tracking_desc"),
      goal: "sell", icon: Tag, preview: "tag", show: true,
    },
    {
      view: "customers", addon: "crm", title: t("dash.upgrades.crm_title"), netIls: 49, priceLabel: `₪49${perMonth}${vatSuffix}`,
      desc: t("dash.upgrades.crm_desc"),
      goal: "know", icon: Users, preview: "bars", show: true,
    },
    {
      view: "domains", navigateLabel: t("dash.upgrades.domain_navigate_label"), title: t("dash.upgrades.domain_title"), priceLabel: `${t("dash.upgrades.price_from_prefix")}₪50${t("dash.upgrades.price_per_year")}${vatSuffix}`,
      desc: t("dash.upgrades.domain_desc"),
      goal: "pro", icon: Globe, preview: "domain", show: true,
    },
    {
      view: "ai-generated-images", navigateLabel: t("dash.upgrades.ai_images_navigate_label"), title: t("dash.upgrades.ai_images_title"), priceLabel: t("dash.upgrades.price_by_package"),
      desc: t("dash.upgrades.ai_images_desc"),
      goal: "pro", icon: Wand2, preview: "gallery", show: true,
    },
    {
      view: "whatsapp", addon: "whatsapp", title: t("dash.upgrades.whatsapp_title"), netIls: 89, priceLabel: `₪89${perMonth}${vatSuffix}`,
      desc: t("dash.upgrades.whatsapp_desc"),
      goal: "time", icon: MessageCircle, preview: "chat", show: true, comingSoon: !whatsappEnabled(),
    },
    {
      view: "email", addon: "email", title: t("dash.upgrades.email_title"), netIls: 19, priceLabel: `₪19${perMonth}${vatSuffix}`,
      desc: t("dash.upgrades.email_desc"),
      goal: "time", icon: Mail, preview: "mail", show: true, comingSoon: !emailEnabled(),
    },
  ];
};

const fade = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: d } });
const vatGross = (net: number) => Math.round(net * 1.18);

/* --- tiny live previews of each feature --- */
const Preview = ({ kind, color, reviewsWord }: { kind: Product["preview"]; color: string; reviewsWord: string }) => {
  const box = "h-24 rounded-xl border border-border flex items-center justify-center overflow-hidden bg-card";
  if (kind === "stars")
    return (
      <div className={box}>
        <div className="text-center">
          <div className="flex gap-0.5 justify-center">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-4 h-4" style={{ color, fill: color }} />)}</div>
          <div className="text-xs font-bold mt-1" style={{ color }}>4.9 · 213 {reviewsWord}</div>
        </div>
      </div>
    );
  if (kind === "bars")
    return (
      <div className={box}>
        <div className="flex items-end gap-1.5 h-14">
          {[24, 40, 32, 52, 44, 60].map((h, i) => <span key={i} className="w-2.5 rounded-t" style={{ height: h, background: i % 2 ? color : `${color}99` }} />)}
        </div>
      </div>
    );
  if (kind === "domain")
    return (
      <div className={box}>
        <div className="text-center">
          <Globe className="w-6 h-6 mx-auto" style={{ color }} />
          <div className="text-xs font-bold mt-1 font-mono" dir="ltr">your-brand.co.il</div>
        </div>
      </div>
    );
  if (kind === "gallery")
    return (
      <div className={box}>
        <div className="grid grid-cols-4 gap-1 p-2 w-full h-full">
          {Array.from({ length: 8 }).map((_, i) => <span key={i} className="rounded" style={{ background: i % 3 === 0 ? color : `${color}33` }} />)}
        </div>
      </div>
    );
  const Icon = (kind === "chat" ? MessageCircle : kind === "mail" ? Mail : Tag) as React.FC<{ className?: string; style?: React.CSSProperties }>;
  return <div className={box}><Icon className="w-8 h-8" style={{ color, opacity: 0.5 }} /></div>;
};

const DashboardUpgrades = ({ onNavigate, business }: Props) => {
  const { t } = useLanguage();
  const { entitled: crmEntitled } = useCrmEntitled();
  const [cart, setCart] = useState<string[]>([]);
  const [checkout, setCheckout] = useState(false);
  const GOALS = buildGoals(t);
  const PRODUCTS = buildProducts(t);

  // Google Reviews can only deliver if Siango's Google Places key is configured
  // server-side. If it isn't, we must NOT sell it - show it as "בקרוב" everywhere
  // until the key exists (then it opens automatically). Defaults to configured so
  // a transient probe error never hides an add-on that actually works.
  const { data: reviewsConfigured = true } = useQuery({
    queryKey: ["reviews-configured"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("google-reviews", { body: { action: "status" } });
      return data?.configured !== false;
    },
  });

  // Resolve each product's live availability (reviews depends on the key probe).
  const products: Product[] = PRODUCTS.map((p) =>
    p.view === "reviews" ? { ...p, comingSoon: !reviewsConfigured } : p,
  );

  const isActive = (p: Product) =>
    (p.addon === "crm" && crmEntitled) ||
    (p.addon === "reviews" && !!business?.reviews_paid) ||
    (p.view === "tracking" && !!business?.tracking_paid);

  const inCart = (addon?: string) => !!addon && cart.includes(addon);
  const toggleCart = (addon?: string) => {
    if (!addon) return;
    setCart((c) => (c.includes(addon) ? c.filter((a) => a !== addon) : [...c, addon]));
  };

  const cartItems: CheckoutItem[] = cart
    .map((addon) => products.find((p) => p.addon === addon))
    .filter((p): p is Product => !!p && !!p.netIls)
    .map((p) => ({ addon: p.addon!, title: p.title, netIls: p.netIls!, color: GOALS[p.goal].color }));
  const cartNet = cartItems.reduce((s, i) => s + i.netIls, 0);

  const goalsInOrder: Goal[] = ["sell", "know", "pro", "time"];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28" dir="rtl">
      {/* hero */}
      <motion.div {...fade()} className="rounded-2xl p-7 text-white relative overflow-hidden mb-6" style={{ background: "linear-gradient(120deg,#0b9e77,#1785c2,#6d4bd0)" }}>
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{t("dash.upgrades.hero_title")}</h1>
            <p className="text-white/80 text-sm mt-0.5">{t("dash.upgrades.hero_subtitle")}</p>
          </div>
        </div>
      </motion.div>

      {/* goal bands */}
      <div className="space-y-6">
        {goalsInOrder.map((goal) => {
          const g = GOALS[goal];
          // Live tools in each goal band; everything "בקרוב" is collected into one
          // section at the very bottom instead of scattered inside the bands.
          const prods = products.filter((p) => p.goal === goal && p.show && !p.comingSoon);
          if (prods.length === 0) return null;
          const GIcon = g.icon;
          return (
            <section key={goal}>
              <div className="inline-flex items-center gap-2 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-3" style={{ background: `linear-gradient(100deg,${g.color},${g.color2})` }}>
                <GIcon className="w-4 h-4" /> {g.label}
              </div>
              <div className="space-y-3">
                {prods.map((p, i) => {
                  const active = isActive(p);
                  const Icon = p.icon;
                  return (
                    <motion.div key={p.view} {...fade(0.04 * i)} className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="grid md:grid-cols-2 gap-4 p-4 items-center" style={{ background: `linear-gradient(110deg,${g.color}0d,transparent)` }}>
                        {/* text side */}
                        <div className={i % 2 ? "md:order-2" : ""}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${g.color}1a` }}>
                              <Icon className="w-5 h-5" style={{ color: g.color }} />
                            </span>
                            <h3 className="font-bold text-foreground">{p.title}</h3>
                            {active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">{t("dash.upgrades.badge_active")}</span>}
                            {p.comingSoon && !active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t("dash.upgrades.coming_soon")}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{p.desc}</p>
                          <div className="text-sm font-bold mb-3" style={{ color: g.color }}>{p.priceLabel}</div>

                          {/* actions */}
                          {active ? (
                            <button onClick={() => onNavigate(p.view)} className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: g.color }}>
                              {t("dash.upgrades.manage_btn")} <ArrowLeft className="w-4 h-4" />
                            </button>
                          ) : p.comingSoon ? (
                            <button disabled className="rounded-xl px-5 py-2 text-sm font-semibold bg-muted text-muted-foreground cursor-not-allowed">{t("dash.upgrades.coming_soon")}</button>
                          ) : (
                            <div className="flex items-center gap-3 flex-wrap">
                              {p.addon ? (
                                <button
                                  onClick={() => toggleCart(p.addon)}
                                  className="rounded-xl px-5 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                                  style={{ background: inCart(p.addon) ? "#059669" : `linear-gradient(100deg,${g.color},${g.color2})` }}
                                >
                                  {inCart(p.addon) ? <><Check className="w-4 h-4" /> {t("dash.upgrades.in_cart")}</> : <><ShoppingCart className="w-4 h-4" /> {t("dash.upgrades.add_to_cart")}</>}
                                </button>
                              ) : (
                                <button
                                  onClick={() => onNavigate(p.view)}
                                  className="rounded-xl px-5 py-2 text-sm font-semibold text-white inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                                  style={{ background: `linear-gradient(100deg,${g.color},${g.color2})` }}
                                >
                                  {p.navigateLabel || t("dash.upgrades.continue_default")} <ArrowLeft className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => onNavigate(p.view)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                                <Eye className="w-4 h-4" /> {t("dash.upgrades.view_demo")}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* preview side */}
                        <div className={i % 2 ? "md:order-1" : ""}>
                          <Preview kind={p.preview} color={g.color} reviewsWord={t("dash.upgrades.preview_reviews_word")} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* "בקרוב" - all upcoming tools collected at the bottom */}
        {(() => {
          const soon = products.filter((p) => p.show && p.comingSoon);
          if (soon.length === 0) return null;
          return (
            <section>
              <div className="inline-flex items-center gap-2 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-3" style={{ background: "linear-gradient(100deg,#64748b,#94a3b8)" }}>
                <Clock className="w-4 h-4" /> {t("dash.upgrades.coming_soon")}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {soon.map((p) => {
                  const Icon = p.icon;
                  const g = GOALS[p.goal];
                  return (
                    <div key={p.view} className="rounded-2xl border border-border bg-card overflow-hidden relative">
                      <div className="h-1.5 w-full" style={{ background: `linear-gradient(100deg,${g.color},${g.color2})` }} />
                      <div className="p-4 flex items-center gap-3" style={{ background: `linear-gradient(110deg,${g.color}0d,transparent)` }}>
                        <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${g.color}1a` }}>
                          <Icon className="w-5 h-5" style={{ color: g.color }} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-foreground">{p.title}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: `linear-gradient(100deg,${g.color},${g.color2})` }}>{t("dash.upgrades.coming_soon")}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{p.desc}</p>
                          <div className="text-xs font-bold mt-1" style={{ color: g.color }}>{p.priceLabel}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}
      </div>

      {/* sticky cart bar */}
      {cartItems.length > 0 && (
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed bottom-16 md:bottom-4 inset-x-0 z-30 px-4">
          <div className="max-w-4xl mx-auto rounded-2xl shadow-xl text-white flex items-center gap-3 px-5 py-3" style={{ background: "linear-gradient(100deg,#0b9e77,#6d4bd0)" }}>
            <ShoppingCart className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold leading-tight">₪{vatGross(cartNet)} <span className="text-xs font-normal opacity-85">{t("dash.upgrades.cart_bar_price_suffix")}</span></div>
              <div className="text-xs opacity-85">{cartItems.length} {t("dash.upgrades.cart_bar_note")}</div>
            </div>
            <button onClick={() => setCheckout(true)} className="mr-auto bg-white text-foreground font-bold text-sm px-5 py-2 rounded-xl hover:opacity-90 whitespace-nowrap">
              {t("dash.upgrades.checkout_btn")}
            </button>
          </div>
        </motion.div>
      )}

      <UpgradeCheckoutModal open={checkout} onClose={() => setCheckout(false)} items={cartItems} businessId={business?.id} />
    </div>
  );
};

export default DashboardUpgrades;
