import { getEnabledModules, type BusinessLike } from "@/lib/businessModules";
import BookingWidget from "./BookingWidget";
import ListingsBoard from "./ListingsBoard";
import DonationWidget from "./DonationWidget";

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
  if (!business?.id) return null;
  const modules = getEnabledModules(business);
  const accent = business.primary_color || "#0b8f6a";

  return (
    <>
      {modules.includes("booking") && (
        <Section title="קביעת תור" subtitle="בחרו שירות ומועד - ונתראה" accent={accent}>
          <BookingWidget businessId={business.id} />
        </Section>
      )}
      {modules.includes("listings") && (
        <ListingsBoard businessId={business.id} businessPhone={business.phone ?? undefined} />
      )}
      {modules.includes("donations") && (
        <Section title="לתרומה" subtitle="כל תרומה עושה הבדל" accent={accent}>
          <DonationWidget businessId={business.id} donationAmounts={(business as any)?.settings?.donation_amounts} />
        </Section>
      )}
      {modules.includes("synagogue") && (
        <Section title="אזור המתפללים" subtitle="עליות, נדרים וזמני תפילה" accent={accent}>
          <div className="text-center">
            <p className="text-muted-foreground mb-5">
              עליות, נדרים, זמני תפילה ואזור אישי - הכל מחכה לכם באזור המתפללים של בית הכנסת.
            </p>
            <a href={`/shul/${(business as any).slug}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}>
              כניסה לאזור המתפללים
            </a>
          </div>
        </Section>
      )}
    </>
  );
};

export default StorefrontVertical;
