import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requirePartnerAuth } from "@/lib/partner-auth";
import { getMerchantSettlementSummary } from "@/lib/merchant-charge";
import {
  requestMerchantPayout,
  serializeMerchantPayout,
} from "@/lib/merchant-payout";

async function developerAppIdFromKey(keyId: string): Promise<string | null> {
  const key = await prisma.partnerApiKey.findUnique({
    where: { id: keyId },
    select: { developerAppId: true },
  });
  return key?.developerAppId ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePartnerAuth(req, "payouts:read");
    if (!gate.ok) return gate.response;
    const appId = await developerAppIdFromKey(gate.partner.keyId);
    if (!appId) {
      return NextResponse.json({ error: "API key not linked to a developer app" }, { status: 403 });
    }

    const summary = await getMerchantSettlementSummary(appId);
    const rows = await prisma.merchantPayout.findMany({
      where: { developerAppId: appId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      settlement: summary,
      payouts: rows.map(serializeMerchantPayout),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/partner/v1/payouts" });
  }
}

const CreateBody = z.object({
  amountUgx: z.number().int().positive(),
  phone: z.string().max(32).optional(),
  network: z.enum(["MTN", "AIRTEL"]).optional(),
  note: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const gate = await requirePartnerAuth(req, "payouts:create");
    if (!gate.ok) return gate.response;
    const appId = await developerAppIdFromKey(gate.partner.keyId);
    if (!appId) {
      return NextResponse.json({ error: "API key not linked to a developer app" }, { status: 403 });
    }

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const payout = await requestMerchantPayout({
      developerAppId: appId,
      amountUgx: parsed.data.amountUgx,
      phone: parsed.data.phone,
      network: parsed.data.network,
      note: parsed.data.note,
    });

    return NextResponse.json({ payout: serializeMerchantPayout(payout) }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/partner/v1/payouts" });
  }
}
