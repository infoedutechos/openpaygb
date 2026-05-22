/**
 * GET: list teams for browsing – name, member count, isMember, requestStatus (pending | approved | denied).
 * Optional initData: if provided, includes whether current user is a member and any join request status.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TEAM_MAX_MEMBERS } from '@/utils/consts';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  const teams = await prisma.team.findMany({
    include: { members: true },
    orderBy: { createdAt: 'desc' },
  });

  let myTeamIds: string[] = [];
  const requestByTeamId: Record<string, string> = {};
  if (initData) {
    const validated = validateTelegramWebAppData(initData);
    if (validated?.user?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { telegramId: validated.user.id.toString() },
        select: { id: true },
      });
      if (dbUser) {
        const created = await prisma.team.findMany({ where: { creatorId: dbUser.id }, select: { id: true } });
        const memberships = await prisma.teamMember.findMany({ where: { userId: dbUser.id }, select: { teamId: true } });
        myTeamIds = [...new Set([...created.map((c) => c.id), ...memberships.map((m) => m.teamId)])];
        const requests = await prisma.teamJoinRequest.findMany({
          where: { userId: dbUser.id },
          select: { teamId: true, status: true },
        });
        for (const r of requests) requestByTeamId[r.teamId] = r.status;
      }
    }
  }

  const list = teams.map((team) => ({
    id: team.id,
    name: team.name,
    memberCount: team.members.length,
    maxMembers: TEAM_MAX_MEMBERS,
    isMember: myTeamIds.includes(team.id),
    requestStatus: requestByTeamId[team.id] ?? null,
  }));

  return NextResponse.json({ teams: list });
}
