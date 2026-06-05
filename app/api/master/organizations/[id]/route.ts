import { NextResponse } from "next/server";
import { z } from "zod";
import { OrganizationTenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { activatePendingOrganizationWorkspace } from "@/lib/org-activate-pending";
import { revalidateOrganizationCaches } from "@/lib/revalidate-organizations";
import { workspaceEmailVerificationRequired } from "@/lib/organization-workspace-verify";
import { apiErrorResponse } from "@/lib/api-error";

const PatchBody = z.object({
  action: z.enum(["approve", "reject", "reopen"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.slug === "default") {
    return NextResponse.json({ error: "Cannot change the template organization this way" }, { status: 400 });
  }

  if (parsed.data.action === "reject") {
    if (org.tenantStatus !== OrganizationTenantStatus.pending) {
      return NextResponse.json(
        { error: "Only pending tenants can be rejected" },
        { status: 400 }
      );
    }
    const updated = await prisma.organization.update({
      where: { id },
      data: { tenantStatus: OrganizationTenantStatus.rejected },
    });
    revalidateOrganizationCaches(org.slug);
    return NextResponse.json({ organization: updated });
  }

  if (parsed.data.action === "reopen") {
    if (org.tenantStatus !== OrganizationTenantStatus.rejected) {
      return NextResponse.json(
        { error: "Only rejected tenants can be reopened to pending review" },
        { status: 400 },
      );
    }
    const updated = await prisma.organization.update({
      where: { id },
      data: { tenantStatus: OrganizationTenantStatus.pending },
    });
    revalidateOrganizationCaches(org.slug);
    return NextResponse.json({
      organization: updated,
      message:
        "Workspace reopened as pending. Applicant may need to verify email again if not already verified; you can approve when ready.",
    });
  }

  // approve
  if (workspaceEmailVerificationRequired(org)) {
    return NextResponse.json(
      {
        error:
          "Applicant has not verified their registration email yet. They must click the ODEL HUB link in their inbox before workspace approval.",
      },
      { status: 400 },
    );
  }

  if (org.tenantStatus !== OrganizationTenantStatus.pending) {
    if (org.tenantStatus === OrganizationTenantStatus.active) {
      return NextResponse.json({ organization: org });
    }
    return NextResponse.json(
      { error: "Only pending tenants can be approved" },
      { status: 400 }
    );
  }

  try {
    const updated = await activatePendingOrganizationWorkspace(id);
    return NextResponse.json({ organization: updated });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "master/organizations",
      fallback: "Provision failed",
    });
  }
}
