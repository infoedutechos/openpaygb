/**
 * POST: opponent league creator accepts challenge (locks stake, starts challenge)
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

  const challenge = await prisma.leagueChallenge.findUnique({
    where: { id: challengeId },
    include: {
      creatorLeague: { include: { members: true } },
      opponentLeague: { include: { members: true } },
    },
  });

  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  if (challenge.status !== 'pending') return NextResponse.json({ error: 'Challenge is not pending' }, { status: 400 });
  if (!challenge.opponentLeague) return NextResponse.json({ error: 'Opponent league not found' }, { status: 400 });
  if (challenge.opponentLeague.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the opponent league creator can accept' }, { status: 403 });

  const stake = challenge.stakePerLeague;
  if ((dbUser.pointsBalance ?? 0) < stake) {
    return NextResponse.json({ error: `Insufficient balance. Stake is ${stake.toLocaleString()} PEARLS.` }, { status: 400 });
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + challenge.durationDays * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { pointsBalance: { decrement: stake } },
  });

  await prisma.leagueChallengeStake.create({
    data: { challengeId, userId: dbUser.id, leagueId: challenge.opponentLeagueId!, amount: stake },
  });

  const creatorMemberIds = [challenge.creatorLeague.creatorId, ...challenge.creatorLeague.members.map((m) => m.userId)];
  const opponentMemberIds = [challenge.opponentLeague.creatorId, ...challenge.opponentLeague.members.map((m) => m.userId)];
  const allMemberIds = [...creatorMemberIds, ...opponentMemberIds];
  const users = await prisma.user.findMany({ where: { id: { in: allMemberIds } }, select: { id: true, pointsBalance: true } });

  for (const uid of creatorMemberIds) {
    const u = users.find((x) => x.id === uid);
    await prisma.userChallengeSnapshot.create({
      data: {
        challengeId,
        userId: uid,
        leagueId: challenge.creatorLeagueId,
        pointsBalanceAtStart: u?.pointsBalance ?? 0,
      },
    });
  }
  for (const uid of opponentMemberIds) {
    const u = users.find((x) => x.id === uid);
    await prisma.userChallengeSnapshot.create({
      data: {
        challengeId,
        userId: uid,
        leagueId: challenge.opponentLeagueId!,
        pointsBalanceAtStart: u?.pointsBalance ?? 0,
      },
    });
  }

  await prisma.leagueChallenge.update({
    where: { id: challengeId },
    data: { status: 'active', startsAt, endsAt },
  });

  return NextResponse.json({
    success: true,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    message: 'Challenge started! First league to reach the target PEARLS (or highest at the end) wins the prize pool.',
  });
}
