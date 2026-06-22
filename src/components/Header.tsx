import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogIn, LogOut, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import logoDarkBg from "@/assets/logo-dark-bg.png";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Header = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="fixed top-0 right-0 left-0 z-50">
      {/* Frosted glass navigation bar */}
      <div className="mx-4 mt-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="container flex items-center justify-between h-20">
          {/* Logo with neon glow */}
          <Link to="/" className="flex items-center group relative">
            {/* Ambient glow behind logo */}
            <motion.div 
              animate={{ 
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl pointer-events-none"
            />
            
            {/* Logo image with glow effect */}
            <motion.img 
              src={logoDarkBg}
              alt="Quick-Site"
              className="relative h-14 md:h-20 w-auto"
              style={{
                filter: `
                  drop-shadow(0 0 10px hsl(var(--primary) / 0.8))
                  drop-shadow(0 0 20px hsl(var(--primary) / 0.5))
                `
              }}
              whileHover={{
                filter: `
                  drop-shadow(0 0 15px hsl(var(--primary)))
                  drop-shadow(0 0 30px hsl(var(--primary) / 0.7))
                `
              }}
            />
          </Link>

          {/* Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {user ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all duration-300 rounded-full px-5" 
                  asChild
                >
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('header.dashboard')}</span>
                  </Link>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-white/30 text-white/90 hover:bg-white/10 hover:border-white/50 rounded-full px-5"
                  onClick={() => signOut()}
                >
                  <LogOut className="w-4 h-4 sm:mr-1.5 scale-x-[-1]" />
                  <span className="hidden sm:inline">{t('header.logout')}</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all duration-300 rounded-full px-5" 
                  asChild
                >
                  <Link to="/login" className="flex items-center gap-2">
                    <span className="hidden sm:inline">{t('header.login')}</span>
                    <LogIn className="w-4 h-4 scale-x-[-1]" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-white text-black hover:bg-white/90 px-6 rounded-full font-bold transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.4),0_0_40px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(255,255,255,0.6),0_0_60px_rgba(255,255,255,0.4)]"
                  asChild
                >
                  <Link to="/register">{t('header.startNow')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;