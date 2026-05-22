/**
 * GET: team challenge detail + progress for both teams. Resolves and distributes if ended.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params;
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');
  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user?.id?.toString();
  const dbUser = telegramId ? await prisma.user.findUnique({ where: { telegramId } }) : null;

  const challenge = await prisma.teamChallenge.findUnique({
    where: { id: challengeId },
    include: {
      creatorTeam: { include: { members: true } },
      opponentTeam: { include: { members: true } },
      stakes: true,
      snapshots: true,
    },
  });

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });

  const contributions = await prisma.teamChallengeContribution.findMany({
    where: { challengeId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const now = new Date();
  const isEnded = challenge.endsAt && challenge.endsAt <= now;
  if (challenge.status === 'active' && isEnded) {
    await resolveChallenge(prisma, challengeId);
    const updated = await prisma.teamChallenge.findUnique({ where: { id: challengeId }, include: { creatorTeam: true, opponentTeam: true } });
    if (updated) {
      (challenge as { status: string }).status = updated.status;
      (challenge as { winnerTeamId: string | null }).winnerTeamId = updated.winnerTeamId;
    }
  }

  const creatorMemberIds = challenge.creatorTeam.members.map((m) => m.userId);
  const opponentMemberIds = challenge.opponentTeam ? challenge.opponentTeam.members.map((m) => m.userId) : [];

  const progressCreator = await getTeamProgress(prisma, challengeId, challenge.creatorTeamId, creatorMemberIds);
  const progressOpponent = challenge.opponentTeamId
    ? await getTeamProgress(prisma, challengeId, challenge.opponentTeamId!, opponentMemberIds)
    : { totalGrowth: 0, memberCount: 0, participants: 0 };

  const canAccept = challenge.status === 'pending' && dbUser && challenge.opponentTeam && challenge.opponentTeam.creatorId === dbUser.id;

  return NextResponse.json({
    id: challenge.id,
    creatorTeamId: challenge.creatorTeamId,
    creatorTeamName: challenge.creatorTeam.name,
    opponentTeamId: challenge.opponentTeamId,
    opponentTeamName: challenge.opponentTeam?.name ?? null,
    status: challenge.status,
    targetAlm: challenge.targetAlm,
    durationDays: challenge.durationDays,
    stakePerTeam: challenge.stakePerTeam,
    prizePool: challenge.prizePool,
    startsAt: challenge.startsAt?.toISOString() ?? null,
    endsAt: challenge.endsAt?.toISOString() ?? null,
    winnerTeamId: challenge.winnerTeamId,
    canAccept,
    progressCreator: { totalGrowth: progressCreator.totalGrowth, memberCount: progressCreator.memberCount, participants: progressCreator.participants },
    progressOpponent: { totalGrowth: progressOpponent.totalGrowth, memberCount: progressOpponent.memberCount, participants: progressOpponent.participants },
    recentContributions: contributions.map((c) => ({ userName: c.user.name ?? 'User', amount: c.amount, createdAt: c.createdAt.toISOString() })),
  });
}

async function getTeamProgress(
  prisma: typeof import('@/utils/prisma').default,
  challengeId: string,
  teamId: string,
  memberIds: string[]
): Promise<{ totalGrowth: number; memberCount: number; participants: number }> {
  if (memberIds.length === 0) return { totalGrowth: 0, memberCount: 0, participants: 0 };
  const snapshots = await prisma.userTeamChallengeSnapshot.findMany({
    where: { challengeId, teamId, userId: { in: memberIds } },
  });
  const userIds = snapshots.map((s) => s.userId);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, pointsBalance: true } });
  const balanceMap = new Map(users.map((u) => [u.id, u.pointsBalance ?? 0]));
  let totalGrowth = 0;
  let participants = 0;
  for (const s of snapshots) {
    const current = balanceMap.get(s.userId) ?? 0;
    const growth = Math.max(0, current - s.pointsBalanceAtStart);
    totalGrowth += growth;
    if (growth > 0) participants += 1;
  }
  return { totalGrowth, memberCount: memberIds.length, participants };
}

async function resolveChallenge(prisma: typeof import('@/utils/prisma').default, challengeId: string): Promise<void> {
  const c = await prisma.teamChallenge.findUnique({
    where: { id: challengeId },
    include: { creatorTeam: { include: { members: true } }, opponentTeam: { include: { members: true } } },
  });
  if (!c || c.status !== 'active' || !c.endsAt || c.endsAt > new Date()) return;
  if (!c.opponentTeam) return;

  const creatorIds = c.creatorTeam.members.map((m) => m.userId);
  const opponentIds = c.opponentTeam.members.map((m) => m.userId);

  const prog1 = await getTeamProgress(prisma, challengeId, c.creatorTeamId, creatorIds);
  const prog2 = await getTeamProgress(prisma, challengeId, c.opponentTeamId!, opponentIds);

  let winnerTeamId: string | null = null;
  if (prog1.totalGrowth >= c.targetAlm && prog2.totalGrowth < c.targetAlm) winnerTeamId = c.creatorTeamId;
  else if (prog2.totalGrowth >= c.targetAlm && prog1.totalGrowth < c.targetAlm) winnerTeamId = c.opponentTeamId;
  else if (prog1.totalGrowth > prog2.totalGrowth) winnerTeamId = c.creatorTeamId;
  else if (prog2.totalGrowth > prog1.totalGrowth) winnerTeamId = c.opponentTeamId;
  else if (prog1.totalGrowth === prog2.totalGrowth && prog1.totalGrowth > 0) winnerTeamId = c.creatorTeamId;

  await prisma.teamChallenge.update({
    where: { id: challengeId },
    data: { status: 'completed', winnerTeamId },
  });

  if (!winnerTeamId || c.prizePool <= 0) return;

  const winnerIds = winnerTeamId === c.creatorTeamId ? creatorIds : opponentIds;

  // Refund stake to the winning team's stake-payer(s) first (they put up the PEARLS to start the challenge)
  const winnerStakes = await prisma.teamChallengeStake.findMany({
    where: { challengeId, teamId: winnerTeamId },
  });
  const totalStakeRefund = winnerStakes.reduce((sum, s) => sum + s.amount, 0);
  const refundCap = Math.min(totalStakeRefund, c.prizePool);
  let poolRemainder = c.prizePool;
  if (winnerStakes.length > 0 && refundCap > 0) {
    for (const stake of winnerStakes) {
      const portion = totalStakeRefund > 0 ? (stake.amount / totalStakeRefund) * refundCap : 0;
      if (portion > 0) {
        await prisma.user.update({
          where: { id: stake.userId },
          data: { pointsBalance: { increment: portion } },
        });
        poolRemainder -= portion;
      }
    }
  }

  const snapshots = await prisma.userTeamChallengeSnapshot.findMany({
    where: { challengeId, teamId: winnerTeamId },
  });
  const users = await prisma.user.findMany({ where: { id: { in: winnerIds } }, select: { id: true, pointsBalance: true } });
  const balanceMap = new Map(users.map((u) => [u.id, u.pointsBalance ?? 0]));
  const growthPerUser: { userId: string; growth: number }[] = [];
  let totalGrowth = 0;
  for (const s of snapshots) {
    const current = balanceMap.get(s.userId) ?? 0;
    const growth = Math.max(0, current - s.pointsBalanceAtStart);
    if (growth > 0) {
      growthPerUser.push({ userId: s.userId, growth });
      totalGrowth += growth;
    }
  }

  if (poolRemainder <= 0) return;

  if (totalGrowth <= 0) {
    const perUser = poolRemainder / winnerIds.length;
    for (const uid of winnerIds) {
      await prisma.user.update({ where: { id: uid }, data: { pointsBalance: { increment: perUser } } });
    }
    return;
  }

  for (const { userId, growth } of growthPerUser) {
    const share = (growth / totalGrowth) * poolRemainder;
    await prisma.user.update({ where: { id: userId }, data: { pointsBalance: { increment: share } } });
  }
}
