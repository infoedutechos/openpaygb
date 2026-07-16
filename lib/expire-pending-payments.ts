import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPlatformAuthPolicy } from "@/lib/platform-customisation";

const DEFAULT_TTL_HOURS = 48;

/** Env override or default 48h — sync helper for tests. Prefer `resolvePendingPaymentExpiryMs`. */
export function pendingPaymentExpiryMs(): number {
  const raw = process.env.PENDING_PAYMENT_TTL_HOURS?.trim();
  const hours = raw ? Number.parseFloat(raw) : DEFAULT_TTL_HOURS;
  if (!Number.isFinite(hours) || hours <= 0) return DEFAULT_TTL_HOURS * 60 * 60 * 1000;
  return hours * 60 * 60 * 1000;
}

export async function resolvePendingPaymentExpiryMs(): Promise<number> {
  const raw = process.env.PENDING_PAYMENT_TTL_HOURS?.trim();
  if (raw) {
    const hours = Number.parseFloat(raw);
    if (Number.isFinite(hours) && hours > 0) return hours * 60 * 60 * 1000;
  }
  const policy = await getPlatformAuthPolicy();
  return policy.pendingPaymentTtlHours * 60 * 60 * 1000;
}

/** Mark stale pending tuition payments as failed so checkout guards unblock. */
export async function expireStalePendingPayments(): Promise<{ expired: number }> {
  const cutoff = new Date(Date.now() - (await resolvePendingPaymentExpiryMs()));
  const result = await prisma.payment.updateMany({
    where: {
      status: PaymentStatus.pending,
      createdAt: { lt: cutoff },
    },
    data: {
      status: PaymentStatus.failed,
      confirmedAt: null,
      cancelledAt: new Date(),
      cancelReason: "expired",
    },
  });
  return { expired: result.count };
}
