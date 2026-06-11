import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ugxToOpgbMinor } from "@/lib/opgb-peg";
import { withPrismaRetry } from "@/lib/prisma-retry";

export type OpgbLedgerKind =
  | "deposit_momo"
  | "deposit_ton"
  | "deposit_card_topup"
  | "tuition_pay"
  | "withdraw"
  | "swap"
  | "adjustment";

export type OpgbLedgerDirection = "credit" | "debit";

export type OpgbLedgerWriteInput = {
  studentId: string;
  organizationId: string;
  direction: OpgbLedgerDirection;
  amountMinor: number;
  kind: OpgbLedgerKind;
  referenceKey: string;
  sourceRail?: string;
  sourceCurrency?: string;
  sourceAmountMinor?: number;
  memo?: string;
};

type TxClient = Prisma.TransactionClient;

export async function ensureOpgbWallet(studentId: string, organizationId: string) {
  return withPrismaRetry(() =>
    prisma.opgbWallet.upsert({
      where: { studentId },
      create: { studentId, organizationId, balanceMinor: 0 },
      update: {},
    }),
  );
}

export async function getOpgbWalletSummary(studentId: string) {
  const wallet = await withPrismaRetry(() =>
    prisma.opgbWallet.findUnique({
      where: { studentId },
      include: {
        entries: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    }),
  );
  if (!wallet) return null;
  return {
    balanceMinor: wallet.balanceMinor,
    balanceUgx: wallet.balanceMinor,
    entries: wallet.entries.map((e) => ({
      id: e.id,
      direction: e.direction,
      amountMinor: e.amountMinor,
      kind: e.kind,
      referenceKey: e.referenceKey,
      sourceRail: e.sourceRail,
      sourceCurrency: e.sourceCurrency,
      sourceAmountMinor: e.sourceAmountMinor,
      memo: e.memo,
      balanceAfterMinor: e.balanceAfterMinor,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

/** Idempotent ledger write — returns false when referenceKey already exists. */
export async function writeOpgbLedgerEntry(
  input: OpgbLedgerWriteInput,
  tx?: TxClient,
): Promise<{ ok: boolean; balanceAfterMinor?: number }> {
  const amountMinor = Math.round(input.amountMinor);
  if (amountMinor <= 0) return { ok: false };

  const run = async (client: TxClient) => {
    const existing = await client.opgbLedgerEntry.findUnique({
      where: { referenceKey: input.referenceKey },
      select: { id: true },
    });
    if (existing) return { ok: false as const };

    const wallet = await client.opgbWallet.upsert({
      where: { studentId: input.studentId },
      create: {
        studentId: input.studentId,
        organizationId: input.organizationId,
        balanceMinor: 0,
      },
      update: {},
    });

    const delta = input.direction === "credit" ? amountMinor : -amountMinor;
    const nextBalance = wallet.balanceMinor + delta;
    if (nextBalance < 0) {
      throw new Error("Insufficient OPGB balance");
    }

    await client.opgbWallet.update({
      where: { id: wallet.id },
      data: { balanceMinor: nextBalance },
    });

    await client.opgbLedgerEntry.create({
      data: {
        walletId: wallet.id,
        direction: input.direction,
        amountMinor,
        kind: input.kind,
        referenceKey: input.referenceKey,
        sourceRail: input.sourceRail ?? "",
        sourceCurrency: input.sourceCurrency ?? "UGX",
        sourceAmountMinor: input.sourceAmountMinor ?? ugxToOpgbMinor(amountMinor),
        memo: input.memo ?? "",
        balanceAfterMinor: nextBalance,
      },
    });

    return { ok: true as const, balanceAfterMinor: nextBalance };
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

/** Deposit external UGX (or 1:1 converted amount) into OPGB wallet. */
export async function creditOpgbDeposit(
  opts: {
    studentId: string;
    organizationId: string;
    amountUgx: number;
    referenceKey: string;
    kind: Extract<OpgbLedgerKind, "deposit_momo" | "deposit_ton" | "deposit_card_topup">;
    sourceRail: string;
    sourceCurrency?: string;
    memo?: string;
  },
  tx?: TxClient,
) {
  return writeOpgbLedgerEntry({
    studentId: opts.studentId,
    organizationId: opts.organizationId,
    direction: "credit",
    amountMinor: ugxToOpgbMinor(opts.amountUgx),
    kind: opts.kind,
    referenceKey: opts.referenceKey,
    sourceRail: opts.sourceRail,
    sourceCurrency: opts.sourceCurrency ?? "UGX",
    sourceAmountMinor: ugxToOpgbMinor(opts.amountUgx),
    memo: opts.memo,
  }, tx);
}

/** One-time catch-up when OpenPayGB card balance predates the OPGB ledger. */
export async function reconcileOpgbWalletWithCard(
  opts: { studentId: string; organizationId: string; cardBalanceUgx: number },
  tx?: TxClient,
) {
  const targetMinor = ugxToOpgbMinor(opts.cardBalanceUgx);
  const run = async (client: TxClient) => {
    const wallet = await client.opgbWallet.upsert({
      where: { studentId: opts.studentId },
      create: {
        studentId: opts.studentId,
        organizationId: opts.organizationId,
        balanceMinor: 0,
      },
      update: {},
    });
    const gap = targetMinor - wallet.balanceMinor;
    if (gap <= 0) return { ok: true as const, syncedMinor: 0 };

    return writeOpgbLedgerEntry(
      {
        studentId: opts.studentId,
        organizationId: opts.organizationId,
        direction: "credit",
        amountMinor: gap,
        kind: "adjustment",
        referenceKey: `sync:card:${opts.studentId}:${targetMinor}`,
        sourceRail: "openpay_card",
        memo: "OpenPayGB card balance sync",
      },
      client,
    );
  };

  if (tx) return run(tx);
  return prisma.$transaction(run);
}

export async function debitOpgbForTuition(
  opts: {
    studentId: string;
    organizationId: string;
    amountUgx: number;
    paymentId: string;
    memo?: string;
  },
  tx?: TxClient,
) {
  return writeOpgbLedgerEntry({
    studentId: opts.studentId,
    organizationId: opts.organizationId,
    direction: "debit",
    amountMinor: ugxToOpgbMinor(opts.amountUgx),
    kind: "tuition_pay",
    referenceKey: `payment:${opts.paymentId}`,
    sourceRail: "openpay_card",
    memo: opts.memo ?? "Tuition payment",
  }, tx);
}
