import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { fetchResultsAppStudents, isResultsAppConfigured } from "@/lib/school-results-app-import";
import { importResultsAppStudents } from "@/lib/school-external-student-import";

const Body = z.object({
  organizationSlug: z.string().optional(),
  sessionLabel: z.string().optional(),
  classCode: z.string().optional(),
  admissionNos: z.array(z.string()).optional(),
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

    const students = await fetchResultsAppStudents({
      organizationSlug: auth.scope.slug,
      sessionLabel: url.searchParams.get("sessionLabel") ?? auth.context.sessionLabel,
      classCode: url.searchParams.get("classCode") ?? undefined,
    });

    return NextResponse.json({ students });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/students/import/external" });
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

    const result = await importResultsAppStudents({
      organizationId: auth.scope.organizationId,
      organizationSlug: auth.scope.slug,
      sessionLabel: body.sessionLabel ?? auth.context.sessionLabel,
      sessionId: auth.context.sessionId,
      activeTerm: auth.context.activeTerm,
      classCode: body.classCode,
      admissionNos: body.admissionNos,
      newOnly: body.newOnly,
    });

    return NextResponse.json(result);
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/students/import/external" });
  }
}
