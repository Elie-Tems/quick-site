import { Link } from 'react-router-dom';
import { Phone, Mail } from 'lucide-react';
import logoDarkBg from "@/assets/logo-dark-bg.png";
import { useLanguage } from "@/contexts/LanguageContext";

interface FooterProps {
  isStorefront?: boolean;
  businessName?: string;
  businessEmail?: string;
}

const Footer = ({
  isStorefront = false,
  businessName = 'קוויקסייט',
  businessEmail = 'contact@quick-site.app',
}: FooterProps) => {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="py-20 bg-background border-t border-border/50" role="contentinfo">
      <div className="container">
        <div className="grid gap-12 md:grid-cols-3 mb-16">
          {/* Business info */}
          <div className="space-y-6">
            <Link to="/" className="inline-block">
              <img src={logoDarkBg} alt={businessName} className="h-8 w-auto" />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              {t('footer.description')}
            </p>
            <div className="space-y-3 text-sm">
              
              <a 
                href={`mailto:${businessEmail}`}
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                aria-label={`Email: ${businessEmail}`}
              >
                <Mail className="w-4 h-4" strokeWidth={1.5} />
                <span dir="ltr">{businessEmail}</span>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground">{t('footer.quickLinks')}</h3>
            <nav aria-label={t('footer.quickLinks')}>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link 
                    to="/" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('footer.home')}
                  </Link>
                </li>
                {!isStorefront && (
                  <li>
                    <Link 
                      to="/register" 
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t('footer.register')}
                    </Link>
                  </li>
                )}
                <li>
                  <Link 
                    to="/login" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('footer.login')}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Legal links */}
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground">{t('footer.legal')}</h3>
            <nav aria-label={t('footer.legal')}>
              <ul className="space-y-3 text-sm">
                {!isStorefront && (
                  <li>
                    <Link
                      to="/terms"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t('footer.terms')}
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/privacy"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('footer.privacy')}
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/accessibility" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('footer.accessibility')}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="section-divider mb-8" />

        {/* Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            © {currentYear} {businessName}. {t('footer.rights')}
          </span>
          <p className="text-xs text-muted-foreground">
            {t('footer.a11yCompliance')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
