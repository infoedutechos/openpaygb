import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDefaultOrganizationId } from "@/lib/default-organization";

/**
 * Prisma `where` fragment for tenant-scoped models (`Student`, `Payment`, …).
 *
 * - **`master`**: `{}` — no `organizationId` filter; tuition admin APIs and pages can read **every** school.
 * - **`org_admin`**: `{ organizationId }` from the admin row (fallback: default org).
 *
 * Optional `organizationSlug` on list routes further narrows **masters only** to one tenant.
 */
export async function organizationWhereForSession(
  adminId: string,
  role: AdminRole
): Promise<Record<string, never> | { organizationId: string }> {
  if (role === "master") return {};
  const row = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { organizationId: true },
  });
  const organizationId = row?.organizationId ?? (await getDefaultOrganizationId());
  return { organizationId };
}
