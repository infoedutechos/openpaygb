import { NextRequest, NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { executeAmmSwap } from "@/lib/dex-amm-execute";
import type { AmmPair } from "@/lib/dex-amm-quote";
import { apiErrorResponse } from "@/lib/api-error";

const PAIRS: AmmPair[] = ["OPGB_TON", "OPGB_USDT"];

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Sign in to swap" }, { status: 401 });
    }

    const body = (await req.json()) as { pair?: string; inputAmountUgx?: number };
    const pair = (body.pair ?? "OPGB_TON").toUpperCase() as AmmPair;
    const inputAmountUgx = Number(body.inputAmountUgx);

    if (!PAIRS.includes(pair)) {
      return NextResponse.json({ error: `Unsupported pair: ${PAIRS.join(", ")}` }, { status: 400 });
    }
    if (!Number.isFinite(inputAmountUgx) || inputAmountUgx <= 0) {
      return NextResponse.json({ error: "inputAmountUgx must be positive" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: { organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await executeAmmSwap({
      studentId: session.sub,
      organizationId: student.organizationId,
      pair,
      inputAmountUgx: Math.round(inputAmountUgx),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { ok: _ok, ...payload } = result;
    return NextResponse.json({ ok: true, ...payload });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/dex/amm-swap" });
  }
}
