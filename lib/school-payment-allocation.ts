import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSchoolTerm } from "@/lib/school-term";

/** Apply payment amount FIFO across unpaid bill charge lines for a student/term. */
export async function allocatePaymentToBillCharges(input: {
  organizationId: string;
  paymentId: string;
  studentId: string;
  term: number;
  amountUgx: number;
  sessionId?: string | null;
}): Promise<{ allocations: { billChargeId: string; amountUgx: number }[] }> {
  const term = normalizeSchoolTerm(input.term);
  let remaining = input.amountUgx;

  const charges = await prisma.studentBillCharge.findMany({
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
    await prisma.paymentAllocation.create({
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
