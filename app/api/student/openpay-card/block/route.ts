import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentFromCookies } from "@/lib/student-auth";
import { setOpenPayCardBlocked } from "@/lib/openpay-card-cashout";
import { apiErrorResponse } from "@/lib/api-error";

const Body = z.object({ blocked: z.boolean() });

export async function POST(req: Request) {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const result = await setOpenPayCardBlocked({
      studentId: session.sub,
      blocked: parsed.data.blocked,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, blocked: result.blocked });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/openpay-card/block" });
  }
}
