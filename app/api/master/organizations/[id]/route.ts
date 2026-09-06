import { NextResponse } from "next/server";
import { z } from "zod";
import { OrganizationTenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { activatePendingOrganizationWorkspace } from "@/lib/org-activate-pending";
import { revalidateOrganizationCaches } from "@/lib/revalidate-organizations";
import { workspaceEmailVerificationRequired } from "@/lib/organization-workspace-verify";
import { normalizeRegistrationContactEmail } from "@/lib/organization-intake";
import { apiErrorResponse } from "@/lib/api-error";

const ActionBody = z.object({
  action: z.enum(["approve", "reject", "reopen"]),
});

const ProfileBody = z.object({
  name: z.string().min(2).max(120).optional(),
  registrationContactEmail: z.string().email().optional().or(z.literal("")),
  registrationNote: z.string().max(2000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if ("action" in json) {
    const parsed = ActionBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if (org.slug === "default") {
      return NextResponse.json({ error: "Cannot change the template organization this way" }, { status: 400 });
    }

    if (parsed.data.action === "reject") {
      if (org.tenantStatus !== OrganizationTenantStatus.pending) {
        return NextResponse.json({ error: "Only pending tenants can be rejected" }, { status: 400 });
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
    const emailUnverified = workspaceEmailVerificationRequired(org);

    if (org.tenantStatus !== OrganizationTenantStatus.pending) {
      if (org.tenantStatus === OrganizationTenantStatus.active) {
        return NextResponse.json({ organization: org });
      }
      return NextResponse.json({ error: "Only pending tenants can be approved" }, { status: 400 });
    }

    try {
      const updated = await activatePendingOrganizationWorkspace(id);
      return NextResponse.json({
        organization: updated,
        ...(emailUnverified
          ? {
              warning:
                "Workspace approved, but the registration email is not verified yet. The school dashboard will show a reminder until they confirm.",
            }
          : {}),
      });
    } catch (e) {
      return apiErrorResponse(e, {
        route: "master/organizations",
        fallback: "Provision failed",
      });
    }
  }

  const parsed = ProfileBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: {
    name?: string;
    registrationContactEmail?: string;
    registrationNote?: string;
    registrationEmailVerifiedAt?: Date;
  } = {};

  if (parsed.data.name !== undefined) {
    data.name = parsed.data.name.trim();
  }
  if (parsed.data.registrationContactEmail !== undefined) {
    const email = normalizeRegistrationContactEmail(parsed.data.registrationContactEmail);
    data.registrationContactEmail = email;
    // Master-edited contact is treated as verified when a valid email is set.
    if (email) {
      data.registrationEmailVerifiedAt = new Date();
    }
  }
  if (parsed.data.registrationNote !== undefined) {
    data.registrationNote = parsed.data.registrationNote.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.organization.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        registrationContactEmail: true,
        registrationNote: true,
        registrationEmailVerifiedAt: true,
        tenantStatus: true,
      },
    });
    revalidateOrganizationCaches(org.slug);
    return NextResponse.json({
      organization: {
        ...updated,
        registrationEmailVerifiedAt: updated.registrationEmailVerifiedAt?.toISOString() ?? null,
      },
      message: "Organization updated.",
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "PATCH /api/master/organizations/[id] profile",
      fallback: "Could not update organization",
    });
  }
}
