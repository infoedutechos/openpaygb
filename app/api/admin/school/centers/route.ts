import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

/** School centres / campuses available for the signed-in school admin (self + child units). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const org = await prisma.organization.findUnique({
      where: { id: auth.scope.organizationId },
      select: {
        id: true,
        slug: true,
        name: true,
        unitKind: true,
        parentOrganizationId: true,
        childOrganizations: {
          where: { institutionTier: "school", tenantStatus: "active" },
          select: { id: true, slug: true, name: true, unitKind: true },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const centers = [
      {
        id: org.id,
        slug: org.slug,
        name: org.name,
        unitKind: org.unitKind,
        isCurrent: true,
      },
      ...org.childOrganizations.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        unitKind: c.unitKind,
        isCurrent: false,
      })),
    ];

    return NextResponse.json({
      centers,
      currentSlug: org.slug,
      currentName: org.name,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/centers" });
  }
}
