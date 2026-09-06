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
        name: z.string().min(1).max(120).optional(),
        enabled: z.boolean().optional(),
        defaultAmountUgx: z.number().int().min(0).optional(),
      })
      .parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const updated = await prisma.schoolAccount.updateMany({
      where: { id, organizationId: auth.scope.organizationId },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.defaultAmountUgx !== undefined ? { defaultAmountUgx: body.defaultAmountUgx } : {}),
      },
    });
    if (updated.count === 0) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/accounts/[id]" });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Soft-disable if bills reference the account; hard-delete when unused.
    const chargeCount = await prisma.studentBillCharge.count({
      where: { schoolAccountId: id, organizationId: auth.scope.organizationId },
    });
    if (chargeCount > 0) {
      const disabled = await prisma.schoolAccount.updateMany({
        where: { id, organizationId: auth.scope.organizationId },
        data: { enabled: false },
      });
      if (disabled.count === 0) return NextResponse.json({ error: "Account not found" }, { status: 404 });
      return NextResponse.json({
        ok: true,
        disabled: true,
        message: "Fee head has existing bills — disabled instead of deleted.",
      });
    }

    const deleted = await prisma.schoolAccount.deleteMany({
      where: { id, organizationId: auth.scope.organizationId },
    });
    if (deleted.count === 0) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/accounts/[id]" });
  }
}
