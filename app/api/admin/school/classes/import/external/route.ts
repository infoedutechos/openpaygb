import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { fetchResultsAppClasses, isResultsAppConfigured } from "@/lib/school-results-app-import";

const Body = z.object({
  organizationSlug: z.string().optional(),
  sessionLabel: z.string().optional(),
  classCodes: z.array(z.string()).optional(),
  includeStudents: z.boolean().optional(),
  newOnly: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    if (!isResultsAppConfigured()) {
      return NextResponse.json({ error: "Results App integration not configured" }, { status: 503 });
    }
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const classes = await fetchResultsAppClasses({
      organizationSlug: auth.scope.slug,
      sessionLabel: url.searchParams.get("sessionLabel") ?? auth.context.sessionLabel,
    });

    return NextResponse.json({ classes });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/classes/import/external" });
  }
}

export async function POST(req: Request) {
  try {
    if (!isResultsAppConfigured()) {
      return NextResponse.json({ error: "Results App integration not configured" }, { status: 503 });
    }
    const body = Body.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const external = await fetchResultsAppClasses({
      organizationSlug: auth.scope.slug,
      sessionLabel: body.sessionLabel ?? auth.context.sessionLabel,
    });

    const selected = body.classCodes?.length
      ? external.filter((c) => body.classCodes!.includes(c.code))
      : external;

    let classesCreated = 0;
    const sessionId = auth.context.sessionId;

    for (const row of selected) {
      let cls = await prisma.schoolClass.findFirst({
        where: { organizationId: auth.scope.organizationId, code: row.code },
      });
      if (!cls) {
        cls = await prisma.schoolClass.create({
          data: {
            organizationId: auth.scope.organizationId,
            code: row.code,
            name: row.name,
            levelKind: row.levelKind ?? "primary",
            schoolSessionId: sessionId,
          },
        });
        classesCreated++;
      }
      for (const s of row.streams ?? []) {
        const exists = await prisma.schoolStream.findFirst({
          where: { organizationId: auth.scope.organizationId, schoolClassId: cls.id, code: s.code },
        });
        if (!exists) {
          await prisma.schoolStream.create({
            data: {
              organizationId: auth.scope.organizationId,
              schoolClassId: cls.id,
              code: s.code,
              name: s.name,
            },
          });
        }
      }
    }

    return NextResponse.json({ classesCreated, imported: selected.length });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/classes/import/external" });
  }
}
