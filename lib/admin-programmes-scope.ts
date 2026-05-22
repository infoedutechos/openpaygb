import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { organizationWhereForSession } from "@/lib/admin-org-scope";

export type ResolveOrgResult =
  | { ok: true; organizationId: string }
  | { ok: false; status: number; error: string };

/**
 * Resolves target `organizationId` for programme/fee admin APIs.
 * - **org_admin**: always their org (ignores `organizationSlug` from client).
 * - **master**: must pass `organizationSlug` for an **active** tenant.
 */
export async function resolveOrganizationIdForProgrammeAdmin(
  admin: { sub: string; role: AdminRole },
  organizationSlug: string | null | undefined
): Promise<ResolveOrgResult> {
  if (admin.role === "master") {
    const slug = organizationSlug?.trim().toLowerCase();
    if (!slug) {
      return { ok: false, status: 400, error: "organizationSlug query or body is required for platform masters" };
    }
    const org = await prisma.organization.findFirst({
      where: { slug, tenantStatus: "active" },
      select: { id: true },
    });
    if (!org) {
      return { ok: false, status: 404, error: "Organization not found or not active" };
    }
    return { ok: true, organizationId: org.id };
  }

  const orgWhere = await organizationWhereForSession(admin.sub, admin.role);
  if (!("organizationId" in orgWhere)) {
    return { ok: false, status: 500, error: "Expected org-scoped admin" };
  }
  const org = await prisma.organization.findFirst({
    where: { id: orgWhere.organizationId },
    select: { tenantStatus: true, slug: true },
  });
  if (!org) {
    return { ok: false, status: 404, error: "Organization not found" };
  }
  if (org.tenantStatus !== "active") {
    return {
      ok: false,
      status: 403,
      error:
        org.tenantStatus === "pending"
          ? "Your school workspace is pending master approval. Programmes can be edited after approval."
          : "Your school workspace is not active. Contact platform support.",
    };
  }
  return { ok: true, organizationId: orgWhere.organizationId };
}
