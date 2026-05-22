import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_UGX_PER_TON } from "@/lib/constants";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { fetchLiveFxBreakdown, getCachedLiveUgxPerTon } from "@/lib/fx-live";
import { getOrgFxOverride, getPlatformFxOverride, mergeFxOverrides, resolveFxWithOverride } from "@/lib/fx-override";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";

const PlatformFxPatch = z
  .object({
    fxOverrideKind: z.enum(["none", "fixed", "buffer_pct"]),
    fxOverrideUgxPerTon: z.union([z.number().positive(), z.null()]).optional(),
    fxOverrideBufferPct: z.number().finite().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.fxOverrideKind === "fixed") {
      const u = val.fxOverrideUgxPerTon;
      if (u == null || u <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fxOverrideUgxPerTon"],
          message: "Required positive number when kind is fixed",
        });
      }
    }
    if (val.fxOverrideKind === "buffer_pct" && val.fxOverrideBufferPct === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fxOverrideBufferPct"],
        message: "Required when kind is buffer_pct",
      });
    }
  });

async function dbFallbackUgxOnly(organizationId: string): Promise<number> {
  const latest = await prisma.fxRate.findFirst({
    where: { organizationId },
    orderBy: { effectiveAt: "desc" },
  });
  if (latest && latest.ugxPerTon > 0) return latest.ugxPerTon;
  return DEFAULT_UGX_PER_TON;
}

export async function GET(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const fresh = url.searchParams.get("fresh") === "1";

  const defaultOrgId = await getDefaultOrganizationId();

  const [platformRow, defaultOrg, fallbackUgx] = await Promise.all([
    prisma.siteUiSettings.findUnique({
      where: { key: "platform" },
      select: {
        fxOverrideKind: true,
        fxOverrideUgxPerTon: true,
        fxOverrideBufferPct: true,
      },
    }),
    prisma.organization.findUnique({
      where: { id: defaultOrgId },
      select: { id: true, slug: true },
    }),
    dbFallbackUgxOnly(defaultOrgId),
  ]);

  const liveBreakdown = fresh
    ? await fetchLiveFxBreakdown()
    : { providers: [] as { source: string; ugxPerTon: number }[], combined: await getCachedLiveUgxPerTon() };

  const platformNormalized = await getPlatformFxOverride();
  const orgFx = await getOrgFxOverride(defaultOrgId);
  const effective = mergeFxOverrides(platformNormalized, orgFx);
  const resolved = await resolveFxWithOverride(effective, liveBreakdown.combined, fallbackUgx);

  const platformOnlyEffective = mergeFxOverrides(platformNormalized, {
    kind: "inherit",
    ugxPerTon: null,
    bufferPct: 0,
  });
  const platformPreview = await resolveFxWithOverride(
    platformOnlyEffective,
    liveBreakdown.combined,
    fallbackUgx,
  );

  return NextResponse.json({
    fresh,
    envDefaultUgx: DEFAULT_UGX_PER_TON,
    platform: {
      fxOverrideKind: platformRow?.fxOverrideKind ?? "none",
      fxOverrideUgxPerTon: platformRow?.fxOverrideUgxPerTon ?? null,
      fxOverrideBufferPct: platformRow?.fxOverrideBufferPct ?? 0,
    },
    live: {
      providers: liveBreakdown.providers,
      combined: liveBreakdown.combined
        ? {
            ugxPerTon: liveBreakdown.combined.ugxPerTon,
            source: liveBreakdown.combined.source,
            fetchedAt: liveBreakdown.combined.fetchedAt.toISOString(),
          }
        : null,
    },
    defaultOrganization: defaultOrg
      ? { id: defaultOrg.id, slug: defaultOrg.slug }
      : { id: defaultOrgId, slug: "default" },
    /** Resolved rate for the template/default org (platform + that org’s override). */
    effectiveSample: {
      ugxPerTon: resolved.ugxPerTon,
      source: resolved.source,
      effectiveScope: effective.scope,
      effectiveKind: effective.kind,
    },
    /** As if the org fully inherits: shows platform rule applied to live/DB fallback. */
    platformPreview: {
      ugxPerTon: platformPreview.ugxPerTon,
      source: platformPreview.source,
      effectiveScope: platformOnlyEffective.scope,
      effectiveKind: platformOnlyEffective.kind,
    },
  });
}

export async function PATCH(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = PlatformFxPatch.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const kind = parsed.data.fxOverrideKind;
  const data: {
    fxOverrideKind: string;
    fxOverrideUgxPerTon: number | null;
    fxOverrideBufferPct: number;
  } = {
    fxOverrideKind: kind,
    fxOverrideUgxPerTon: null,
    fxOverrideBufferPct: 0,
  };

  if (kind === "fixed") {
    data.fxOverrideUgxPerTon = parsed.data.fxOverrideUgxPerTon!;
    data.fxOverrideBufferPct = parsed.data.fxOverrideBufferPct ?? 0;
  } else if (kind === "buffer_pct") {
    data.fxOverrideUgxPerTon = parsed.data.fxOverrideUgxPerTon ?? null;
    data.fxOverrideBufferPct = parsed.data.fxOverrideBufferPct!;
  }

  const updated = await prisma.siteUiSettings.upsert({
    where: { key: "platform" },
    create: {
      key: "platform",
      fxOverrideKind: data.fxOverrideKind,
      fxOverrideUgxPerTon: data.fxOverrideUgxPerTon,
      fxOverrideBufferPct: data.fxOverrideBufferPct,
    },
    update: {
      fxOverrideKind: data.fxOverrideKind,
      fxOverrideUgxPerTon: data.fxOverrideUgxPerTon,
      fxOverrideBufferPct: data.fxOverrideBufferPct,
    },
    select: {
      fxOverrideKind: true,
      fxOverrideUgxPerTon: true,
      fxOverrideBufferPct: true,
    },
  });

  return NextResponse.json({ platform: updated });
}
