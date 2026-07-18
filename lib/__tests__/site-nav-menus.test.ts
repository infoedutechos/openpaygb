import { describe, expect, it } from "vitest";
import { SITE_FOOTER_COLUMNS, SITE_HEADER_MENUS, SITE_HEADER_UTILITY_LINKS } from "@/lib/ecosystem/site-nav-menus";

describe("site-nav-menus", () => {
  it("defines header product menus with lobby hrefs", () => {
    expect(SITE_HEADER_MENUS).toHaveLength(5);
    expect(SITE_HEADER_MENUS.find((m) => m.id === "developers")?.href).toBe("/developers");
    expect(SITE_HEADER_MENUS.find((m) => m.id === "hubs")?.items.map((i) => i.label)).toEqual([
      "Dex Hub",
      "Get funds",
      "AMM swap",
      "Offramp",
      "P2P market",
      "Play Hub",
    ]);
    expect(SITE_HEADER_MENUS.find((m) => m.id === "odelpay_higher")?.href).toBe("/OdelPayUniversities");
    expect(SITE_HEADER_MENUS.find((m) => m.id === "openpaygb")?.items.some((i) => i.href === "/dex/sell")).toBe(true);
  });

  it("defines flat header utility links in nav order", () => {
    expect(SITE_HEADER_UTILITY_LINKS.map((l) => l.label)).toEqual([
      "Pay tuition",
      "Register school",
      "Log in",
      "School admin",
      "Developers",
    ]);
    expect(SITE_HEADER_UTILITY_LINKS.find((l) => l.label === "Log in")?.href).toBe("/login");
    expect(SITE_HEADER_UTILITY_LINKS.find((l) => l.label === "Developers")?.href).toBe("/developers");
  });

  it("defines footer columns for product lines and ecosystem", () => {
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("OdelPay — Schools");
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("Guides");
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("Policies");
    const guides = SITE_FOOTER_COLUMNS.find((c) => c.heading === "Guides");
    expect(guides?.links.map((l) => l.href)).toEqual([
      "/help/guide-student-schools",
      "/help/guide-student-higher",
      "/help/guide-staff-schools",
      "/help/guide-staff-higher",
      "/help/guide-admin-schools",
      "/help/guide-admin-higher",
      "/api/docs/guides/USER_GUIDE_INDEX.md",
      "/help",
    ]);
    const policies = SITE_FOOTER_COLUMNS.find((c) => c.heading === "Policies");
    expect(policies?.links.map((l) => l.label)).toEqual([
      "Platform Terms of Service",
      "Platform Privacy Policy",
      "Risk Disclosure",
      "Payment Provider Policy",
      "Help",
    ]);
  });

  it("includes audience handbooks in Higher and Schools header menus", () => {
    const higher = SITE_HEADER_MENUS.find((m) => m.id === "odelpay_higher");
    const schools = SITE_HEADER_MENUS.find((m) => m.id === "odelpay_schools");
    expect(higher?.items.some((i) => i.href === "/help/guide-student-higher")).toBe(true);
    expect(higher?.items.some((i) => i.href === "/help/guide-staff-higher")).toBe(true);
    expect(higher?.items.some((i) => i.href === "/help/guide-admin-higher")).toBe(true);
    expect(schools?.items.some((i) => i.href === "/help/guide-student-schools")).toBe(true);
    expect(schools?.items.some((i) => i.href === "/help/guide-staff-schools")).toBe(true);
    expect(schools?.items.some((i) => i.href === "/help/guide-admin-schools")).toBe(true);
  });
});
