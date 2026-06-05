import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const LIMIT = 8;

export async function GET(req: Request) {
  try {
    if (rateLimitHit(`admin-search:${clientIp(req)}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
    }

    const orgSlugParam = url.searchParams.get("orgSlug")?.trim().toLowerCase() ?? "";
    const orgWhere = await organizationWhereForSession(admin.sub, admin.role);

    let scopedOrgId: string | null = null;
    if (orgSlugParam) {
      if (admin.role !== "master") {
        return NextResponse.json({ error: "orgSlug filter is for platform masters only" }, { status: 403 });
      }
      const org = await prisma.organization.findUnique({
        where: { slug: orgSlugParam },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json({ error: "Unknown workspace slug" }, { status: 404 });
      }
      scopedOrgId = org.id;
    } else if ("organizationId" in orgWhere) {
      scopedOrgId = orgWhere.organizationId;
    }

    const studentWhere = {
      ...(scopedOrgId ? { organizationId: scopedOrgId } : orgWhere),
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { programmeCode: { contains: q } },
      ],
    };

    const paymentOr: Record<string, unknown>[] = [
      { student: { name: { contains: q } } },
      { student: { email: { contains: q } } },
    ];
    if (/^[0-9a-fA-F]{24}$/.test(q)) {
      paymentOr.unshift({ id: q });
    }

    const paymentWhere = {
      ...(scopedOrgId ? { organizationId: scopedOrgId } : orgWhere),
      OR: paymentOr,
    };

    const [organizations, students, payments] = await Promise.all([
      admin.role === "master" && !scopedOrgId
        ? prisma.organization.findMany({
            where: {
              OR: [
                { name: { contains: q } },
                { slug: { contains: q } },
              ],
            },
            take: LIMIT,
            orderBy: { name: "asc" },
            select: { id: true, name: true, slug: true, tenantStatus: true },
          })
        : Promise.resolve([]),
      prisma.student.findMany({
        where: studentWhere,
        take: LIMIT,
        orderBy: { createdAt: "desc" },
        include: { organization: { select: { slug: true } } },
      }),
      prisma.payment.findMany({
        where: paymentWhere,
        take: LIMIT,
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { name: true } },
          organization: { select: { slug: true } },
        },
      }),
    ]);

    return NextResponse.json({
      organizations,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        programmeCode: s.programmeCode,
        orgSlug: s.organization.slug,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        status: p.status,
        studentName: p.student.name,
        orgSlug: p.organization.slug,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/search", fallback: "Search failed" });
  }
}
