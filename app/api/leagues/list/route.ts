/**
 * GET: list leagues for browsing – name, performance (total LP), members, maxMembers.
 * Optional initData: includes status (creator | member | pending) for current user.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getWeekKey } from '@/utils/week-utils';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');
  const weekKey = getWeekKey();

  const leagues = await prisma.userCreatedLeague.findMany({
    where: { weekKey },
    include: { members: true },
    orderBy: { createdAt: 'desc' },
  });

  const memberIdsByLeague = new Map<string, string[]>();
  for (const league of leagues) {
    memberIdsByLeague.set(league.id, [league.creatorId, ...league.members.map((m) => m.userId)]);
  }
  const allUserIds = Array.from(new Set(leagues.flatMap((l) => memberIdsByLeague.get(l.id)!)));
  const pointsMap = new Map<string, number>();
  if (allUserIds.length > 0) {
    const weeks = await prisma.userLeagueWeek.findMany({
      where: { weekKey, userId: { in: allUserIds } },
      select: { userId: true, leaguePoints: true },
    });
    for (const w of weeks) {
      pointsMap.set(w.userId, w.leaguePoints);
    }
  }

  let currentUserId: string | null = null;
  let myLeagueIds: string[] = [];
  let myRequestLeagueIds: string[] = [];
  if (initData) {
    const validated = validateTelegramWebAppData(initData);
    if (validated?.user?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { telegramId: validated.user.id.toString() },
        select: { id: true },
      });
      if (dbUser) {
        currentUserId = dbUser.id;
        const memberships = await prisma.userCreatedLeagueMember.findMany({
          where: { userId: dbUser.id },
          select: { leagueId: true },
        });
        const created = await prisma.userCreatedLeague.findMany({
          where: { creatorId: dbUser.id },
          select: { id: true },
        });
        myLeagueIds = [...new Set([...memberships.map((m) => m.leagueId), ...created.map((c) => c.id)])];
        const requests = await prisma.leagueJoinRequest.findMany({
          where: { userId: dbUser.id, status: 'pending' },
          select: { leagueId: true },
        });
        myRequestLeagueIds = requests.map((r) => r.leagueId);
      }
    }
  }

  const list = leagues.map((league) => {
    const ids = memberIdsByLeague.get(league.id)!;
    const totalLP = ids.reduce((sum, uid) => sum + (pointsMap.get(uid) ?? 0), 0);
    let status: 'creator' | 'member' | 'pending' | undefined;
    if (currentUserId) {
      if (league.creatorId === currentUserId) status = 'creator';
      else if (myLeagueIds.includes(league.id)) status = 'member';
      else if (myRequestLeagueIds.includes(league.id)) status = 'pending';
    }
    return {
      id: league.id,
      name: league.name,
      memberCount: ids.length,
      maxMembers: league.maxMembers,
      totalLP,
      status,
    };
  });

  return NextResponse.json({ leagues: list, weekKey });
}
