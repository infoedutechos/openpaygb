import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOpgbFxSnapshot } from "@/lib/opgb-fx-rates";
import type { AmmPair } from "@/lib/dex-amm-quote";

const DEFAULT_POOL_UGX = 50_000_000;
const AMM_FEE_BPS = 30;

type TxClient = Prisma.TransactionClient;

function pairCryptoAsset(pair: AmmPair): "ton" | "usdt" {
  return pair === "OPGB_TON" ? "ton" : "usdt";
}

export async function ensureAmmPools() {
  const fx = await getOpgbFxSnapshot();
  const seeds: { pair: AmmPair; reserveCrypto: number }[] = [
    { pair: "OPGB_TON", reserveCrypto: DEFAULT_POOL_UGX / fx.ugxPerTon },
    { pair: "OPGB_USDT", reserveCrypto: DEFAULT_POOL_UGX / fx.ugxPerUsdt },
  ];

  for (const seed of seeds) {
    await prisma.dexAmmPool.upsert({
      where: { pair: seed.pair },
      create: {
        pair: seed.pair,
        reserveOpgbUgx: DEFAULT_POOL_UGX,
        reserveCrypto: seed.reserveCrypto,
      },
      update: {},
    });
  }
}

export async function getAmmPool(pair: AmmPair, tx?: TxClient) {
  const client = tx ?? prisma;
  let pool = await client.dexAmmPool.findUnique({ where: { pair } });
  if (!pool) {
    await ensureAmmPools();
    pool = await client.dexAmmPool.findUnique({ where: { pair } });
  }
  return pool;
}

/** Constant-product output with fee (exact-in OPGB → crypto). */
export function quoteAmmFromPool(opts: {
  reserveOpgbUgx: number;
  reserveCrypto: number;
  inputOpgbUgx: number;
}) {
  const input = Math.round(opts.inputOpgbUgx);
  if (input <= 0 || opts.reserveOpgbUgx <= 0 || opts.reserveCrypto <= 0) return null;

  const inputAfterFee = input * (1 - AMM_FEE_BPS / 10_000);
  const outputCrypto =
    (opts.reserveCrypto * inputAfterFee) / (opts.reserveOpgbUgx + inputAfterFee);
  const priceImpactBps = Math.min(
    500,
    Math.round((input / (opts.reserveOpgbUgx + input)) * 10_000),
  );

  return {
    inputOpgbUgx: input,
    outputCrypto: Math.round(outputCrypto * 1e9) / 1e9,
    priceImpactBps,
    poolLiquidityUgx: opts.reserveOpgbUgx,
    feeBps: AMM_FEE_BPS,
  };
}

export async function executeAmmPoolSwap(
  opts: { pair: AmmPair; inputOpgbUgx: number },
  tx: TxClient,
) {
  const pool = await getAmmPool(opts.pair, tx);
  if (!pool) throw new Error("AMM pool unavailable");

  const quote = quoteAmmFromPool({
    reserveOpgbUgx: pool.reserveOpgbUgx,
    reserveCrypto: pool.reserveCrypto,
    inputOpgbUgx: opts.inputOpgbUgx,
  });
  if (!quote || quote.outputCrypto <= 0) throw new Error("Insufficient pool liquidity");

  const newReserveOpgb = pool.reserveOpgbUgx + quote.inputOpgbUgx;
  const newReserveCrypto = pool.reserveCrypto - quote.outputCrypto;
  if (newReserveCrypto <= 0) throw new Error("Pool would be drained");

  await tx.dexAmmPool.update({
    where: { id: pool.id },
    data: {
      reserveOpgbUgx: newReserveOpgb,
      reserveCrypto: newReserveCrypto,
    },
  });

  return {
    ...quote,
    outputAsset: pairCryptoAsset(opts.pair).toUpperCase(),
    cryptoAsset: pairCryptoAsset(opts.pair),
  };
}
