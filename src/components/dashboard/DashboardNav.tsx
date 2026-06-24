import { LayoutDashboard, Package, ShoppingCart, Image, Settings, Eye, Ticket, Tag, Crown, Sparkles, Megaphone, Star, FolderOpen, Info, Truck, CreditCard, Palette, ScrollText, Target, Gauge, ChevronDown, Radar, Lightbulb } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type DashboardView = 'home' | 'products' | 'categories' | 'sales' | 'orders' | 'banners' | 'campaigns' | 'coupons' | 'ai-images' | 'ai-generated-images' | 'subscription' | 'about' | 'design' | 'settings' | 'shipping' | 'payments' | 'legal' | 'preview' | 'ad-budget' | 'usage' | 'traffic' | 'insights';

interface DashboardNavProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  /** האם לאפשר טאב קמפיינים (למשל רק כשיש מוצרים) */
  canUseCampaigns?: boolean;
  /** האם לאפשר טאב קופונים (למשל רק כשיש מוצרים) */
  canUseCoupons?: boolean;
  /** האם לאפשר טאב תמונות AI (למשל בהתאם למנוי) */
  canUseAIImages?: boolean;
}

// Sidebar groups (desktop shows these as section headers). Order here = display order.
const NAV_GROUPS = ["ניהול", "שיווק ותצוגה", "תפעול", "הגדרות"] as const;
type NavGroup = (typeof NAV_GROUPS)[number];

const navItems: {
  id: DashboardView;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  premium?: boolean;
  group: NavGroup;
}[] = [
  // ניהול / יום־יום
  { id: "home", label: "דשבורד", icon: LayoutDashboard, group: "ניהול" },
  { id: "orders", label: "הזמנות", icon: ShoppingCart, group: "ניהול" },
  { id: "products", label: "מוצרים", icon: Package, group: "ניהול" },
  { id: "categories", label: "קטגוריות", icon: FolderOpen, group: "ניהול" },
  { id: "sales", label: "מבצעים ומובילים", shortLabel: "מבצעים", icon: Star, group: "ניהול" },

  // שיווק ותצוגה
  { id: "ad-budget", label: "תקציב פרסום", shortLabel: "פרסום", icon: Target, group: "שיווק ותצוגה" },
  { id: "traffic", label: "מקורות הגעה", shortLabel: "מקורות", icon: Radar, group: "שיווק ותצוגה" },
  { id: "insights", label: "תובנות", icon: Lightbulb, group: "שיווק ותצוגה" },
  { id: "banners", label: "באנרים", icon: Image, group: "שיווק ותצוגה" },
  { id: "campaigns", label: "קמפיינים", icon: Megaphone, group: "שיווק ותצוגה" },
  { id: "coupons", label: "קופונים", icon: Ticket, group: "שיווק ותצוגה" },
  { id: "ai-images", label: "תמונות AI", icon: Sparkles, premium: true, group: "שיווק ותצוגה" },
  { id: "ai-generated-images", label: "גלריית AI", shortLabel: "נוצרו", icon: Image, premium: true, group: "שיווק ותצוגה" },
  { id: "preview", label: "תצוגה מקדימה", shortLabel: "תצוגה", icon: Eye, group: "שיווק ותצוגה" },

  // תפעול
  { id: "shipping", label: "משלוחים", icon: Truck, group: "תפעול" },
  { id: "payments", label: "סליקה", icon: CreditCard, group: "תפעול" },

  // הגדרות
  { id: "settings", label: "הגדרות", icon: Settings, group: "הגדרות" },
  { id: "legal", label: "מסמכים משפטיים", shortLabel: "משפטי", icon: ScrollText, group: "הגדרות" },
  { id: "about", label: "אודות", icon: Info, group: "הגדרות" },
  { id: "usage", label: "שימוש ו-AI", icon: Gauge, group: "הגדרות" },
  { id: "subscription", label: "התוכנית שלי", icon: Crown, group: "הגדרות" },
];

const DashboardNav = ({
  currentView,
  onViewChange,
  canUseCampaigns = true,
  canUseCoupons = true,
  canUseAIImages = true,
}: DashboardNavProps) => {
  const itemsToRender = navItems.filter((item) => {
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
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.shortLabel || item.label}</span>
              {item.premium && (
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
          return (
            <div key={group} className="mb-1">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                <span>{group}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "" : "-rotate-90")} />
              </button>
              {open && groupItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-right relative",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
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
      </div>
    </nav>
  );
};

export default DashboardNav;
