import { NextResponse } from "next/server";
import { listSchoolDefaulters, type DefaulterTab } from "@/lib/school-defaulters";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { normalizeSchoolTerm } from "@/lib/school-term";

const TABS: DefaulterTab[] = ["all_due", "overdue", "responding", "non_defaulters"];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const term = normalizeSchoolTerm(url.searchParams.get("term") ?? auth.context.activeTerm);
    const tabParam = url.searchParams.get("tab") as DefaulterTab | null;
    const tab = tabParam && TABS.includes(tabParam) ? tabParam : undefined;

    const result = await listSchoolDefaulters({
      organizationId: auth.scope.organizationId,
      term,
      tab,
      sessionId: auth.context.sessionId,
    });

    return NextResponse.json({ term, tab: tab ?? "all_due", ...result, context: auth.context });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/defaulters" });
  }
}
