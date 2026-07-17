import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { prisma } from "@/lib/prisma";
import { ensureSchoolPayCode } from "@/lib/school-pay-code";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/admin/school-pay-code[?organizationSlug=]
 * Returns (allocating on first call) the SchoolPay-style School Code for the
 * admin's organization. Master admins may pass `organizationSlug`.
 */
export async function GET(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: admin.sub },
      select: { organizationId: true, role: true },
    });
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let organizationId = adminUser.organizationId;
    const slugParam = new URL(req.url).searchParams.get("organizationSlug")?.trim().toLowerCase();
    if (adminUser.role === "master" && slugParam) {
      const org = await prisma.organization.findUnique({
        where: { slug: slugParam },
        select: { id: true },
      });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      organizationId = org.id;
    }
    if (!organizationId) {
      organizationId = await getDefaultOrganizationId();
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true, name: true },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const schoolPayCode = await ensureSchoolPayCode(organizationId);
    return NextResponse.json({
      schoolPayCode,
      organizationSlug: org.slug,
      organizationName: org.name,
    });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/admin/school-pay-code",
      fallback: "Could not load School Code",
    });
  }
}
