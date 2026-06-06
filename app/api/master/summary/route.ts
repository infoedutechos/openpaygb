import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/master-session";

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return gate.response;

  const [
    activeOrgs,
    pendingOrgs,
    rejectedOrgs,
    totalPayments,
    totalStudents,
    orgAdminCount,
    tonAgg,
    activeCards,
    cardBalanceAgg,
  ] = await Promise.all([
    prisma.organization.count({ where: { tenantStatus: "active" } }),
    prisma.organization.count({ where: { tenantStatus: "pending" } }),
    prisma.organization.count({ where: { tenantStatus: "rejected" } }),
    prisma.payment.count(),
    prisma.student.count(),
    prisma.adminUser.count({ where: { role: "org_admin" } }),
    prisma.payment.aggregate({
      where: { status: "confirmed" },
      _sum: { tonAmount: true },
    }),
    prisma.openPayCard.count({ where: { status: "active" } }),
    prisma.openPayCard.aggregate({
      where: { status: "active" },
      _sum: { balanceUgx: true },
    }),
  ]);

  const totalTon = tonAgg._sum.tonAmount ?? 0;

  return NextResponse.json({
    organizations: {
      active: activeOrgs,
      pending: pendingOrgs,
      rejected: rejectedOrgs,
      total: activeOrgs + pendingOrgs + rejectedOrgs,
    },
    tuition: {
      totalStudents,
      totalPayments,
      totalCollectionsTon: Math.round(totalTon * 10_000) / 10_000,
    },
    platformAdmins: {
      orgAdmins: orgAdminCount,
    },
    openPayCards: {
      active: activeCards,
      totalBalanceUgx: cardBalanceAgg._sum.balanceUgx ?? 0,
    },
  });
}
