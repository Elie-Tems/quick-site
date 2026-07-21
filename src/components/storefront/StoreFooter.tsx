import { Phone, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StoreFooterProps {
  businessName: string;
  phone?: string;
  email?: string;
  storeSlug?: string;
  /** Lead/donation-based verticals (realestate, nonprofit, synagogue) never write
   * to the orders table, so the "my orders" lookup has nothing to show. Default
   * true to keep existing commerce layouts unchanged. */
  showOrders?: boolean;
}

const StoreFooter = ({ businessName, phone, email, storeSlug, showOrders = true }: StoreFooterProps) => {
  const { t } = useLanguage();
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
                    href={`/${storeSlug}/about`}
                    className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("store.footer.about")}
                  </a>
                  <a
                    href={`/${storeSlug}/terms`}
                    className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("store.footer.terms")}
                  </a>
                  <a
                    href={`/${storeSlug}/privacy`}
                    className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("store.footer.privacy")}
                  </a>
                  {showOrders && (
                    <a
                      href={`/${storeSlug}/my-orders`}
                      className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t("store.footer.myOrders")}
                    </a>
                  )}
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
        <div className="border-t border-foreground/10 py-5 flex items-center justify-center">
          <a
            href={`https://${import.meta.env.VITE_WEBSITE_URL || "siango.app"}?utm_source=store_credit`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.03] px-4 py-2 hover:bg-foreground/[0.06] transition-colors"
          >
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground">{t("store.footer.madeWithLove")}</span>
            <span className="text-[13px] font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">siango</span>
          </a>
        </div>

      </div>
    </footer>
  );
};

export default StoreFooter;