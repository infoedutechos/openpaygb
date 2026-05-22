/**
 * Leagues: tiered system + user-created leagues
 * GET: current tier, weekly LP, rank, tier leaderboard, custom leagues, championship info
 * POST: create league (body: { name }) -> inviteCode, inviteLink
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getWeekKey } from '@/utils/week-utils';
import {
  LEAGUE_CHAMPIONSHIP_WEEKS,
  LEAGUE_CHAMPIONSHIP_TOP,
  LEAGUE_CUSTOM_MAX_MEMBERS,
  LEAGUE_CREATION_FEE,
} from '@/utils/consts';
import { generateInviteCode } from '@/utils/league-points';
import { getOrCreateFeeRecipientUser } from '@/utils/fee-recipient';

function getNextChampionshipWeek(): string {
  const now = new Date();
  const weekKey = getWeekKey(now);
  const [y, w] = weekKey.split('-W').map((x, i) => (i === 0 ? parseInt(x, 10) : parseInt(x, 10)));
  let nextW = w + LEAGUE_CHAMPIONSHIP_WEEKS;
  let nextY = y;
  if (nextW > 52) {
    nextW -= 52;
    nextY += 1;
  }
  return `${nextY}-W${String(nextW).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  const weekKey = getWeekKey();
  const nextChampionshipWeek = getNextChampionshipWeek();

  const payload: {
    weekKey: string;
    nextChampionshipWeek: string;
    currentTier: string;
    weeklyPoints: number;
    totalPoints: number;
    weeklyTeamPoints: number;
    totalTeamPoints: number;
    rankInTier: number | null;
    tierLeaderboard: Array<{ rank: number; name: string; leaguePoints: number }>;
    customLeagues: Array<{
      id: string;
      name: string;
      inviteCode: string;
      inviteLink: string | null;
      isCreator: boolean;
      memberCount: number;
      myRank?: number;
      myPoints?: number;
    }>;
    championship: { nextWeek: string; topQualify: number; qualified: boolean };
  } = {
    weekKey,
    nextChampionshipWeek,
    currentTier: 'Bronze',
    weeklyPoints: 0,
    totalPoints: 0,
    weeklyTeamPoints: 0,
    totalTeamPoints: 0,
    rankInTier: null,
    tierLeaderboard: [],
    customLeagues: [],
    championship: { nextWeek: nextChampionshipWeek, topQualify: LEAGUE_CHAMPIONSHIP_TOP, qualified: false },
  };

  if (!initData) {
    return NextResponse.json(payload);
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json(payload);

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json(payload);

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json(payload);

  const currentTier = dbUser.leagueTier ?? 'Bronze';
  payload.currentTier = currentTier;
  payload.totalPoints = dbUser.totalLeaguePoints ?? 0;

  const myWeek = await prisma.userLeagueWeek.findUnique({
    where: { userId_weekKey: { userId: dbUser.id, weekKey } },
  });
  payload.weeklyPoints = myWeek?.leaguePoints ?? 0;

  const myTeamWeek = await prisma.userTeamWeek.findUnique({
    where: { userId_weekKey: { userId: dbUser.id, weekKey } },
  });
  payload.weeklyTeamPoints = myTeamWeek?.teamPoints ?? 0;
  payload.totalTeamPoints = dbUser.totalTeamPoints ?? 0;

  // Tier leaderboard: users in same tier, this week, by leaguePoints
  const tierProgress = await prisma.userLeagueWeek.findMany({
    where: { weekKey },
    include: { user: { select: { name: true, leagueTier: true } } },
    orderBy: { leaguePoints: 'desc' },
    take: 50,
  });
  const inTier = tierProgress.filter((e) => e.user.leagueTier === currentTier).slice(0, 15);
  payload.tierLeaderboard = inTier.map((e, i) => ({
    rank: i + 1,
    name: e.user.name || 'User',
    leaguePoints: e.leaguePoints,
  }));
  const myRankIdx = inTier.findIndex((e) => e.userId === dbUser.id);
  payload.rankInTier = myRankIdx >= 0 ? myRankIdx + 1 : null;

  // User-created leagues: created by user + joined
  const created = await prisma.userCreatedLeague.findMany({
    where: { creatorId: dbUser.id },
    include: { members: true },
  });
  const memberships = await prisma.userCreatedLeagueMember.findMany({
    where: { userId: dbUser.id },
    include: { league: true },
  });
  const joinedLeagues = memberships.filter((m) => m.league.creatorId !== dbUser.id).map((m) => m.league);

  for (const league of created) {
    const memberIds = [league.creatorId, ...league.members.map((m) => m.userId)];
    const points = await prisma.userLeagueWeek.findMany({
      where: { weekKey: league.weekKey, userId: { in: memberIds } },
      orderBy: { leaguePoints: 'desc' },
    });
    const myP = points.find((p) => p.userId === dbUser.id);
    payload.customLeagues.push({
      id: league.id,
      name: league.name,
      inviteCode: league.inviteCode,
      inviteLink: null,
      isCreator: true,
      memberCount: memberIds.length,
      myRank: myP ? points.findIndex((p) => p.userId === dbUser.id) + 1 : undefined,
      myPoints: myP?.leaguePoints,
    });
  }
  for (const league of joinedLeagues) {
    const memberCount = await prisma.userCreatedLeagueMember.count({ where: { leagueId: league.id } }) + 1;
    const memberIds = [league.creatorId, ...(await prisma.userCreatedLeagueMember.findMany({ where: { leagueId: league.id }, select: { userId: true } })).map((m) => m.userId)];
    const points = await prisma.userLeagueWeek.findMany({
      where: { weekKey: league.weekKey, userId: { in: memberIds } },
      orderBy: { leaguePoints: 'desc' },
    });
    const myP = points.find((p) => p.userId === dbUser.id);
    payload.customLeagues.push({
      id: league.id,
      name: league.name,
      inviteCode: league.inviteCode,
      inviteLink: null,
      isCreator: false,
      memberCount,
      myRank: myP ? points.findIndex((p) => p.userId === dbUser.id) + 1 : undefined,
      myPoints: myP?.leaguePoints,
    });
  }

  if (currentTier === 'Diamond' || currentTier === 'Legend') {
    const tierRank = await prisma.userLeagueWeek.count({
      where: {
        weekKey,
        leaguePoints: { gt: payload.weeklyPoints },
        user: { leagueTier: currentTier },
      },
    });
    payload.championship.qualified = tierRank < LEAGUE_CHAMPIONSHIP_TOP;
  }

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, name, teamId, agreedToTerms } = body;

  if (!initData || !name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing initData or league name' }, { status: 400 });
  }
  if (!teamId || typeof teamId !== 'string') {
    return NextResponse.json({ error: 'Only a team can create a league. Provide teamId.' }, { status: 400 });
  }
  if (agreedToTerms !== true) {
    return NextResponse.json({ error: 'You must agree to the Teams & Leagues Terms to create a league' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.creatorId !== dbUser.id) {
    return NextResponse.json({ error: 'Only the team creator can create a league on behalf of the team' }, { status: 403 });
  }

  const balance = dbUser.pointsBalance ?? 0;
  if (balance < LEAGUE_CREATION_FEE) {
    return NextResponse.json(
      { error: `League creation requires a commitment fee of ${LEAGUE_CREATION_FEE.toLocaleString()} PEARLS. Your balance: ${Math.floor(balance).toLocaleString()} PEARLS.` },
      { status: 400 }
    );
  }

  const feeRecipient = await getOrCreateFeeRecipientUser(prisma);

  const weekKey = getWeekKey();
  let inviteCode = generateInviteCode();
  let exists = await prisma.userCreatedLeague.findUnique({ where: { inviteCode } });
  while (exists) {
    inviteCode = generateInviteCode();
    exists = await prisma.userCreatedLeague.findUnique({ where: { inviteCode } });
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { pointsBalance: { decrement: LEAGUE_CREATION_FEE } },
  });
  await prisma.user.update({
    where: { id: feeRecipient.id },
    data: { pointsBalance: { increment: LEAGUE_CREATION_FEE } },
  });
  await prisma.treasuryTransaction.create({
    data: { amount: LEAGUE_CREATION_FEE, type: 'league_commitment', userId: dbUser.id },
  });

  const league = await prisma.userCreatedLeague.create({
    data: {
      creatorId: dbUser.id,
      creatorTeamId: team.id,
      name: name.trim().slice(0, 80),
      inviteCode,
      weekKey,
      maxMembers: LEAGUE_CUSTOM_MAX_MEMBERS,
    },
  });

  await prisma.leagueTeam.create({
    data: { leagueId: league.id, teamId: team.id },
  });
  await prisma.userCreatedLeagueMember.create({
    data: { leagueId: league.id, userId: dbUser.id },
  });

  return NextResponse.json({
    id: league.id,
    name: league.name,
    inviteCode,
    inviteLink: null,
  });
}
