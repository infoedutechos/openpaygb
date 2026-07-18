import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { getDefaultOrganizationId } from "@/lib/default-organization";
import { prisma } from "@/lib/prisma";
import { allocateAdmissionNo } from "@/lib/admission-no";
import { apiErrorResponse } from "@/lib/api-error";

/** Preview / allocate next admission number for the admin's organization. */
export async function GET(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: admin.sub },
      select: { organizationId: true, role: true },
    });
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let organizationId = adminUser.organizationId;
    const slug = new URL(req.url).searchParams.get("organizationSlug")?.trim().toLowerCase();
    if (adminUser.role === "master" && slug) {
      const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
      if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      organizationId = org.id;
    }
    if (!organizationId) organizationId = await getDefaultOrganizationId();

    const admissionNo = await allocateAdmissionNo(organizationId);
    return NextResponse.json({ admissionNo });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/students/next-admission",
      fallback: "Could not allocate admission number",
    });
  }
}
