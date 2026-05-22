/**
 * GET: team member dashboard – for users who are members (not creator).
 * Returns: team name, announcements, members (with TP/LP totals and current week), team challenges (available + completed).
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getWeekKey } from '@/utils/week-utils';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const { user } = validateTelegramWebAppData(initData);
  if (!user) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      creator: { select: { id: true, name: true, totalTeamPoints: true, totalLeaguePoints: true } },
      members: { include: { user: { select: { id: true, name: true, totalTeamPoints: true, totalLeaguePoints: true } } } },
      announcements: { orderBy: { createdAt: 'desc' }, take: 30, include: { author: { select: { name: true } } } },
      opinions: { orderBy: { createdAt: 'desc' }, take: 30, include: { author: { select: { name: true } }, votes: true } },
    },
  });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.creatorId === dbUser.id) return NextResponse.json({ error: 'Use management dashboard for your team' }, { status: 403 });

  const isMember = team.members.some((m) => m.userId === dbUser.id);
  if (!isMember) return NextResponse.json({ error: 'You are not a member of this team' }, { status: 403 });

  const weekKey = getWeekKey();
  const memberIds = [team.creator.id, ...team.members.map((m) => m.userId)];
  const [teamWeeks, leagueWeeks] = await Promise.all([
    prisma.userTeamWeek.findMany({ where: { userId: { in: memberIds }, weekKey }, select: { userId: true, teamPoints: true } }),
    prisma.userLeagueWeek.findMany({ where: { userId: { in: memberIds }, weekKey }, select: { userId: true, leaguePoints: true } }),
  ]);
  const tpWeek = new Map(teamWeeks.map((w) => [w.userId, w.teamPoints]));
  const lpWeek = new Map(leagueWeeks.map((w) => [w.userId, w.leaguePoints]));

  const members = [
    { userId: team.creator.id, name: team.creator.name ?? 'Owner', isOwner: true, totalTP: team.creator.totalTeamPoints ?? 0, totalLP: team.creator.totalLeaguePoints ?? 0, weekTP: tpWeek.get(team.creator.id) ?? 0, weekLP: lpWeek.get(team.creator.id) ?? 0 },
    ...team.members.map((m) => ({
      userId: m.userId,
      name: m.user.name ?? 'Member',
      isOwner: false,
      totalTP: m.user.totalTeamPoints ?? 0,
      totalLP: m.user.totalLeaguePoints ?? 0,
      weekTP: tpWeek.get(m.userId) ?? 0,
      weekLP: lpWeek.get(m.userId) ?? 0,
    })),
  ];

  const creatorName = team.creator?.name ?? 'Owner';
  const announcements = team.announcements.map((a) => ({
    id: a.id,
    text: a.text,
    authorName: a.author?.name ?? creatorName,
    createdAt: a.createdAt.toISOString(),
  }));

  const opinions = team.opinions.map((o) => {
    const votesFor = o.votes.filter((v) => v.vote === 'for').length;
    const votesAgainst = o.votes.filter((v) => v.vote === 'against').length;
    return {
      id: o.id,
      title: o.title,
      body: o.body,
      authorName: o.author?.name ?? creatorName,
      createdAt: o.createdAt.toISOString(),
      votesFor,
      votesAgainst,
    };
  });

  const challenges = await prisma.teamChallenge.findMany({
    where: { OR: [{ creatorTeamId: teamId }, { opponentTeamId: teamId }] },
    include: {
      creatorTeam: { select: { name: true } },
      opponentTeam: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const available = challenges.filter((c) => c.status === 'pending' || c.status === 'active');
  const completed = challenges.filter((c) => c.status === 'completed');

  const totalTP = members.reduce((s, m) => s + m.totalTP, 0);
  const totalLP = members.reduce((s, m) => s + m.totalLP, 0);

  return NextResponse.json({
    team: { id: team.id, name: team.name },
    overview: { memberCount: members.length, totalTP, totalLP, announcementsCount: announcements.length, opinionsCount: opinions.length, tasksAvailableCount: available.length, tasksCompletedCount: completed.length },
    announcements,
    opinions,
    members,
    tasksAvailable: available.map((c) => ({
      id: c.id,
      status: c.status,
      targetAlm: c.targetAlm,
      durationDays: c.durationDays,
      prizePool: c.prizePool,
      creatorTeamName: c.creatorTeam.name,
      opponentTeamName: c.opponentTeam?.name ?? null,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      winnerTeamId: c.winnerTeamId,
    })),
    tasksCompleted: completed.map((c) => ({
      id: c.id,
      targetAlm: c.targetAlm,
      prizePool: c.prizePool,
      creatorTeamName: c.creatorTeam.name,
      opponentTeamName: c.opponentTeam?.name ?? null,
      winnerTeamId: c.winnerTeamId,
      endsAt: c.endsAt?.toISOString() ?? null,
    })),
  });
}
