/**
 * Admin League Management: list/create/delete teams and leagues, donate to teams, add/remove teams from leagues.
 * GET: list all teams and leagues with details.
 * POST: action (createTeam, createLeague, deleteTeam, deleteLeague, donateToTeam, addTeamToLeague, removeTeamFromLeague).
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';
import { generateInviteCode } from '@/utils/league-points';
import { getWeekKey } from '@/utils/week-utils';
import { LEAGUE_CUSTOM_MAX_MEMBERS } from '@/utils/consts';

import { apiErrorResponse } from "@/lib/api-error";
export const dynamic = 'force-dynamic';

function uniqueInviteCode(prisma: typeof import('@/utils/prisma').default, forTeam: boolean): Promise<string> {
  const code = generateInviteCode();
  const check = forTeam
    ? () => prisma.team.findUnique({ where: { inviteCode: code } })
    : () => prisma.userCreatedLeague.findUnique({ where: { inviteCode: code } });
  return check().then((exists) => (exists ? uniqueInviteCode(prisma, forTeam) : code));
}

export async function GET(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const [teams, leagues] = await Promise.all([
      prisma.team.findMany({
        include: {
          creator: { select: { id: true, name: true, telegramId: true } },
          members: { include: { user: { select: { id: true, name: true, telegramId: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userCreatedLeague.findMany({
        include: {
          creator: { select: { id: true, name: true, telegramId: true } },
          teams: { include: { team: { select: { id: true, name: true } } } },
          members: { include: { user: { select: { id: true, name: true, telegramId: true } } } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const teamList = teams.map((t) => ({
      id: t.id,
      name: t.name,
      inviteCode: t.inviteCode,
      creatorId: t.creatorId,
      creatorName: t.creator.name ?? null,
      creatorTelegramId: t.creator.telegramId,
      memberCount: t.members.length,
      members: t.members.map((m) => ({ userId: m.userId, name: m.user.name ?? null, telegramId: m.user.telegramId })),
      createdAt: t.createdAt.toISOString(),
    }));

    const leagueList = leagues.map((l) => ({
      id: l.id,
      name: l.name,
      inviteCode: l.inviteCode,
      weekKey: l.weekKey,
      creatorId: l.creatorId,
      creatorName: l.creator.name ?? null,
      creatorTelegramId: l.creator.telegramId,
      creatorTeamId: l.creatorTeamId,
      teamCount: l.teams.length,
      teams: l.teams.map((lt) => ({ id: lt.team.id, name: lt.team.name })),
      memberCount: l.members.length,
      members: l.members.map((m) => ({ userId: m.userId, name: m.user.name ?? null, telegramId: m.user.telegramId })),
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({ teams: teamList, leagues: leagueList });
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/league-management", fallback: "Failed to fetch" });
  }
}

// POST for actions
export async function POST(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    switch (action) {
      case 'createTeam': {
        const { creatorUserId, name } = body;
        if (!creatorUserId || !name || typeof name !== 'string') {
          return NextResponse.json({ error: 'createTeam requires creatorUserId and name' }, { status: 400 });
        }
        const user = await prisma.user.findUnique({ where: { id: creatorUserId } });
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        const inviteCode = await uniqueInviteCode(prisma, true);
        const team = await prisma.team.create({
          data: { creatorId: user.id, name: name.trim().slice(0, 80), inviteCode },
        });
        await prisma.teamMember.create({ data: { teamId: team.id, userId: user.id } });
        return NextResponse.json({ success: true, team: { id: team.id, name: team.name, inviteCode } });
      }

      case 'createLeague': {
        const { creatorUserId, teamId, name, weekKey: wk } = body;
        if (!creatorUserId || !teamId || !name || typeof name !== 'string') {
          return NextResponse.json({ error: 'createLeague requires creatorUserId, teamId, and name' }, { status: 400 });
        }
        const [user, team] = await Promise.all([
          prisma.user.findUnique({ where: { id: creatorUserId } }),
          prisma.team.findUnique({ where: { id: teamId } }),
        ]);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        if (team.creatorId !== user.id) {
          return NextResponse.json({ error: 'Team creator must match creatorUserId' }, { status: 400 });
        }
        const weekKey = typeof wk === 'string' && wk ? wk : getWeekKey();
        const inviteCode = await uniqueInviteCode(prisma, false);
        const league = await prisma.userCreatedLeague.create({
          data: {
            creatorId: user.id,
            creatorTeamId: team.id,
            name: name.trim().slice(0, 80),
            inviteCode,
            weekKey,
            maxMembers: LEAGUE_CUSTOM_MAX_MEMBERS,
          },
        });
        await prisma.leagueTeam.create({ data: { leagueId: league.id, teamId: team.id } });
        await prisma.userCreatedLeagueMember.create({ data: { leagueId: league.id, userId: user.id } });
        return NextResponse.json({ success: true, league: { id: league.id, name: league.name, inviteCode, weekKey } });
      }

      case 'deleteTeam': {
        const { teamId } = body;
        if (!teamId) return NextResponse.json({ error: 'deleteTeam requires teamId' }, { status: 400 });
        await prisma.team.delete({ where: { id: teamId } });
        return NextResponse.json({ success: true });
      }

      case 'deleteLeague': {
        const { leagueId } = body;
        if (!leagueId) return NextResponse.json({ error: 'deleteLeague requires leagueId' }, { status: 400 });
        await prisma.userCreatedLeague.delete({ where: { id: leagueId } });
        return NextResponse.json({ success: true });
      }

      case 'donateToTeam': {
        const { teamId, amount } = body;
        if (!teamId || amount == null) {
          return NextResponse.json({ error: 'donateToTeam requires teamId and amount' }, { status: 400 });
        }
        const amt = Math.floor(Number(amount));
        if (!Number.isFinite(amt) || amt <= 0) {
          return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
        }
        const team = await prisma.team.findUnique({ where: { id: teamId }, include: { creator: true } });
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        await prisma.user.update({
          where: { id: team.creatorId },
          data: { pointsBalance: { increment: amt } },
        });
        return NextResponse.json({ success: true, message: `Added ${amt} PEARLS to team creator ${team.creator.name ?? team.creatorId}` });
      }

      case 'addTeamToLeague': {
        const { leagueId, teamId } = body;
        if (!leagueId || !teamId) return NextResponse.json({ error: 'addTeamToLeague requires leagueId and teamId' }, { status: 400 });
        const league = await prisma.userCreatedLeague.findUnique({ where: { id: leagueId } });
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        await prisma.leagueTeam.upsert({
          where: { leagueId_teamId: { leagueId, teamId } },
          create: { leagueId, teamId },
          update: {},
        });
        return NextResponse.json({ success: true });
      }

      case 'removeTeamFromLeague': {
        const { leagueId, teamId } = body;
        if (!leagueId || !teamId) return NextResponse.json({ error: 'removeTeamFromLeague requires leagueId and teamId' }, { status: 400 });
        await prisma.leagueTeam.deleteMany({ where: { leagueId, teamId } });
        return NextResponse.json({ success: true });
      }

      case 'updateTeam': {
        const { teamId, name } = body;
        if (!teamId || !name || typeof name !== 'string') {
          return NextResponse.json({ error: 'updateTeam requires teamId and name' }, { status: 400 });
        }
        await prisma.team.update({
          where: { id: teamId },
          data: { name: name.trim().slice(0, 80) },
        });
        return NextResponse.json({ success: true });
      }

      case 'updateLeague': {
        const { leagueId, name } = body;
        if (!leagueId || !name || typeof name !== 'string') {
          return NextResponse.json({ error: 'updateLeague requires leagueId and name' }, { status: 400 });
        }
        await prisma.userCreatedLeague.update({
          where: { id: leagueId },
          data: { name: name.trim().slice(0, 80) },
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return apiErrorResponse(e, { route: "admin/league-management", fallback: "Request failed" });
  }
}
