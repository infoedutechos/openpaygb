/**
 * POST: opponent team creator accepts challenge (locks stake, starts challenge)
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData } = body;
  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const challenge = await prisma.teamChallenge.findUnique({
    where: { id: challengeId },
    include: {
      creatorTeam: { include: { members: true } },
      opponentTeam: { include: { members: true } },
    },
  });

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  if (challenge.status !== 'pending') return NextResponse.json({ error: 'Challenge is not pending' }, { status: 400 });
  if (!challenge.opponentTeam) return NextResponse.json({ error: 'Opponent team not found' }, { status: 400 });
  if (challenge.opponentTeam.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the opponent team creator can accept' }, { status: 403 });

  const stake = challenge.stakePerTeam;
  if ((dbUser.pointsBalance ?? 0) < stake) {
    return NextResponse.json({ error: `Insufficient balance. Stake is ${stake.toLocaleString()} PEARLS.` }, { status: 400 });
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + challenge.durationDays * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { pointsBalance: { decrement: stake } },
  });

  await prisma.teamChallengeStake.create({
    data: { challengeId, userId: dbUser.id, teamId: challenge.opponentTeamId!, amount: stake },
  });

  const creatorMemberIds = challenge.creatorTeam.members.map((m) => m.userId);
  const opponentMemberIds = challenge.opponentTeam.members.map((m) => m.userId);
  const allMemberIds = [...creatorMemberIds, ...opponentMemberIds];
  const users = await prisma.user.findMany({ where: { id: { in: allMemberIds } }, select: { id: true, pointsBalance: true } });

  for (const uid of creatorMemberIds) {
    const u = users.find((x) => x.id === uid);
    await prisma.userTeamChallengeSnapshot.create({
      data: {
        challengeId,
        userId: uid,
        teamId: challenge.creatorTeamId,
        pointsBalanceAtStart: u?.pointsBalance ?? 0,
      },
    });
  }
  for (const uid of opponentMemberIds) {
    const u = users.find((x) => x.id === uid);
    await prisma.userTeamChallengeSnapshot.create({
      data: {
        challengeId,
        userId: uid,
        teamId: challenge.opponentTeamId!,
        pointsBalanceAtStart: u?.pointsBalance ?? 0,
      },
    });
  }

  await prisma.teamChallenge.update({
    where: { id: challengeId },
    data: { status: 'active', startsAt, endsAt },
  });

  return NextResponse.json({
    success: true,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    message: 'Challenge started! First team to reach the target PEARLS (or highest at the end) wins the prize pool.',
  });
}
