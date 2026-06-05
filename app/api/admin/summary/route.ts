import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveSummaryScope } from "@/lib/admin-summary-scope";
import { apiErrorResponse } from "@/lib/api-error";

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${m < 10 ? "0" : ""}${m}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET(req: Request) {
  try {
  const session = await getAdminFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationSlug = url.searchParams.get("organizationSlug");

  const scopeResult = await resolveSummaryScope(session.sub, session.role, organizationSlug);
  if (!scopeResult.ok) {
    return NextResponse.json({ error: scopeResult.error }, { status: scopeResult.status });
  }
  const payScoped = scopeResult.payScoped;
  const studentScoped = scopeResult.studentScoped;

  const adminProfile = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    select: {
      role: true,
      organization: { select: { name: true, slug: true } },
    },
  });

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const chartTonSince = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const chartPendingSince = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const [
    totalPayments,
    totalStudents,
    agg,
    confirmedRows,
    pendingRows,
    recentPayments,
    pendingPaymentsList,
    tonThisMonth,
    tonLastMonth,
    payThisMonth,
    payLastMonth,
    studentsThisMonth,
    studentsLastMonth,
    ugxAgg,
    railBreakdown,
  ] = await Promise.all([
    prisma.payment.count({ where: payScoped }),
    prisma.student.count({ where: studentScoped }),
    prisma.payment.aggregate({
      where: { status: "confirmed", ...payScoped },
      _sum: { tonAmount: true },
    }),
    prisma.payment.findMany({
      where: {
        status: "confirmed",
        confirmedAt: { not: null, gte: chartTonSince },
        ...payScoped,
      },
      select: { confirmedAt: true, tonAmount: true },
      orderBy: { confirmedAt: "asc" },
    }),
    prisma.payment.findMany({
      where: { status: "pending", createdAt: { gte: chartPendingSince }, ...payScoped },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findMany({
      where: { ...payScoped },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { student: { select: { id: true, name: true } } },
    }),
    prisma.payment.findMany({
      where: { status: "pending", ...payScoped },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { student: { select: { id: true, name: true } } },
    }),
    prisma.payment.aggregate({
      where: {
        status: "confirmed",
        confirmedAt: { gte: thisMonthStart },
        ...payScoped,
      },
      _sum: { tonAmount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "confirmed",
        confirmedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        ...payScoped,
      },
      _sum: { tonAmount: true },
    }),
    prisma.payment.count({
      where: { createdAt: { gte: thisMonthStart }, ...payScoped },
    }),
    prisma.payment.count({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, ...payScoped },
    }),
    prisma.student.count({
      where: { createdAt: { gte: thisMonthStart }, ...studentScoped },
    }),
    prisma.student.count({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, ...studentScoped },
    }),
    prisma.payment.aggregate({
      where: { status: "confirmed", ...payScoped },
      _sum: { totalUgx: true, platformFeeUgx: true },
    }),
    prisma.payment.groupBy({
      by: ["rail"],
      where: { status: "confirmed", ...payScoped },
      _count: { _all: true },
      _sum: { totalUgx: true, tonAmount: true },
    }),
  ]);

  const totalTon = agg._sum.tonAmount ?? 0;
  const monthMap = new Map<string, number>();
  for (const row of confirmedRows) {
    if (!row.confirmedAt) continue;
    const key = monthKey(row.confirmedAt);
    monthMap.set(key, (monthMap.get(key) ?? 0) + row.tonAmount);
  }
  const monthlyTon = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([m, ton]) => ({ m, ton }));

  const pendingMonthMap = new Map<string, number>();
  for (const row of pendingRows) {
    const key = monthKey(row.createdAt);
    pendingMonthMap.set(key, (pendingMonthMap.get(key) ?? 0) + 1);
  }
  const monthlyPending = Array.from(pendingMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([m, count]) => ({ m, count }));

  const tonTm = tonThisMonth._sum.tonAmount ?? 0;
  const tonLm = tonLastMonth._sum.tonAmount ?? 0;

  const scopedOrg = scopeResult.viewerOrg;

  return NextResponse.json({
    viewer: {
      role: adminProfile?.role ?? session.role,
      organizationName: scopedOrg?.name ?? adminProfile?.organization?.name ?? null,
      organizationSlug: scopedOrg?.slug ?? adminProfile?.organization?.slug ?? null,
      scopedToSlug: scopedOrg?.slug ?? null,
    },
    totalCollectionsTon: Math.round(totalTon * 10_000) / 10_000,
    totalCollectionsUgx: ugxAgg._sum.totalUgx ?? 0,
    totalPlatformFeeUgx: ugxAgg._sum.platformFeeUgx ?? 0,
    collectionsByRail: railBreakdown.map((r) => ({
      rail: r.rail,
      count: r._count._all,
      totalUgx: r._sum.totalUgx ?? 0,
      tonAmount: Math.round((r._sum.tonAmount ?? 0) * 10_000) / 10_000,
    })),
    totalPayments,
    totalStudents,
    monthlyTon,
    monthlyPending,
    collectionsMomPct: pctChange(tonTm, tonLm),
    paymentsMomPct: pctChange(payThisMonth, payLastMonth),
    studentsMomPct: pctChange(studentsThisMonth, studentsLastMonth),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      studentId: p.student.id,
      studentName: p.student.name,
      tonAmount: p.tonAmount,
      totalUgx: p.totalUgx,
      rail: p.rail,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    pendingPayments: pendingPaymentsList.map((p) => ({
      id: p.id,
      studentId: p.student.id,
      studentName: p.student.name,
      tonAmount: p.tonAmount,
      totalUgx: p.totalUgx,
      rail: p.rail,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
  });
  } catch (e) {
    return apiErrorResponse(e, {
      route: "GET /api/admin/summary",
      fallback: "Could not load dashboard summary",
    });
  }
}
