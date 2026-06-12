import { describe, expect, it } from "vitest";
import { PRODUCT_LINE_ORDER, PRODUCT_LINES } from "@/lib/ecosystem/product-lines";

describe("product-lines", () => {
  it("exposes independent product lines including developers", () => {
    expect(PRODUCT_LINE_ORDER).toEqual(["odelpay_higher", "odelpay_schools", "openpaygb", "developers"]);
    expect(PRODUCT_LINES).toHaveLength(4);
    expect(PRODUCT_LINES.map((p) => p.title)).toContain("OdelPay — Higher Institutions");
    expect(PRODUCT_LINES.map((p) => p.title)).toContain("OdelPay — Schools");
    expect(PRODUCT_LINES.map((p) => p.title)).toContain("OpenPayGB");
    expect(PRODUCT_LINES.find((p) => p.id === "odelpay_higher")?.primaryHref).toBe("/OdelPayUniversities");
    expect(PRODUCT_LINES.find((p) => p.id === "odelpay_schools")?.primaryHref).toBe("/OdelPaySchools");
    expect(PRODUCT_LINES.find((p) => p.id === "openpaygb")?.primaryHref).toBe("/opgb");
    expect(PRODUCT_LINES.find((p) => p.id === "developers")?.primaryHref).toBe("/developers");
  });
});
