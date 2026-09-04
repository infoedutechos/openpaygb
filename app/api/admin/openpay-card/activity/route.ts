import { NextResponse } from "next/server";
import { requireAdminOpenPayHolder } from "@/lib/admin-openpay-api";
import { listOpenPayCardActivity } from "@/lib/openpay-card-activity";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    const gate = await requireAdminOpenPayHolder(req);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const card = await getStudentOpenPayCard(gate.holder.studentId);
    if (!card) return NextResponse.json({ activities: [] });
    const activities = await listOpenPayCardActivity({
      studentId: gate.holder.studentId,
      cardId: card.id,
    });
    return NextResponse.json({ activities });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/openpay-card/activity" });
  }
}
