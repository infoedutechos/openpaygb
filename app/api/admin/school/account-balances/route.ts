import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { getExpenditureAccountBalances } from "@/lib/school-account-balance";
import { normalizeSchoolTerm } from "@/lib/school-term";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const term = normalizeSchoolTerm(url.searchParams.get("term") ?? auth.context.activeTerm);
    const balances = await getExpenditureAccountBalances({
      organizationId: auth.scope.organizationId,
      term,
    });
    return NextResponse.json({ term, balances });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/account-balances" });
  }
}
