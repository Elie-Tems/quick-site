import { getEnabledModules, type BusinessLike } from "@/lib/businessModules";
import BookingWidget from "./BookingWidget";
import ListingsBoard from "./ListingsBoard";
import DonationWidget from "./DonationWidget";

/**
 * Storefront vertical renderer. Given the business, shows the module-specific
 * customer experience (booking widget / listings board / donation widget). A
 * commerce-only store returns null so StoreFront keeps rendering the product
 * catalog. A services business shows booking IN ADDITION to any products it
 * sells (services commonly sell products too).
 *
 * Wiring: in src/pages/StoreFront.tsx, render <StorefrontVertical business={business} />
 * near the top of the catalog area. hasCatalog() lets the caller decide whether
 * to still show products below.
 */
export const businessHasProductCatalog = (business: BusinessLike | null | undefined): boolean =>
  getEnabledModules(business).includes("commerce");

const StorefrontVertical = ({ business }: { business: (BusinessLike & { id: string }) | null | undefined }) => {
  if (!business?.id) return null;
  const modules = getEnabledModules(business);

  return (
    <>
      {modules.includes("booking") && <BookingWidget businessId={business.id} />}
      {modules.includes("listings") && <ListingsBoard businessId={business.id} />}
      {modules.includes("donations") && <DonationWidget businessId={business.id} />}
    </>
  );
};

export default StorefrontVertical;
