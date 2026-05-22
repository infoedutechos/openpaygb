/**
 * GET: list pending join requests (creator only).
 * POST: review a request – body: { initData, requestId, action: 'approve' | 'deny', denyReason?: string }
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

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
    select: { id: true, creatorId: true },
  });
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });
  if (league.creatorId !== dbUser.id) {
    return NextResponse.json({ error: 'Only the creator can view requests' }, { status: 403 });
  }

  const requests = await prisma.leagueJoinRequest.findMany({
    where: { leagueId, status: 'pending' },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name || 'User',
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leagueId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData, requestId, action, denyReason } = body;

  if (!initData || !requestId || !action || !['approve', 'deny'].includes(action)) {
    return NextResponse.json({ error: 'Missing initData, requestId, or invalid action' }, { status: 400 });
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
  if (league.creatorId !== dbUser.id) {
    return NextResponse.json({ error: 'Only the creator can review requests' }, { status: 403 });
  }

  const joinRequest = await prisma.leagueJoinRequest.findFirst({
    where: { id: requestId, leagueId, status: 'pending' },
  });
  if (!joinRequest) {
    return NextResponse.json({ error: 'Request not found or already reviewed' }, { status: 404 });
  }

  const now = new Date();
  if (action === 'approve') {
    const memberCount = league.members.length + 1;
    if (memberCount >= league.maxMembers) {
      return NextResponse.json({ error: 'League is full' }, { status: 400 });
    }
    await prisma.leagueJoinRequest.update({
      where: { id: requestId },
      data: { status: 'approved', reviewedAt: now },
    });
    await prisma.userCreatedLeagueMember.create({
      data: { leagueId, userId: joinRequest.userId },
    });
    return NextResponse.json({ success: true, action: 'approved' });
  }

  await prisma.leagueJoinRequest.update({
    where: { id: requestId },
    data: {
      status: 'denied',
      reviewedAt: now,
      denyReason: typeof denyReason === 'string' ? denyReason.trim().slice(0, 500) : null,
    },
  });
  return NextResponse.json({ success: true, action: 'denied' });
}
