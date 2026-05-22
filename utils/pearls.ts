import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { PearlActivityStatus, PearlAuditEventType, PearlType, Prisma } from '@prisma/client';
import { BLUE_TO_GOLDISH_RATE, WHITE_TO_GOLDISH_RATE } from '@/utils/consts';

export { BLUE_TO_GOLDISH_RATE, WHITE_TO_GOLDISH_RATE } from '@/utils/consts';

export async function resolveUserFromInitData(initData: string) {
  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return null;
  const telegramId = user.id?.toString();
  if (!telegramId) return null;
  return prisma.user.findUnique({ where: { telegramId } });
}

export async function createPearlAudit(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    eventType: PearlAuditEventType;
    pearlType?: PearlType;
    amount?: number;
    meta?: Prisma.InputJsonValue;
  }
) {
  await tx.pearlAudit.create({
    data: {
      userId: params.userId,
      eventType: params.eventType,
      pearlType: params.pearlType,
      amount: params.amount,
      meta: params.meta,
    },
  });
}

/** Server-side instant white pearl credit (ledger + whitePearls only). Callers must already increment `points` / `pointsBalance` when those totals should move; do not double-count `pointsBalance` here. */
export async function creditWhitePearlsInstant(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  sourceKey: string,
  sourceLabel: string
) {
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) return;

  await tx.pearlActivity.create({
    data: {
      userId,
      sourceKey,
      sourceLabel,
      pearlType: PearlType.WHITE,
      amount: amt,
      status: PearlActivityStatus.APPROVED,
      approvedByAdmin: true,
      approvedAt: new Date(),
    },
  });
  await tx.user.update({
    where: { id: userId },
    data: {
      whitePearls: { increment: amt },
    },
  });
  await createPearlAudit(tx, {
    userId,
    eventType: PearlAuditEventType.EARN_WHITE,
    pearlType: PearlType.WHITE,
    amount: amt,
    meta: { sourceKey, sourceLabel },
  });
}

export function convertWhiteToGoldish(whiteAmount: number) {
  const goldish = Math.floor(whiteAmount / WHITE_TO_GOLDISH_RATE);
  return {
    goldish,
    whiteConsumed: goldish * WHITE_TO_GOLDISH_RATE,
    whiteRemainder: whiteAmount - goldish * WHITE_TO_GOLDISH_RATE,
  };
}

export function convertBlueToGoldish(blueAmount: number) {
  const goldish = Math.floor(blueAmount / BLUE_TO_GOLDISH_RATE);
  return {
    goldish,
    blueConsumed: goldish * BLUE_TO_GOLDISH_RATE,
    blueRemainder: blueAmount - goldish * BLUE_TO_GOLDISH_RATE,
  };
}

/** When taps credit `pointsBalance` but not `whitePearls`, wallet under-reads. Catch up one-way (never lowers white). */
export async function reconcileWhitePearlsFromPointsBalance(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { pointsBalance: true, whitePearls: true },
  });
  if (!u) return;
  const pb = Math.floor(Number(u.pointsBalance ?? 0));
  const wp = Math.floor(Number(u.whitePearls ?? 0));
  if (pb > wp) {
    await prisma.user.update({ where: { id: userId }, data: { whitePearls: pb } });
  }
}
