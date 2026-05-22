import { PaymentRail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TON_WALLET } from "@/lib/constants";
import { tonToNanotonString } from "@/lib/money";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import {
  fetchAccountTransactionsRecent,
  txHash,
  txIncomingNano,
  txReferencesPayment,
  txUtimeMs,
} from "@/lib/ton/tonapi";

export type TonConfirmJobResult = {
  ok: boolean;
  confirmed: number;
  pendingScanned: number;
  walletsScanned?: number;
  message?: string;
};

type PendingPayment = {
  id: string;
  tonAmount: number;
  destinationWallet: string;
  createdAt: Date;
};

async function confirmOne(paymentId: string, hash: string): Promise<boolean> {
  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!existing || existing.status === "confirmed") return false;

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      txHash: hash,
    },
  });
  handleFirstTimeConfirmation(updated);
  return true;
}

function pendingWhere() {
  return {
    status: "pending" as const,
    rail: { in: [PaymentRail.web, PaymentRail.telegram] },
  };
}

function watchAddressesForPending(pending: PendingPayment[]): string[] {
  const set = new Set<string>();
  const def = DEFAULT_TON_WALLET.trim();
  if (def && !def.includes("placeholder")) set.add(def);
  for (const p of pending) {
    const w = p.destinationWallet?.trim();
    if (w && !w.includes("placeholder")) set.add(w);
  }
  return [...set];
}

function paymentsForWallet(pending: PendingPayment[], wallet: string): PendingPayment[] {
  const w = wallet.trim();
  return pending.filter((p) => p.destinationWallet.trim() === w);
}

async function matchRefPass(
  pending: PendingPayment[],
  txs: Record<string, unknown>[],
  usedHashes: Set<string>,
): Promise<number> {
  let confirmed = 0;
  paymentLoop: for (const p of pending) {
    for (const tx of txs) {
      const h = txHash(tx);
      if (!h || usedHashes.has(h)) continue;
      if (!txReferencesPayment(tx, p.id)) continue;
      const ok = await confirmOne(p.id, h);
      if (ok) {
        confirmed++;
        usedHashes.add(h);
      }
      continue paymentLoop;
    }
  }
  return confirmed;
}

async function matchAmountPass(
  pending: PendingPayment[],
  txs: Record<string, unknown>[],
  usedHashes: Set<string>,
): Promise<number> {
  let confirmed = 0;
  const sortedByTime = [...txs].sort((a, b) => txUtimeMs(a) - txUtimeMs(b));

  for (const p of pending) {
    const expectedNano = BigInt(tonToNanotonString(p.tonAmount));
    const minTime = p.createdAt.getTime() - 5000;

    for (const tx of sortedByTime) {
      const h = txHash(tx);
      if (!h || usedHashes.has(h)) continue;
      const nano = txIncomingNano(tx);
      if (nano === null || nano !== expectedNano) continue;
      if (txUtimeMs(tx) < minTime) continue;

      const ok = await confirmOne(p.id, h);
      if (ok) {
        confirmed++;
        usedHashes.add(h);
      }
      break;
    }
  }
  return confirmed;
}

/**
 * Match TonAPI transactions to pending `web` / `telegram` payments per settlement wallet:
 * 1) transaction JSON contains `ref:<paymentId>`,
 * 2) else exact incoming nanoTON + timestamp after `createdAt` (FIFO).
 */
export async function runTonInboundConfirmJob(): Promise<TonConfirmJobResult> {
  const pending = await prisma.payment.findMany({
    where: pendingWhere(),
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      tonAmount: true,
      destinationWallet: true,
      createdAt: true,
    },
  });

  const addresses = watchAddressesForPending(pending);
  if (addresses.length === 0) {
    return {
      ok: false,
      confirmed: 0,
      pendingScanned: pending.length,
      walletsScanned: 0,
      message: "No settlement wallets configured (set ODELHUB_TON_WALLET_ADDRESS or org destinationWallet)",
    };
  }

  const usedHashes = new Set<string>();
  let confirmed = 0;
  let walletsScanned = 0;

  for (const address of addresses) {
    const fetched = await fetchAccountTransactionsRecent(address, 100);
    if (!fetched.ok) {
      if (addresses.length === 1) {
        return { ok: false, confirmed: 0, pendingScanned: pending.length, message: fetched.error };
      }
      continue;
    }
    walletsScanned++;

    const walletPending = paymentsForWallet(pending, address);
    if (walletPending.length === 0) continue;

    const txs = [...fetched.transactions];
    confirmed += await matchRefPass(walletPending, txs, usedHashes);

    const stillPendingForWallet = walletPending.filter((p) => {
      return pending.some((row) => row.id === p.id);
    });
    if (stillPendingForWallet.length > 0) {
      const refreshed = await prisma.payment.findMany({
        where: { id: { in: stillPendingForWallet.map((p) => p.id) }, ...pendingWhere() },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          tonAmount: true,
          destinationWallet: true,
          createdAt: true,
        },
      });
      if (refreshed.length > 0) {
        confirmed += await matchAmountPass(refreshed, txs, usedHashes);
      }
    }
  }

  const count = await prisma.payment.count({ where: pendingWhere() });
  return {
    ok: true,
    confirmed,
    pendingScanned: count,
    walletsScanned,
  };
}
