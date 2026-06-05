import "server-only";

import { PaymentRail, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TON_WALLET } from "@/lib/constants";
import { createPendingPayment } from "@/lib/create-payment";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import { getOpenPayCardPlatformSettings } from "@/lib/openpay-card-settings";
import { withPrismaRetry } from "@/lib/prisma-retry";
import type { ProgrammeFeeSelectionMode } from "@/lib/programmes";

export function openPayCardIssueMemo(cardId: string): string {
  return `opcard:${cardId}`;
}

export function openPayCardFundMemo(cardId: string, fundId: string): string {
  return `opcardfund:${cardId}:${fundId}`;
}

export function maskedPanForStudent(studentId: string): string {
  const tail = studentId.replace(/[^a-f0-9]/gi, "").slice(-4).toUpperCase() || "0000";
  return `OPGB •••• ${tail}`;
}

export async function getStudentOpenPayCard(studentId: string) {
  return withPrismaRetry(() =>
    prisma.openPayCard.findUnique({
      where: { studentId },
    }),
  );
}

export async function ensurePendingOpenPayCard(studentId: string, organizationId: string) {
  const existing = await getStudentOpenPayCard(studentId);
  if (existing) return existing;

  const settings = await getOpenPayCardPlatformSettings();
  if (!settings.enabled) {
    throw new Error("OpenPayGB card is not available on this platform right now.");
  }

  return withPrismaRetry(() =>
    prisma.openPayCard.create({
      data: {
        studentId,
        organizationId,
        status: "pending_issue",
        maskedPan: maskedPanForStudent(studentId),
        issueFeeTon: settings.issueFeeTon,
        issueMemo: "",
      },
    }),
  );
}

export async function activateOpenPayCard(cardId: string, txHash: string) {
  const card = await prisma.openPayCard.findUnique({ where: { id: cardId } });
  if (!card || card.status === "active") return false;

  await prisma.openPayCard.update({
    where: { id: cardId },
    data: {
      status: "active",
      issueTxHash: txHash,
      issuedAt: new Date(),
      issueMemo: openPayCardIssueMemo(cardId),
    },
  });
  return true;
}

export async function creditOpenPayCardBalance(cardId: string, amountUgx: number) {
  if (amountUgx <= 0) return;
  await prisma.openPayCard.update({
    where: { id: cardId },
    data: { balanceUgx: { increment: Math.round(amountUgx) } },
  });
}

export async function payTuitionFromOpenPayCard(opts: {
  studentId: string;
  programmeCode: string;
  year: number;
  semester: number;
  feeSelectionMode?: ProgrammeFeeSelectionMode;
  feeIds?: string[];
  installmentCount?: number;
  installmentPlanId?: string;
  installmentIndex?: number;
}) {
  const settings = await getOpenPayCardPlatformSettings();
  if (!settings.enabled) {
    throw new Error("OpenPayGB card payments are disabled.");
  }

  const card = await getStudentOpenPayCard(opts.studentId);
  if (!card || card.status !== "active") {
    throw new Error("Activate your OpenPayGB card before paying with it.");
  }

  const pending = await createPendingPayment({
    studentId: opts.studentId,
    programmeCode: opts.programmeCode,
    year: opts.year,
    semester: opts.semester,
    rail: PaymentRail.openpay_card,
    feeSelectionMode: opts.feeSelectionMode,
    feeIds: opts.feeIds,
    installmentCount: opts.installmentCount,
    installmentPlanId: opts.installmentPlanId,
    installmentIndex: opts.installmentIndex,
  });

  if (card.balanceUgx < pending.totalUgx) {
    await prisma.payment.deleteMany({ where: { id: pending.id, status: PaymentStatus.pending } });
    throw new Error(
      `Insufficient OpenPayGB card balance (UGX ${card.balanceUgx.toLocaleString()}). Fund your card first.`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const debited = await tx.openPayCard.updateMany({
      where: { id: card.id, studentId: opts.studentId, balanceUgx: { gte: pending.totalUgx } },
      data: { balanceUgx: { decrement: pending.totalUgx } },
    });
    if (debited.count !== 1) {
      throw new Error("Could not debit OpenPayGB card balance. Try again.");
    }
    return tx.payment.update({
      where: { id: pending.id },
      data: {
        status: PaymentStatus.confirmed,
        confirmedAt: new Date(),
        momoReference: `opcard-${card.id}`,
      },
    });
  });

  await handleFirstTimeConfirmation(updated);
  const balanceAfter = card.balanceUgx - pending.totalUgx;

  return { payment: updated, cardBalanceUgx: balanceAfter };
}

export function platformTonWalletForCardOps(): string {
  return DEFAULT_TON_WALLET.trim();
}
