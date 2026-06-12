import { NextRequest, NextResponse } from "next/server";
import {
  DEX_SELL_CRYPTO_ASSETS,
  quoteDexSell,
  type DexSellCrypto,
} from "@/lib/dex-sell-quote";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const crypto = (req.nextUrl.searchParams.get("crypto") ?? "TON").toUpperCase() as DexSellCrypto;
    const cryptoAmount = Number(
      req.nextUrl.searchParams.get("cryptoAmount") ?? req.nextUrl.searchParams.get("amount"),
    );

    if (!DEX_SELL_CRYPTO_ASSETS.includes(crypto)) {
      return NextResponse.json(
        { error: `Unsupported crypto. Use one of: ${DEX_SELL_CRYPTO_ASSETS.join(", ")}` },
        { status: 400 },
      );
    }

    if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) {
      return NextResponse.json({ error: "cryptoAmount must be a positive number" }, { status: 400 });
    }

    const quote = await quoteDexSell(crypto, cryptoAmount);
    if (!quote) {
      return NextResponse.json({ error: "Could not build quote" }, { status: 503 });
    }

    return NextResponse.json({ quote });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/public/dex/sell-quote" });
  }
}
