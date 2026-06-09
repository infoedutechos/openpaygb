import "server-only";

import { prisma } from "@/lib/prisma";

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

    return tx.walletTransfer.create({
      data: {
        fromCardId: from.id,
        toCardId: to.id,
        amountUgx,
        memo: (input.memo ?? "").trim(),
        status: "completed",
      },
    });
  });
}
