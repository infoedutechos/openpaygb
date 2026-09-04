import { prisma } from "@/lib/prisma";

/** Normalize common UG MoMo formats to digits (e.g. 07… → 2567…). */
export function normalizeMomoPhone(raw: string): string {
  let p = raw.replace(/[\s\-()]/g, "").trim();
  if (p.startsWith("+")) p = p.slice(1);
  if (/^0\d{9}$/.test(p)) p = `256${p.slice(1)}`;
  return p;
}

export async function requestMerchantPayout(opts: {
  developerAppId: string;
  amountUgx: number;
  phone?: string;
  network?: string;
  note?: string;
  /** Persist phone/network on the app when provided with the request. */
  saveDestination?: boolean;
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

    const phone = normalizeMomoPhone(opts.phone?.trim() || app.payoutPhone || "");
    const network = (opts.network?.trim() || app.payoutNetwork || "MTN").toUpperCase();
    if (!phone) throw new Error("Set a payout Mobile Money number first");
    if (phone.length < 10 || phone.length > 15 || !/^\d+$/.test(phone)) {
      throw new Error("Invalid Mobile Money number");
    }
    if (network !== "MTN" && network !== "AIRTEL") {
      throw new Error("Network must be MTN or AIRTEL");
    }
    if (opts.amountUgx > app.settlementBalanceUgx) {
      throw new Error(
        `Insufficient balance (${app.settlementBalanceUgx.toLocaleString()} UGX available)`,
      );
    }

    const amount = Math.round(opts.amountUgx);
    const shouldSave =
      opts.saveDestination !== false &&
      (Boolean(opts.phone?.trim()) || Boolean(opts.network?.trim()));

    await tx.developerApp.update({
      where: { id: opts.developerAppId },
      data: {
        settlementBalanceUgx: { decrement: amount },
        ...(shouldSave ? { payoutPhone: phone, payoutNetwork: network } : {}),
      },
    });

    return tx.merchantPayout.create({
      data: {
        developerAppId: opts.developerAppId,
        amountUgx: amount,
        phone,
        network,
        status: "pending",
        note: opts.note?.trim() ?? "",
      },
    });
  }).then(async (payout) => {
    const auto = await tryAutoDisburseMerchantPayout(payout.id);
    return auto.payout ?? payout;
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
  rail?: string;
  railReference?: string;
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
    rail: row.rail || "manual",
    railReference: row.railReference || null,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Sandbox auto-complete for merchant MoMo cashouts (dev / explicit flag). */
export function merchantCashoutSandboxEnabled(): boolean {
  if (process.env.OPENPAYGB_CASHOUT_SANDBOX === "1") return true;
  if (process.env.OPENPAYGB_CASHOUT_SANDBOX === "0") return false;
  return process.env.NODE_ENV !== "production" && process.env.OPENPAYGB_CHARGES_SANDBOX === "1";
}

/**
 * Attempt automated disbursement:
 * 1) Sandbox auto-mark when OPENPAYGB_CASHOUT_SANDBOX / charges sandbox
 * 2) Live LivePay/Relworx send-money when OPENPAYGB_CASHOUT_LIVE=1 + credentials
 * 3) Otherwise leave queued for master mark-paid
 */
export async function tryAutoDisburseMerchantPayout(payoutId: string) {
  const row = await prisma.merchantPayout.findUnique({ where: { id: payoutId } });
  if (!row || row.status === "paid" || row.status === "rejected") {
    return { action: "noop" as const, payout: row };
  }

  if (merchantCashoutSandboxEnabled()) {
    const paid = await prisma.merchantPayout.update({
      where: { id: payoutId },
      data: {
        status: "paid",
        paidAt: new Date(),
        rail: "sandbox",
        railReference: `sandbox_${payoutId.slice(-8)}`,
        note: [row.note, "Auto-paid in OPENPAYGB cashout sandbox"].filter(Boolean).join(" | "),
      },
    });
    return { action: "sandbox_paid" as const, payout: paid };
  }

  const { disburseToMomo } = await import("@/lib/momo-disburse");
  await prisma.merchantPayout.update({
    where: { id: payoutId },
    data: { status: "processing" },
  });

  const result = await disburseToMomo({
    phoneDigits: row.phone,
    network: row.network,
    amountUgx: row.amountUgx,
    reference: `mp${payoutId}`,
    description: `Merchant cashout ${payoutId.slice(-8)}`,
  });

  if (result.ok) {
    const paid = await prisma.merchantPayout.update({
      where: { id: payoutId },
      data: {
        status: "paid",
        paidAt: new Date(),
        rail: result.rail,
        railReference: result.railReference,
        note: [row.note, result.message].filter(Boolean).join(" | "),
      },
    });
    return { action: "live_paid" as const, payout: paid };
  }

  const queued = await prisma.merchantPayout.update({
    where: { id: payoutId },
    data: {
      status: "pending",
      note: [row.note, result.reason].filter(Boolean).join(" | ").slice(0, 500),
    },
  });
  return { action: "queued" as const, payout: queued, reason: result.reason };
}

/** Master/ops: mark payout paid (money already sent via MoMo). */
export async function markMerchantPayoutPaid(payoutId: string) {
  const row = await prisma.merchantPayout.findUnique({ where: { id: payoutId } });
  if (!row) throw new Error("Payout not found");
  if (row.status === "paid") return row;
  if (row.status !== "pending" && row.status !== "processing") {
    throw new Error(`Cannot pay payout in status ${row.status}`);
  }
  return prisma.merchantPayout.update({
    where: { id: payoutId },
    data: { status: "paid", paidAt: new Date(), rail: row.rail || "manual" },
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
