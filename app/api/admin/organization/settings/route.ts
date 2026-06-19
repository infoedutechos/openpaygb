import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveOrgAdminOrganization } from "@/lib/admin-school-org";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

const PatchBody = z.object({
  currentAcademicYearLabel: z.string().max(40).optional(),
});

export async function GET() {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await resolveOrgAdminOrganization(admin);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const org = await prisma.organization.findUnique({
      where: { id: scope.organizationId },
      select: {
        slug: true,
        name: true,
        institutionTier: true,
        currentAcademicYearLabel: true,
        faviconUploadedAt: true,
        registrationWebsiteUrl: true,
      },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      slug: org.slug,
      name: org.name,
      institutionTier: org.institutionTier,
      currentAcademicYearLabel: org.currentAcademicYearLabel?.trim() ?? "",
      hasFavicon: Boolean(org.faviconUploadedAt),
      faviconUploadedAt: org.faviconUploadedAt?.toISOString() ?? null,
      faviconUrl: org.faviconUploadedAt
        ? `/api/org/${encodeURIComponent(org.slug)}/favicon?v=${encodeURIComponent(org.faviconUploadedAt.toISOString())}`
        : null,
      registrationWebsiteUrl: org.registrationWebsiteUrl?.trim() ?? "",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/organization/settings" });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await resolveOrgAdminOrganization(admin);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: scope.organizationId },
      select: { institutionTier: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const data: { currentAcademicYearLabel?: string } = {};
    if (parsed.data.currentAcademicYearLabel !== undefined) {
      if (org.institutionTier !== "school") {
        return NextResponse.json(
          { error: "Academic year label is only editable for school workspaces." },
          { status: 403 },
        );
      }
      data.currentAcademicYearLabel = parsed.data.currentAcademicYearLabel.trim();
    }

    const updated = await prisma.organization.update({
      where: { id: scope.organizationId },
      data,
      select: {
        slug: true,
        currentAcademicYearLabel: true,
        faviconUploadedAt: true,
      },
    });

    return NextResponse.json({
      slug: updated.slug,
      currentAcademicYearLabel: updated.currentAcademicYearLabel?.trim() ?? "",
      hasFavicon: Boolean(updated.faviconUploadedAt),
      faviconUploadedAt: updated.faviconUploadedAt?.toISOString() ?? null,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/organization/settings" });
  }
}
