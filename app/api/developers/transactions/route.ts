import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireDeveloperSession } from "@/lib/developer-auth";
import { serializeMerchantCharge, getMerchantSettlementSummary } from "@/lib/merchant-charge";

/** Transaction ledger for the signed-in developer app. */
export async function GET(req: NextRequest) {
  try {
    const gate = await requireDeveloperSession();
    if (!gate.ok) return gate.response;

    const status = req.nextUrl.searchParams.get("status")?.trim() || undefined;
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "50"), 100);

    const charges = await prisma.merchantCharge.findMany({
      where: {
        developerAppId: gate.app.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const summary = await getMerchantSettlementSummary(gate.app.id);

    return NextResponse.json({
      charges: charges.map((c) => serializeMerchantCharge(c, { includePrivate: true })),
      summary,
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/developers/transactions" });
  }
}
