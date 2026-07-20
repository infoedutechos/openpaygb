import { PaymentRail, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeOpgbLedgerEntry } from "@/lib/opgb-ledger";
import { ugxToOpgbMinor } from "@/lib/opgb-peg";

/**
 * Refund a confirmed payment in one Mongo transaction:
 * - status → refunded (idempotent if already refunded)
 * - delete PaymentAllocation rows so school bill outstanding returns
 * - if paid via OpenPayGB card: restore card UGX + credit OPGB ledger
 *
 * External PSP/TON rails are bookkeeping-only (no automatic PSP reverse).
 */
export async function refundConfirmedPayment(opts: {
  paymentId: string;
  organizationId?: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const payment = await prisma.payment.findUnique({
    where: { id: opts.paymentId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      studentId: true,
      totalUgx: true,
      rail: true,
    },
  });

  if (!payment) {
    return { ok: false, error: "Payment not found", status: 404 };
  }

  if (opts.organizationId && payment.organizationId !== opts.organizationId) {
    return { ok: false, error: "Payment not found", status: 404 };
  }

  if (payment.status === PaymentStatus.refunded) {
    return { ok: true };
  }

  if (payment.status !== PaymentStatus.confirmed) {
    return { ok: false, error: "Only confirmed payments can be refunded", status: 409 };
  }

  const note = opts.note?.trim() || "";
  const amountUgx = Math.max(0, Math.round(payment.totalUgx));

  try {
    await prisma.$transaction(async (tx) => {
      const flipped = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.confirmed },
        data: {
          status: PaymentStatus.refunded,
          refundedAt: new Date(),
          refundNote: note,
        },
      });
      if (flipped.count !== 1) {
        // Concurrent refund or status change — treat as success if already refunded
        const again = await tx.payment.findUnique({
          where: { id: payment.id },
          select: { status: true },
        });
        if (again?.status === PaymentStatus.refunded) return;
        throw new Error("Payment is no longer confirmed");
      }

      await tx.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });

      if (payment.rail === PaymentRail.openpay_card && amountUgx > 0) {
        const card = await tx.openPayCard.findFirst({
          where: { studentId: payment.studentId, organizationId: payment.organizationId },
          select: { id: true },
        });
        if (card) {
          await tx.openPayCard.update({
            where: { id: card.id },
            data: { balanceUgx: { increment: amountUgx } },
          });
        }

        await writeOpgbLedgerEntry(
          {
            studentId: payment.studentId,
            organizationId: payment.organizationId,
            direction: "credit",
            amountMinor: ugxToOpgbMinor(amountUgx),
            kind: "adjustment",
            referenceKey: `refund:payment:${payment.id}`,
            sourceRail: "openpay_card",
            sourceCurrency: "UGX",
            sourceAmountMinor: ugxToOpgbMinor(amountUgx),
            memo: note ? `Tuition refund: ${note}` : "Tuition refund",
          },
          tx,
        );
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refund failed";
    if (msg.includes("no longer confirmed")) {
      return { ok: false, error: msg, status: 409 };
    }
    throw e;
  }

  return { ok: true };
}
