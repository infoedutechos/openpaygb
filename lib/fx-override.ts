import { prisma } from "@/lib/prisma";
import { defaultUgxPerTon } from "@/lib/constants";
import type { LiveFxResult } from "@/lib/fx-live";

export const PLATFORM_FX_KINDS = ["none", "fixed", "buffer_pct"] as const; // platform override kinds
export const ORG_FX_KINDS = ["inherit", "none", "fixed", "buffer_pct"] as const;

export type PlatformFxOverrideKind = (typeof PLATFORM_FX_KINDS)[number];
export type OrgFxOverrideKind = (typeof ORG_FX_KINDS)[number];

export type FxOverrideConfig = {
  kind: PlatformFxOverrideKind | OrgFxOverrideKind;
  ugxPerTon: number | null;
  bufferPct: number;
};

export type PlatformFxOverrideRow = {
  fxOverrideKind: string;
  fxOverrideUgxPerTon: number | null;
  fxOverrideBufferPct: number;
};

export type OrgFxOverrideRow = PlatformFxOverrideRow & {
  fxOverrideKind: string;
};

function roundUgxPerTon(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

export function normalizePlatformFxOverride(row: PlatformFxOverrideRow | null | undefined): FxOverrideConfig {
  const kindRaw = row?.fxOverrideKind ?? "none";
  const kind = PLATFORM_FX_KINDS.includes(kindRaw as PlatformFxOverrideKind)
    ? (kindRaw as PlatformFxOverrideKind)
    : "none";
  const ugx =
    typeof row?.fxOverrideUgxPerTon === "number" && row.fxOverrideUgxPerTon > 0
      ? roundUgxPerTon(row.fxOverrideUgxPerTon)
      : null;
  const bufferPct =
    typeof row?.fxOverrideBufferPct === "number" && Number.isFinite(row.fxOverrideBufferPct)
      ? row.fxOverrideBufferPct
      : 0;
  return { kind, ugxPerTon: ugx, bufferPct };
}

export function normalizeOrgFxOverride(row: OrgFxOverrideRow | null | undefined): FxOverrideConfig & {
  kind: OrgFxOverrideKind;
} {
  const kindRaw = row?.fxOverrideKind ?? "inherit";
  const kind = ORG_FX_KINDS.includes(kindRaw as OrgFxOverrideKind) ? (kindRaw as OrgFxOverrideKind) : "inherit";
  const ugx =
    typeof row?.fxOverrideUgxPerTon === "number" && row.fxOverrideUgxPerTon > 0
      ? roundUgxPerTon(row.fxOverrideUgxPerTon)
      : null;
  const bufferPct =
    typeof row?.fxOverrideBufferPct === "number" && Number.isFinite(row.fxOverrideBufferPct)
      ? row.fxOverrideBufferPct
      : 0;
  return { kind, ugxPerTon: ugx, bufferPct };
}

export async function getPlatformFxOverride(): Promise<FxOverrideConfig> {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: "platform" },
    select: {
      fxOverrideKind: true,
      fxOverrideUgxPerTon: true,
      fxOverrideBufferPct: true,
    },
  });
  return normalizePlatformFxOverride(row);
}

export async function getOrgFxOverride(organizationId: string): Promise<FxOverrideConfig & { kind: OrgFxOverrideKind }> {
  const row = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      fxOverrideKind: true,
      fxOverrideUgxPerTon: true,
      fxOverrideBufferPct: true,
    },
  });
  return normalizeOrgFxOverride(row);
}

/** Effective override for checkout: org wins over platform when not `inherit`. */
export function mergeFxOverrides(
  platform: FxOverrideConfig,
  org: FxOverrideConfig & { kind: OrgFxOverrideKind },
): { kind: PlatformFxOverrideKind; ugxPerTon: number | null; bufferPct: number; scope: "org" | "platform" | "none" } {
  if (org.kind !== "inherit") {
    if (org.kind === "none") return { kind: "none", ugxPerTon: null, bufferPct: 0, scope: "none" };
    return {
      kind: org.kind as PlatformFxOverrideKind,
      ugxPerTon: org.ugxPerTon,
      bufferPct: org.bufferPct,
      scope: "org",
    };
  }
  if (platform.kind !== "none" && platform.kind !== "inherit") {
    return {
      kind: platform.kind,
      ugxPerTon: platform.ugxPerTon,
      bufferPct: platform.bufferPct,
      scope: "platform",
    };
  }
  return { kind: "none", ugxPerTon: null, bufferPct: 0, scope: "none" };
}

export function applyBufferToLive(liveUgxPerTon: number, bufferPct: number): number {
  const pct = Number.isFinite(bufferPct) ? bufferPct : 0;
  return roundUgxPerTon(liveUgxPerTon * (1 + pct / 100));
}

export type ResolvedFxOverride = {
  ugxPerTon: number;
  source: string;
  liveBase: LiveFxResult | null;
};

/** Apply master/org override on top of live median when configured. */
export async function resolveFxWithOverride(
  effective: ReturnType<typeof mergeFxOverrides>,
  live: LiveFxResult | null,
  fallbackUgx: number,
): Promise<ResolvedFxOverride> {
  const scope = effective.scope;
  const prefix = scope === "org" ? "org" : scope === "platform" ? "platform" : "";

  if (effective.kind === "fixed" && effective.ugxPerTon && effective.ugxPerTon > 0) {
    return {
      ugxPerTon: effective.ugxPerTon,
      source: prefix ? `${prefix}_fixed` : "manual",
      liveBase: live,
    };
  }

  if (effective.kind === "buffer_pct") {
    const base = live?.ugxPerTon && live.ugxPerTon > 0 ? live.ugxPerTon : fallbackUgx;
    const buffered = applyBufferToLive(base, effective.bufferPct);
    if (buffered > 0) {
      return {
        ugxPerTon: buffered,
        source: prefix ? `${prefix}_buffer_pct` : "buffer_pct",
        liveBase: live,
      };
    }
  }

  if (live && live.ugxPerTon > 0) {
    return { ugxPerTon: live.ugxPerTon, source: live.source, liveBase: live };
  }

  return {
    ugxPerTon: fallbackUgx > 0 ? fallbackUgx : defaultUgxPerTon(),
    source: fallbackUgx > 0 ? "db" : "env_default",
    liveBase: live,
  };
}
