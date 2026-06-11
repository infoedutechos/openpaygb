import { NextRequest, NextResponse } from "next/server";
import { getStudentFromCookies } from "@/lib/student-auth";
import { prisma } from "@/lib/prisma";
import { DEX_BUY_CRYPTO_ASSETS, type DexBuyCrypto } from "@/lib/dex-buy-quote";
import { executeDexBuyWithOpgb } from "@/lib/dex-buy-settle";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Sign in to buy crypto" }, { status: 401 });
    }

    const body = (await req.json()) as { crypto?: string; fiatAmountUgx?: number };
    const crypto = (body.crypto ?? "TON").toUpperCase() as DexBuyCrypto;
    const fiatAmountUgx = Number(body.fiatAmountUgx);

    if (!DEX_BUY_CRYPTO_ASSETS.includes(crypto)) {
      return NextResponse.json(
        { error: `Unsupported crypto. Use one of: ${DEX_BUY_CRYPTO_ASSETS.join(", ")}` },
        { status: 400 },
      );
    }
    if (!Number.isFinite(fiatAmountUgx) || fiatAmountUgx <= 0) {
      return NextResponse.json({ error: "fiatAmountUgx must be a positive number" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: { organizationId: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await executeDexBuyWithOpgb({
      studentId: session.sub,
      organizationId: student.organizationId,
      crypto,
      fiatAmountUgx: Math.round(fiatAmountUgx),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      status: "settled",
      orderId: result.orderId,
      referenceId: result.referenceKey,
      crypto: result.crypto,
      cryptoAmount: result.cryptoAmount,
      fiatAmountUgx: result.fiatAmountUgx,
      message: result.message,
      executionPhase: 4,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/student/dex/buy" });
  }
}
