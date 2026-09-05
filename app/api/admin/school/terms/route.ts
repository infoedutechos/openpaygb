import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { listSchoolTerms, nextSchoolTermNumber, ensureDefaultSchoolTerms } from "@/lib/school-terms";
import { loadSchoolOrgContext } from "@/lib/school-org-context";

const CreateBody = z.object({
  organizationSlug: z.string().optional(),
  label: z.string().min(1).max(64),
  termNumber: z.number().int().min(1).max(99).optional(),
  activate: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug") ?? undefined;
    const auth = await requireSchoolAdminScope(organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const terms = await listSchoolTerms(auth.scope.organizationId);
    const context = await loadSchoolOrgContext(auth.scope.organizationId);

    return NextResponse.json({
      context,
      terms: terms.map((t) => ({
        id: t.id,
        label: t.label,
        termNumber: t.termNumber,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/terms" });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const auth = await requireSchoolAdminScope(parsed.data.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await ensureDefaultSchoolTerms(auth.scope.organizationId);
    const label = parsed.data.label.trim();
    const termNumber = parsed.data.termNumber ?? (await nextSchoolTermNumber(auth.scope.organizationId));

    const clash = await prisma.schoolTerm.findFirst({
      where: {
        organizationId: auth.scope.organizationId,
        OR: [{ label }, { termNumber }],
      },
    });
    if (clash) {
      return NextResponse.json({ error: "Term label or number already exists" }, { status: 409 });
    }

    const term = await prisma.schoolTerm.create({
      data: {
        organizationId: auth.scope.organizationId,
        label,
        termNumber,
        isActive: false,
      },
    });

    if (parsed.data.activate) {
      await prisma.$transaction([
        prisma.schoolTerm.updateMany({
          where: { organizationId: auth.scope.organizationId },
          data: { isActive: false },
        }),
        prisma.schoolTerm.update({ where: { id: term.id }, data: { isActive: true } }),
        prisma.organization.update({
          where: { id: auth.scope.organizationId },
          data: {
            activeSchoolTermId: term.id,
            activeSchoolTerm: term.termNumber,
          },
        }),
      ]);
    }

    return NextResponse.json({ term: { ...term, isActive: Boolean(parsed.data.activate) } }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/terms" });
  }
}

const PatchActiveBody = z.object({
  organizationSlug: z.string().optional(),
  /** Activate by termNumber (legacy) or prefer /terms/[id]/activate */
  activeTerm: z.number().int().min(1).max(99).optional(),
  activeTermId: z.string().optional(),
});

export async function PATCH(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = PatchActiveBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const auth = await requireSchoolAdminScope(parsed.data.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await ensureDefaultSchoolTerms(auth.scope.organizationId);

    let term = parsed.data.activeTermId
      ? await prisma.schoolTerm.findFirst({
          where: { id: parsed.data.activeTermId, organizationId: auth.scope.organizationId },
        })
      : null;
    if (!term && parsed.data.activeTerm !== undefined) {
      term = await prisma.schoolTerm.findFirst({
        where: { organizationId: auth.scope.organizationId, termNumber: parsed.data.activeTerm },
      });
    }
    if (!term) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.schoolTerm.updateMany({
        where: { organizationId: auth.scope.organizationId },
        data: { isActive: false },
      }),
      prisma.schoolTerm.update({ where: { id: term.id }, data: { isActive: true } }),
      prisma.organization.update({
        where: { id: auth.scope.organizationId },
        data: {
          activeSchoolTermId: term.id,
          activeSchoolTerm: term.termNumber,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, term });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/terms" });
  }
}
