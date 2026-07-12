import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { recordSchoolManualPayment } from "@/lib/school-manual-payment";
import { normalizeSchoolTerm } from "@/lib/school-term";

const Body = z.object({
  organizationSlug: z.string().optional(),
  studentId: z.string().min(1),
  term: z.number().int().min(1).max(3),
  amountUgx: z.number().int().min(1),
  paymentMode: z.enum(["CASH", "MOBILE TRANSFER"]),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const auth = await requireSchoolAdminScope(body.organizationSlug);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const result = await recordSchoolManualPayment({
      organizationId: auth.scope.organizationId,
      studentId: body.studentId,
      term: normalizeSchoolTerm(body.term),
      amountUgx: body.amountUgx,
      paymentMode: body.paymentMode,
      notes: body.notes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/payments" });
  }
}
