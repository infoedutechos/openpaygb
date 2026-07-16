import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  availableQty: z.number().int().min(0).optional(),
  unavailableQty: z.number().int().min(0).optional(),
  unitCostUgx: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = PatchBody.parse(await req.json());
    const auth = await requireSchoolAdminScope(new URL(req.url).searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const result = await prisma.schoolInventoryItem.updateMany({
      where: { id, organizationId: auth.scope.organizationId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.availableQty !== undefined ? { availableQty: body.availableQty } : {}),
        ...(body.unavailableQty !== undefined ? { unavailableQty: body.unavailableQty } : {}),
        ...(body.unitCostUgx !== undefined ? { unitCostUgx: body.unitCostUgx } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/inventory/[id]" });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const auth = await requireSchoolAdminScope(new URL(req.url).searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const result = await prisma.schoolInventoryItem.deleteMany({
      where: { id, organizationId: auth.scope.organizationId },
    });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/inventory/[id]" });
  }
}
