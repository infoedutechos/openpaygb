/**
 * Confirm pending PaymentRail.card payments from Flutterwave / Paystack webhooks.
 */

import type { Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { webhookAmountMatchesPayment } from "@/lib/webhook-payment-confirm";
import { withPrismaRetry } from "@/lib/prisma-retry";

export async function confirmCardAcquiringPayment(opts: {
  providerReference: string;
  amount?: number;
  currency?: string;
  success: boolean;
  providerTxId?: string;
}): Promise<{ action: string; paymentId?: string }> {
  if (!opts.success) return { action: "not_success" };

  const ref = opts.providerReference.trim();
  if (!ref) return { action: "no_reference" };

  let payment =
    (await withPrismaRetry(() =>
      prisma.payment.findFirst({
        where: { rail: "card", momoReference: ref },
      }),
    )) || null;

  if (!payment && /^opgb_/i.test(ref)) {
    const id = ref.replace(/^opgb_/i, "").replace(/[^a-fA-F0-9]/g, "");
    if (id.length === 24) {
      payment = await withPrismaRetry(() =>
        prisma.payment.findFirst({ where: { id, rail: "card" } }),
      );
    }
  }

  if (!payment) return { action: "unknown_payment" };
  return finalizeCardPayment(payment, opts);
}

async function finalizeCardPayment(
  payment: Payment,
  opts: { amount?: number; currency?: string; providerTxId?: string },
): Promise<{ action: string; paymentId?: string }> {
  if (payment.status === "confirmed") {
    return { action: "already_confirmed", paymentId: payment.id };
  }
  if (
    !webhookAmountMatchesPayment(
      payment.totalUgx,
      opts.amount,
      opts.currency || "UGX",
    )
  ) {
    return { action: "amount_mismatch", paymentId: payment.id };
  }

  const momoReference = opts.providerTxId || payment.momoReference || payment.id;
  const claimed = await withPrismaRetry(() =>
    prisma.payment.updateMany({
      where: { id: payment.id, status: "pending" },
      data: {
        status: "confirmed",
        confirmedAt: new Date(),
        momoReference,
      },
    }),
  );
  if (claimed.count === 0) {
    return { action: "already_confirmed", paymentId: payment.id };
  }

  const full = await withPrismaRetry(() =>
    prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
  );
  await handleFirstTimeConfirmation(full);
  return { action: "confirmed", paymentId: payment.id };
}
