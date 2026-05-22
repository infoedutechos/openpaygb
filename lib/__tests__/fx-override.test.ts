import { describe, expect, it } from "vitest";
import { DEFAULT_UGX_PER_TON } from "@/lib/constants";
import {
  mergeFxOverrides,
  normalizeOrgFxOverride,
  normalizePlatformFxOverride,
  resolveFxWithOverride,
  type FxOverrideConfig,
} from "@/lib/fx-override";
import type { LiveFxResult } from "@/lib/fx-live";

describe("mergeFxOverrides", () => {
  const platformNone: FxOverrideConfig = normalizePlatformFxOverride({
    fxOverrideKind: "none",
    fxOverrideUgxPerTon: null,
    fxOverrideBufferPct: 0,
  });

  it("uses org override when kind is not inherit", () => {
    const org = normalizeOrgFxOverride({
      fxOverrideKind: "fixed",
      fxOverrideUgxPerTon: 12_000,
      fxOverrideBufferPct: 0,
    });
    const m = mergeFxOverrides(platformNone, org);
    expect(m.scope).toBe("org");
    expect(m.kind).toBe("fixed");
    expect(m.ugxPerTon).toBe(12_000);
  });

  it("uses platform when org inherits and platform is fixed", () => {
    const platform = normalizePlatformFxOverride({
      fxOverrideKind: "fixed",
      fxOverrideUgxPerTon: 9_500,
      fxOverrideBufferPct: 0,
    });
    const org = normalizeOrgFxOverride({
      fxOverrideKind: "inherit",
      fxOverrideUgxPerTon: null,
      fxOverrideBufferPct: 0,
    });
    const m = mergeFxOverrides(platform, org);
    expect(m.scope).toBe("platform");
    expect(m.kind).toBe("fixed");
    expect(m.ugxPerTon).toBe(9_500);
  });

  it("returns none scope when org inherits and platform is none", () => {
    const org = normalizeOrgFxOverride({
      fxOverrideKind: "inherit",
      fxOverrideUgxPerTon: null,
      fxOverrideBufferPct: 0,
    });
    const m = mergeFxOverrides(platformNone, org);
    expect(m.scope).toBe("none");
    expect(m.kind).toBe("none");
  });

  it("treats org none as explicit none", () => {
    const platform = normalizePlatformFxOverride({
      fxOverrideKind: "fixed",
      fxOverrideUgxPerTon: 8_000,
      fxOverrideBufferPct: 0,
    });
    const org = normalizeOrgFxOverride({
      fxOverrideKind: "none",
      fxOverrideUgxPerTon: null,
      fxOverrideBufferPct: 0,
    });
    const m = mergeFxOverrides(platform, org);
    expect(m.scope).toBe("none");
    expect(m.kind).toBe("none");
  });
});

describe("resolveFxWithOverride", () => {
  const live: LiveFxResult = { ugxPerTon: 10_000, source: "coingecko", fetchedAt: new Date() };

  it("applies fixed org rate", async () => {
    const effective = mergeFxOverrides(
      normalizePlatformFxOverride({ fxOverrideKind: "none", fxOverrideUgxPerTon: null, fxOverrideBufferPct: 0 }),
      normalizeOrgFxOverride({
        fxOverrideKind: "fixed",
        fxOverrideUgxPerTon: 11_111,
        fxOverrideBufferPct: 0,
      }),
    );
    const r = await resolveFxWithOverride(effective, live, 5_000);
    expect(r.ugxPerTon).toBe(11_111);
    expect(r.source).toBe("org_fixed");
    expect(r.liveBase).toBe(live);
  });

  it("applies buffer on live median for platform scope", async () => {
    const effective = mergeFxOverrides(
      normalizePlatformFxOverride({
        fxOverrideKind: "buffer_pct",
        fxOverrideUgxPerTon: null,
        fxOverrideBufferPct: 10,
      }),
      normalizeOrgFxOverride({
        fxOverrideKind: "inherit",
        fxOverrideUgxPerTon: null,
        fxOverrideBufferPct: 0,
      }),
    );
    const r = await resolveFxWithOverride(effective, live, 5_000);
    expect(r.ugxPerTon).toBe(11_000);
    expect(r.source).toBe("platform_buffer_pct");
  });

  it("falls back to DB when live missing and override is none", async () => {
    const effective = mergeFxOverrides(
      normalizePlatformFxOverride({ fxOverrideKind: "none", fxOverrideUgxPerTon: null, fxOverrideBufferPct: 0 }),
      normalizeOrgFxOverride({
        fxOverrideKind: "inherit",
        fxOverrideUgxPerTon: null,
        fxOverrideBufferPct: 0,
      }),
    );
    const r = await resolveFxWithOverride(effective, null, 7_777);
    expect(r.ugxPerTon).toBe(7_777);
    expect(r.source).toBe("db");
  });

  it("uses env default when no live and no positive fallback", async () => {
    const effective = mergeFxOverrides(
      normalizePlatformFxOverride({ fxOverrideKind: "none", fxOverrideUgxPerTon: null, fxOverrideBufferPct: 0 }),
      normalizeOrgFxOverride({
        fxOverrideKind: "inherit",
        fxOverrideUgxPerTon: null,
        fxOverrideBufferPct: 0,
      }),
    );
    const r = await resolveFxWithOverride(effective, null, 0);
    expect(r.ugxPerTon).toBe(DEFAULT_UGX_PER_TON);
    expect(r.source).toBe("env_default");
  });
});
