import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireMaster } from "@/lib/master-session";

/** Platform-wide OPGB activity snapshot for the multi-tab console. */
export async function GET() {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const [
      chargeAgg,
      pendingCharges,
      confirmedCharges,
      developerApps,
      whiteLabelApps,
      pendingPayouts,
      pendingWithdraws,
      openDisputes,
      cards,
      settlementSum,
    ] = await Promise.all([
      prisma.merchantCharge.aggregate({
        _sum: {
          amountUgx: true,
          orderAmountUgx: true,
          platformFeeUgx: true,
          merchantNetUgx: true,
        },
        _count: true,
      }),
      prisma.merchantCharge.count({
        where: { status: { in: ["pending", "collecting"] } },
      }),
      prisma.merchantCharge.count({ where: { status: "confirmed" } }),
      prisma.developerApp.count({ where: { enabled: true } }),
      prisma.developerApp.count({ where: { whiteLabelMode: true, enabled: true } }),
      prisma.merchantPayout.count({ where: { status: "pending" } }),
      prisma.opgbWithdrawRequest.count({ where: { status: "pending" } }).catch(() => 0),
      prisma.dexP2pDispute.count({ where: { status: "open" } }).catch(() => 0),
      prisma.openPayCard.count(),
      prisma.developerApp.aggregate({
        _sum: { settlementBalanceUgx: true },
      }),
    ]);

    const recentCharges = await prisma.merchantCharge.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        developerApp: { select: { name: true, slug: true, whiteLabelMode: true } },
      },
    });

    return NextResponse.json({
      kpis: {
        developerApps,
        whiteLabelApps,
        totalCharges: chargeAgg._count,
        pendingCharges,
        confirmedCharges,
        lifetimeCustomerPaidUgx: chargeAgg._sum.amountUgx ?? 0,
        lifetimeOrderUgx: chargeAgg._sum.orderAmountUgx ?? 0,
        lifetimePlatformFeesUgx: chargeAgg._sum.platformFeeUgx ?? 0,
        lifetimeMerchantNetUgx: chargeAgg._sum.merchantNetUgx ?? 0,
        merchantSettlementFloatUgx: settlementSum._sum.settlementBalanceUgx ?? 0,
        pendingMerchantPayouts: pendingPayouts,
        pendingWithdraws,
        openDisputes,
        openPayCards: cards,
      },
      recentCharges: recentCharges.map((c) => ({
        id: c.id,
        status: c.status,
        orderAmountUgx: c.orderAmountUgx,
        amountUgx: c.amountUgx,
        platformFeeUgx: c.platformFeeUgx,
        merchantNetUgx: c.merchantNetUgx,
        createdAt: c.createdAt.toISOString(),
        appName: c.developerApp.name,
        appSlug: c.developerApp.slug,
        whiteLabelMode: c.developerApp.whiteLabelMode,
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/opgb-console" });
  }
}
