import type { AdminRole } from "@prisma/client";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveOrganizationIdForProgrammeAdmin } from "@/lib/admin-programmes-scope";
import { prisma } from "@/lib/prisma";
import { loadSchoolOrgContext } from "@/lib/school-org-context";

/**
 * HR / Staff module scope — schools and higher institutions (any active tenant).
 */
export async function requireStaffHrAdminScope(organizationSlug?: string | null) {
  const admin = await getAdminFromCookies();
  if (!admin) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }
  const resolved = await resolveOrganizationIdForProgrammeAdmin(admin, organizationSlug ?? null);
  if (!resolved.ok) {
    return { ok: false as const, status: resolved.status, error: resolved.error };
  }
  const org = await prisma.organization.findUnique({
    where: { id: resolved.organizationId },
    select: {
      id: true,
      slug: true,
      institutionTier: true,
      currentAcademicYearLabel: true,
      name: true,
    },
  });
  if (!org) {
    return { ok: false as const, status: 404, error: "Organization not found" };
  }
  const context = await loadSchoolOrgContext(org.id);
  return {
    ok: true as const,
    admin: admin as { sub: string; role: AdminRole },
    scope: {
      organizationId: org.id,
      slug: org.slug,
      institutionTier: org.institutionTier as "school" | "university",
      name: org.name,
    },
    context,
  };
}
