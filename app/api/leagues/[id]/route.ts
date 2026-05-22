/**
 * GET: league detail + leaderboard (user must be creator or member)
 * Includes teamCount and canCreateTask (league can create tasks only if 2+ teams).
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { MIN_TEAMS_FOR_LEAGUE_TASK } from '@/utils/consts';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leagueId } = await params;
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const league = await prisma.userCreatedLeague.findUnique({
    where: { id: leagueId },
    include: { members: true, teams: true },
  });
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  const teamCount = league.teams.length;
  const canCreateTask = teamCount >= MIN_TEAMS_FOR_LEAGUE_TASK;

  const isCreator = league.creatorId === dbUser.id;
  const isMember = league.members.some((m) => m.userId === dbUser.id);
  if (!isCreator && !isMember) {
    return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
  }

  let pendingRequestsCount = 0;
  if (isCreator) {
    pendingRequestsCount = await prisma.leagueJoinRequest.count({
      where: { leagueId, status: 'pending' },
    });
  }

  const memberIds = [league.creatorId, ...league.members.map((m) => m.userId)];
  const points = await prisma.userLeagueWeek.findMany({
    where: { weekKey: league.weekKey, userId: { in: memberIds } },
    include: { user: { select: { name: true } } },
    orderBy: { leaguePoints: 'desc' },
  });

  const leaderboard = points.map((p, i) => ({
    rank: i + 1,
    name: p.user.name || 'User',
    leaguePoints: p.leaguePoints,
  }));

  return NextResponse.json({
    id: league.id,
    name: league.name,
    inviteCode: league.inviteCode,
    inviteLink: null,
    weekKey: league.weekKey,
    memberCount: memberIds.length,
    teamCount,
    canCreateTask,
    isCreator,
    pendingRequestsCount: isCreator ? pendingRequestsCount : undefined,
    leaderboard,
  });
}
