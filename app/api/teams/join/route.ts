/**
 * POST: join a team by invite code
 * Body: { initData, inviteCode }
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TEAM_MAX_MEMBERS } from '@/utils/consts';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, inviteCode } = body;

  if (!initData || !inviteCode || typeof inviteCode !== 'string') {
    return NextResponse.json({ error: 'Missing initData or inviteCode' }, { status: 400 });
  }

  const code = String(inviteCode).trim().toUpperCase();
  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const team = await prisma.team.findUnique({
    where: { inviteCode: code },
    include: { members: true },
  });

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const totalCount = 1 + team.members.length;
  if (totalCount >= TEAM_MAX_MEMBERS) {
    return NextResponse.json({ error: `This team has reached the maximum of ${TEAM_MAX_MEMBERS} members` }, { status: 400 });
  }

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: dbUser.id } },
  });
  if (existing) return NextResponse.json({ error: 'Already in this team' }, { status: 400 });
  if (team.creatorId === dbUser.id) return NextResponse.json({ error: 'You created this team' }, { status: 400 });

  // User can only be in one team: leave any other team(s) first, then join this one
  await prisma.teamMember.deleteMany({
    where: { userId: dbUser.id },
  });
  await prisma.teamMember.create({
    data: { teamId: team.id, userId: dbUser.id },
  });

  return NextResponse.json({
    success: true,
    teamId: team.id,
    name: team.name,
  });
}
