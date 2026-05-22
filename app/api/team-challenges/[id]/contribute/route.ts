/**
 * POST: add PEARLS to team challenge prize pool (anyone can contribute). Body: { initData, amount }
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TEAM_CHALLENGE_MIN_CONTRIBUTION } from '@/utils/consts';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData, amount } = body;
  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt < TEAM_CHALLENGE_MIN_CONTRIBUTION) {
    return NextResponse.json({ error: `Minimum contribution is ${TEAM_CHALLENGE_MIN_CONTRIBUTION.toLocaleString()} PEARLS` }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if ((dbUser.pointsBalance ?? 0) < amt) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });

  const challenge = await prisma.teamChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  if (challenge.status !== 'active') return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 });

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { pointsBalance: { decrement: amt } },
  });
  await prisma.teamChallenge.update({
    where: { id: challengeId },
    data: { prizePool: { increment: amt } },
  });
  await prisma.teamChallengeContribution.create({
    data: { challengeId, userId: dbUser.id, amount: amt },
  });

  return NextResponse.json({
    success: true,
    amount: amt,
    newPrizePool: challenge.prizePool + amt,
  });
}
