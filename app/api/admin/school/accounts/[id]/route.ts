import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = z
      .object({ name: z.string().min(1).max(120).optional(), enabled: z.boolean().optional() })
      .parse(await req.json());
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const updated = await prisma.schoolAccount.updateMany({
      where: { id, organizationId: auth.scope.organizationId },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      },
    });
    if (updated.count === 0) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/accounts/[id]" });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const deleted = await prisma.schoolAccount.deleteMany({
      where: { id, organizationId: auth.scope.organizationId },
    });
    if (deleted.count === 0) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/accounts/[id]" });
  }
}
