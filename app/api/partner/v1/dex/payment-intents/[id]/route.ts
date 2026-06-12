import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { serializeDexPaymentIntent } from "@/lib/dex-payment-intent";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const gate = await requirePartnerAuth(req, "dex:intent:create");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const key = await prisma.partnerApiKey.findUnique({
      where: { id: gate.partner.keyId },
      select: { developerAppId: true },
    });
    if (!key?.developerAppId) {
      return NextResponse.json({ error: "API key not linked to a developer app" }, { status: 403 });
    }

    const row = await prisma.dexPaymentIntent.findFirst({
      where: { id, developerAppId: key.developerAppId },
    });
    if (!row) {
      return NextResponse.json({ error: "Intent not found" }, { status: 404 });
    }

    if (row.status === "pending" && row.expiresAt < new Date()) {
      await prisma.dexPaymentIntent.update({
        where: { id: row.id },
        data: { status: "expired" },
      });
      row.status = "expired";
    }

    return NextResponse.json({ intent: serializeDexPaymentIntent(row) });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/partner/v1/dex/payment-intents/[id]" });
  }
}
