import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOrganizationIdForProgrammeAdmin } from "@/lib/admin-programmes-scope";

export type SchoolOrgScope =
  | {
      ok: true;
      organizationId: string;
      slug: string;
      institutionTier: "school" | "university";
      currentAcademicYearLabel: string;
      hasFavicon: boolean;
      faviconUploadedAt: string | null;
    }
  | { ok: false; status: number; error: string };

export async function resolveSchoolAdminOrganization(
  admin: { sub: string; role: AdminRole },
  organizationSlug: string | null | undefined,
): Promise<SchoolOrgScope> {
  const resolved = await resolveOrganizationIdForProgrammeAdmin(admin, organizationSlug ?? null);
  if (!resolved.ok) {
    return { ok: false, status: resolved.status, error: resolved.error };
  }

  const org = await prisma.organization.findUnique({
    where: { id: resolved.organizationId },
    select: {
      id: true,
      slug: true,
      institutionTier: true,
      currentAcademicYearLabel: true,
      faviconUploadedAt: true,
    },
  });
  if (!org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }
  if (org.institutionTier !== "school") {
    return {
      ok: false,
      status: 403,
      error: "School structure is only available for primary and secondary school workspaces.",
    };
  }

  return {
    ok: true,
    organizationId: org.id,
    slug: org.slug,
    institutionTier: org.institutionTier,
    currentAcademicYearLabel: org.currentAcademicYearLabel?.trim() ?? "",
    hasFavicon: Boolean(org.faviconUploadedAt),
    faviconUploadedAt: org.faviconUploadedAt?.toISOString() ?? null,
  };
}

/** Org admin favicon upload scope — any active tenant tier. */
export async function resolveOrgAdminOrganization(
  admin: { sub: string; role: AdminRole },
): Promise<
  | { ok: true; organizationId: string; slug: string; hasFavicon: boolean; faviconUploadedAt: string | null }
  | { ok: false; status: number; error: string }
> {
  const resolved = await resolveOrganizationIdForProgrammeAdmin(admin, null);
  if (!resolved.ok) {
    return { ok: false, status: resolved.status, error: resolved.error };
  }

  const org = await prisma.organization.findUnique({
    where: { id: resolved.organizationId },
    select: { id: true, slug: true, faviconUploadedAt: true },
  });
  if (!org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }

  return {
    ok: true,
    organizationId: org.id,
    slug: org.slug,
    hasFavicon: Boolean(org.faviconUploadedAt),
    faviconUploadedAt: org.faviconUploadedAt?.toISOString() ?? null,
  };
}
