import "server-only";

import { prisma } from "@/lib/prisma";
import { creditOpgb, debitOpgb, ensureOpgbWallet } from "@/lib/opgb-ledger";
import {
  creditOpgbAsset,
  debitOpgbAsset,
  isOpgbCryptoAsset,
  type OpgbCryptoAsset,
} from "@/lib/opgb-asset-balance";
import { getOpgbFxSnapshot } from "@/lib/opgb-fx-rates";

export type WithdrawRail = "momo" | "ton" | "bank";

export type WithdrawResult =
  | { ok: true; requestId: string; referenceKey: string; status: string; message: string }
  | { ok: false; error: string; status: number };

function assetToUgx(asset: string, amount: number, fx: Awaited<ReturnType<typeof getOpgbFxSnapshot>>) {
  const a = asset.toLowerCase();
  if (a === "opgb" || a === "momo") return Math.round(amount);
  if (a === "ton") return Math.round(amount * fx.ugxPerTon);
  if (a === "usdt") return Math.round(amount * fx.ugxPerUsdt);
  if (a === "btc") return Math.round(amount * fx.ugxPerBtc);
  if (a === "eth") return Math.round(amount * fx.ugxPerEth);
  return 0;
}

export async function requestOpgbWithdraw(opts: {
  studentId: string;
  organizationId: string;
  asset: string;
  amount: number;
  rail: WithdrawRail;
  destination: string;
  memo?: string;
}): Promise<WithdrawResult> {
  const asset = opts.asset.toLowerCase();
  const amount = opts.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be positive", status: 400 };
  }
  if (!opts.destination.trim()) {
    return { ok: false, error: "Destination is required", status: 400 };
  }

  const fx = await getOpgbFxSnapshot();
  const amountUgx = assetToUgx(asset, amount, fx);
  if (amountUgx <= 0) return { ok: false, error: "Unsupported asset", status: 400 };

  await ensureOpgbWallet(opts.studentId, opts.organizationId);
  const referenceKey = `withdraw:${opts.studentId}:${asset}:${Date.now()}`;

  try {
    const request = await prisma.$transaction(async (tx) => {
      const wallet = await tx.opgbWallet.findUniqueOrThrow({
        where: { studentId: opts.studentId },
      });

      if (asset === "opgb" || asset === "momo") {
        const debited = await debitOpgb(
          {
            studentId: opts.studentId,
            organizationId: opts.organizationId,
            amountUgx: Math.round(amount),
            kind: "withdraw",
            referenceKey,
            sourceRail: opts.rail,
            memo: opts.memo ?? `Withdraw ${asset} via ${opts.rail}`,
          },
          tx,
        );
        if (!debited.ok) throw new Error("Insufficient OPGB balance");
      } else if (isOpgbCryptoAsset(asset)) {
        const debited = await debitOpgbAsset(
          { walletId: wallet.id, asset: asset as OpgbCryptoAsset, amount },
          tx,
        );
        if (!debited.ok) throw new Error(`Insufficient ${asset.toUpperCase()} balance`);
      } else {
        throw new Error("Unsupported asset");
      }

      return tx.opgbWithdrawRequest.create({
        data: {
          walletId: wallet.id,
          studentId: opts.studentId,
          organizationId: opts.organizationId,
          asset,
          amount,
          amountUgx,
          rail: opts.rail,
          destination: opts.destination.trim(),
          status: "processing",
          referenceKey,
          memo: opts.memo ?? "",
        },
      });
    });

    return {
      ok: true,
      requestId: request.id,
      referenceKey: request.referenceKey,
      status: request.status,
      message: `Withdrawal of ${amount} ${asset.toUpperCase()} via ${opts.rail} queued for ops payout (funds held).`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Withdraw failed";
    return { ok: false, error: msg, status: 409 };
  }
}

export async function listOpgbWithdrawQueue(opts?: { status?: string; limit?: number }) {
  const status = opts?.status?.trim();
  return prisma.opgbWithdrawRequest.findMany({
    where: status ? { status } : { status: { in: ["pending", "processing"] } },
    orderBy: { createdAt: "asc" },
    take: Math.min(opts?.limit ?? 100, 200),
  });
}

/** Mark payout sent externally (MoMo/bank/TON). Does not move ledger — debit already applied.
 * When rail is momo and OPENPAYGB_CASHOUT_LIVE=1, attempts LivePay/Relworx send-money first.
 */
export async function completeOpgbWithdraw(opts: {
  requestId: string;
  note?: string;
  /** Phone digits for MoMo auto-disburse when destination is on the request. */
  phone?: string;
  network?: string;
  amountUgx?: number;
}): Promise<WithdrawResult> {
  const row = await prisma.opgbWithdrawRequest.findUnique({ where: { id: opts.requestId } });
  if (!row || !["pending", "processing"].includes(row.status)) {
    return { ok: false, error: "Withdraw not actionable", status: 404 };
  }

  let note = opts.note?.trim().slice(0, 500) ?? "";
  const rail = (row.rail || "").toLowerCase();
  const phone = (opts.phone || row.destination || "").replace(/\D/g, "");
  const amountUgx = opts.amountUgx ?? row.amountUgx;
  if (rail === "momo" && phone && amountUgx > 0) {
    const { disburseToMomo } = await import("@/lib/momo-disburse");
    const sent = await disburseToMomo({
      phoneDigits: phone,
      network: opts.network || "MTN",
      amountUgx,
      reference: `wd${row.id}`,
      description: `OpenPayGB withdraw ${row.referenceKey}`,
    });
    if (sent.ok) {
      note = [note, `${sent.rail}:${sent.railReference}`].filter(Boolean).join(" | ");
    } else if (!sent.queued) {
      return { ok: false, error: sent.reason, status: 502 };
    } else {
      note = [note, sent.reason].filter(Boolean).join(" | ");
    }
  }

  const updated = await prisma.opgbWithdrawRequest.update({
    where: { id: row.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      memo: note ? `${row.memo || ""} | completed: ${note}`.trim() : row.memo,
    },
  });

  return {
    ok: true,
    requestId: updated.id,
    referenceKey: updated.referenceKey,
    status: updated.status,
    message: "Withdrawal marked completed (external payout recorded).",
  };
}

/** Reject payout and restore student balance. */
export async function failOpgbWithdraw(opts: {
  requestId: string;
  note?: string;
}): Promise<WithdrawResult> {
  const row = await prisma.opgbWithdrawRequest.findUnique({ where: { id: opts.requestId } });
  if (!row || !["pending", "processing"].includes(row.status)) {
    return { ok: false, error: "Withdraw not actionable", status: 404 };
  }

  const note = opts.note?.trim().slice(0, 500) ?? "rejected by ops";
  const refundKey = `withdraw-refund:${row.referenceKey}`;

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.opgbWithdrawRequest.updateMany({
        where: { id: row.id, status: { in: ["pending", "processing"] } },
        data: {
          status: "failed",
          memo: `${row.memo || ""} | failed: ${note}`.trim(),
        },
      });
      if (locked.count !== 1) throw new Error("Withdraw already settled");

      const asset = row.asset.toLowerCase();
      if (asset === "opgb" || asset === "momo") {
        await creditOpgb(
          {
            studentId: row.studentId,
            organizationId: row.organizationId,
            amountUgx: Math.round(row.amount),
            kind: "adjustment",
            referenceKey: refundKey,
            sourceRail: row.rail,
            memo: `Withdraw rejected: ${note}`,
          },
          tx,
        );
      } else if (isOpgbCryptoAsset(asset)) {
        await creditOpgbAsset(
          { walletId: row.walletId, asset: asset as OpgbCryptoAsset, amount: row.amount },
          tx,
        );
      } else {
        throw new Error("Unsupported asset for refund");
      }
    });

    return {
      ok: true,
      requestId: row.id,
      referenceKey: row.referenceKey,
      status: "failed",
      message: "Withdrawal rejected — balance restored to student.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reject failed";
    return { ok: false, error: msg, status: 409 };
  }
}

/** Credit OPGB from any inbound rail (direct deposit, not tuition spend). */
export async function creditOpgbDirectDeposit(opts: {
  studentId: string;
  organizationId: string;
  amountUgx: number;
  rail: string;
  referenceKey: string;
  kind?: "deposit_momo" | "deposit_ton" | "deposit_card_topup";
}) {
  const { creditOpgbDeposit, ensureOpgbWallet } = await import("@/lib/opgb-ledger");
  await ensureOpgbWallet(opts.studentId, opts.organizationId);
  return creditOpgbDeposit({
    studentId: opts.studentId,
    organizationId: opts.organizationId,
    amountUgx: opts.amountUgx,
    referenceKey: opts.referenceKey,
    kind: opts.kind ?? "deposit_momo",
    sourceRail: opts.rail,
    memo: `Direct OPGB deposit via ${opts.rail}`,
  });
}
