import { LayoutDashboard, Package, ShoppingCart, Image, ImagePlus, Settings, Eye, Ticket, Crown, Megaphone, Star, Info, Truck, CreditCard, Palette, ScrollText, Target, ChevronDown, Radar, Lightbulb, Globe, MessageCircle, AtSign, BarChart3, Users, Sparkles, Tag, Type, Heart, Building2, FileText, CalendarClock, Layers, Mail, Blocks, CalendarDays, PenLine, LayoutPanelTop } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BusinessType } from "@/lib/businessModules";
import { useLanguage } from "@/contexts/LanguageContext";

export type DashboardView = 'home' | 'products' | 'categories' | 'sales' | 'orders' | 'customers' | 'profitability' | 'banners' | 'campaigns' | 'coupons' | 'ai-images' | 'ai-generated-images' | 'subscription' | 'about' | 'content' | 'design' | 'settings' | 'shipping' | 'payments' | 'legal' | 'preview' | 'ad-budget' | 'usage' | 'traffic' | 'insights' | 'domains' | 'whatsapp' | 'email' | 'upgrades' | 'tracking' | 'reviews' | 'discounts' | 'store-texts' | 'whatsapp-button' | 'verticals' | 'visualization-studio' | 'lifecycle-emails' | 'modules' | 'availability';

interface DashboardNavProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  businessType?: BusinessType;
  /** האם לאפשר טאב קמפיינים (למשל רק כשיש מוצרים) */
  canUseCampaigns?: boolean;
  /** האם לאפשר טאב קופונים (למשל רק כשיש מוצרים) */
  canUseCoupons?: boolean;
  /** האם לאפשר טאב תמונות AI (למשל בהתאם למנוי) */
  canUseAIImages?: boolean;
  /** יומן/לידים/תרומות - רק לעסקים עם מודול ורטיקל */
  showVerticals?: boolean;
  /** התווית המדויקת למודול ("יומן ותורים" / "לידים ונכסים" / "תרומות") */
  verticalsLabel?: string;
  pendingBookingsCount?: number;
  legalNotApproved?: boolean;
}

// Sidebar groups (desktop shows these as section headers). Order here = display
// order. These Hebrew literals are the internal group IDs (TS literal types +
// React state keys) - kept unchanged. Only the rendered label is translated,
// via GROUP_LABEL_KEYS below.
const NAV_GROUPS = ["סקירה", "ניהול", "תוכן ועיצוב", "שיווק", "הגדרות"] as const;
type NavGroup = (typeof NAV_GROUPS)[number];

const GROUP_LABEL_KEYS: Record<NavGroup, string> = {
  "סקירה": "dash.nav.grp.overview",
  "ניהול": "dash.nav.grp.management",
  "תוכן ועיצוב": "dash.nav.grp.content",
  "שיווק": "dash.nav.grp.marketing",
  "הגדרות": "dash.nav.grp.settings",
};

// Per-business-type overrides: which nav items to hide, and label/icon overrides.
// label/shortLabel are i18n keys, resolved with t() at render time.
const TYPE_CONFIG: Record<BusinessType, {
  hiddenItems?: DashboardView[];
  managementGroupLabelKey?: string;
  extraNavItems?: typeof navItems;
  itemOverrides?: Partial<Record<DashboardView, { labelKey?: string; shortLabelKey?: string; icon?: React.ComponentType<{ className?: string }> }>>;
}> = {
  products:  { hiddenItems: ['visualization-studio'] },
  services:  {
    hiddenItems: ['visualization-studio'],
    itemOverrides: {
      // NOT "שירותים" - that's the actual bookable-services manager (the "יומן ותורים"
      // nav item). This tab edits the commerce products table (retail add-ons like
      // creams/gift cards), so a merchant clicking "שירותים" here would land on the
      // wrong screen looking for their bookable services.
      products: { labelKey: "dash.nav.ov.services_products", shortLabelKey: "dash.nav.ov.services_products_short", icon: Package },
    },
  },
  nonprofit: {
    managementGroupLabelKey: "dash.nav.mgmt.nonprofit",
    // 'orders' points at the commerce orders table, which nonprofits never write to
    // (donations live in the "verticals" tab instead) → permanently empty, hidden.
    // 'discounts' (sale price / "hot" badge) is a commerce merchandising concept with
    // no equivalent on the donation-project storefront - also hidden.
    hiddenItems: ['orders', 'shipping', 'coupons', 'visualization-studio', 'discounts'],
    itemOverrides: {
      products: { labelKey: "dash.nav.ov.nonprofit_products", shortLabelKey: "dash.nav.ov.nonprofit_products_short", icon: Heart },
    },
  },
  synagogue: {
    managementGroupLabelKey: "dash.nav.mgmt.synagogue",
    // 'orders' (relabeled "תרומות ועליות") points at the commerce orders table, which
    // synagogues never write to → permanently empty. Their real donations/aliyot live
    // in the "verticals" tab, so hide the dead orders tab. 'discounts' is likewise a
    // commerce-only concept (sale price / "hot" badge) with no synagogue equivalent.
    hiddenItems: ['orders', 'shipping', 'coupons', 'visualization-studio', 'discounts'],
    itemOverrides: {
      products: { labelKey: "dash.nav.ov.synagogue_products", shortLabelKey: "dash.nav.ov.synagogue_products_short", icon: Heart },
    },
  },
  realestate: {
    managementGroupLabelKey: "dash.nav.mgmt.realestate",
    // 'orders' (previously relabeled "לידים"/Leads) points at the commerce orders
    // table, which real-estate leads never write to → permanently empty, hidden.
    // Real leads already work correctly under the "customers" (CRM) tab via
    // contacts-capture -> pipeline_cards.
    hiddenItems: ['orders', 'shipping', 'coupons', 'verticals'] as DashboardView[],
    itemOverrides: {
      products: { labelKey: "dash.nav.ov.realestate_products", shortLabelKey: "dash.nav.ov.realestate_products_short", icon: Building2 },
    },
  },
  vacation: {
    managementGroupLabelKey: "dash.nav.mgmt.vacation",
    hiddenItems: ['shipping', 'coupons', 'visualization-studio'] as DashboardView[],
    itemOverrides: {
      products: { labelKey: "dash.nav.ov.vacation_products", shortLabelKey: "dash.nav.ov.vacation_products_short", icon: Building2 },
      orders: { labelKey: "dash.nav.ov.vacation_orders", shortLabelKey: "dash.nav.ov.vacation_orders_short", icon: ShoppingCart },
      customers: { labelKey: "dash.nav.ov.vacation_customers", shortLabelKey: "dash.nav.ov.vacation_customers_short", icon: Users },
    },
    extraNavItems: [
      { id: "availability" as DashboardView, labelKey: "dash.nav.availability", shortLabelKey: "dash.nav.availability_short", icon: CalendarDays, group: "ניהול" },
    ],
  },
};

// label/shortLabel are i18n keys, resolved with t() at render time (in itemsToRender).
const navItems: {
  id: DashboardView;
  labelKey: string;
  shortLabelKey?: string;
  icon: React.ComponentType<{ className?: string }>;
  premium?: boolean;
  group: NavGroup;
}[] = [
  // סקירה
  { id: "home", labelKey: "dash.nav.home", shortLabelKey: "dash.nav.home_short", icon: LayoutDashboard, group: "סקירה" },

  // ניהול
  { id: "orders", labelKey: "dash.nav.orders", icon: ShoppingCart, group: "ניהול" },
  { id: "products", labelKey: "dash.nav.products", icon: Package, group: "ניהול" },
  { id: "customers", labelKey: "dash.nav.customers", shortLabelKey: "dash.nav.customers_short", icon: Users, group: "ניהול" },
  // Vertical managers (booking calendar / listings / donation campaigns)
  { id: "verticals", labelKey: "dash.nav.verticals", icon: CalendarClock, group: "ניהול" },
  { id: "shipping", labelKey: "dash.nav.shipping", icon: Truck, group: "ניהול" },

  // תוכן ועיצוב
  { id: "content", labelKey: "dash.nav.content", icon: PenLine, group: "תוכן ועיצוב" },
  { id: "design", labelKey: "dash.nav.design", icon: Palette, group: "תוכן ועיצוב" },
  { id: "ai-images", labelKey: "dash.nav.ai_images", shortLabelKey: "dash.nav.ai_images_short", icon: ImagePlus, group: "תוכן ועיצוב" },
  { id: "ai-generated-images", labelKey: "dash.nav.ai_gallery", shortLabelKey: "dash.nav.ai_gallery_short", icon: Image, group: "תוכן ועיצוב" },
  { id: "visualization-studio", labelKey: "dash.nav.viz_studio", shortLabelKey: "dash.nav.viz_studio_short", icon: Layers, group: "תוכן ועיצוב" },
  { id: "modules", labelKey: "dash.nav.modules", shortLabelKey: "dash.nav.modules_short", icon: Blocks, group: "הגדרות" },

  // שיווק
  { id: "banners", labelKey: "dash.nav.banners", shortLabelKey: "dash.nav.banners_short", icon: LayoutPanelTop, group: "שיווק" },
  { id: "coupons", labelKey: "dash.nav.coupons", icon: Ticket, group: "שיווק" },
  { id: "campaigns", labelKey: "dash.nav.campaigns", icon: Megaphone, group: "שיווק" },
  { id: "discounts", labelKey: "dash.nav.discounts", shortLabelKey: "dash.nav.discounts_short", icon: Tag, group: "שיווק" },
  { id: "lifecycle-emails", labelKey: "dash.nav.lifecycle_emails", shortLabelKey: "dash.nav.lifecycle_emails_short", icon: Mail, group: "שיווק" },
  { id: "whatsapp-button", labelKey: "dash.nav.whatsapp_button", shortLabelKey: "dash.nav.whatsapp_button_short", icon: MessageCircle, group: "שיווק" },

  // הגדרות
  { id: "domains", labelKey: "dash.nav.domains", icon: Globe, group: "הגדרות" },
  { id: "settings", labelKey: "dash.nav.settings", shortLabelKey: "dash.nav.settings_short", icon: Settings, group: "הגדרות" },
  { id: "legal", labelKey: "dash.nav.legal", shortLabelKey: "dash.nav.legal_short", icon: ScrollText, group: "הגדרות" },
  { id: "subscription", labelKey: "dash.nav.subscription", icon: Crown, group: "הגדרות" },
  { id: "payments", labelKey: "dash.nav.payments", icon: CreditCard, group: "הגדרות" },
];

const DashboardNav = ({
  currentView,
  onViewChange,
  businessType = "products",
  canUseCampaigns = true,
  canUseCoupons = true,
  canUseAIImages = true,
  showVerticals = false,
  verticalsLabel,
  pendingBookingsCount = 0,
  legalNotApproved = false,
}: DashboardNavProps) => {
  const { t } = useLanguage();
  const typeConfig = TYPE_CONFIG[businessType] ?? {};
  const hiddenItems = new Set(typeConfig.hiddenItems ?? []);
  const itemOverrides = typeConfig.itemOverrides ?? {};
  const managementGroupLabel = typeConfig.managementGroupLabelKey ? t(typeConfig.managementGroupLabelKey) : undefined;
  const extraNavItems = typeConfig.extraNavItems ?? [];

  // Merge base items with any type-specific extra items (e.g. vacation's availability)
  const allNavItems = [...navItems, ...extraNavItems];

  const itemsToRender = allNavItems
    .map((item) => {
      const override = itemOverrides[item.id] ?? {};
      const labelKey = override.labelKey ?? item.labelKey;
      const shortLabelKey = override.shortLabelKey ?? item.shortLabelKey;
      return {
        ...item,
        label: item.id === "verticals" && verticalsLabel ? verticalsLabel : t(labelKey),
        shortLabel: shortLabelKey ? t(shortLabelKey) : undefined,
        icon: override.icon ?? item.icon,
      };
    })
    .filter((item) => {
      if (hiddenItems.has(item.id)) return false;
      if (item.id === "verticals" && !showVerticals) return false;
      if (item.id === "campaigns" && !canUseCampaigns) return false;
      if (item.id === "coupons" && !canUseCoupons) return false;
      if (item.id === "ai-images" && !canUseAIImages) return false;
      return true;
    });

  const activeGroup = allNavItems.find((i) => i.id === currentView)?.group;
  // Open the active group, and always open "ניהול" for vertical/management-heavy businesses.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g, g === activeGroup || g === "ניהול"])),
  );
  const toggleGroup = (g: NavGroup) => setOpenGroups((s) => ({ ...s, [g]: !s[g] }));

  // Resolve the display label for a group (may be overridden for certain business types)
  const groupLabel = (group: NavGroup) =>
    group === "ניהול" && managementGroupLabel ? managementGroupLabel : t(GROUP_LABEL_KEYS[group]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border md:sticky md:top-14 md:border-t-0 md:border-l md:w-56 md:h-[calc(100vh-3.5rem)] md:overflow-y-auto">
      {/* Mobile: Bottom tabs */}
      <div className="flex items-center justify-around py-2 md:hidden overflow-x-auto">
        {itemsToRender.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors relative shrink-0",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.id === "verticals" && pendingBookingsCount > 0 ? (
                <span className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <span>{item.shortLabel || item.label}</span>
                  <span className="flex-shrink-0 min-w-[16px] h-[16px] rounded-full bg-rose-500 text-white text-[9px] font-semibold flex items-center justify-center px-1 leading-none">
                    {pendingBookingsCount > 9 ? "9+" : pendingBookingsCount}
                  </span>
                </span>
              ) : (
                <span className="text-xs whitespace-nowrap">{item.shortLabel || item.label}</span>
              )}
              {item.id === "legal" && legalNotApproved && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-500 rounded-full" />
              )}
              {item.premium && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden md:flex md:flex-col p-3 gap-1">
        {/* Quick-action row: preview site + upgrades */}
        <div className="flex gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => onViewChange("preview")}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Eye className="h-3.5 w-3.5" /> {t("dash.nav.view_site")}
          </button>
          <button
            type="button"
            onClick={() => onViewChange("upgrades")}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/8 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-500/15 transition-colors"
          >
            {t("dash.nav.addons_btn")}
          </button>
        </div>

        {NAV_GROUPS.map((group) => {
          const groupItems = itemsToRender.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;
          const open = openGroups[group];
          // Single-item group: clicking the header navigates directly, no accordion
          const singleItemId = groupItems.length === 1 ? groupItems[0].id : null;
          const displayGroupLabel = groupLabel(group);
          return (
            <div key={group} className="mb-1">
              <button
                onClick={() => singleItemId ? onViewChange(singleItemId) : toggleGroup(group)}
                className="w-full flex items-center justify-between px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider transition-colors text-muted-foreground/70 hover:text-foreground"
              >
                <span>{displayGroupLabel}</span>
                {!singleItemId && <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "" : "-rotate-90")} />}
              </button>
              {open && groupItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-right relative",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isActive ? "bg-primary/15" : "bg-muted"
                    )}>
                      <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    {item.id === "verticals" && pendingBookingsCount > 0 ? (
                      <span className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center px-1 leading-none">
                          {pendingBookingsCount > 9 ? "9+" : pendingBookingsCount}
                        </span>
                      </span>
                    ) : (
                      <span className="truncate">{item.label}</span>
                    )}
                    {item.id === "legal" && legalNotApproved && (
                      <span className="mr-auto w-2 h-2 bg-amber-500 rounded-full shrink-0" />
                    )}
                    {item.premium && (
                      <span className="mr-auto px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded">
                        {t("dash.nav.premium")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* Bottom upsell card */}
        <div className="mt-auto pt-3 px-2">
          <button
            type="button"
            onClick={() => onViewChange("upgrades")}
            className="w-full rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/10 to-violet-500/5 p-3 text-right hover:from-violet-500/15 transition-all"
          >
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">{t("dash.nav.upsell_title")}</p>
            <p className="text-[10px] text-muted-foreground leading-snug">{t("dash.nav.upsell_body")}</p>
            <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mt-1">{t("dash.nav.upsell_cta")}</p>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;
