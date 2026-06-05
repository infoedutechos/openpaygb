import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { withPrismaRetry } from "@/lib/prisma-retry";

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
  const row = await withPrismaRetry(() =>
    prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { organizationId: true },
    }),
  );
  const organizationId = row?.organizationId ?? (await getDefaultOrganizationId());
  return { organizationId };
}

/** Tuition admin (master or org_admin for the same tenant) may resume guest checkout for a student. */
export async function adminCanAccessStudentOrganization(
  adminId: string,
  role: AdminRole,
  studentOrganizationId: string,
): Promise<boolean> {
  if (role === "master") return true;
  const scope = await organizationWhereForSession(adminId, role);
  if (!("organizationId" in scope)) return true;
  return scope.organizationId === studentOrganizationId;
}
