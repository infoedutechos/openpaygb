import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await requireSchoolAdminScope();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const session = await prisma.schoolSession.findFirst({
      where: { id, organizationId: auth.scope.organizationId },
    });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.schoolSession.updateMany({
        where: { organizationId: auth.scope.organizationId },
        data: { isActive: false },
      }),
      prisma.schoolSession.update({ where: { id }, data: { isActive: true } }),
      prisma.organization.update({
        where: { id: auth.scope.organizationId },
        data: { activeSchoolSessionId: id, currentAcademicYearLabel: session.label },
      }),
    ]);

    return NextResponse.json({ ok: true, label: session.label });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/sessions/[id]/activate" });
  }
}
