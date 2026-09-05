import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { organizationSlug?: string };
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const term = await prisma.schoolTerm.findFirst({
      where: { id, organizationId: auth.scope.organizationId },
    });
    if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.schoolTerm.updateMany({
        where: { organizationId: auth.scope.organizationId },
        data: { isActive: false },
      }),
      prisma.schoolTerm.update({ where: { id }, data: { isActive: true } }),
      prisma.organization.update({
        where: { id: auth.scope.organizationId },
        data: {
          activeSchoolTermId: id,
          activeSchoolTerm: term.termNumber,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, label: term.label, termNumber: term.termNumber });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/terms/[id]/activate" });
  }
}
