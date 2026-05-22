/**
 * POST: send a request to join a league. Body: { initData, leagueId }
 * Creator approves or denies via /api/leagues/[id]/requests (review).
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getWeekKey } from '@/utils/week-utils';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, leagueId, agreedToTerms } = body;

  if (!initData || !leagueId || typeof leagueId !== 'string') {
    return NextResponse.json({ error: 'Missing initData or leagueId' }, { status: 400 });
  }
  if (agreedToTerms !== true) {
    return NextResponse.json({ error: 'You must agree to the Teams & Leagues Terms to request to join a league' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const league = await prisma.userCreatedLeague.findUnique({
    where: { id: leagueId },
    include: { members: true },
  });
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  const weekKey = getWeekKey();
  if (league.weekKey !== weekKey) {
    return NextResponse.json({ error: 'This league is for a different week.' }, { status: 400 });
  }

  const memberCount = league.members.length + 1;
  if (memberCount >= league.maxMembers) {
    return NextResponse.json({ error: 'League is full' }, { status: 400 });
  }

  if (league.creatorId === dbUser.id) {
    return NextResponse.json({ error: 'You created this league' }, { status: 400 });
  }

  const existingMember = await prisma.userCreatedLeagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: dbUser.id } },
  });
  if (existingMember) {
    return NextResponse.json({ error: 'Already in this league' }, { status: 400 });
  }

  const existingRequest = await prisma.leagueJoinRequest.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: dbUser.id } },
  });
  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      return NextResponse.json({ error: 'Request already sent', requestId: existingRequest.id }, { status: 400 });
    }
    if (existingRequest.status === 'approved') {
      return NextResponse.json({ error: 'Already in this league' }, { status: 400 });
    }
    // Previously denied: allow new request by updating
    await prisma.leagueJoinRequest.update({
      where: { id: existingRequest.id },
      data: { status: 'pending', denyReason: null, reviewedAt: null },
    });
    return NextResponse.json({ success: true, message: 'Request sent', leagueId: league.id, leagueName: league.name });
  }

  await prisma.leagueJoinRequest.create({
    data: {
      leagueId: league.id,
      userId: dbUser.id,
      status: 'pending',
    },
  });

  return NextResponse.json({ success: true, message: 'Request sent', leagueId: league.id, leagueName: league.name });
}
