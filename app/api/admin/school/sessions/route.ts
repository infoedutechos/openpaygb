import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { ensureDefaultSchoolAccounts } from "@/lib/school-accounts-seed";
import { loadSchoolOrgContext } from "@/lib/school-org-context";
import { normalizeSchoolTerm } from "@/lib/school-term";

const CreateSessionBody = z.object({
  organizationSlug: z.string().optional(),
  label: z.string().min(4).max(32),
  activate: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug") ?? undefined;
    const auth = await requireSchoolAdminScope(organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await ensureDefaultSchoolAccounts(auth.scope.organizationId);

    const sessions = await prisma.schoolSession.findMany({
      where: { organizationId: auth.scope.organizationId },
      orderBy: { label: "desc" },
    });

    return NextResponse.json({
      context: auth.context,
      sessions: sessions.map((s) => ({
        id: s.id,
        label: s.label,
        isActive: s.isActive,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/sessions" });
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateSessionBody.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const label = body.label.trim();
    const session = await prisma.schoolSession.create({
      data: {
        organizationId: auth.scope.organizationId,
        label,
        isActive: Boolean(body.activate),
      },
    });

    if (body.activate) {
      await prisma.$transaction([
        prisma.schoolSession.updateMany({
          where: { organizationId: auth.scope.organizationId, id: { not: session.id } },
          data: { isActive: false },
        }),
        prisma.organization.update({
          where: { id: auth.scope.organizationId },
          data: {
            activeSchoolSessionId: session.id,
            currentAcademicYearLabel: label,
          },
        }),
      ]);
    }

    return NextResponse.json({ session: { id: session.id, label: session.label, isActive: session.isActive } });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/sessions" });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = z
      .object({
        organizationSlug: z.string().optional(),
        activeTerm: z.number().int().min(1).max(3).optional(),
        activeSessionId: z.string().optional(),
      })
      .parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const data: { activeSchoolTerm?: number; activeSchoolSessionId?: string; currentAcademicYearLabel?: string } = {};
    if (body.activeTerm !== undefined) data.activeSchoolTerm = normalizeSchoolTerm(body.activeTerm);
    if (body.activeSessionId) {
      const session = await prisma.schoolSession.findFirst({
        where: { id: body.activeSessionId, organizationId: auth.scope.organizationId },
      });
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      data.activeSchoolSessionId = session.id;
      data.currentAcademicYearLabel = session.label;
    }

    await prisma.organization.update({ where: { id: auth.scope.organizationId }, data });
    const context = await loadSchoolOrgContext(auth.scope.organizationId);
    return NextResponse.json({ context });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/sessions" });
  }
}
