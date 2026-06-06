import "server-only";

import { prisma } from "@/lib/prisma";
import { defaultTonWallet } from "@/lib/constants";
import { tonToNanotonString } from "@/lib/money";
import { activateOpenPayCard, confirmOpenPayCardTopup, platformTonWalletForCardOps } from "@/lib/openpay-card";
import {
  fetchAccountTransactionsRecent,
  txHash,
  txIncomingNano,
  txReferencesMarker,
  txUtimeMs,
} from "@/lib/ton/tonapi";

export type OpenPayCardTonConfirmResult = {
  ok: boolean;
  cardsActivated: number;
  topupsConfirmed: number;
  message?: string;
};

/**
 * Scan platform TON wallet for `opcard:` (issue) and `opcardfund:` (balance top-up) memos.
 */
export async function runOpenPayCardTonConfirmJob(): Promise<OpenPayCardTonConfirmResult> {
  const wallet = platformTonWalletForCardOps() || defaultTonWallet().trim();
  if (!wallet || wallet.includes("placeholder")) {
    return { ok: false, cardsActivated: 0, topupsConfirmed: 0, message: "Platform TON wallet not configured" };
  }

  const [pendingCards, pendingTopups, fetched] = await Promise.all([
    prisma.openPayCard.findMany({
      where: { status: "pending_issue", issueMemo: { not: "" } },
      take: 100,
      select: { id: true, issueFeeTon: true, issueMemo: true, createdAt: true },
    }),
    prisma.openPayCardTopup.findMany({
      where: { status: "pending", fundingRail: "ton", memo: { not: "" } },
      take: 100,
      select: { id: true, cardId: true, tonAmount: true, memo: true, createdAt: true },
    }),
    fetchAccountTransactionsRecent(wallet, 120),
  ]);

  if (!fetched.ok) {
    return { ok: false, cardsActivated: 0, topupsConfirmed: 0, message: fetched.error };
  }

  if (pendingCards.length === 0 && pendingTopups.length === 0) {
    return { ok: true, cardsActivated: 0, topupsConfirmed: 0 };
  }

  const txs = [...fetched.transactions].sort((a, b) => txUtimeMs(a) - txUtimeMs(b));
  const usedHashes = new Set<string>();
  let cardsActivated = 0;
  let topupsConfirmed = 0;

  for (const card of pendingCards) {
    const memo = card.issueMemo.trim();
    if (!memo) continue;
    const expectedNano = BigInt(tonToNanotonString(card.issueFeeTon ?? 5));
    const minTime = card.createdAt.getTime() - 5000;

    for (const tx of txs) {
      const h = txHash(tx);
      if (!h || usedHashes.has(h)) continue;
      if (!txReferencesMarker(tx, memo)) continue;
      const nano = txIncomingNano(tx);
      if (nano === null || nano !== expectedNano) continue;
      if (txUtimeMs(tx) < minTime) continue;

      const ok = await activateOpenPayCard(card.id, h);
      if (ok) {
        cardsActivated++;
        usedHashes.add(h);
      }
      break;
    }
  }

  for (const topup of pendingTopups) {
    const memo = topup.memo.trim();
    if (!memo) continue;
    const expectedNano = BigInt(tonToNanotonString(topup.tonAmount));
    const minTime = topup.createdAt.getTime() - 5000;

    for (const tx of txs) {
      const h = txHash(tx);
      if (!h || usedHashes.has(h)) continue;
      if (!txReferencesMarker(tx, memo)) continue;
      const nano = txIncomingNano(tx);
      if (nano === null || nano !== expectedNano) continue;
      if (txUtimeMs(tx) < minTime) continue;

      const ok = await confirmOpenPayCardTopup(topup.id, h);
      if (ok) {
        topupsConfirmed++;
        usedHashes.add(h);
      }
      break;
    }
  }

  return { ok: true, cardsActivated, topupsConfirmed };
}
