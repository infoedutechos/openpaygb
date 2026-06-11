import "server-only";

import { PaymentRail, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultTonWallet } from "@/lib/constants";
import { createPendingPayment } from "@/lib/create-payment";
import { handleFirstTimeConfirmation } from "@/lib/on-payment-confirmed";
import {
  creditOpgbDeposit,
  debitOpgbForTuition,
  reconcileOpgbWalletWithCard,
} from "@/lib/opgb-ledger";
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

export function isOpenPayCardMomoIssueMemo(memo: string): boolean {
  return memo.startsWith("opcardissuemomo:");
}

/** Idempotent confirm — MoMo issue fee activates card; fund top-ups credit balance. */
export async function finalizeOpenPayCardMomoTopup(
  topupId: string,
  txHash: string,
): Promise<{ action: string }> {
  const topup = await prisma.openPayCardTopup.findUnique({
    where: { id: topupId },
    include: { card: true },
  });
  if (!topup) return { action: "unknown_topup" };
  if (topup.status === "confirmed") return { action: "already_confirmed" };

  if (isOpenPayCardMomoIssueMemo(topup.memo)) {
    if (topup.card.status !== "pending_issue") {
      return { action: "card_not_pending_issue" };
    }
    const activated = await prisma.$transaction(async (tx) => {
      const updated = await tx.openPayCardTopup.updateMany({
        where: { id: topupId, status: "pending" },
        data: { status: "confirmed", txHash },
      });
      if (updated.count !== 1) return false;
      const cardUpdated = await tx.openPayCard.updateMany({
        where: { id: topup.cardId, status: "pending_issue" },
        data: {
          status: "active",
          issueTxHash: txHash,
          issuedAt: new Date(),
          issueMemo: openPayCardIssueMemo(topup.cardId),
        },
      });
      return cardUpdated.count === 1;
    });
    return { action: activated ? "card_issue_confirmed" : "confirm_failed" };
  }

  const ok = await confirmOpenPayCardTopup(topupId, txHash);
  if (ok) {
    const { notifyTelegramCardTopup } = await import("@/lib/telegram/notify");
    notifyTelegramCardTopup(topupId);
  }
  return { action: ok ? "card_topup_confirmed" : "confirm_failed" };
}

/** Idempotent confirm — used by TON scan and MoMo webhooks. */
export async function confirmOpenPayCardTopup(
  topupId: string,
  txHash: string,
): Promise<boolean> {
  const topup = await prisma.openPayCardTopup.findUnique({
    where: { id: topupId },
    include: { card: true },
  });
  if (!topup || topup.status === "confirmed") return false;

  const railKind =
    topup.fundingRail === "ton"
      ? "deposit_ton"
      : topup.fundingRail === "livepay" || topup.fundingRail === "relworx"
        ? "deposit_momo"
        : "deposit_card_topup";

  await prisma.$transaction(async (tx) => {
    const updated = await tx.openPayCardTopup.updateMany({
      where: { id: topupId, status: "pending" },
      data: { status: "confirmed", txHash },
    });
    if (updated.count !== 1) throw new Error("topup already confirmed");
    await tx.openPayCard.update({
      where: { id: topup.cardId },
      data: { balanceUgx: { increment: topup.amountUgx } },
    });
    await creditOpgbDeposit(
      {
        studentId: topup.card.studentId,
        organizationId: topup.card.organizationId,
        amountUgx: topup.amountUgx,
        referenceKey: `topup:${topupId}`,
        kind: railKind,
        sourceRail: topup.fundingRail,
        memo: topup.memo,
      },
      tx,
    );
  });
  return true;
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
    await reconcileOpgbWalletWithCard(
      {
        studentId: opts.studentId,
        organizationId: card.organizationId,
        cardBalanceUgx: card.balanceUgx,
      },
      tx,
    );
    const debited = await tx.openPayCard.updateMany({
      where: { id: card.id, studentId: opts.studentId, balanceUgx: { gte: pending.totalUgx } },
      data: { balanceUgx: { decrement: pending.totalUgx } },
    });
    if (debited.count !== 1) {
      throw new Error("Could not debit OpenPayGB card balance. Try again.");
    }
    const payment = await tx.payment.update({
      where: { id: pending.id },
      data: {
        status: PaymentStatus.confirmed,
        confirmedAt: new Date(),
        momoReference: `opcard-${card.id}`,
      },
    });
    await debitOpgbForTuition(
      {
        studentId: opts.studentId,
        organizationId: card.organizationId,
        amountUgx: pending.totalUgx,
        paymentId: pending.id,
      },
      tx,
    );
    return payment;
  });

  await handleFirstTimeConfirmation(updated);
  const balanceAfter = card.balanceUgx - pending.totalUgx;

  return { payment: updated, cardBalanceUgx: balanceAfter };
}

export function platformTonWalletForCardOps(): string {
  return defaultTonWallet().trim();
}
