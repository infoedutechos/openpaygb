import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

const PatchBody = z.object({
  amountUgx: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = PatchBody.parse(await req.json());
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const charge = await prisma.studentBillCharge.updateMany({
      where: { id, organizationId: auth.scope.organizationId },
      data: {
        ...(body.amountUgx !== undefined ? { amountUgx: body.amountUgx } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    if (charge.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/bills/[id]" });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const result = await prisma.studentBillCharge.deleteMany({
      where: { id, organizationId: auth.scope.organizationId },
    });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/bills/[id]" });
  }
}
