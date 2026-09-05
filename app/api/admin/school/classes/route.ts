import { NextResponse } from "next/server";
import { z } from "zod";
import { SchoolLevelKind } from "@prisma/client";
import { normalizeSchoolCode } from "@/lib/school-structure";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { schoolClassSessionWhere } from "@/lib/school-session-scope";

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
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const include = {
      streams: {
        orderBy: [{ sortOrder: "asc" as const }, { code: "asc" as const }],
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
    };

    const forceAllSessions = url.searchParams.get("allSessions") === "1";
    let sessionFallback = false;
    let classes = await prisma.schoolClass.findMany({
      where: {
        organizationId: auth.scope.organizationId,
        ...(forceAllSessions ? {} : schoolClassSessionWhere(auth.context.sessionId)),
      },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include,
    });

    // New academic sessions often leave classes on a prior sessionId — fall back so Class dropdowns are not empty.
    if (!forceAllSessions && classes.length === 0 && auth.context.sessionId) {
      classes = await prisma.schoolClass.findMany({
        where: { organizationId: auth.scope.organizationId },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        include,
      });
      sessionFallback = classes.length > 0;
    }

    return NextResponse.json({
      currentAcademicYearLabel: auth.context.sessionLabel,
      sessionFallback,
      classes: classes.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        levelKind: c.levelKind,
        sortOrder: c.sortOrder,
        enabled: c.enabled,
        schoolSessionId: c.schoolSessionId,
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
    const json = await req.json().catch(() => null);
    const parsed = CreateClassBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const auth = await requireSchoolAdminScope(parsed.data.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const code = normalizeSchoolCode(parsed.data.code);
    const created = await prisma.schoolClass.create({
      data: {
        organizationId: auth.scope.organizationId,
        code,
        name: parsed.data.name.trim(),
        levelKind: parsed.data.levelKind ?? SchoolLevelKind.primary,
        sortOrder: parsed.data.sortOrder ?? 0,
        enabled: parsed.data.enabled ?? true,
        schoolSessionId: auth.context.sessionId,
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
