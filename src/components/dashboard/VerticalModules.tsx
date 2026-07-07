import { getEnabledModules, type BusinessLike } from "@/lib/businessModules";
import BookingManager from "./booking/BookingManager";
import LeadsBoard from "./crm/LeadsBoard";
import ListingsManager from "./listings/ListingsManager";
import DonationsManager from "./donations/DonationsManager";

/**
 * Feature-gate consumption: given the current business, render only the vertical
 * managers its module set unlocks (business_type -> modules, see
 * src/lib/businessModules.ts). Mount this in the dashboard. A products store
 * (commerce only) renders nothing extra; a services business gets booking; a
 * real-estate business gets listings + leads; a nonprofit gets donations.
 *
 * Wiring: in src/pages/Dashboard.tsx, render <VerticalModules business={business} />
 * inside the dashboard content (e.g. a "וורטיקל" tab or above the product tabs).
 * The commerce module keeps today's product/order UI unchanged.
 */
const VerticalModules = ({ business }: { business: (BusinessLike & { id: string }) | null | undefined }) => {
  if (!business?.id) return null;
  const modules = getEnabledModules(business);

  return (
    <div className="space-y-10">
      {modules.includes("booking") && <BookingManager businessId={business.id} />}
      {modules.includes("listings") && (
        <>
          <ListingsManager businessId={business.id} />
          <LeadsBoard businessId={business.id} />
        </>
      )}
      {modules.includes("donations") && <DonationsManager businessId={business.id} />}
    </div>
  );
};

export default VerticalModules;
