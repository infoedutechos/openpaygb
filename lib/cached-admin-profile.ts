import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";

const ADMIN_PROFILE_REVALIDATE_SEC = 30;

export function getCachedAdminProfile(adminUserId: string) {
  return unstable_cache(
    async () =>
      withPrismaRetry(() =>
        prisma.adminUser.findUnique({
          where: { id: adminUserId },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                institutionTier: true,
                registrationContactEmail: true,
                registrationEmailVerifiedAt: true,
              },
            },
          },
        }),
      ),
    ["admin-profile", adminUserId],
    { revalidate: ADMIN_PROFILE_REVALIDATE_SEC, tags: [`admin:${adminUserId}`] },
  )();
}

export function revalidateAdminProfile(adminUserId: string) {
  try {
    revalidateTag(`admin:${adminUserId}`);
  } catch {
    /* Vitest / scripts run outside Next static generation store */
  }
}
