import "server-only";

import { prisma } from "@/lib/prisma";
import { debitOpgb, ensureOpgbWallet } from "@/lib/opgb-ledger";
import {
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

    // Custodial auto-complete (payout rail simulation until live disbursement API).
    const completed = await prisma.opgbWithdrawRequest.update({
      where: { id: request.id },
      data: { status: "completed", completedAt: new Date() },
    });

    return {
      ok: true,
      requestId: completed.id,
      referenceKey: completed.referenceKey,
      status: completed.status,
      message: `Withdrawal of ${amount} ${asset.toUpperCase()} via ${opts.rail} queued and processed.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Withdraw failed";
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
