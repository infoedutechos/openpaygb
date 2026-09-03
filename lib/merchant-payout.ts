import { prisma } from "@/lib/prisma";

export async function requestMerchantPayout(opts: {
  developerAppId: string;
  amountUgx: number;
  phone?: string;
  network?: string;
  note?: string;
}) {
  if (!Number.isFinite(opts.amountUgx) || opts.amountUgx < 1000) {
    throw new Error("Minimum cashout is 1,000 UGX");
  }

  return prisma.$transaction(async (tx) => {
    const app = await tx.developerApp.findUnique({
      where: { id: opts.developerAppId },
      select: {
        settlementBalanceUgx: true,
        payoutPhone: true,
        payoutNetwork: true,
        enabled: true,
      },
    });
    if (!app || !app.enabled) throw new Error("App not found");

    const phone = (opts.phone?.trim() || app.payoutPhone).trim();
    const network = (opts.network?.trim() || app.payoutNetwork || "MTN").toUpperCase();
    if (!phone) throw new Error("Set a payout Mobile Money number first");
    if (network !== "MTN" && network !== "AIRTEL") {
      throw new Error("Network must be MTN or AIRTEL");
    }
    if (opts.amountUgx > app.settlementBalanceUgx) {
      throw new Error(
        `Insufficient balance (${app.settlementBalanceUgx.toLocaleString()} UGX available)`,
      );
    }

    await tx.developerApp.update({
      where: { id: opts.developerAppId },
      data: { settlementBalanceUgx: { decrement: opts.amountUgx } },
    });

    return tx.merchantPayout.create({
      data: {
        developerAppId: opts.developerAppId,
        amountUgx: Math.round(opts.amountUgx),
        phone,
        network,
        status: "pending",
        note: opts.note?.trim() ?? "",
      },
    });
  });
}

export function serializeMerchantPayout(row: {
  id: string;
  amountUgx: number;
  phone: string;
  network: string;
  status: string;
  note: string;
  rejectionReason: string;
  paidAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    amountUgx: row.amountUgx,
    phone: row.phone,
    network: row.network,
    status: row.status,
    note: row.note,
    rejectionReason: row.rejectionReason || null,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Master/ops: mark payout paid (money already sent via MoMo). */
export async function markMerchantPayoutPaid(payoutId: string) {
  const row = await prisma.merchantPayout.findUnique({ where: { id: payoutId } });
  if (!row) throw new Error("Payout not found");
  if (row.status === "paid") return row;
  if (row.status !== "pending") throw new Error(`Cannot pay payout in status ${row.status}`);
  return prisma.merchantPayout.update({
    where: { id: payoutId },
    data: { status: "paid", paidAt: new Date() },
  });
}

/** Master/ops: reject and restore balance. */
export async function rejectMerchantPayout(payoutId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.merchantPayout.findUnique({ where: { id: payoutId } });
    if (!row) throw new Error("Payout not found");
    if (row.status !== "pending") throw new Error(`Cannot reject payout in status ${row.status}`);
    await tx.developerApp.update({
      where: { id: row.developerAppId },
      data: { settlementBalanceUgx: { increment: row.amountUgx } },
    });
    return tx.merchantPayout.update({
      where: { id: payoutId },
      data: { status: "rejected", rejectionReason: reason.trim() || "Rejected" },
    });
  });
}
