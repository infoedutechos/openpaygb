/**
 * League Competition (league vs league) challenges
 * GET: list active + pending (for leagues I'm in)
 * POST: create challenge (body: creatorLeagueId, opponentLeagueId, targetAlm, durationDays, stakePerLeague)
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import {
  LEAGUE_CHALLENGE_MIN_STAKE,
  LEAGUE_CHALLENGE_MAX_STAKE,
  LEAGUE_CHALLENGE_MIN_TARGET_PEARLS,
  LEAGUE_CHALLENGE_MAX_TARGET_PEARLS,
  LEAGUE_CHALLENGE_MIN_DAYS,
  LEAGUE_CHALLENGE_MAX_DAYS,
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

  const myLeagueIds = await getMyLeagueIds(prisma, dbUser.id);

  const challenges = await prisma.leagueChallenge.findMany({
    where: {
      OR: [
        { status: 'active' },
        { status: 'pending', creatorLeagueId: { in: myLeagueIds } },
        { status: 'pending', opponentLeagueId: { in: myLeagueIds } },
      ],
    },
    include: {
      creatorLeague: { include: { teams: { include: { team: { select: { name: true } } } } } },
      opponentLeague: { include: { teams: { include: { team: { select: { name: true } } } } } },
      stakes: true,
      _count: { select: { contributions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const list = challenges.map((c) => ({
    id: c.id,
    creatorLeagueId: c.creatorLeagueId,
    creatorLeagueName: c.creatorLeague.name,
    creatorTeamNames: c.creatorLeague.teams.map((lt) => lt.team.name),
    opponentLeagueId: c.opponentLeagueId,
    opponentLeagueName: c.opponentLeague?.name ?? null,
    opponentTeamNames: c.opponentLeague?.teams.map((lt) => lt.team.name) ?? [],
    status: c.status,
    targetAlm: c.targetAlm,
    durationDays: c.durationDays,
    stakePerLeague: c.stakePerLeague,
    prizePool: c.prizePool,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    winnerLeagueId: c.winnerLeagueId,
    contributionCount: c._count.contributions,
  }));

  return NextResponse.json({ challenges: list });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, creatorLeagueId, opponentLeagueId, targetAlm, durationDays, stakePerLeague } = body;

  if (!initData || !creatorLeagueId || !opponentLeagueId) {
    return NextResponse.json({ error: 'Missing initData or league ids' }, { status: 400 });
  }

  const target = Number(targetAlm);
  const days = Math.floor(Number(durationDays));
  const stake = Math.floor(Number(stakePerLeague));

  if (!Number.isFinite(target) || target < LEAGUE_CHALLENGE_MIN_TARGET_PEARLS || target > LEAGUE_CHALLENGE_MAX_TARGET_PEARLS) {
    return NextResponse.json({ error: `Target PEARLS must be between ${LEAGUE_CHALLENGE_MIN_TARGET_PEARLS.toLocaleString()} and ${LEAGUE_CHALLENGE_MAX_TARGET_PEARLS.toLocaleString()}` }, { status: 400 });
  }
  if (!Number.isFinite(days) || days < LEAGUE_CHALLENGE_MIN_DAYS || days > LEAGUE_CHALLENGE_MAX_DAYS) {
    return NextResponse.json({ error: `Duration must be ${LEAGUE_CHALLENGE_MIN_DAYS}-${LEAGUE_CHALLENGE_MAX_DAYS} days` }, { status: 400 });
  }
  if (!Number.isFinite(stake) || stake < LEAGUE_CHALLENGE_MIN_STAKE || stake > LEAGUE_CHALLENGE_MAX_STAKE) {
    return NextResponse.json({ error: `Stake per league must be ${LEAGUE_CHALLENGE_MIN_STAKE.toLocaleString()} - ${LEAGUE_CHALLENGE_MAX_STAKE.toLocaleString()} PEARLS` }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const [creatorLeague, opponentLeague] = await Promise.all([
    prisma.userCreatedLeague.findUnique({ where: { id: creatorLeagueId }, include: { members: true } }),
    prisma.userCreatedLeague.findUnique({ where: { id: opponentLeagueId } }),
  ]);

  if (!creatorLeague) return NextResponse.json({ error: 'Your league not found' }, { status: 404 });
  if (!opponentLeague) return NextResponse.json({ error: 'Opponent league not found' }, { status: 404 });
  if (creatorLeague.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the league creator can create a challenge' }, { status: 403 });
  if (creatorLeagueId === opponentLeagueId) return NextResponse.json({ error: 'Cannot challenge your own league' }, { status: 400 });

  if ((dbUser.pointsBalance ?? 0) < stake) {
    return NextResponse.json({ error: `Insufficient balance. Stake is ${stake.toLocaleString()} PEARLS.` }, { status: 400 });
  }

  const initialPrizePool = stake * 2;

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { pointsBalance: { decrement: stake } },
  });

  const challenge = await prisma.leagueChallenge.create({
    data: {
      creatorLeagueId,
      opponentLeagueId,
      status: 'pending',
      targetAlm: target,
      durationDays: days,
      stakePerLeague: stake,
      prizePool: initialPrizePool,
    },
  });

  await prisma.leagueChallengeStake.create({
    data: { challengeId: challenge.id, userId: dbUser.id, leagueId: creatorLeagueId, amount: stake },
  });

  return NextResponse.json({
    id: challenge.id,
    status: challenge.status,
    message: 'Challenge sent. Opponent league creator must accept and lock their stake to start.',
  });
}

async function getMyLeagueIds(prisma: typeof import('@/utils/prisma').default, userId: string): Promise<string[]> {
  const created = await prisma.userCreatedLeague.findMany({ where: { creatorId: userId }, select: { id: true } });
  const memberships = await prisma.userCreatedLeagueMember.findMany({ where: { userId }, include: { league: true } });
  const joined = memberships.map((m) => m.league.id);
  return [...created.map((c) => c.id), ...joined];
}
