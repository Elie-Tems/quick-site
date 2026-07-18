import { LayoutDashboard, Package, ShoppingCart, Image, ImagePlus, Settings, Eye, Ticket, Crown, Megaphone, Star, Info, Truck, CreditCard, Palette, ScrollText, Target, ChevronDown, Radar, Lightbulb, Globe, MessageCircle, AtSign, BarChart3, Users, Sparkles, Tag, Type, Heart, Building2, FileText, CalendarClock, Layers, Mail, Blocks, CalendarDays, PenLine } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BusinessType } from "@/lib/businessModules";

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
}

// Sidebar groups (desktop shows these as section headers). Order here = display order.
const NAV_GROUPS = ["סקירה", "ניהול", "תוכן ועיצוב", "שיווק", "הגדרות"] as const;
type NavGroup = (typeof NAV_GROUPS)[number];

// Per-business-type overrides: which nav items to hide, and label/icon overrides.
const TYPE_CONFIG: Record<BusinessType, {
  hiddenItems?: DashboardView[];
  managementGroupLabel?: string;
  extraNavItems?: typeof navItems;
  itemOverrides?: Partial<Record<DashboardView, { label?: string; shortLabel?: string; icon?: React.ComponentType<{ className?: string }> }>>;
}> = {
  products:  { hiddenItems: ['visualization-studio'] },
  services:  {
    hiddenItems: ['visualization-studio'],
    itemOverrides: {
      // NOT "שירותים" - that's the actual bookable-services manager (the "יומן ותורים"
      // nav item). This tab edits the commerce products table (retail add-ons like
      // creams/gift cards), so a merchant clicking "שירותים" here would land on the
      // wrong screen looking for their bookable services.
      products: { label: "מוצרים נלווים", shortLabel: "מוצרים", icon: Package },
    },
  },
  nonprofit: {
    managementGroupLabel: "ניהול תרומות",
    // 'orders' points at the commerce orders table, which nonprofits never write to
    // (donations live in the "verticals" tab instead) → permanently empty, hidden.
    // 'discounts' (sale price / "hot" badge) is a commerce merchandising concept with
    // no equivalent on the donation-project storefront - also hidden.
    hiddenItems: ['orders', 'shipping', 'coupons', 'visualization-studio', 'discounts'],
    itemOverrides: {
      products: { label: "פעילויות ומיזמים", shortLabel: "פעילויות", icon: Heart },
    },
  },
  synagogue: {
    managementGroupLabel: "ניהול בית הכנסת",
    // 'orders' (relabeled "תרומות ועליות") points at the commerce orders table, which
    // synagogues never write to → permanently empty. Their real donations/aliyot live
    // in the "verticals" tab, so hide the dead orders tab. 'discounts' is likewise a
    // commerce-only concept (sale price / "hot" badge) with no synagogue equivalent.
    hiddenItems: ['orders', 'shipping', 'coupons', 'visualization-studio', 'discounts'],
    itemOverrides: {
      products: { label: "פרויקטים / מיזמים", shortLabel: "פרויקטים", icon: Heart },
    },
  },
  realestate: {
    managementGroupLabel: "ניהול לידים",
    hiddenItems: ['shipping', 'coupons', 'verticals'] as DashboardView[],
    itemOverrides: {
      products: { label: "נכסים", shortLabel: "נכסים", icon: Building2 },
      orders: { label: "לידים", shortLabel: "לידים", icon: Users },
    },
  },
  vacation: {
    managementGroupLabel: "ניהול לינה",
    hiddenItems: ['shipping', 'coupons', 'visualization-studio'] as DashboardView[],
    itemOverrides: {
      products: { label: "חדרים ויחידות", shortLabel: "חדרים", icon: Building2 },
      orders: { label: "הזמנות לינה", shortLabel: "הזמנות", icon: ShoppingCart },
      customers: { label: "אורחים", shortLabel: "אורחים", icon: Users },
    },
    extraNavItems: [
      { id: "availability" as DashboardView, label: "יומן זמינות", shortLabel: "זמינות", icon: CalendarDays, group: "ניהול" },
    ],
  },
};

const navItems: {
  id: DashboardView;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  premium?: boolean;
  group: NavGroup;
}[] = [
  // סקירה
  { id: "home", label: "סקירה כללית", shortLabel: "סקירה", icon: LayoutDashboard, group: "סקירה" },

  // ניהול
  { id: "orders", label: "הזמנות", icon: ShoppingCart, group: "ניהול" },
  { id: "products", label: "מוצרים", icon: Package, group: "ניהול" },
  { id: "customers", label: "לקוחות & CRM", shortLabel: "לקוחות", icon: Users, group: "ניהול" },
  // Vertical managers (booking calendar / listings / donation campaigns)
  { id: "verticals", label: "יומן ולידים", icon: CalendarClock, group: "ניהול" },
  { id: "shipping", label: "משלוחים", icon: Truck, group: "ניהול" },

  // תוכן ועיצוב
  { id: "content", label: "תוכן", icon: PenLine, group: "תוכן ועיצוב" },
  { id: "design", label: "עיצוב", icon: Palette, group: "תוכן ועיצוב" },
  { id: "ai-images", label: "תמונות AI", shortLabel: "תמונות AI", icon: ImagePlus, group: "תוכן ועיצוב" },
  { id: "ai-generated-images", label: "גלריית תמונות", shortLabel: "גלריה", icon: Image, group: "תוכן ועיצוב" },
  { id: "visualization-studio", label: "סטודיו הדמיות", shortLabel: "הדמיות", icon: Layers, group: "תוכן ועיצוב" },
  { id: "modules", label: "יכולות ומודולים", shortLabel: "מודולים", icon: Blocks, group: "הגדרות" },

  // שיווק
  { id: "coupons", label: "קופונים", icon: Ticket, group: "שיווק" },
  { id: "campaigns", label: "פרסום באתר", icon: Megaphone, group: "שיווק" },
  { id: "discounts", label: "מבצעים ומובילים", shortLabel: "מבצעים", icon: Tag, group: "שיווק" },
  { id: "lifecycle-emails", label: "מיילים ללקוחות", shortLabel: "מיילים", icon: Mail, group: "שיווק" },
  { id: "whatsapp-button", label: "כפתור וואטסאפ", shortLabel: "וואטסאפ", icon: MessageCircle, group: "שיווק" },

  // הגדרות
  { id: "domains", label: "דומיינים", icon: Globe, group: "הגדרות" },
  { id: "settings", label: "פרטי העסק", shortLabel: "הגדרות", icon: Settings, group: "הגדרות" },
  { id: "legal", label: "מסמכים משפטיים", shortLabel: "משפטי", icon: ScrollText, group: "הגדרות" },
  { id: "subscription", label: "התוכנית שלי", icon: Crown, group: "הגדרות" },
  { id: "payments", label: "סליקה", icon: CreditCard, group: "הגדרות" },
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
}: DashboardNavProps) => {
  const typeConfig = TYPE_CONFIG[businessType] ?? {};
  const hiddenItems = new Set(typeConfig.hiddenItems ?? []);
  const itemOverrides = typeConfig.itemOverrides ?? {};
  const managementGroupLabel = typeConfig.managementGroupLabel;
  const extraNavItems = typeConfig.extraNavItems ?? [];

  // Merge base items with any type-specific extra items (e.g. vacation's availability)
  const allNavItems = [...navItems, ...extraNavItems];

  const itemsToRender = allNavItems
    .map((item) => {
      const override = itemOverrides[item.id] ?? {};
      return {
        ...item,
        label: item.id === "verticals" && verticalsLabel ? verticalsLabel : (override.label ?? item.label),
        shortLabel: override.shortLabel ?? item.shortLabel,
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
    group === "ניהול" && managementGroupLabel ? managementGroupLabel : group;

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
              <span className="text-xs whitespace-nowrap">{item.shortLabel || item.label}</span>
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
            <Eye className="h-3.5 w-3.5" /> צפה באתר
          </button>
          <button
            type="button"
            onClick={() => onViewChange("upgrades")}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/8 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-500/15 transition-colors"
          >
            ✨ תוספות
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
                    <span>{item.label}</span>
                    {item.premium && (
                      <span className="mr-auto px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded">
                        פרימיום
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
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">✨ תוספות שוות</p>
            <p className="text-[10px] text-muted-foreground leading-snug">Google Reviews · דומיין · CRM מלא</p>
            <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 mt-1">גלה עוד ←</p>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;
