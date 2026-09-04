import { NextResponse } from "next/server";
import { z } from "zod";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { cashoutOpenPayCardToMomo } from "@/lib/openpay-card-cashout";
import { apiErrorResponse } from "@/lib/api-error";
import { clientIp, rateLimitHit } from "@/lib/rate-limit";

const Body = z.object({
  amountUgx: z.number().int().min(1000).max(500_000_000),
  phone: z.string().min(9).max(20),
  network: z.enum(["MTN", "AIRTEL"]).optional(),
  memo: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    if (rateLimitHit(`student-opcard-cashout:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: { organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = await cashoutOpenPayCardToMomo({
      studentId: session.sub,
      organizationId: student.organizationId,
      amountUgx: parsed.data.amountUgx,
      phone: parsed.data.phone,
      network: parsed.data.network,
      memo: parsed.data.memo,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      requestId: result.requestId,
      referenceKey: result.referenceKey,
      message: result.message,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/openpay-card/cashout-momo" });
  }
}
