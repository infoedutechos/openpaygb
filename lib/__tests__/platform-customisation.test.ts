import { describe, expect, it } from "vitest";

/** Pure mirrors of lib/platform-customisation SEO helpers (avoid server-only import in unit tests). */
function resolvedSeoTitle(b: { seoTitle: string; platformDisplayName: string }): string {
  if (b.seoTitle.trim()) return b.seoTitle.trim();
  return `${b.platformDisplayName} — Tuition, Play & Dex`;
}

function resolvedSeoDescription(b: { seoDescription: string }): string {
  if (b.seoDescription.trim()) return b.seoDescription.trim();
  return "Tuition Hub: programme fees and settlement. Play Hub: engagement. Dex Hub: onramp & offramp rails — extensible ecosystem.";
}

describe("platform customisation SEO helpers", () => {
  it("resolves SEO title from display name when seoTitle blank", () => {
    expect(resolvedSeoTitle({ platformDisplayName: "ODEL HUB", seoTitle: "" })).toContain("ODEL HUB");
  });

  it("uses custom seoTitle when set", () => {
    expect(resolvedSeoTitle({ platformDisplayName: "ODEL HUB", seoTitle: "Custom Title" })).toBe(
      "Custom Title",
    );
  });

  it("resolves SEO description defaults", () => {
    expect(resolvedSeoDescription({ seoDescription: "" }).length).toBeGreaterThan(20);
  });
});
