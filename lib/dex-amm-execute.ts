import "server-only";

import { prisma } from "@/lib/prisma";
import { debitOpgb, ensureOpgbWallet, reconcileOpgbWalletWithCard } from "@/lib/opgb-ledger";
import { creditOpgbAsset } from "@/lib/opgb-asset-balance";
import { executeAmmPoolSwap } from "@/lib/dex-amm-pool";
import { getStudentOpenPayCard } from "@/lib/openpay-card";
import { quoteAmmSwap, type AmmPair } from "@/lib/dex-amm-quote";
import { dexSettlementNextPath, dexSettlementNote } from "@/lib/dex-settlement";

export type AmmSwapResult =
  | {
      ok: true;
      swapId: string;
      referenceKey: string;
      outputAsset: string;
      outputAmount: number;
      inputAmountUgx: number;
      nextPath: string;
      message: string;
    }
  | { ok: false; error: string; status: number };

export async function executeAmmSwap(opts: {
  studentId: string;
  organizationId: string;
  pair: AmmPair;
  inputAmountUgx: number;
}): Promise<AmmSwapResult> {
  const quote = await quoteAmmSwap({
    pair: opts.pair,
    inputAmount: opts.inputAmountUgx,
    direction: "exact_in",
  });
  if (!quote) {
    return { ok: false, error: "Invalid swap request", status: 400 };
  }

  const referenceKey = `amm:${opts.studentId}:${opts.pair}:${opts.inputAmountUgx}:${Date.now()}`;

  const card = await getStudentOpenPayCard(opts.studentId);
  if (card && card.balanceUgx > 0) {
    await reconcileOpgbWalletWithCard({
      studentId: opts.studentId,
      organizationId: opts.organizationId,
      cardBalanceUgx: card.balanceUgx,
    });
  }

  await ensureOpgbWallet(opts.studentId, opts.organizationId);

  try {
    const swap = await prisma.$transaction(async (tx) => {
      const poolSwap = await executeAmmPoolSwap(
        { pair: opts.pair, inputOpgbUgx: opts.inputAmountUgx },
        tx,
      );

      const debited = await debitOpgb(
        {
          studentId: opts.studentId,
          organizationId: opts.organizationId,
          amountUgx: poolSwap.inputOpgbUgx,
          kind: "amm_swap",
          referenceKey,
          sourceRail: "dex_amm",
          memo: `AMM ${opts.pair}`,
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
          asset: poolSwap.cryptoAsset,
          amount: poolSwap.outputCrypto,
        },
        tx,
      );

      return tx.dexAmmSwap.create({
        data: {
          studentId: opts.studentId,
          organizationId: opts.organizationId,
          pair: opts.pair,
          inputAmountUgx: poolSwap.inputOpgbUgx,
          outputAsset: poolSwap.outputAsset,
          outputAmount: poolSwap.outputCrypto,
          status: "completed",
          referenceKey,
          settlementNote: dexSettlementNote(poolSwap.outputAsset),
        },
      });
    });

    return {
      ok: true,
      swapId: swap.id,
      referenceKey: swap.referenceKey,
      outputAsset: swap.outputAsset,
      outputAmount: swap.outputAmount,
      inputAmountUgx: swap.inputAmountUgx,
      nextPath: dexSettlementNextPath(swap.outputAsset),
      message: `${swap.outputAmount} ${swap.outputAsset} credited to your wallet.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Swap failed";
    return { ok: false, error: msg, status: 409 };
  }
}
