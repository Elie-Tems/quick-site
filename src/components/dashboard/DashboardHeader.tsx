import { useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Sun, Moon, HelpCircle, Store, ChevronDown, Crown, Settings as SettingsIcon, Check, PlusCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, LANGUAGES, type Language } from "@/contexts/LanguageContext";
import { useMyBusinesses } from "@/hooks/useBusiness";
import { getActiveBusinessId, setActiveBusinessId } from "@/lib/activeBusiness";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import logoDarkBg from "@/assets/logo-dark-bg.png";
import logoLightBg from "@/assets/logo-light-bg1.png";
import type { DashboardView } from "@/components/dashboard/DashboardNav";

interface DashboardHeaderProps {
  businessName: string;
  siteUrl?: string;
  merchantLogoUrl?: string;
  onNavigate?: (view: DashboardView) => void;
}

const DashboardHeader = ({ businessName, siteUrl, merchantLogoUrl, onNavigate }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, currentLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const { data: myBusinesses = [] } = useMyBusinesses();
  const activeBusinessId = getActiveBusinessId() || myBusinesses[0]?.id;

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  // Switch the active site. A full reload guarantees every screen re-reads the new
  // business cleanly (no leftover data from the previous site).
  const switchSite = (id: string) => {
    if (id === activeBusinessId) return;
    setActiveBusinessId(id);
    window.location.assign("/dashboard");
  };

  // Use the logo that matches the current theme so it's always visible
  // (the dark-bg logo is invisible on the light dashboard, and vice versa).
  const siangoLogo = theme === "light" ? logoLightBg : logoDarkBg;

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <img src={siangoLogo} alt="Siango" className="h-6 w-auto flex-shrink-0" />
          <div className="h-5 w-px bg-border flex-shrink-0" />
          {/* Click the business name -> personal/account menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 min-w-0 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors focus:outline-none">
              {merchantLogoUrl ? (
                <img src={merchantLogoUrl} alt={businessName} className="h-7 w-7 rounded-full object-cover border border-border flex-shrink-0" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <span className="font-semibold text-foreground truncate max-w-[28vw] sm:max-w-[200px]">{businessName}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {myBusinesses.length > 1 && (
                <>
                  <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">{t("dash.hdr.my_sites")} ({myBusinesses.length})</div>
                  {myBusinesses.map((b) => (
                    <DropdownMenuItem key={b.id} onClick={() => switchSite(b.id)} className="gap-2">
                      <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate flex-1">{b.name}</span>
                      {!b.is_published && <span className="text-[10px] text-muted-foreground">{t("dash.hdr.draft")}</span>}
                      {b.id === activeBusinessId && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate("/onboarding?new=1")} className="gap-2 text-primary focus:text-primary">
                <PlusCircle className="h-4 w-4" /> {t("dash.hdr.new_site")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate?.("settings")} className="gap-2">
                <SettingsIcon className="h-4 w-4" /> {t("dash.hdr.business_details")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.("subscription")} className="gap-2">
                <Crown className="h-4 w-4" /> {t("dash.hdr.my_plan")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 scale-x-[-1]" /> {t("dash.hdr.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* Language switcher - lets a merchant run the whole app in their own
              language (he/en/ar/ru/fr). Selecting a language flips document dir
              (rtl/ltr) app-wide via LanguageContext. */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-9 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none" aria-label="Language / שפה">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">{currentLanguage.flag} {currentLanguage.nativeName}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as Language)}
                  className={`gap-2 cursor-pointer ${language === lang.code ? "text-primary font-medium" : ""}`}
                >
                  <span>{lang.flag}</span>
                  <span className="flex-1">{lang.nativeName}</span>
                  {language === lang.code && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Knowledge center - opens the external help page (like iCount) */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            title={t("dash.hdr.help_center")}
          >
            <a href="/help" target="_blank" rel="noopener noreferrer">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden md:inline">{t("dash.hdr.help_center_short")}</span>
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-1.5 border-border/50 hover:bg-accent hover:text-accent-foreground"
            title={theme === 'light' ? t("dash.hdr.dark_mode") : t("dash.hdr.light_mode")}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="hidden sm:inline">{theme === 'light' ? t("dash.hdr.dark_mode_short") : t("dash.hdr.light_mode_short")}</span>
          </Button>
          {siteUrl && (
            <Button variant="default" size="sm" asChild className="gap-1.5 font-semibold">
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dash.hdr.view_site")}</span>
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 scale-x-[-1]" />
            <span className="hidden sm:inline">{t("dash.hdr.logout")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
