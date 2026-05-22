import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function refundConfirmedPayment(opts: {
  paymentId: string;
  organizationId?: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const payment = await prisma.payment.findUnique({
    where: { id: opts.paymentId },
    select: { id: true, status: true, organizationId: true },
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

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.refunded,
      refundedAt: new Date(),
      refundNote: opts.note?.trim() || "",
    },
  });

  return { ok: true };
}
