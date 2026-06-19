import { NextResponse } from "next/server";
import { z } from "zod";
import { SchoolLevelKind } from "@prisma/client";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveSchoolAdminOrganization } from "@/lib/admin-school-org";
import { normalizeSchoolCode } from "@/lib/school-structure";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";

const CreateClassBody = z.object({
  organizationSlug: z.string().min(1).optional(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  levelKind: z.nativeEnum(SchoolLevelKind).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const organizationSlug = url.searchParams.get("organizationSlug")?.trim() ?? undefined;
    const scope = await resolveSchoolAdminOrganization(admin, organizationSlug);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const classes = await prisma.schoolClass.findMany({
      where: { organizationId: scope.organizationId },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: {
        streams: {
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
          select: {
            id: true,
            code: true,
            name: true,
            sortOrder: true,
            enabled: true,
            _count: { select: { students: true } },
          },
        },
        _count: { select: { students: true, streams: true } },
      },
    });

    return NextResponse.json({
      currentAcademicYearLabel: scope.currentAcademicYearLabel,
      classes: classes.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        levelKind: c.levelKind,
        sortOrder: c.sortOrder,
        enabled: c.enabled,
        streamCount: c._count.streams,
        studentCount: c._count.students,
        streams: c.streams.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          sortOrder: s.sortOrder,
          enabled: s.enabled,
          studentCount: s._count.students,
        })),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/classes" });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = CreateClassBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const slug = admin.role === "master" ? parsed.data.organizationSlug?.trim() : undefined;
    if (admin.role === "master" && !slug) {
      return NextResponse.json({ error: "organizationSlug is required for platform masters" }, { status: 400 });
    }

    const scope = await resolveSchoolAdminOrganization(admin, slug ?? null);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const code = normalizeSchoolCode(parsed.data.code);
    const created = await prisma.schoolClass.create({
      data: {
        organizationId: scope.organizationId,
        code,
        name: parsed.data.name.trim(),
        levelKind: parsed.data.levelKind ?? SchoolLevelKind.primary,
        sortOrder: parsed.data.sortOrder ?? 0,
        enabled: parsed.data.enabled ?? true,
      },
    });

    return NextResponse.json({ class: created }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A class with this code already exists." }, { status: 409 });
    }
    return apiErrorResponse(e, { route: "POST /api/admin/school/classes" });
  }
}
