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
      .object({
        organizationSlug: z.string().optional(),
        label: z.string().min(1).max(64),
      })
      .parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const updated = await prisma.schoolTerm.updateMany({
      where: { id, organizationId: auth.scope.organizationId },
      data: { label: body.label.trim() },
    });
    if (updated.count === 0) return NextResponse.json({ error: "Term not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/terms/[id]" });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug") ?? undefined;
    const auth = await requireSchoolAdminScope(organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const deleted = await prisma.schoolTerm.deleteMany({
      where: { id, organizationId: auth.scope.organizationId, isActive: false },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Cannot delete active or missing term" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/terms/[id]" });
  }
}
