import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { listSchoolReceipts } from "@/lib/school-receipts";
import { normalizeSchoolTerm } from "@/lib/school-term";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const termParam = url.searchParams.get("term");
    const term = termParam ? normalizeSchoolTerm(termParam) : undefined;
    const schoolClassId = url.searchParams.get("schoolClassId")?.trim() || undefined;
    const receipts = await listSchoolReceipts({
      organizationId: auth.scope.organizationId,
      term,
      schoolClassId,
      limit: Number(url.searchParams.get("limit") ?? 500),
    });

    return NextResponse.json({ receipts });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/receipts" });
  }
}
