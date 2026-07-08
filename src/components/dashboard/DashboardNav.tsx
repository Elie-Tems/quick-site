import { LayoutDashboard, Package, ShoppingCart, Image, ImagePlus, Settings, Eye, Ticket, Crown, Megaphone, Star, Info, Truck, CreditCard, Palette, ScrollText, Target, ChevronDown, Radar, Lightbulb, Globe, MessageCircle, AtSign, BarChart3, Users, Sparkles, Tag, Type, Heart, Building2, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { whatsappEnabled, emailEnabled } from "@/lib/featureFlags";
import type { BusinessType } from "@/lib/businessModules";

export type DashboardView = 'home' | 'products' | 'categories' | 'sales' | 'orders' | 'customers' | 'profitability' | 'banners' | 'campaigns' | 'coupons' | 'ai-images' | 'ai-generated-images' | 'subscription' | 'about' | 'content' | 'design' | 'settings' | 'shipping' | 'payments' | 'legal' | 'preview' | 'ad-budget' | 'usage' | 'traffic' | 'insights' | 'domains' | 'whatsapp' | 'email' | 'upgrades' | 'tracking' | 'reviews' | 'discounts' | 'store-texts' | 'whatsapp-button';

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
}

// Sidebar groups (desktop shows these as section headers). Order here = display order.
// Redesigned IA: 6 focused groups instead of the old sprawling list.
const NAV_GROUPS = ["בית", "חנות פיצ'רים", "תוכן", "עריכה ועיצוב", "ניהול מכירות", "שיווק", "הגדרות"] as const;
type NavGroup = (typeof NAV_GROUPS)[number];

// Per-business-type overrides: which nav items to hide, and label/icon overrides.
const TYPE_CONFIG: Record<BusinessType, {
  hiddenItems?: DashboardView[];
  managementGroupLabel?: string;
  itemOverrides?: Partial<Record<DashboardView, { label?: string; shortLabel?: string; icon?: React.ComponentType<{ className?: string }> }>>;
}> = {
  products: {},
  services: {},
  nonprofit: {
    managementGroupLabel: "ניהול תרומות",
    hiddenItems: ['shipping', 'coupons'],
    itemOverrides: {
      products: { label: "פרויקטים / מיזמים", shortLabel: "פרויקטים", icon: Heart },
      orders: { label: "תרומות", shortLabel: "תרומות", icon: Heart },
    },
  },
  realestate: {
    managementGroupLabel: "ניהול לידים",
    hiddenItems: ['shipping', 'coupons'],
    itemOverrides: {
      products: { label: "נכסים", shortLabel: "נכסים", icon: Building2 },
      orders: { label: "לידים", shortLabel: "לידים", icon: Users },
    },
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
  // בית
  { id: "home", label: "סקירה", icon: LayoutDashboard, group: "בית" },

  // תוכן - עריכת כותרת ראשית + אודות
  { id: "content", label: "תוכן", icon: FileText, group: "תוכן" },

  // עריכה ועיצוב - כל מה שבונה את תוכן ומראה החנות
  // (קטגוריות + מבצעים הם עכשיו טאבים בתוך "מוצרים")
  { id: "products", label: "מוצרים", icon: Package, group: "עריכה ועיצוב" },
  { id: "design", label: "עיצוב", icon: Palette, group: "עריכה ועיצוב" },
  { id: "store-texts", label: "טקסטים", icon: Type, group: "עריכה ועיצוב" },
  { id: "ai-generated-images", label: "גלריית תמונות", shortLabel: "גלריה", icon: Image, group: "עריכה ועיצוב" },
  { id: "preview", label: "תצוגה מקדימה", shortLabel: "תצוגה", icon: Eye, group: "עריכה ועיצוב" },

  // ניהול מכירות
  { id: "orders", label: "הזמנות", icon: ShoppingCart, group: "ניהול מכירות" },
  { id: "coupons", label: "קופונים", icon: Ticket, group: "ניהול מכירות" },
  { id: "shipping", label: "משלוחים", icon: Truck, group: "ניהול מכירות" },
  { id: "payments", label: "סליקה", icon: CreditCard, group: "ניהול מכירות" },

  // חנות פיצ'רים - כניסה לחנות בלבד; הפירוט נמצא בתוך החנות עצמה
  { id: "upgrades", label: "כל הפיצ'רים", shortLabel: "פיצ'רים", icon: Sparkles, group: "חנות פיצ'רים" },

  // שיווק
  { id: "campaigns", label: "פרסום באתר", icon: Megaphone, group: "שיווק" },
  { id: "discounts", label: "מבצעים ומובילים", icon: Tag, group: "שיווק" },
  { id: "whatsapp-button", label: "כפתור וואטסאפ", shortLabel: "וואטסאפ", icon: MessageCircle, group: "שיווק" },

  // הגדרות
  { id: "settings", label: "פרטי העסק", shortLabel: "הגדרות", icon: Settings, group: "הגדרות" },
  { id: "subscription", label: "התוכנית שלי", icon: Crown, group: "הגדרות" },
  { id: "legal", label: "מסמכים משפטיים", shortLabel: "משפטי", icon: ScrollText, group: "הגדרות" },
];

const DashboardNav = ({
  currentView,
  onViewChange,
  businessType = "products",
  canUseCampaigns = true,
  canUseCoupons = true,
  canUseAIImages = true,
}: DashboardNavProps) => {
  const typeConfig = TYPE_CONFIG[businessType] ?? {};
  const hiddenItems = new Set(typeConfig.hiddenItems ?? []);
  const itemOverrides = typeConfig.itemOverrides ?? {};
  const managementGroupLabel = typeConfig.managementGroupLabel;

  // WhatsApp + Email are built but not live yet: show them as "בקרוב" (clearly
  // upcoming) instead of hiding them, so they read as a roadmap, not as missing.
  const itemsToRender = navItems
    .map((item) => {
      const override = itemOverrides[item.id] ?? {};
      return {
        ...item,
        label: override.label ?? item.label,
        shortLabel: override.shortLabel ?? item.shortLabel,
        icon: override.icon ?? item.icon,
        comingSoon:
          (item.id === "whatsapp" && !whatsappEnabled()) ||
          (item.id === "email" && !emailEnabled()),
      };
    })
    .filter((item) => {
      if (hiddenItems.has(item.id)) return false;
      if (item.id === "campaigns" && !canUseCampaigns) return false;
      if (item.id === "coupons" && !canUseCoupons) return false;
      if (item.id === "ai-images" && !canUseAIImages) return false;
      return true;
    });

  const activeGroup = navItems.find((i) => i.id === currentView)?.group;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((g) => [g, g === activeGroup])),
  );
  const toggleGroup = (g: NavGroup) => setOpenGroups((s) => ({ ...s, [g]: !s[g] }));

  // Resolve the display label for a group (may be overridden for certain business types)
  const groupLabel = (group: NavGroup) =>
    group === "ניהול מכירות" && managementGroupLabel ? managementGroupLabel : group;

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
              onClick={() => !item.comingSoon && onViewChange(item.id)}
              disabled={item.comingSoon}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors relative shrink-0",
                item.comingSoon
                  ? "text-muted-foreground/50"
                  : isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs whitespace-nowrap">{item.shortLabel || item.label}</span>
              {item.comingSoon && (
                <span className="absolute -top-1 -right-1 px-1 py-px text-[8px] font-bold bg-muted text-muted-foreground rounded">בקרוב</span>
              )}
              {item.premium && !item.comingSoon && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden md:flex md:flex-col p-3 gap-1">
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
                className={cn(
                  "w-full flex items-center justify-between px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider transition-colors",
                  group === "חנות פיצ'רים"
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground/70 hover:text-foreground"
                )}
              >
                <span className={group === "חנות פיצ'רים" ? "font-bold text-[12px]" : ""}>{displayGroupLabel}</span>
                {!singleItemId && <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "" : "-rotate-90")} />}
              </button>
              {open && groupItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                if (item.comingSoon) {
                  return (
                    <div
                      key={item.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-default select-none"
                      title="המודול הזה יהיה זמין בקרוב"
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                      <span className="mr-auto px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground rounded">בקרוב</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-right relative",
                      item.id === "upgrades"
                        ? isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary hover:bg-primary/20 font-semibold"
                        : isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                    {item.premium && item.id !== "upgrades" && (
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
      </div>
    </nav>
  );
};

export default DashboardNav;
