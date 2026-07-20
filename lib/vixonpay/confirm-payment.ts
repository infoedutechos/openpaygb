import type { Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { isVixonPayWebhookSuccess } from "@/lib/vixonpay/client";
import { webhookAmountMatchesPayment } from "@/lib/webhook-payment-confirm";
import { withPrismaRetry } from "@/lib/prisma-retry";

export type VixonPayConfirmInput = {
  transaction_status?: unknown;
  transaction_amount?: unknown;
  request_currency?: unknown;
  internal_reference?: unknown;
  merchant_reference?: unknown;
};

export type VixonPayConfirmResult =
  | { ok: true; action: string; paymentId: string }
  | { ok: true; action: string; paymentId?: string };

/** Confirm a pending `vixonpay` payment from webhook or status poll. */
export async function confirmVixonPayPaymentIfEligible(
  payment: Pick<Payment, "id" | "status" | "totalUgx" | "momoReference" | "rail">,
  input: VixonPayConfirmInput,
): Promise<VixonPayConfirmResult> {
  if (payment.rail !== "vixonpay") {
    return { ok: true, action: "wrong_rail" };
  }

  if (!isVixonPayWebhookSuccess(input.transaction_status)) {
    return { ok: true, action: "not_success", paymentId: payment.id };
  }

  if (payment.status === "confirmed") {
    return { ok: true, action: "already_confirmed", paymentId: payment.id };
  }

  const amount =
    typeof input.transaction_amount === "number"
      ? input.transaction_amount
      : Number(input.transaction_amount);
  const currency =
    typeof input.request_currency === "string" ? input.request_currency : "UGX";
  if (!webhookAmountMatchesPayment(payment.totalUgx, Number.isFinite(amount) ? amount : undefined, currency)) {
    return { ok: true, action: "amount_mismatch", paymentId: payment.id };
  }

  const internalRef =
    typeof input.internal_reference === "string" ? input.internal_reference.trim() : "";
  const merchantRef =
    typeof input.merchant_reference === "string" ? input.merchant_reference.trim() : "";

  const momoReference = internalRef || payment.momoReference || merchantRef || payment.id;
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
    return { ok: true, action: "already_confirmed", paymentId: payment.id };
  }

  const full = await withPrismaRetry(() =>
    prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
  );
  await handleFirstTimeConfirmation(full);

  return { ok: true, action: "confirmed", paymentId: payment.id };
}
