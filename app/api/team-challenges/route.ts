/**
 * Team vs Team challenges
 * GET: list active + pending (for teams I'm in)
 * POST: create challenge (body: creatorTeamId, opponentTeamId, targetAlm, durationDays, stakePerTeam)
 */

import { NextResponse } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import {
  TEAM_CHALLENGE_MIN_STAKE,
  TEAM_CHALLENGE_MAX_STAKE,
  TEAM_CHALLENGE_MIN_TARGET_PEARLS,
  TEAM_CHALLENGE_MAX_TARGET_PEARLS,
  TEAM_CHALLENGE_MIN_DAYS,
  TEAM_CHALLENGE_MAX_DAYS,
} from '@/utils/consts';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');
  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const myTeamIds = await getMyTeamIds(prisma, dbUser.id);

  const challenges = await prisma.teamChallenge.findMany({
    where: {
      OR: [
        { status: 'active' },
        { status: 'pending', creatorTeamId: { in: myTeamIds } },
        { status: 'pending', opponentTeamId: { in: myTeamIds } },
      ],
    },
    include: {
      creatorTeam: { select: { id: true, name: true } },
      opponentTeam: { select: { id: true, name: true } },
      stakes: true,
      _count: { select: { contributions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const list = challenges.map((c) => ({
    id: c.id,
    creatorTeamId: c.creatorTeamId,
    creatorTeamName: c.creatorTeam.name,
    opponentTeamId: c.opponentTeamId,
    opponentTeamName: c.opponentTeam?.name ?? null,
    status: c.status,
    targetAlm: c.targetAlm,
    durationDays: c.durationDays,
    stakePerTeam: c.stakePerTeam,
    prizePool: c.prizePool,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    winnerTeamId: c.winnerTeamId,
    contributionCount: c._count.contributions,
  }));

  return NextResponse.json({ challenges: list });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, creatorTeamId, opponentTeamId, targetAlm, durationDays, stakePerTeam } = body;

  if (!initData || !creatorTeamId || !opponentTeamId) {
    return NextResponse.json({ error: 'Missing initData or team ids' }, { status: 400 });
  }

  const target = Number(targetAlm);
  const days = Math.floor(Number(durationDays));
  const stake = Math.floor(Number(stakePerTeam ?? 0));

  if (!Number.isFinite(target) || target < TEAM_CHALLENGE_MIN_TARGET_PEARLS || target > TEAM_CHALLENGE_MAX_TARGET_PEARLS) {
    return NextResponse.json({ error: `Target PEARLS must be between ${TEAM_CHALLENGE_MIN_TARGET_PEARLS.toLocaleString()} and ${TEAM_CHALLENGE_MAX_TARGET_PEARLS.toLocaleString()}` }, { status: 400 });
  }
  if (!Number.isFinite(days) || days < TEAM_CHALLENGE_MIN_DAYS || days > TEAM_CHALLENGE_MAX_DAYS) {
    return NextResponse.json({ error: `Duration must be ${TEAM_CHALLENGE_MIN_DAYS}-${TEAM_CHALLENGE_MAX_DAYS} days` }, { status: 400 });
  }
  if (!Number.isFinite(stake) || stake < TEAM_CHALLENGE_MIN_STAKE || stake > TEAM_CHALLENGE_MAX_STAKE) {
    return NextResponse.json({ error: `Stake per team must be ${TEAM_CHALLENGE_MIN_STAKE.toLocaleString()} - ${TEAM_CHALLENGE_MAX_STAKE.toLocaleString()} PEARLS` }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const [creatorTeam, opponentTeam] = await Promise.all([
    prisma.team.findUnique({ where: { id: creatorTeamId }, include: { members: true } }),
    prisma.team.findUnique({ where: { id: opponentTeamId } }),
  ]);

  if (!creatorTeam) return NextResponse.json({ error: 'Your team not found' }, { status: 404 });
  if (!opponentTeam) return NextResponse.json({ error: 'Opponent team not found' }, { status: 404 });
  if (creatorTeam.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the team creator can create a challenge' }, { status: 403 });
  if (creatorTeamId === opponentTeamId) return NextResponse.json({ error: 'Cannot challenge your own team' }, { status: 400 });

  if ((dbUser.pointsBalance ?? 0) < stake) {
    return NextResponse.json({ error: `Insufficient balance. Stake is ${stake.toLocaleString()} PEARLS.` }, { status: 400 });
  }

  const initialPrizePool = stake * 2;

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { pointsBalance: { decrement: stake } },
  });

  const challenge = await prisma.teamChallenge.create({
    data: {
      creatorTeamId,
      opponentTeamId,
      status: 'pending',
      targetAlm: target,
      durationDays: days,
      stakePerTeam: stake,
      prizePool: initialPrizePool,
    },
  });

  await prisma.teamChallengeStake.create({
    data: { challengeId: challenge.id, userId: dbUser.id, teamId: creatorTeamId, amount: stake },
  });

  return NextResponse.json({
    id: challenge.id,
    status: challenge.status,
    message: 'Challenge sent. Opponent team creator must accept and lock their stake to start.',
  });
}

async function getMyTeamIds(db: PrismaClient, userId: string): Promise<string[]> {
  const created = await db.team.findMany({ where: { creatorId: userId }, select: { id: true } });
  const memberships = await db.teamMember.findMany({ where: { userId }, select: { teamId: true } });
  return [...new Set([...created.map((c) => c.id), ...memberships.map((m) => m.teamId)])];
}
