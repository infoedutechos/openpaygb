import { describe, expect, it } from "vitest";
import { SITE_FOOTER_COLUMNS, SITE_HEADER_MENUS, SITE_HEADER_UTILITY_LINKS } from "@/lib/ecosystem/site-nav-menus";

describe("site-nav-menus", () => {
  it("defines header product menus with lobby hrefs", () => {
    expect(SITE_HEADER_MENUS).toHaveLength(6);
    expect(SITE_HEADER_MENUS.find((m) => m.id === "assessmentverse_os")?.href).toBe("/AssessmentVerseOS");
    expect(SITE_HEADER_MENUS.find((m) => m.id === "developers")?.href).toBe("/developers");
    expect(SITE_HEADER_MENUS.find((m) => m.id === "hubs")?.items.map((i) => i.label)).toEqual([
      "Dex Hub",
      "Play Hub",
      "Tuition pay",
    ]);
    expect(SITE_HEADER_MENUS.find((m) => m.id === "odelpay_higher")?.href).toBe("/OdelPayUniversities");
    expect(SITE_HEADER_MENUS.find((m) => m.id === "openpaygb")?.items.some((i) => i.href === "/dex/sell")).toBe(true);
  });

  it("keeps AssessmentVerse public menu free of localhost", () => {
    const av = SITE_HEADER_MENUS.find((m) => m.id === "assessmentverse_os");
    expect(av?.items.every((i) => !i.href.includes("127.0.0.1") && !i.href.includes("localhost"))).toBe(true);
    const footerAv = SITE_FOOTER_COLUMNS.find((c) => c.heading === "AssessmentVerse OS");
    expect(footerAv?.links.every((i) => !i.href.includes("127.0.0.1"))).toBe(true);
  });

  it("does not advertise demo school checkout in public menus", () => {
    const allHrefs = [
      ...SITE_HEADER_MENUS.flatMap((m) => m.items.map((i) => i.href)),
      ...SITE_FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href)),
    ];
    expect(allHrefs.some((h) => h.includes("riverside-demo"))).toBe(false);
  });

  it("defines flat header utility links in nav order", () => {
    expect(SITE_HEADER_UTILITY_LINKS.map((l) => l.label)).toEqual([
      "Pay tuition",
      "Register school",
      "Log in",
      "School admin",
    ]);
    expect(SITE_HEADER_UTILITY_LINKS.find((l) => l.label === "Log in")?.href).toBe("/login");
    expect(SITE_HEADER_UTILITY_LINKS.find((l) => l.label === "Developers")).toBeUndefined();
  });

  it("defines footer columns for product lines and ecosystem", () => {
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("OdelPay — Schools");
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("AssessmentVerse OS");
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("Guides");
    expect(SITE_FOOTER_COLUMNS.map((c) => c.heading)).toContain("Policies");
    const guides = SITE_FOOTER_COLUMNS.find((c) => c.heading === "Guides");
    expect(guides?.links[0]?.href).toBe("/api/docs/guides/USER_GUIDE_INDEX.md");
    expect(guides?.links.some((l) => l.href === "/help")).toBe(false);
    const policies = SITE_FOOTER_COLUMNS.find((c) => c.heading === "Policies");
    expect(policies?.links.map((l) => l.label)).toEqual([
      "Platform Terms of Service",
      "Platform Privacy Policy",
      "Risk Disclosure",
      "Payment Provider Policy",
    ]);
    const services = SITE_FOOTER_COLUMNS.find((c) => c.heading === "Services");
    expect(services?.links.filter((l) => l.href === "/help")).toHaveLength(1);
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
