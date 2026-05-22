/**
 * POST: join a league as a team (so league can have 2+ teams and create tasks)
 * Body: { initData, inviteCode, teamId }
 * Only the team creator can join the league on behalf of the team.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getWeekKey } from '@/utils/week-utils';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, inviteCode, teamId } = body;

  if (!initData || !inviteCode || typeof inviteCode !== 'string' || !teamId || typeof teamId !== 'string') {
    return NextResponse.json({ error: 'Missing initData, inviteCode, or teamId' }, { status: 400 });
  }

  const code = String(inviteCode).trim().toUpperCase();
  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.creatorId !== dbUser.id) {
    return NextResponse.json({ error: 'Only the team creator can join a league on behalf of the team' }, { status: 403 });
  }

  const league = await prisma.userCreatedLeague.findUnique({
    where: { inviteCode: code },
    include: { teams: true },
  });

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  const weekKey = getWeekKey();
  if (league.weekKey !== weekKey) {
    return NextResponse.json({ error: 'This league is for a different week. Ask for a new invite.' }, { status: 400 });
  }

  const alreadyInLeague = league.teams.some((t) => t.teamId === teamId);
  if (alreadyInLeague) return NextResponse.json({ error: 'Your team is already in this league' }, { status: 400 });

  await prisma.leagueTeam.create({
    data: { leagueId: league.id, teamId: team.id },
  });

  return NextResponse.json({
    success: true,
    leagueId: league.id,
    name: league.name,
    message: 'Team joined the league. League now has more teams (2+ teams allow league task creation).',
  });
}
