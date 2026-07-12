import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listSchoolDefaulters } from "@/lib/school-defaulters";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { getOrganizationTermFeeRecovery } from "@/lib/school-payment-allocation";
import { schoolSessionWhere } from "@/lib/school-session-scope";

export type SchoolDashboardPayload = {
  accounts: {
    expectedUgx: number;
    receivedUgx: number;
    outstandingUgx: number;
    recoveryPercent: number;
  };
  cashflows: {
    incomeUgx: number;
    expenditureUgx: number;
    netUgx: number;
  };
  defaulters: {
    responding: number;
    overdue: number;
    totalDue: number;
  };
  students: { total: number; male: number; female: number };
  staff: { teaching: number; nonTeaching: number; total: number };
  inventory: { availableTypes: number; unavailableTypes: number; totalTypes: number };
  context: { term: number; sessionLabel: string };
};

export async function buildSchoolDashboard(
  organizationId: string,
  termInput: number,
  sessionId?: string | null,
): Promise<SchoolDashboardPayload> {
  const term = normalizeSchoolTerm(termInput);
  const studentWhere = { organizationId, ...schoolSessionWhere(sessionId) };

  const [feeRecovery, confirmedPayments, outflows, salaryPaid, students, staff, inventory, defaulterAll, org] =
    await Promise.all([
      getOrganizationTermFeeRecovery({ organizationId, term, sessionId }),
      prisma.payment.aggregate({
        where: { organizationId, status: PaymentStatus.confirmed, semester: term },
        _sum: { totalUgx: true },
      }),
      prisma.schoolOutflowVoucher.aggregate({
        where: { organizationId, term },
        _sum: { totalUgx: true },
      }),
      prisma.schoolSalaryPayment.aggregate({
        where: { organizationId, paidAt: { not: null } },
        _sum: { netUgx: true },
      }),
      prisma.student.groupBy({
        by: ["sex"],
        where: studentWhere,
        _count: { _all: true },
      }),
      prisma.schoolStaff.findMany({
        where: { organizationId, status: "active" },
        select: { duty: true },
      }),
      prisma.schoolInventoryItem.findMany({
        where: { organizationId },
        select: { availableQty: true, unavailableQty: true },
      }),
      listSchoolDefaulters({ organizationId, term, sessionId }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          activeSchoolTerm: true,
          currentAcademicYearLabel: true,
          activeSchoolSession: { select: { label: true } },
        },
      }),
    ]);

  const { expectedUgx, receivedUgx, outstandingUgx } = feeRecovery;
  const recoveryPercent = expectedUgx > 0 ? Math.round((receivedUgx / expectedUgx) * 10000) / 100 : 0;
  const incomeUgx = confirmedPayments._sum.totalUgx ?? 0;
  const expenditureUgx = (outflows._sum.totalUgx ?? 0) + (salaryPaid._sum.netUgx ?? 0);

  const teaching = staff.filter((s) => /teach|dos|head/i.test(s.duty)).length;
  const nonTeaching = staff.length - teaching;

  let availableTypes = 0;
  let unavailableTypes = 0;
  for (const item of inventory) {
    if (item.availableQty > 0) availableTypes += 1;
    if (item.unavailableQty > 0) unavailableTypes += 1;
  }

  const overdue = defaulterAll.rows.filter((r) => r.tab === "overdue").length;
  const responding = defaulterAll.rows.filter((r) => r.tab === "responding").length;
  const totalDue = defaulterAll.rows.filter((r) => r.debtBalanceUgx > 0).length;

  const studentCounts = students as { sex: string; _count: { _all: number } }[];
  let male = 0;
  let female = 0;
  let totalStudents = 0;
  for (const row of studentCounts) {
    totalStudents += row._count._all;
    if (row.sex === "male") male += row._count._all;
    if (row.sex === "female") female += row._count._all;
  }

  return {
    accounts: { expectedUgx, receivedUgx, outstandingUgx, recoveryPercent },
    cashflows: { incomeUgx, expenditureUgx, netUgx: incomeUgx - expenditureUgx },
    defaulters: { responding, overdue, totalDue },
    students: { total: totalStudents, male, female },
    staff: { teaching, nonTeaching, total: staff.length },
    inventory: {
      availableTypes,
      unavailableTypes,
      totalTypes: inventory.length,
    },
    context: {
      term,
      sessionLabel: org?.activeSchoolSession?.label ?? org?.currentAcademicYearLabel ?? "—",
    },
  };
}
