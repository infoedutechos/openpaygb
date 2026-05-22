/**
 * POST: join a user-created league by invite code
 * Body: { initData, inviteCode }
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getWeekKey } from '@/utils/week-utils';

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

  const league = await prisma.userCreatedLeague.findUnique({
    where: { inviteCode: code },
    include: { members: true },
  });

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  const weekKey = getWeekKey();
  if (league.weekKey !== weekKey) {
    return NextResponse.json({ error: 'This league is for a different week. Ask for a new invite.' }, { status: 400 });
  }

  const currentCount = league.members.length + 1;
  if (currentCount >= league.maxMembers) {
    return NextResponse.json({ error: 'League is full' }, { status: 400 });
  }

  const existing = await prisma.userCreatedLeagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: dbUser.id } },
  });
  if (existing) return NextResponse.json({ error: 'Already in this league' }, { status: 400 });
  if (league.creatorId === dbUser.id) return NextResponse.json({ error: 'You created this league' }, { status: 400 });

  await prisma.userCreatedLeagueMember.create({
    data: { leagueId: league.id, userId: dbUser.id },
  });

  return NextResponse.json({
    success: true,
    leagueId: league.id,
    name: league.name,
  });
}
