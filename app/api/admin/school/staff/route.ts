import { NextResponse } from "next/server";
import { z } from "zod";
import { SchoolStaffSex, SchoolStaffStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

const CreateBody = z.object({
  organizationSlug: z.string().optional(),
  staffCode: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  sex: z.nativeEnum(SchoolStaffSex).optional(),
  employmentDate: z.string().optional(),
  duty: z.string().optional(),
  salaryUgx: z.number().int().min(0).optional(),
  status: z.nativeEnum(SchoolStaffStatus).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug") ?? undefined;
    const status = url.searchParams.get("status") as SchoolStaffStatus | null;
    const auth = await requireSchoolAdminScope(organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const staff = await prisma.schoolStaff.findMany({
      where: {
        organizationId: auth.scope.organizationId,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    const totalSalary = staff.filter((s) => s.status === "active").reduce((sum, s) => sum + s.salaryUgx, 0);

    return NextResponse.json({
      staff: staff.map((s) => ({
        id: s.id,
        staffCode: s.staffCode,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        sex: s.sex,
        employmentDate: s.employmentDate?.toISOString().slice(0, 10) ?? null,
        duty: s.duty,
        salaryUgx: s.salaryUgx,
        status: s.status,
      })),
      totalSalaryUgx: totalSalary,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/staff" });
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateBody.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const staff = await prisma.schoolStaff.create({
      data: {
        organizationId: auth.scope.organizationId,
        staffCode: body.staffCode.trim().toUpperCase(),
        name: body.name.trim(),
        phone: body.phone?.trim() ?? "",
        email: body.email?.trim() ?? "",
        address: body.address?.trim() ?? "",
        sex: body.sex ?? SchoolStaffSex.other,
        employmentDate: body.employmentDate ? new Date(body.employmentDate) : null,
        duty: body.duty?.trim() ?? "",
        salaryUgx: body.salaryUgx ?? 0,
        status: body.status ?? SchoolStaffStatus.active,
      },
    });

    return NextResponse.json({ id: staff.id });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/staff" });
  }
}
