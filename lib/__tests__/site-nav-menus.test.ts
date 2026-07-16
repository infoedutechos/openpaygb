import { describe, expect, it } from "vitest";
import { SITE_FOOTER_COLUMNS, SITE_HEADER_MENUS, SITE_HEADER_UTILITY_LINKS } from "@/lib/ecosystem/site-nav-menus";

describe("site-nav-menus", () => {
  it("defines header product menus with lobby hrefs", () => {
    expect(SITE_HEADER_MENUS).toHaveLength(5);
    expect(SITE_HEADER_MENUS.find((m) => m.id === "developers")?.href).toBe("/developers");
    expect(SITE_HEADER_MENUS.find((m) => m.id === "hubs")?.items.map((i) => i.label)).toEqual([
      "Dex Hub",
      "Play Hub",
    ]);
    expect(SITE_HEADER_MENUS.find((m) => m.id === "odelpay_higher")?.href).toBe("/OdelPayUniversities");
    expect(SITE_HEADER_MENUS.find((m) => m.id === "openpaygb")?.items.some((i) => i.href === "/dex/sell")).toBe(true);
  });

  it("defines flat header utility links in nav order", () => {
    expect(SITE_HEADER_UTILITY_LINKS.map((l) => l.label)).toEqual([
      "Pay tuition",
      "Register school",
      "Student portal",
      "Admin",
    ]);
  });

  it("defines footer columns for product lines and ecosystem", () => {
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("OdelPay — Schools");
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("Policies");
    const policies = SITE_FOOTER_COLUMNS.find((c) => c.heading === "Policies");
    expect(policies?.links.map((l) => l.label)).toEqual([
      "Platform Terms of Service",
      "Platform Privacy Policy",
      "Risk Disclosure",
      "Payment Provider Policy",
      "Help",
    ]);
  });
});
