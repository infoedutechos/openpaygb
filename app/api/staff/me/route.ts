import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffFromCookies } from "@/lib/staff-auth";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getStaffFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.schoolStaff.findFirst({
      where: { id: session.sub, organizationId: session.organizationId },
      include: {
        organization: { select: { name: true, slug: true, institutionTier: true } },
        salaryPayments: {
          orderBy: { monthKey: "desc" },
          take: 24,
          select: {
            id: true,
            monthKey: true,
            grossUgx: true,
            deductionUgx: true,
            netUgx: true,
            paidAt: true,
          },
        },
      },
    });
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      staff: {
        id: staff.id,
        name: staff.name,
        staffCode: staff.staffCode,
        phone: staff.phone,
        email: staff.email,
        address: staff.address,
        sex: staff.sex,
        dateOfBirth: staff.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        employmentDate: staff.employmentDate?.toISOString().slice(0, 10) ?? null,
        duty: staff.duty,
        salaryUgx: staff.salaryUgx,
        status: staff.status,
        portalSignInEnabled: Boolean(staff.portalPasswordHash),
        lastLoginAt: staff.lastLoginAt?.toISOString() ?? null,
        previousLoginAt: staff.previousLoginAt?.toISOString() ?? null,
        organizationName: staff.organization.name,
        organizationSlug: staff.organization.slug,
        institutionTier: staff.organization.institutionTier,
        salaryPayments: staff.salaryPayments.map((p) => ({
          id: p.id,
          monthKey: p.monthKey,
          grossUgx: p.grossUgx,
          deductionUgx: p.deductionUgx,
          netUgx: p.netUgx,
          paidAt: p.paidAt?.toISOString() ?? null,
        })),
      },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/staff/me" });
  }
}
