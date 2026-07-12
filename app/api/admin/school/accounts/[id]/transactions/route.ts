import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { buildAccountLedger } from "@/lib/school-account-ledger";
import { normalizeSchoolTerm } from "@/lib/school-term";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const auth = await requireSchoolAdminScope(url.searchParams.get("organizationSlug"));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const termParam = url.searchParams.get("term");
    const term = termParam ? normalizeSchoolTerm(termParam) : auth.context.activeTerm;
    const data = await buildAccountLedger({
      organizationId: auth.scope.organizationId,
      accountId: id,
      term,
    });
    return NextResponse.json(data);
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/accounts/[id]/transactions" });
  }
}
