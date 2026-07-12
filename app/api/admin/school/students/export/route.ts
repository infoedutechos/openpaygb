import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { exportSchoolStudentsCsv } from "@/lib/school-students-export";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

    const classId = url.searchParams.get("classId");
    return exportSchoolStudentsCsv({
      organizationId: auth.scope.organizationId,
      sessionId: auth.context.sessionId,
      classId,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/students/export" });
  }
}
