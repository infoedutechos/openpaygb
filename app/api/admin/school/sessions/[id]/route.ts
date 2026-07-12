import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = z.object({ label: z.string().min(4).max(32) }).parse(await req.json());
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const session = await prisma.schoolSession.updateMany({
      where: { id, organizationId: auth.scope.organizationId },
      data: { label: body.label.trim() },
    });
    if (session.count === 0) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/sessions/[id]" });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const deleted = await prisma.schoolSession.deleteMany({
      where: { id, organizationId: auth.scope.organizationId, isActive: false },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Cannot delete active or missing session" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/sessions/[id]" });
  }
}
