import { NextResponse } from "next/server";
import { z } from "zod";
import { SchoolStaffSex, SchoolStaffStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireStaffHrAdminScope } from "@/lib/staff-admin-api";
import { allocateStaffCode } from "@/lib/staff-code";

const CreateBody = z.object({
  organizationSlug: z.string().optional(),
  staffCode: z.string().max(32).optional().or(z.literal("")),
  name: z.string().min(1).max(120),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  sex: z.nativeEnum(SchoolStaffSex).optional(),
  employmentDate: z.string().optional(),
  duty: z.string().optional(),
  salaryUgx: z.number().int().min(0).optional(),
  status: z.nativeEnum(SchoolStaffStatus).optional(),
  /** Optional portal password (min 8) so staff can sign in with Staff ID. */
  portalPassword: z.string().min(8).max(128).optional().or(z.literal("")),
});

function serializeStaff(s: {
  id: string;
  staffCode: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  sex: SchoolStaffSex;
  employmentDate: Date | null;
  duty: string;
  salaryUgx: number;
  status: SchoolStaffStatus;
  portalPasswordHash: string | null;
}) {
  return {
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
    portalSignInEnabled: Boolean(s.portalPasswordHash),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug") ?? undefined;
    const status = url.searchParams.get("status") as SchoolStaffStatus | null;
    const auth = await requireStaffHrAdminScope(organizationSlug);
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
      staff: staff.map(serializeStaff),
      totalSalaryUgx: totalSalary,
      institutionTier: auth.scope.institutionTier,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/staff" });
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateBody.parse(await req.json());
    const auth = await requireStaffHrAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let staffCode = body.staffCode?.trim().toUpperCase() ?? "";
    if (!staffCode) {
      staffCode = await allocateStaffCode(auth.scope.organizationId);
    }

    const portalPassword = body.portalPassword?.trim() ?? "";
    const portalPasswordHash = portalPassword ? await bcrypt.hash(portalPassword, 10) : null;

    const staff = await prisma.schoolStaff.create({
      data: {
        organizationId: auth.scope.organizationId,
        staffCode,
        name: body.name.trim(),
        phone: body.phone?.trim() ?? "",
        email: body.email?.trim() ?? "",
        address: body.address?.trim() ?? "",
        sex: body.sex ?? SchoolStaffSex.other,
        employmentDate: body.employmentDate ? new Date(body.employmentDate) : null,
        duty: body.duty?.trim() ?? "",
        salaryUgx: body.salaryUgx ?? 0,
        status: body.status ?? SchoolStaffStatus.active,
        portalPasswordHash,
      },
    });

    return NextResponse.json({
      id: staff.id,
      staffCode: staff.staffCode,
      portalSignInEnabled: Boolean(portalPasswordHash),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/staff" });
  }
}
