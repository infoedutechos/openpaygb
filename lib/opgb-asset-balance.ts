import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prisma-retry";

export const OPGB_CRYPTO_ASSETS = ["ton", "usdt", "btc", "eth"] as const;
export type OpgbCryptoAsset = (typeof OPGB_CRYPTO_ASSETS)[number];

type TxClient = Prisma.TransactionClient;

export function isOpgbCryptoAsset(asset: string): asset is OpgbCryptoAsset {
  return OPGB_CRYPTO_ASSETS.includes(asset.toLowerCase() as OpgbCryptoAsset);
}

export async function getOpgbAssetBalances(walletId: string, tx?: TxClient) {
  const client = tx ?? prisma;
  const rows = await client.opgbAssetBalance.findMany({
    where: { walletId },
    orderBy: { asset: "asc" },
  });
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.asset, row.amount);
  for (const asset of OPGB_CRYPTO_ASSETS) {
    if (!map.has(asset)) map.set(asset, 0);
  }
  return map;
}

export async function creditOpgbAsset(
  opts: { walletId: string; asset: OpgbCryptoAsset; amount: number },
  tx?: TxClient,
) {
  const amount = opts.amount;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false as const };

  const run = async (client: TxClient) => {
    const row = await client.opgbAssetBalance.upsert({
      where: { walletId_asset: { walletId: opts.walletId, asset: opts.asset } },
      create: { walletId: opts.walletId, asset: opts.asset, amount },
      update: { amount: { increment: amount } },
    });
    return { ok: true as const, amount: row.amount };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

export async function debitOpgbAsset(
  opts: { walletId: string; asset: OpgbCryptoAsset; amount: number },
  tx?: TxClient,
) {
  const amount = opts.amount;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false as const };

  const run = async (client: TxClient) => {
    const row = await client.opgbAssetBalance.findUnique({
      where: { walletId_asset: { walletId: opts.walletId, asset: opts.asset } },
    });
    if (!row || row.amount < amount) throw new Error(`Insufficient ${opts.asset.toUpperCase()} balance`);

    const updated = await client.opgbAssetBalance.update({
      where: { id: row.id },
      data: { amount: { decrement: amount } },
    });
    return { ok: true as const, amount: updated.amount };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

export async function getWalletIdForStudent(studentId: string) {
  return withPrismaRetry(() =>
    prisma.opgbWallet.findUnique({
      where: { studentId },
      select: { id: true },
    }),
  );
}
