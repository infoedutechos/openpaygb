import { OrganizationTenantStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cloneProgrammesAndFxFromTemplate } from "@/lib/org-provision";
import { revalidateOrganizationCaches } from "@/lib/revalidate-organizations";
import { fetchFaviconFromWebsite } from "@/lib/fetch-remote-favicon";
import { maybeProvisionSchoolOrgAdmin } from "@/lib/provision-school-org-admin";
import { provisionSchoolErpDefaults } from "@/lib/school-org-provision";

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

  const before = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { registrationWebsiteUrl: true, faviconUploadedAt: true },
  });

  let faviconBytes: Uint8Array | null = null;
  if (!before?.faviconUploadedAt && before?.registrationWebsiteUrl?.trim()) {
    const favicon = await fetchFaviconFromWebsite(before.registrationWebsiteUrl);
    if (favicon) faviconBytes = new Uint8Array(favicon);
  }

  const data: Prisma.OrganizationUpdateInput = {
    tenantStatus: OrganizationTenantStatus.active,
  };
  if (faviconBytes) {
    data.faviconIco = faviconBytes as Uint8Array<ArrayBuffer>;
    data.faviconUploadedAt = new Date();
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data,
  });
  revalidateOrganizationCaches(updated.slug, updated.id);

  try {
    await provisionSchoolErpDefaults(organizationId);
  } catch (e) {
    console.warn("[org-activate] school ERP provision failed", e);
  }

  try {
    await maybeProvisionSchoolOrgAdmin(organizationId);
  } catch (e) {
    console.warn("[org-activate] auto org_admin provision failed", e);
  }

  return updated;
}
