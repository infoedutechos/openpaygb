import { NextResponse } from "next/server";
import { z } from "zod";
import { SchoolLevelKind } from "@prisma/client";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveSchoolAdminOrganization } from "@/lib/admin-school-org";
import { normalizeSchoolCode } from "@/lib/school-structure";
import { prisma } from "@/lib/prisma";
import { isValidObjectId } from "@/lib/object-id";
import { apiErrorResponse } from "@/lib/api-error";

const PatchBody = z.object({
  organizationSlug: z.string().min(1).optional(),
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(120).optional(),
  levelKind: z.nativeEnum(SchoolLevelKind).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const slug = admin.role === "master" ? parsed.data.organizationSlug?.trim() : undefined;
    const scope = await resolveSchoolAdminOrganization(admin, slug ?? null);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const existing = await prisma.schoolClass.findFirst({
      where: { id, organizationId: scope.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const updated = await prisma.schoolClass.update({
      where: { id },
      data: {
        ...(parsed.data.code !== undefined ? { code: normalizeSchoolCode(parsed.data.code) } : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.levelKind !== undefined ? { levelKind: parsed.data.levelKind } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      },
    });

    return NextResponse.json({ class: updated });
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/school/classes/[id]" });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug")?.trim() ?? undefined;
    const scope = await resolveSchoolAdminOrganization(admin, organizationSlug);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const existing = await prisma.schoolClass.findFirst({
      where: { id, organizationId: scope.organizationId },
      include: { _count: { select: { students: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    if (existing._count.students > 0) {
      return NextResponse.json(
        { error: "Cannot delete a class with enrolled students. Reassign students first." },
        { status: 409 },
      );
    }

    await prisma.schoolClass.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e, { route: "DELETE /api/admin/school/classes/[id]" });
  }
}
