import { NextRequest, NextResponse } from "next/server";
import {
  DEX_BUY_CRYPTO_ASSETS,
  quoteDexBuy,
  type DexBuyCrypto,
} from "@/lib/dex-buy-quote";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const crypto = (req.nextUrl.searchParams.get("crypto") ?? "TON").toUpperCase() as DexBuyCrypto;
    const fiatAmount = Number(req.nextUrl.searchParams.get("fiatAmountUgx") ?? req.nextUrl.searchParams.get("amountUgx"));

    if (!DEX_BUY_CRYPTO_ASSETS.includes(crypto)) {
      return NextResponse.json(
        { error: `Unsupported crypto. Use one of: ${DEX_BUY_CRYPTO_ASSETS.join(", ")}` },
        { status: 400 },
      );
    }

    if (!Number.isFinite(fiatAmount) || fiatAmount <= 0) {
      return NextResponse.json({ error: "fiatAmountUgx must be a positive number" }, { status: 400 });
    }

    const quote = await quoteDexBuy(crypto, fiatAmount);
    if (!quote) {
      return NextResponse.json({ error: "Could not build quote" }, { status: 503 });
    }

    return NextResponse.json({
      quote,
      summary: {
        step1_crypto: quote.crypto,
        step2_fiatSpendUgx: quote.fiatAmount,
        step3_cryptoReceive: quote.cryptoAmount,
        step4_feeUgx: quote.feeUgx,
        step5_totalFiatUgx: quote.totalFiatUgx,
        step6_action: "buy",
        step7_checks: ["account_balance", "liquidity", "validity"],
        step8_execute: quote.stepsReady ? "ready" : "awaiting_liquidity",
      },
      peg: { opgbPerUgx: 1, opgbSettlementMinor: quote.opgbSettlementMinor },
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/dex/buy-quote" });
  }
}
