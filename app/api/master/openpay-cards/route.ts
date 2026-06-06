import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    const gate = await requireMaster();
    if (!gate.ok) return gate.response;

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25")));
    const status = url.searchParams.get("status")?.trim() || undefined;

    const where = status ? { status } : {};

    const [
      totalCards,
      activeCards,
      pendingIssue,
      balanceAgg,
      topupTotal,
      topupConfirmed,
      topupTonAgg,
      issueFeeAgg,
      total,
      cards,
    ] = await Promise.all([
      prisma.openPayCard.count(),
      prisma.openPayCard.count({ where: { status: "active" } }),
      prisma.openPayCard.count({ where: { status: "pending_issue" } }),
      prisma.openPayCard.aggregate({
        where: { status: "active" },
        _sum: { balanceUgx: true },
      }),
      prisma.openPayCardTopup.count(),
      prisma.openPayCardTopup.count({ where: { status: "confirmed" } }),
      prisma.openPayCardTopup.aggregate({
        where: { status: "confirmed" },
        _sum: { tonAmount: true, amountUgx: true },
      }),
      prisma.openPayCard.aggregate({
        where: { status: "active", issueFeeTon: { not: null } },
        _sum: { issueFeeTon: true },
      }),
      prisma.openPayCard.count({ where }),
      prisma.openPayCard.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          student: {
            select: { id: true, name: true, email: true, programmeCode: true },
          },
          _count: { select: { topups: true } },
        },
      }),
    ]);

    const orgIds = [...new Set(cards.map((c) => c.organizationId))];
    const orgs =
      orgIds.length === 0
        ? []
        : await prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true, slug: true },
          });
    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    return NextResponse.json({
      stats: {
        totalCards,
        activeCards,
        pendingIssue,
        totalBalanceUgx: balanceAgg._sum.balanceUgx ?? 0,
        totalTopups: topupTotal,
        confirmedTopups: topupConfirmed,
        totalTopupTon: Math.round((topupTonAgg._sum.tonAmount ?? 0) * 10_000) / 10_000,
        totalTopupUgx: topupTonAgg._sum.amountUgx ?? 0,
        totalIssueFeeTon: Math.round((issueFeeAgg._sum.issueFeeTon ?? 0) * 10_000) / 10_000,
      },
      page,
      pageSize,
      total,
      cards: cards.map((c) => {
        const org = orgMap.get(c.organizationId);
        return {
          id: c.id,
          studentId: c.studentId,
          studentName: c.student.name,
          studentEmail: c.student.email,
          programmeCode: c.student.programmeCode,
          organizationId: c.organizationId,
          organizationName: org?.name ?? "—",
          organizationSlug: org?.slug ?? "",
          status: c.status,
          balanceUgx: c.balanceUgx,
          maskedPan: c.maskedPan,
          issueFeeTon: c.issueFeeTon,
          issueTxHash: c.issueTxHash,
          issuedAt: c.issuedAt?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          topupCount: c._count.topups,
        };
      }),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/master/openpay-cards" });
  }
}
