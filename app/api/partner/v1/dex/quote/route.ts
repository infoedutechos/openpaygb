import { NextRequest, NextResponse } from "next/server";
import { DEX_BUY_CRYPTO_ASSETS, quoteDexBuy, type DexBuyCrypto } from "@/lib/dex-buy-quote";
import { quoteDexSell } from "@/lib/dex-sell-quote";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePartnerAuth } from "@/lib/partner-auth";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePartnerAuth(req, "dex:quote:read");
    if (!gate.ok) return gate.response;

    const side = (req.nextUrl.searchParams.get("side") ?? "buy").toLowerCase();
    const crypto = (req.nextUrl.searchParams.get("crypto") ?? "TON").toUpperCase() as DexBuyCrypto;

    if (!DEX_BUY_CRYPTO_ASSETS.includes(crypto)) {
      return NextResponse.json(
        { error: `Unsupported crypto. Use: ${DEX_BUY_CRYPTO_ASSETS.join(", ")}` },
        { status: 400 },
      );
    }

    if (side === "sell") {
      const cryptoAmount = Number(req.nextUrl.searchParams.get("cryptoAmount"));
      if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) {
        return NextResponse.json({ error: "cryptoAmount must be positive" }, { status: 400 });
      }
      const quote = await quoteDexSell(crypto, cryptoAmount);
      if (!quote) return NextResponse.json({ error: "Could not build sell quote" }, { status: 503 });
      return NextResponse.json({ side: "sell", quote, partner: { keyId: gate.partner.keyId } });
    }

    const fiatAmountUgx = Number(
      req.nextUrl.searchParams.get("fiatAmountUgx") ?? req.nextUrl.searchParams.get("amountUgx"),
    );
    if (!Number.isFinite(fiatAmountUgx) || fiatAmountUgx <= 0) {
      return NextResponse.json({ error: "fiatAmountUgx must be positive" }, { status: 400 });
    }

    const quote = await quoteDexBuy(crypto, fiatAmountUgx);
    if (!quote) return NextResponse.json({ error: "Could not build buy quote" }, { status: 503 });

    return NextResponse.json({ side: "buy", quote, partner: { keyId: gate.partner.keyId } });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/partner/v1/dex/quote" });
  }
}
