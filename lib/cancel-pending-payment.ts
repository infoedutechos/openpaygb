import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PaymentCancelReason = "user" | "admin" | "expired" | "system";

export async function failPendingPayment(opts: {
  paymentId: string;
  organizationId?: string;
  studentId?: string;
  reason?: PaymentCancelReason;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const payment = await prisma.payment.findUnique({
    where: { id: opts.paymentId },
    select: {
      id: true,
      status: true,
      studentId: true,
      organizationId: true,
    },
  });

  if (!payment) {
    return { ok: false, error: "Payment not found", status: 404 };
  }

  if (opts.organizationId && payment.organizationId !== opts.organizationId) {
    return { ok: false, error: "Payment not found", status: 404 };
  }

  if (opts.studentId && payment.studentId !== opts.studentId) {
    return { ok: false, error: "Payment not found", status: 404 };
  }

  if (payment.status === PaymentStatus.confirmed) {
    return { ok: false, error: "Confirmed payments cannot be cancelled", status: 409 };
  }

  if (payment.status === PaymentStatus.refunded) {
    return { ok: false, error: "Refunded payments cannot be cancelled", status: 409 };
  }

  if (payment.status === PaymentStatus.failed) {
    return { ok: true };
  }

  if (payment.status !== PaymentStatus.pending) {
    return { ok: false, error: "Only pending payments can be cancelled", status: 409 };
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.failed,
      confirmedAt: null,
      cancelledAt: new Date(),
      cancelReason: opts.reason ?? "user",
    },
  });

  return { ok: true };
}
