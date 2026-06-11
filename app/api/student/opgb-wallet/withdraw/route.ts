import { NextRequest, NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { requestOpgbWithdraw, type WithdrawRail } from "@/lib/opgb-withdraw";
import { apiErrorResponse } from "@/lib/api-error";

const RAILS: WithdrawRail[] = ["momo", "ton", "bank"];
const ASSETS = ["opgb", "momo", "ton", "usdt", "btc", "eth"];

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Sign in to withdraw" }, { status: 401 });
    }

    const body = (await req.json()) as {
      asset?: string;
      amount?: number;
      rail?: string;
      destination?: string;
      memo?: string;
    };

    const asset = (body.asset ?? "opgb").toLowerCase();
    const rail = (body.rail ?? "momo").toLowerCase() as WithdrawRail;
    const amount = Number(body.amount);

    if (!ASSETS.includes(asset)) {
      return NextResponse.json({ error: `Unsupported asset: ${ASSETS.join(", ")}` }, { status: 400 });
    }
    if (!RAILS.includes(rail)) {
      return NextResponse.json({ error: `Unsupported rail: ${RAILS.join(", ")}` }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: { organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await requestOpgbWithdraw({
      studentId: session.sub,
      organizationId: student.organizationId,
      asset,
      amount,
      rail,
      destination: body.destination ?? "",
      memo: body.memo,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      requestId: result.requestId,
      referenceKey: result.referenceKey,
      status: result.status,
      message: result.message,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/opgb-wallet/withdraw" });
  }
}
