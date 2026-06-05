import { prisma } from "@/lib/prisma";
import { defaultUgxPerTon } from "@/lib/constants";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { getCachedLiveUgxPerTon } from "@/lib/fx-live";
import {
  getOrgFxOverride,
  getPlatformFxOverride,
  mergeFxOverrides,
  resolveFxWithOverride,
} from "@/lib/fx-override";

const PERSIST_MIN_INTERVAL_MS = Number(process.env.FX_PERSIST_MIN_INTERVAL_MS ?? String(60 * 60 * 1000));
const PERSIST_MIN_DELTA_RATIO = Number(process.env.FX_PERSIST_MIN_DELTA_RATIO ?? "0.005");

async function persistFxRateIfNeeded(
  organizationId: string,
  ugxPerTon: number,
  source: string,
): Promise<void> {
  const latest = await prisma.fxRate.findFirst({
    where: { organizationId },
    orderBy: { effectiveAt: "desc" },
  });
  if (latest) {
    const age = Date.now() - latest.effectiveAt.getTime();
    const delta =
      latest.ugxPerTon > 0 ? Math.abs(latest.ugxPerTon - ugxPerTon) / latest.ugxPerTon : 1;
    if (age < PERSIST_MIN_INTERVAL_MS && delta < PERSIST_MIN_DELTA_RATIO) return;
  }
  await prisma.fxRate.create({
    data: {
      organizationId,
      ugxPerTon,
      source,
      effectiveAt: new Date(),
    },
  });
}

async function dbFallbackUgxPerTon(organizationId: string): Promise<{ ugxPerTon: number; source: string }> {
  const latest = await prisma.fxRate.findFirst({
    where: { organizationId },
    orderBy: { effectiveAt: "desc" },
  });
  if (latest && latest.ugxPerTon > 0) {
    return { ugxPerTon: latest.ugxPerTon, source: latest.source ?? "db" };
  }
  return { ugxPerTon: defaultUgxPerTon(), source: "env_default" };
}

/** Latest FX for an organization: master override, then live market, then DB, then env default. */
export async function getActiveUgxPerTonForOrganization(
  organizationId: string,
): Promise<{ ugxPerTon: number; source: string }> {
  const [platform, org, live, dbFallback] = await Promise.all([
    getPlatformFxOverride(),
    getOrgFxOverride(organizationId),
    getCachedLiveUgxPerTon(),
    dbFallbackUgxPerTon(organizationId),
  ]);

  const effective = mergeFxOverrides(platform, org);
  const resolved = await resolveFxWithOverride(effective, live, dbFallback.ugxPerTon);

  const persistSource = resolved.source === "coingecko" ? "coingecko" : resolved.source;
  void persistFxRateIfNeeded(organizationId, resolved.ugxPerTon, persistSource).catch(() => {});

  return { ugxPerTon: resolved.ugxPerTon, source: resolved.source };
}

/** Back-compat: uses the default template org latest FX (or env default). */
export async function getActiveUgxPerTon(): Promise<{ ugxPerTon: number; source: string }> {
  const orgId = await getDefaultOrganizationId();
  return getActiveUgxPerTonForOrganization(orgId);
}
