import { useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import logoDarkBg from "@/assets/logo-dark-bg.png";

interface DashboardHeaderProps {
  businessName: string;
  siteUrl?: string;
}

const DashboardHeader = ({ businessName, siteUrl }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        <div className="flex items-center gap-4">
          <img src={logoDarkBg} alt="Quick-Site" className="h-5 w-auto flex-shrink-0" />
          <div className="h-5 w-px bg-border flex-shrink-0" />
          <span className="font-semibold text-foreground truncate max-w-[28vw] sm:max-w-none">{businessName}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="gap-1.5 border-border/50 hover:bg-accent hover:text-accent-foreground"
            title={theme === 'light' ? 'מעבר למצב כהה' : 'מעבר למצב בהיר'}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {theme === 'light' ? 'מצב כהה' : 'מצב בהיר'}
            </span>
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
