import "server-only";

import { prisma } from "@/lib/prisma";
import { debitOpgb, ensureOpgbWallet, reconcileOpgbWalletWithCard } from "@/lib/opgb-ledger";
import { creditOpgbAsset, type OpgbCryptoAsset } from "@/lib/opgb-asset-balance";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { quoteDexBuy, type DexBuyCrypto } from "@/lib/dex-buy-quote";
import { dexSettlementNote } from "@/lib/dex-settlement";

export type DexBuySettleResult =
  | {
      ok: true;
      orderId: string;
      referenceKey: string;
      crypto: string;
      cryptoAmount: number;
      fiatAmountUgx: number;
      message: string;
    }
  | { ok: false; error: string; status: number };

function cryptoAssetKey(crypto: string): OpgbCryptoAsset {
  return crypto.toLowerCase() as OpgbCryptoAsset;
}

/** Debit OPGB and credit custodial crypto balance; mark order settled. */
export async function executeDexBuyWithOpgb(opts: {
  studentId: string;
  organizationId: string;
  crypto: DexBuyCrypto;
  fiatAmountUgx: number;
}): Promise<DexBuySettleResult> {
  const quote = await quoteDexBuy(opts.crypto, opts.fiatAmountUgx);
  if (!quote || !quote.stepsReady) {
    return { ok: false, error: "Quote unavailable", status: 503 };
  }

  const card = await getStudentOpenPayCard(opts.studentId);
  if (card && card.balanceUgx > 0) {
    await reconcileOpgbWalletWithCard({
      studentId: opts.studentId,
      organizationId: opts.organizationId,
      cardBalanceUgx: card.balanceUgx,
    });
  }
  await ensureOpgbWallet(opts.studentId, opts.organizationId);

  const referenceKey = `dexbuy:${opts.studentId}:${opts.crypto}:${opts.fiatAmountUgx}:${Date.now()}`;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const debited = await debitOpgb(
        {
          studentId: opts.studentId,
          organizationId: opts.organizationId,
          amountUgx: quote.totalFiatUgx,
          kind: "swap",
          referenceKey,
          sourceRail: "dex_buy",
          memo: `Buy ${quote.cryptoAmount} ${opts.crypto}`,
        },
        tx,
      );
      if (!debited.ok) throw new Error("Insufficient OPGB balance");

      const wallet = await tx.opgbWallet.findUniqueOrThrow({
        where: { studentId: opts.studentId },
      });
      await creditOpgbAsset(
        {
          walletId: wallet.id,
          asset: cryptoAssetKey(opts.crypto),
          amount: quote.cryptoAmount,
        },
        tx,
      );

      return tx.dexBuyOrder.create({
        data: {
          studentId: opts.studentId,
          organizationId: opts.organizationId,
          crypto: opts.crypto,
          fiatAmountUgx: quote.fiatAmount,
          cryptoAmount: quote.cryptoAmount,
          feeUgx: quote.feeUgx,
          status: "settled",
          referenceKey,
          settlementNote: dexSettlementNote(opts.crypto),
          settledAt: new Date(),
        },
      });
    });

    return {
      ok: true,
      orderId: order.id,
      referenceKey: order.referenceKey,
      crypto: order.crypto,
      cryptoAmount: order.cryptoAmount,
      fiatAmountUgx: order.fiatAmountUgx,
      message: `Settled: ${order.cryptoAmount} ${order.crypto} credited to your wallet.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Buy failed";
    return { ok: false, error: msg, status: 409 };
  }
}

/** Process queued public buy orders older than threshold (ops fallback). */
export async function settleQueuedDexBuyOrders(limit = 20) {
  const queued = await prisma.dexBuyOrder.findMany({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let settled = 0;
  for (const order of queued) {
    if (!order.studentId || !order.organizationId) continue;
    const result = await executeDexBuyWithOpgb({
      studentId: order.studentId,
      organizationId: order.organizationId,
      crypto: order.crypto as DexBuyCrypto,
      fiatAmountUgx: order.fiatAmountUgx,
    });
    if (result.ok) {
      await prisma.dexBuyOrder.update({
        where: { id: order.id },
        data: { status: "settled", settledAt: new Date(), settlementNote: result.message },
      });
      settled += 1;
    }
  }
  return { processed: queued.length, settled };
}
