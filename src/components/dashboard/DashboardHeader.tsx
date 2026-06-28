import { useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Sun, Moon, HelpCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import logoDarkBg from "@/assets/logo-dark-bg.png";
import logoLightBg from "@/assets/logo-light-bg1.png";

interface DashboardHeaderProps {
  businessName: string;
  siteUrl?: string;
  merchantLogoUrl?: string;
}

const DashboardHeader = ({ businessName, siteUrl, merchantLogoUrl }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate("/");
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
          {/* Merchant logo (if uploaded) next to the business name */}
          {merchantLogoUrl ? (
            <img
              src={merchantLogoUrl}
              alt={businessName}
              className="h-7 w-7 rounded-full object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          <span className="font-semibold text-foreground truncate max-w-[28vw] sm:max-w-none">{businessName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Knowledge center - opens the external help page (like iCount) */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            title="מרכז ידע ועזרה"
          >
            <a href="/help" target="_blank" rel="noopener noreferrer">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden md:inline">מרכז ידע</span>
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-1.5 border-border/50 hover:bg-accent hover:text-accent-foreground"
            title={theme === 'light' ? 'מעבר למצב כהה' : 'מעבר למצב בהיר'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="hidden sm:inline">{theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}</span>
          </Button>
          {siteUrl && (
            <Button variant="default" size="sm" asChild className="gap-1.5 font-semibold">
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span>צפה באתר</span>
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
            <span className="hidden sm:inline">התנתקות</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
