import { NextRequest, NextResponse } from "next/server";
import { DEX_BUY_CRYPTO_ASSETS, type DexBuyCrypto } from "@/lib/dex-buy-quote";
import { queueDexBuy } from "@/lib/dex-buy-execute";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
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

    const result = await queueDexBuy({ crypto, fiatAmountUgx });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
      referenceId: result.referenceId,
      message: result.message,
      nextPath: result.nextPath,
      executionPhase: 2,
      note: "Hybrid DEX / AMM settlement executes in Phase 3 — funds route via onramp until then.",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/public/dex/buy" });
  }
}
