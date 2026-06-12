import "server-only";

import { prisma } from "@/lib/prisma";
import { quoteDexBuy } from "@/lib/dex-buy-quote";
import { quoteDexSell } from "@/lib/dex-sell-quote";
import type { DexBuyCrypto } from "@/lib/dex-buy-quote";

export type DexIntentType = "buy" | "sell" | "convert";

const INTENT_TTL_MS = 30 * 60 * 1000;

export async function createDexPaymentIntent(opts: {
  developerAppId: string;
  apiKeyId?: string | null;
  type: DexIntentType;
  crypto: DexBuyCrypto;
  fiatAmountUgx?: number;
  cryptoAmount?: number;
  studentId?: string | null;
  redirectUrl?: string;
}) {
  let quote: Record<string, unknown> | null = null;

  if (opts.type === "buy") {
    const fiat = opts.fiatAmountUgx ?? 0;
    const q = await quoteDexBuy(opts.crypto, fiat);
    if (!q) return null;
    quote = q as unknown as Record<string, unknown>;
  } else if (opts.type === "sell") {
    const amount = opts.cryptoAmount ?? 0;
    const q = await quoteDexSell(opts.crypto, amount);
    if (!q) return null;
    quote = q as unknown as Record<string, unknown>;
  } else {
    const fiat = opts.fiatAmountUgx ?? 0;
    const q = await quoteDexBuy(opts.crypto, fiat);
    if (!q) return null;
    quote = { ...q, action: "convert" } as unknown as Record<string, unknown>;
  }

  const expiresAt = new Date(Date.now() + INTENT_TTL_MS);

  const row = await prisma.dexPaymentIntent.create({
    data: {
      developerAppId: opts.developerAppId,
      apiKeyId: opts.apiKeyId ?? null,
      type: opts.type,
      status: "pending",
      crypto: opts.crypto,
      fiatAmountUgx: opts.fiatAmountUgx ?? null,
      cryptoAmount: opts.cryptoAmount ?? null,
      quoteJson: JSON.stringify(quote),
      studentId: opts.studentId ?? null,
      redirectUrl: opts.redirectUrl?.trim() ?? "",
      expiresAt,
    },
  });

  return { intent: row, quote };
}

export function serializeDexPaymentIntent(row: {
  id: string;
  type: string;
  status: string;
  crypto: string;
  fiatAmountUgx: number | null;
  cryptoAmount: number | null;
  quoteJson: string;
  studentId: string | null;
  redirectUrl: string;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}) {
  let quote: unknown = null;
  try {
    quote = JSON.parse(row.quoteJson);
  } catch {
    quote = null;
  }
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    crypto: row.crypto,
    fiatAmountUgx: row.fiatAmountUgx,
    cryptoAmount: row.cryptoAmount,
    quote,
    studentId: row.studentId,
    redirectUrl: row.redirectUrl,
    expiresAt: row.expiresAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    executeUrl: `/dex/${row.type}?intent=${row.id}`,
  };
}
