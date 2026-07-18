import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SchoolStaffSex, SchoolStaffStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireStaffHrAdminScope } from "@/lib/staff-admin-api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const body = z
      .object({
        organizationSlug: z.string().optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        sex: z.nativeEnum(SchoolStaffSex).optional(),
        employmentDate: z.string().optional(),
        duty: z.string().optional(),
        salaryUgx: z.number().int().min(0).optional(),
        status: z.nativeEnum(SchoolStaffStatus).optional(),
        portalPassword: z.string().min(8).max(128).optional().or(z.literal("")),
        clearPortalPassword: z.boolean().optional(),
      })
      .parse(await req.json());
    const auth = await requireStaffHrAdminScope(
      body.organizationSlug ?? url.searchParams.get("organizationSlug"),
    );
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let portalPasswordHash: string | null | undefined;
    if (body.clearPortalPassword) {
      portalPasswordHash = null;
    } else if (body.portalPassword?.trim()) {
      portalPasswordHash = await bcrypt.hash(body.portalPassword.trim(), 10);
    }

    const updated = await prisma.schoolStaff.updateMany({
      where: { id, organizationId: auth.scope.organizationId },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
        ...(body.email !== undefined ? { email: body.email.trim() } : {}),
        ...(body.address !== undefined ? { address: body.address.trim() } : {}),
        ...(body.sex ? { sex: body.sex } : {}),
        ...(body.employmentDate ? { employmentDate: new Date(body.employmentDate) } : {}),
        ...(body.duty !== undefined ? { duty: body.duty.trim() } : {}),
        ...(body.salaryUgx !== undefined ? { salaryUgx: body.salaryUgx } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(portalPasswordHash !== undefined ? { portalPasswordHash } : {}),
      },
    });
    if (updated.count === 0) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/staff/[id]" });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const auth = await requireStaffHrAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await prisma.schoolStaff.updateMany({
      where: { id, organizationId: auth.scope.organizationId },
      data: { status: SchoolStaffStatus.inactive },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/staff/[id]" });
  }
}
