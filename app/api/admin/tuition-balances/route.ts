import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { organizationWhereForSession } from "@/lib/admin-org-scope";
import { prisma } from "@/lib/prisma";
import { getStudentBalanceSummary } from "@/lib/tuition-balance";
import { summarizeOutstandingUgx } from "@/lib/tuition-balance-compact";
import { serializeStudentBalance } from "@/lib/tuition-balance-json";
import { apiErrorResponse } from "@/lib/api-error";

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const rows = await Promise.all(chunk.map(fn));
    out.push(...rows);
  }
  return out;
}

/** Admin: students with tuition balance summaries (paid vs remaining). */
export async function GET(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "60") || 60, 120);
    const organizationSlug = url.searchParams.get("organizationSlug")?.trim().toLowerCase() ?? "";

    const orgWhere = await organizationWhereForSession(admin.sub, admin.role);

    let tenantFilter: { organizationId: string } | Record<string, never> = {};
    if (organizationSlug) {
      if (admin.role !== "master") {
        return NextResponse.json(
          { error: "organizationSlug filter is only available to platform masters" },
          { status: 403 },
        );
      }
      const org = await prisma.organization.findFirst({
        where: { slug: organizationSlug },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json({ error: "Unknown organization slug" }, { status: 400 });
      }
      tenantFilter = { organizationId: org.id };
    }

    const students = await prisma.student.findMany({
      where: {
        ...orgWhere,
        ...tenantFilter,
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { phone: { contains: q } },
                { programmeCode: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { organization: { select: { slug: true, name: true } } },
    });

    const rows = await mapPool(students, 8, async (s) => {
      const summary = await getStudentBalanceSummary({
        studentId: s.id,
        organizationId: s.organizationId,
        programmeCode: s.programmeCode,
        year: s.year,
        semester: s.semester,
      });
      const outstandingUgx = summary ? summarizeOutstandingUgx(summary) : 0;
      const activeInstallmentPlans = summary?.installmentPlans.length ?? 0;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        programmeCode: s.programmeCode,
        year: s.year,
        semester: s.semester,
        organizationSlug: s.organization.slug,
        organizationName: s.organization.name,
        outstandingUgx,
        activeInstallmentPlans,
        progress: summary?.progress ?? null,
        balance: summary ? serializeStudentBalance(summary) : null,
      };
    });

    rows.sort((a, b) => b.outstandingUgx - a.outstandingUgx);

    return NextResponse.json({
      students: rows,
      isMaster: admin.role === "master",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/tuition-balances" });
  }
}
