import { Phone, Mail, Heart } from "lucide-react";
import logoDarkBg from "@/assets/logo-dark-bg.png";

interface StoreFooterV2Props {
  businessName: string;
  phone?: string;
  email?: string;
  storeSlug?: string;
}

const StoreFooterV2 = ({ businessName, phone, email, storeSlug }: StoreFooterV2Props) => {
  return (
    <footer dir="rtl" className="relative border-t border-border bg-gradient-to-b from-background to-muted/30 pb-24 md:pb-0 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 md:px-6 relative z-10">
        {/* Main content */}
        <div className="py-12 md:py-16 space-y-8">
          {/* Top section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Business name */}
            <div className="text-center md:text-right space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                {businessName}
              </h3>
              <p className="text-sm text-muted-foreground">
                חנות מקוונת מובילה
              </p>
            </div>

            {/* Contact info */}
            {(phone || email) && (
              <div className="flex flex-col items-center md:items-end gap-3">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    dir="ltr"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium text-foreground transition-all duration-300 hover:scale-105"
                  >
                    <Phone className="h-4 w-4" />
                    {phone}
                  </a>
                )}
                {email && (
                  <a
                    href={`mailto:${email}`}
                    dir="ltr"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium text-foreground transition-all duration-300 hover:scale-105"
                  >
                    <Mail className="h-4 w-4" />
                    {email}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Navigation links */}
          <div className="flex flex-wrap items-center justify-center gap-6 py-6 border-y border-border/50">
            <button
              onClick={() => {
                const section = document.getElementById('products');
                section?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              מוצרים
            </button>
            {storeSlug && (
              <button
                onClick={() => {
                  const section = document.getElementById('about');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                אודות
              </button>
            )}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              חזרה למעלה
            </button>
          </div>

          {/* Bottom section */}
          {/* <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground"> */}
            {/* Copyright */}
            {/* <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-medium text-foreground">{businessName}</span>
              <span>•</span>
              <span>כל הזכויות שמורות</span>
            </div> */}

            {/* Made with love */}
            {/* <div className="flex items-center gap-1.5 text-xs">
              <span>נוצר עם</span>
              <Heart className="h-3 w-3 text-red-500 fill-red-500 animate-pulse" />
              <span>באמצעות</span>
            </div> */}
          {/* </div> */}
        </div>

        {/* Platform credit */}
        <div className="border-t border-border/50 py-6 flex items-center justify-center">
          <a
            href={`https://${import.meta.env.VITE_WEBSITE_URL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all duration-300 hover:scale-105"
          >
            <span className="text-sm font-medium text-foreground">נבנה ע"י</span>
            <img src={logoDarkBg} alt="Siango" className="h-6 w-auto opacity-90 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default StoreFooterV2;
