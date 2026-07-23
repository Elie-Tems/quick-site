import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessType, getEnabledModules, type BusinessLike } from "@/lib/businessModules";
import { useBookingServices } from "@/hooks/useBooking";
import { useLanguage } from "@/contexts/LanguageContext";
import BookingWidget from "./BookingWidget";
import ListingsBoard from "./ListingsBoard";
import DonationWidget from "./DonationWidget";
import LodgingWidget, { type LodgingUnit } from "./LodgingWidget";
import StoreDifferentiation from "./StoreDifferentiation";
import StoreGallery from "./StoreGallery";
import StoreLeadForm from "./StoreLeadForm";

/**
 * Storefront vertical renderer. Given the business, shows the module-specific
 * customer experience (booking widget / listings board / donation widget) as a
 * PROMINENT, framed, titled section - so it reads as a real part of the page in
 * every store template (see StoreFront: passed to each layout as `verticalSlot`,
 * rendered right after the hero). A commerce-only store returns null.
 */
export const businessHasProductCatalog = (business: BusinessLike | null | undefined): boolean =>
  getEnabledModules(business).includes("commerce");

const Section = ({ title, subtitle, accent, children }: { title: string; subtitle?: string; accent: string; children: React.ReactNode }) => (
  <section className="py-8 px-4">
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-5">
        <span className="inline-block h-1 w-12 rounded-full mb-3" style={{ background: accent }} />
        <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-1.5">{subtitle}</p>}
      </div>
      <div className="rounded-2xl border-2 shadow-lg bg-card p-5 md:p-6" style={{ borderColor: `${accent}55` }}>
        {children}
      </div>
    </div>
  </section>
);

const StorefrontVertical = ({ business }: {
  business: (BusinessLike & { id: string; primary_color?: string | null; phone?: string | null }) | null | undefined;
}) => {
  const { t } = useLanguage();
  const isVacation = getBusinessType(business) === "vacation";
  const hasBookingModule = getEnabledModules(business).includes("booking");

  // Vacation units = this business's products that have a nightly rate set. Loaded
  // here (the parent StoreFront doesn't pass products into this slot) and handed to
  // LodgingWidget. Gated so non-vacation stores never run the query.
  const { data: lodgingUnits = [] } = useQuery({
    queryKey: ["lodging-units", business?.id],
    queryFn: async (): Promise<LodgingUnit[]> => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", business.id)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data as any[]) || []).filter((p) => p.price_per_night != null) as LodgingUnit[];
    },
    enabled: !!business?.id && isVacation,
  });

  // Gate the booking Section on having at least one bookable service (mirrors the
  // lodgingUnits.length>0 gate above) - otherwise every newly onboarded services
  // business shows an empty, fully-styled "קביעת תור" frame with nothing inside.
  const { data: bookingServices = [] } = useBookingServices(hasBookingModule ? business?.id : undefined);

  if (!business?.id) return null;
  const modules = getEnabledModules(business);
  const accent = business.primary_color || "#0b8f6a";

  return (
    <>
      {isVacation && modules.includes("lodging") && lodgingUnits.length > 0 && (
        <LodgingWidget businessId={business.id} units={lodgingUnits} />
      )}
      {modules.includes("booking") && bookingServices.length > 0 && (
        <Section title={t("store.vertical.booking_title")} subtitle={t("store.vertical.booking_subtitle")} accent={accent}>
          <BookingWidget businessId={business.id} />
        </Section>
      )}
      {modules.includes("listings") && (
        <ListingsBoard businessId={business.id} businessPhone={business.phone ?? undefined} />
      )}
      {modules.includes("donations") && (
        <Section title={t("store.vertical.donation_title")} subtitle={t("store.vertical.donation_subtitle")} accent={accent}>
          <DonationWidget businessId={business.id} donationAmounts={(business as any)?.settings?.donation_amounts} />
        </Section>
      )}
      {modules.includes("synagogue") && (
        <Section title={t("store.vertical.synagogue_title")} subtitle={t("store.vertical.synagogue_subtitle")} accent={accent}>
          <div className="text-center">
            <p className="text-muted-foreground mb-5">
              {t("store.vertical.synagogue_description")}
            </p>
            <a href={`/shul/${(business as any).slug}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}>
              {t("store.vertical.synagogue_cta")}
            </a>
          </div>
        </Section>
      )}
      {modules.includes("differentiation") && (
        <StoreDifferentiation data={(business as any).differentiation} accent={accent} />
      )}
      {modules.includes("gallery") && (
        <StoreGallery
          images={(business as any).gallery_images?.images}
          heading={(business as any).gallery_images?.heading}
          accent={accent}
        />
      )}
      {(business as any).lead_form_enabled && (
        <StoreLeadForm
          businessId={business.id}
          accent={accent}
          heading={(business as any).custom_labels?.leadFormHeading}
          subheading={(business as any).custom_labels?.leadFormSubheading}
        />
      )}
    </>
  );
};

export default StorefrontVertical;
