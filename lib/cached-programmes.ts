import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const PROGRAMMES_REVALIDATE_SEC = 60;

export function getCachedProgrammesForOrganization(organizationId: string) {
  return unstable_cache(
    async () =>
      prisma.programme.findMany({
        where: { organizationId },
        orderBy: { code: "asc" },
        include: { fees: true, _count: { select: { fees: true } } },
      }),
    ["programmes-list", organizationId],
    { revalidate: PROGRAMMES_REVALIDATE_SEC, tags: [`programmes:${organizationId}`] },
  )();
}

export function revalidateProgrammesCache(organizationId: string) {
  try {
    revalidateTag(`programmes:${organizationId}`);
  } catch {
    /* Vitest / scripts run outside Next static generation store */
  }
}
