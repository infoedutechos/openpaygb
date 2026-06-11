import "server-only";

import { prisma } from "@/lib/prisma";
import {
  creditOpgb,
  debitOpgb,
  ensureOpgbWallet,
  reconcileOpgbWalletWithCard,
} from "@/lib/opgb-ledger";

export async function sendWalletBetweenCards(input: {
  fromCardId: string;
  toCardId: string;
  amountUgx: number;
  memo?: string;
}) {
  const amountUgx = Math.round(input.amountUgx);
  if (amountUgx <= 0) throw new Error("Amount must be positive");
  if (input.fromCardId === input.toCardId) throw new Error("Cannot send to the same card");

  return prisma.$transaction(async (tx) => {
    const from = await tx.openPayCard.findUnique({ where: { id: input.fromCardId } });
    const to = await tx.openPayCard.findUnique({ where: { id: input.toCardId } });
    if (!from || !to) throw new Error("Card not found");
    if (from.status !== "active" || to.status !== "active") {
      throw new Error("Both cards must be active");
    }
    if (from.organizationId !== to.organizationId) {
      throw new Error("Transfers are limited to the same institution");
    }
    if (from.balanceUgx < amountUgx) throw new Error("Insufficient card balance");

    await tx.openPayCard.update({
      where: { id: from.id },
      data: { balanceUgx: { decrement: amountUgx } },
    });
    await tx.openPayCard.update({
      where: { id: to.id },
      data: { balanceUgx: { increment: amountUgx } },
    });

    const transfer = await tx.walletTransfer.create({
      data: {
        fromCardId: from.id,
        toCardId: to.id,
        amountUgx,
        memo: (input.memo ?? "").trim(),
        status: "completed",
      },
    });

    const fromStudentId = from.studentId;
    const toStudentId = to.studentId;
    await reconcileOpgbWalletWithCard(
      { studentId: fromStudentId, organizationId: from.organizationId, cardBalanceUgx: from.balanceUgx - amountUgx },
      tx,
    );
    await reconcileOpgbWalletWithCard(
      { studentId: toStudentId, organizationId: to.organizationId, cardBalanceUgx: to.balanceUgx },
      tx,
    );
    await ensureOpgbWallet(fromStudentId, from.organizationId);
    await ensureOpgbWallet(toStudentId, to.organizationId);

    const refBase = `wallet-transfer:${transfer.id}`;
    await debitOpgb(
      {
        studentId: fromStudentId,
        organizationId: from.organizationId,
        amountUgx,
        kind: "swap",
        referenceKey: `${refBase}:debit`,
        sourceRail: "wallet_p2p",
        memo: input.memo ?? "Card P2P send",
      },
      tx,
    );
    await creditOpgb(
      {
        studentId: toStudentId,
        organizationId: to.organizationId,
        amountUgx,
        kind: "deposit_card_topup",
        referenceKey: `${refBase}:credit`,
        sourceRail: "wallet_p2p",
        memo: input.memo ?? "Card P2P receive",
      },
      tx,
    );

    return transfer;
  });
}
