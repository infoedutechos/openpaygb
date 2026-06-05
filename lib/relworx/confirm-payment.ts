import type { Payment } from "@prisma/client";
import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { prisma } from "@/lib/prisma";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { isRelworxSuccessStatus } from "@/lib/relworx/client";
import { webhookAmountMatchesPayment } from "@/lib/webhook-payment-confirm";
import { withPrismaRetry } from "@/lib/prisma-retry";

export type RelworxConfirmInput = {
  status: unknown;
  request_status?: unknown;
  amount?: unknown;
  currency?: unknown;
  internal_reference?: unknown;
  customer_reference?: unknown;
};

export type RelworxConfirmResult =
  | { ok: true; action: string; paymentId: string }
  | { ok: true; action: string; paymentId?: string };

function relworxStatusOk(input: RelworxConfirmInput): boolean {
  return isRelworxSuccessStatus(input.status) || isRelworxSuccessStatus(input.request_status);
}

/** Confirm a pending `relworx` payment from webhook or status poll. */
export async function confirmRelworxPaymentIfEligible(
  payment: Pick<Payment, "id" | "status" | "totalUgx" | "momoReference" | "rail">,
  input: RelworxConfirmInput,
): Promise<RelworxConfirmResult> {
  if (payment.rail !== "relworx") {
    return { ok: true, action: "wrong_rail" };
  }

  if (!relworxStatusOk(input)) {
    return { ok: true, action: "not_success", paymentId: payment.id };
  }

  if (payment.status === "confirmed") {
    return { ok: true, action: "already_confirmed", paymentId: payment.id };
  }

  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount);
  const currency = typeof input.currency === "string" ? input.currency : relworxCheckoutCurrencyFallback();
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

function relworxCheckoutCurrencyFallback(): string {
  const c = deploymentEnv("RELWORX_CURRENCY").toUpperCase();
  return c === "KES" || c === "TZS" ? c : "UGX";
}
