import { OrganizationTenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cloneProgrammesAndFxFromTemplate } from "@/lib/org-provision";
import { revalidateOrganizationCaches } from "@/lib/revalidate-organizations";

/**
 * Approve a pending school workspace: clone programmes/FX from template and set active.
 * Idempotent when the org is already active.
 */
export async function activatePendingOrganizationWorkspace(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    throw new Error("Organization not found");
  }
  if (org.slug === "default") {
    throw new Error('Cannot activate the template organization "default"');
  }
  if (org.tenantStatus === OrganizationTenantStatus.active) {
    return org;
  }
  if (org.tenantStatus !== OrganizationTenantStatus.pending) {
    throw new Error("Only pending tenants can be activated");
  }

  await cloneProgrammesAndFxFromTemplate(organizationId);
  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { tenantStatus: OrganizationTenantStatus.active },
  });
  revalidateOrganizationCaches(updated.slug, updated.id);
  return updated;
}
