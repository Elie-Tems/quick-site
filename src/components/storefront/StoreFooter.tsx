import { Phone, Mail } from "lucide-react";
import logoDarkBg from "@/assets/logo-dark-bg.png";

interface StoreFooterProps {
  businessName: string;
  phone?: string;
  email?: string;
  storeSlug?: string;
}

const StoreFooter = ({ businessName, phone, email, storeSlug }: StoreFooterProps) => {
  return (
    <footer dir="rtl" className="border-t border-foreground/10 bg-background pb-24 md:pb-0">
      <div className="container px-4 md:px-6">

        {/* ── Main row ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-8 md:py-10">

          {/* Business name */}
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-foreground">
            {businessName}
          </span>

          {/* Contact links */}
          {(phone || email || storeSlug) && (
            <div className="flex items-center gap-5 flex-wrap justify-center">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  dir="ltr"
                  className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  {phone}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  dir="ltr"
                  className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  {email}
                </a>
              )}
              {storeSlug && (
                <>
                  <a
                    href={`/store/${storeSlug}/about`}
                    className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    אודות
                  </a>
                  <a
                    href={`/store/${storeSlug}/terms`}
                    className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    תקנון
                  </a>
                  <a
                    href={`/store/${storeSlug}/privacy`}
                    className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    מדיניות פרטיות
                  </a>
                </>
              )}
            </div>
          )}

          {/* Copyright */}
          <span className="text-[10px] tracking-[0.1em] text-muted-foreground/60">
            © {new Date().getFullYear()} {businessName}
          </span>
        </div>

        {/* ── Platform credit ── */}
        <div className="border-t border-foreground/8 py-4 flex items-center justify-center">
          <a
            href={`https://${import.meta.env.VITE_WEBSITE_URL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-lime-400 hover:text-lime-300 transition-colors"
          >
            <span>נבנה ע"י</span>
            <span className="font-bold text-lime-400 group-hover:text-lime-300 transition-colors">
              <img src={logoDarkBg} alt="Siango" className="h-5 w-auto" />
            </span>
          </a>
        </div>

      </div>
    </footer>
  );
};

export default StoreFooter;