import { NextRequest, NextResponse } from "next/server";
import { quoteAmmSwap, type AmmPair } from "@/lib/dex-amm-quote";
import { apiErrorResponse } from "@/lib/api-error";

const PAIRS: AmmPair[] = ["OPGB_TON", "OPGB_USDT"];

export async function GET(req: NextRequest) {
  try {
    const pair = (req.nextUrl.searchParams.get("pair") ?? "OPGB_TON").toUpperCase() as AmmPair;
    const inputAmount = Number(req.nextUrl.searchParams.get("inputAmountUgx") ?? req.nextUrl.searchParams.get("amount"));

    if (!PAIRS.includes(pair)) {
      return NextResponse.json({ error: `Unsupported pair. Use: ${PAIRS.join(", ")}` }, { status: 400 });
    }
    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      return NextResponse.json({ error: "inputAmountUgx must be a positive number" }, { status: 400 });
    }

    const quote = await quoteAmmSwap({ pair, inputAmount, direction: "exact_in" });
    if (!quote) {
      return NextResponse.json({ error: "Could not build AMM quote" }, { status: 503 });
    }

    return NextResponse.json({
      quote,
      note: "Execute via POST /api/student/dex/amm-swap (OPGB debit) then complete delivery at /dex/onramp.",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/dex/amm-quote" });
  }
}
