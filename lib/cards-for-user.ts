import type { Card } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateLevelIndex } from '@/utils/game-mechanics';

type CardRow = Card & { owned: boolean };

function meetsUnlock(
  card: Card,
  ctx: {
    rankIndex: number;
    referralCount: number;
    hasCompletedTask: boolean;
    hasDailyCipher: boolean;
  },
): boolean {
  const payload = (card.unlockPayload as Record<string, unknown> | null) ?? {};
  switch (card.unlockType) {
    case 'starter':
      return true;
    case 'rank':
      return ctx.rankIndex >= Number(payload.rankIndex ?? 0);
    case 'referrals':
      return ctx.referralCount >= Number(payload.referralCount ?? 0);
    case 'task':
      return ctx.hasCompletedTask;
    case 'daily_cipher':
      return ctx.hasDailyCipher;
    default:
      return false;
  }
}

export async function listCardsForUser(userId: string): Promise<CardRow[]> {
  const [user, cards, owned, referralCount, completedTask, cipherWin] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { points: true, totalTaps: true },
    }),
    prisma.card.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] }),
    prisma.userCard.findMany({ where: { userId }, select: { cardId: true } }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.userTask.findFirst({ where: { userId, isCompleted: true }, select: { id: true } }),
    prisma.userDailyCipherAttempt.findFirst({
      where: { userId, claimedAt: { not: null } },
      select: { id: true },
    }),
  ]);

  if (!user) return [];

  const ownedSet = new Set(owned.map((o) => o.cardId));
  const rankIndex = calculateLevelIndex(user.points, user.totalTaps);
  const ctx = {
    rankIndex,
    referralCount,
    hasCompletedTask: Boolean(completedTask),
    hasDailyCipher: Boolean(cipherWin),
  };

  const toGrant: string[] = [];
  const result: CardRow[] = cards.map((card) => {
    const alreadyOwned = ownedSet.has(card.id);
    const unlocked = alreadyOwned || meetsUnlock(card, ctx);
    if (unlocked && !alreadyOwned) toGrant.push(card.id);
    return {
      ...card,
      owned: unlocked,
    };
  });

  if (toGrant.length > 0) {
    await Promise.all(
      toGrant.map((cardId) =>
        prisma.userCard
          .create({ data: { userId, cardId } })
          .catch(() => undefined),
      ),
    );
  }

  return result;
}
