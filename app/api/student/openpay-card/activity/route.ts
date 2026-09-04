import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentFromCookies } from "@/lib/student-auth";
import { listOpenPayCardActivity } from "@/lib/openpay-card-activity";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const card = await getStudentOpenPayCard(session.sub);
    if (!card) {
      return NextResponse.json({ activities: [] });
    }
    const activities = await listOpenPayCardActivity({
      studentId: session.sub,
      cardId: card.id,
    });
    return NextResponse.json({ activities });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/student/openpay-card/activity" });
  }
}
