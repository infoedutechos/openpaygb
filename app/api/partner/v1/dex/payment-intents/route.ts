import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { DEX_BUY_CRYPTO_ASSETS } from "@/lib/dex-buy-quote";
import { createDexPaymentIntent, serializeDexPaymentIntent } from "@/lib/dex-payment-intent";
import { dispatchDexIntentWebhook } from "@/lib/dex-intent-webhooks";

const CreateBody = z.object({
  type: z.enum(["buy", "sell", "convert"]),
  crypto: z.enum(DEX_BUY_CRYPTO_ASSETS),
  fiatAmountUgx: z.number().int().positive().optional(),
  cryptoAmount: z.number().positive().optional(),
  studentId: z.string().optional(),
  redirectUrl: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePartnerAuth(req, "dex:intent:create");
    if (!gate.ok) return gate.response;

    const key = await prisma.partnerApiKey.findUnique({
      where: { id: gate.partner.keyId },
      select: { developerAppId: true },
    });
    if (!key?.developerAppId) {
      return NextResponse.json({ error: "API key not linked to a developer app" }, { status: 403 });
    }

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "20"), 50);
    const rows = await prisma.dexPaymentIntent.findMany({
      where: { developerAppId: key.developerAppId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      intents: rows.map(serializeDexPaymentIntent),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/partner/v1/dex/payment-intents" });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requirePartnerAuth(req, "dex:intent:create");
    if (!gate.ok) return gate.response;

    const key = await prisma.partnerApiKey.findUnique({
      where: { id: gate.partner.keyId },
      select: { developerAppId: true },
    });
    if (!key?.developerAppId) {
      return NextResponse.json({ error: "API key not linked to a developer app" }, { status: 403 });
    }

    const json = await req.json().catch(() => null);
    const parsed = CreateBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.type === "sell" && !parsed.data.cryptoAmount) {
      return NextResponse.json({ error: "cryptoAmount required for sell intents" }, { status: 400 });
    }
    if ((parsed.data.type === "buy" || parsed.data.type === "convert") && !parsed.data.fiatAmountUgx) {
      return NextResponse.json({ error: "fiatAmountUgx required for buy/convert intents" }, { status: 400 });
    }

    const result = await createDexPaymentIntent({
      developerAppId: key.developerAppId,
      apiKeyId: gate.partner.keyId,
      type: parsed.data.type,
      crypto: parsed.data.crypto,
      fiatAmountUgx: parsed.data.fiatAmountUgx,
      cryptoAmount: parsed.data.cryptoAmount,
      studentId: parsed.data.studentId,
      redirectUrl: parsed.data.redirectUrl,
    });

    if (!result) {
      return NextResponse.json({ error: "Could not create intent" }, { status: 503 });
    }

    const serialized = serializeDexPaymentIntent(result.intent);
    void dispatchDexIntentWebhook("dex.intent.created", serialized).catch(() => undefined);

    return NextResponse.json({ intent: serialized }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/partner/v1/dex/payment-intents" });
  }
}
