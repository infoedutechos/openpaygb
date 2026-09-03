import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireDeveloperSession } from "@/lib/developer-auth";
import {
  requestMerchantPayout,
  serializeMerchantPayout,
} from "@/lib/merchant-payout";
import { getMerchantSettlementSummary } from "@/lib/merchant-charge";

const CreateBody = z.object({
  amountUgx: z.number().int().positive(),
  phone: z.string().max(32).optional(),
  network: z.enum(["MTN", "AIRTEL"]).optional(),
  note: z.string().max(200).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "30"), 100);
    const rows = await prisma.merchantPayout.findMany({
      where: { developerAppId: gate.app.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const summary = await getMerchantSettlementSummary(gate.app.id);

    return NextResponse.json({
      payouts: rows.map(serializeMerchantPayout),
      summary,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/developers/payouts" });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const payout = await requestMerchantPayout({
      developerAppId: gate.app.id,
      amountUgx: parsed.data.amountUgx,
      phone: parsed.data.phone,
      network: parsed.data.network,
      note: parsed.data.note,
    });

    const summary = await getMerchantSettlementSummary(gate.app.id);
    return NextResponse.json(
      { payout: serializeMerchantPayout(payout), summary },
      { status: 201 },
    );
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/developers/payouts" });
  }
}
