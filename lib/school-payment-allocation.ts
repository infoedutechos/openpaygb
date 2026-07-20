import { PaymentRail, PaymentStatus, type Payment, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";
import { loadSchoolOrgContext } from "@/lib/school-org-context";
import { billChargeSessionWhere } from "@/lib/school-session-scope";
import { nextSchoolReceiptNo } from "@/lib/school-receipt-no";

type Db = Prisma.TransactionClient | typeof prisma;

/** Apply payment amount FIFO across unpaid bill charge lines for a student/term. */
export async function allocatePaymentToBillCharges(
  input: {
    organizationId: string;
    paymentId: string;
    studentId: string;
    term: number;
    amountUgx: number;
    sessionId?: string | null;
  },
  client: Db = prisma,
): Promise<{ allocations: { billChargeId: string; amountUgx: number }[] }> {
  const term = normalizeSchoolTerm(input.term);
  let remaining = input.amountUgx;

  const charges = await client.studentBillCharge.findMany({
    where: {
      organizationId: input.organizationId,
      studentId: input.studentId,
      term,
      ...(input.sessionId ? { OR: [{ sessionId: input.sessionId }, { sessionId: null }] } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      allocations: { select: { amountUgx: true } },
    },
  });

  const allocations: { billChargeId: string; amountUgx: number }[] = [];

  for (const charge of charges) {
    if (remaining <= 0) break;
    const paidOnCharge = charge.allocations.reduce((s, a) => s + a.amountUgx, 0);
    const due = Math.max(0, charge.amountUgx - paidOnCharge);
    if (due <= 0) continue;
    const slice = Math.min(remaining, due);
    await client.paymentAllocation.create({
      data: {
        organizationId: input.organizationId,
        paymentId: input.paymentId,
        billChargeId: charge.id,
        amountUgx: slice,
      },
    });
    allocations.push({ billChargeId: charge.id, amountUgx: slice });
    remaining -= slice;
  }

  return { allocations };
}

export async function getAllocatedPaidUgx(input: {
  organizationId: string;
  studentId: string;
  term: number;
}): Promise<number> {
  const term = normalizeSchoolTerm(input.term);
  const charges = await prisma.studentBillCharge.findMany({
    where: { organizationId: input.organizationId, studentId: input.studentId, term },
    select: { id: true },
  });
  if (charges.length === 0) return 0;

  const agg = await prisma.paymentAllocation.aggregate({
    where: {
      organizationId: input.organizationId,
      billChargeId: { in: charges.map((c) => c.id) },
      payment: { status: PaymentStatus.confirmed },
    },
    _sum: { amountUgx: true },
  });
  return agg._sum.amountUgx ?? 0;
}

/** Fee recovery KPIs for dashboard — allocation-based received against session-scoped bill charges. */
export async function getOrganizationTermFeeRecovery(input: {
  organizationId: string;
  term: number;
  sessionId?: string | null;
}): Promise<{ expectedUgx: number; receivedUgx: number; outstandingUgx: number }> {
  const term = normalizeSchoolTerm(input.term);
  const charges = await prisma.studentBillCharge.findMany({
    where: {
      organizationId: input.organizationId,
      term,
      ...billChargeSessionWhere(input.sessionId),
    },
    select: { id: true, amountUgx: true },
  });
  const expectedUgx = charges.reduce((s, c) => s + c.amountUgx, 0);
  if (charges.length === 0) {
    return { expectedUgx: 0, receivedUgx: 0, outstandingUgx: 0 };
  }
  const agg = await prisma.paymentAllocation.aggregate({
    where: {
      organizationId: input.organizationId,
      billChargeId: { in: charges.map((c) => c.id) },
      payment: { status: PaymentStatus.confirmed },
    },
    _sum: { amountUgx: true },
  });
  const receivedUgx = agg._sum.amountUgx ?? 0;
  return {
    expectedUgx,
    receivedUgx,
    outstandingUgx: Math.max(0, expectedUgx - receivedUgx),
  };
}

/** FIFO-allocate confirmed online/MoMo payments for school tenants (manual desk payments allocate at create). */
export async function maybeAllocateSchoolPaymentOnConfirm(payment: Payment): Promise<void> {
  if (payment.rail === PaymentRail.manual_cash) return;

  const existing = await prisma.paymentAllocation.count({ where: { paymentId: payment.id } });
  if (existing > 0) return;

  const org = await prisma.organization.findUnique({
    where: { id: payment.organizationId },
    select: { institutionTier: true },
  });
  if (org?.institutionTier !== "school") return;

  const ctx = await loadSchoolOrgContext(payment.organizationId);

  await prisma.$transaction(async (tx) => {
    if (!payment.schoolReceiptNo) {
      const receiptNo = await nextSchoolReceiptNo(payment.organizationId, tx);
      await tx.payment.update({
        where: { id: payment.id },
        data: { schoolReceiptNo: receiptNo },
      });
    }

    await allocatePaymentToBillCharges(
      {
        organizationId: payment.organizationId,
        paymentId: payment.id,
        studentId: payment.studentId,
        term: payment.semester,
        amountUgx: payment.totalUgx,
        sessionId: ctx?.sessionId,
      },
      tx,
    );
  });
}
