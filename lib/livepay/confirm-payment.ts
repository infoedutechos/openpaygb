import type { Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { isLivePayWebhookSuccess } from "@/lib/livepay/client";
import { webhookAmountMatchesPayment } from "@/lib/webhook-payment-confirm";
import { withPrismaRetry } from "@/lib/prisma-retry";

export type LivePayConfirmInput = {
  status: unknown;
  amount?: unknown;
  currency?: unknown;
  internal_reference?: unknown;
  customer_reference?: unknown;
};

export type LivePayConfirmResult =
  | { ok: true; action: string; paymentId: string }
  | { ok: true; action: string; paymentId?: string };

/**
 * Confirm a pending `livepay` payment from webhook or transaction-status poll.
 */
export async function confirmLivePayPaymentIfEligible(
  payment: Pick<Payment, "id" | "status" | "totalUgx" | "momoReference" | "rail">,
  input: LivePayConfirmInput,
): Promise<LivePayConfirmResult> {
  if (payment.rail !== "livepay") {
    return { ok: true, action: "wrong_rail" };
  }

  if (!isLivePayWebhookSuccess(input.status)) {
    return { ok: true, action: "not_success", paymentId: payment.id };
  }

  if (payment.status === "confirmed") {
    return { ok: true, action: "already_confirmed", paymentId: payment.id };
  }

  const amount =
    typeof input.amount === "number" ? input.amount : Number(input.amount);
  const currency = typeof input.currency === "string" ? input.currency : "UGX";
  if (!webhookAmountMatchesPayment(payment.totalUgx, Number.isFinite(amount) ? amount : undefined, currency)) {
    return { ok: true, action: "amount_mismatch", paymentId: payment.id };
  }

  const internalRef =
    typeof input.internal_reference === "string" ? input.internal_reference.trim() : "";
  const customerRef =
    typeof input.customer_reference === "string" ? input.customer_reference.trim() : "";

  await withPrismaRetry(() =>
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "confirmed",
        confirmedAt: new Date(),
        momoReference: internalRef || payment.momoReference || customerRef || payment.id,
      },
    }),
  );

  const full = await withPrismaRetry(() =>
    prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
  );
  await handleFirstTimeConfirmation(full);

  return { ok: true, action: "confirmed", paymentId: payment.id };
}
