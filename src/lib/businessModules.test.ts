import { describe, it, expect } from "vitest";
import { getBusinessType, getEnabledModules, hasModule, getDefaultLayout } from "./businessModules";

describe("businessModules", () => {
  it("defaults legacy/unknown rows to products + commerce", () => {
    expect(getBusinessType(null)).toBe("products");
    expect(getBusinessType({ business_type: "bogus" })).toBe("products");
    expect(getEnabledModules(null)).toEqual(["commerce"]);
  });

  it("maps each vertical to its default modules", () => {
    expect(getEnabledModules({ business_type: "products" })).toEqual(["commerce"]);
    expect(getEnabledModules({ business_type: "services" })).toEqual(["booking", "commerce"]);
    expect(getEnabledModules({ business_type: "realestate" })).toEqual(["listings"]);
    expect(getEnabledModules({ business_type: "nonprofit" })).toEqual(["donations"]);
  });

  it("hasModule reflects the type", () => {
    expect(hasModule({ business_type: "services" }, "booking")).toBe(true);
    expect(hasModule({ business_type: "products" }, "booking")).toBe(false);
    expect(hasModule({ business_type: "realestate" }, "listings")).toBe(true);
  });

  it("honors an explicit enabled_modules override", () => {
    expect(getEnabledModules({ business_type: "products", enabled_modules: ["commerce", "booking"] }))
      .toEqual(["commerce", "booking"]);
    // junk values are filtered out
    expect(getEnabledModules({ business_type: "products", enabled_modules: ["nope"] })).toEqual(["commerce"]);
  });

  it("gives each vertical a default storefront layout", () => {
    expect(getDefaultLayout({ business_type: "services" })).toBe("service");
    expect(getDefaultLayout({ business_type: "realestate" })).toBe("property");
    expect(getDefaultLayout({ business_type: "nonprofit" })).toBe("service");
    expect(getDefaultLayout({ business_type: "products" })).toBe("classic");
  });
});
