/**
 * GET: list pending join requests (team owner only).
 * POST: review a request – body: { initData, requestId, action: 'approve' | 'deny', denyReason?: string }
 * On approve: user leaves any other team (one team per user), then joins this team.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TEAM_MAX_MEMBERS } from '@/utils/consts';

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
    select: { id: true, creatorId: true },
  });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.creatorId !== dbUser.id) {
    return NextResponse.json({ error: 'Only the team owner can view requests' }, { status: 403 });
  }

  const requests = await prisma.teamJoinRequest.findMany({
    where: { teamId, status: 'pending' },
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
  const { id: teamId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData, requestId, action, denyReason } = body;

  if (!initData || !requestId || !action || !['approve', 'deny'].includes(action)) {
    return NextResponse.json({ error: 'Missing initData, requestId, or invalid action' }, { status: 400 });
  }

  const { user } = validateTelegramWebAppData(initData);
  if (!user) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.creatorId !== dbUser.id) {
    return NextResponse.json({ error: 'Only the team owner can review requests' }, { status: 403 });
  }

  const joinRequest = await prisma.teamJoinRequest.findFirst({
    where: { id: requestId, teamId, status: 'pending' },
  });
  if (!joinRequest) {
    return NextResponse.json({ error: 'Request not found or already reviewed' }, { status: 404 });
  }

  const now = new Date();
  if (action === 'approve') {
    const totalCount = 1 + team.members.length;
    if (totalCount >= TEAM_MAX_MEMBERS) {
      return NextResponse.json({ error: `Team has reached the maximum of ${TEAM_MAX_MEMBERS} members` }, { status: 400 });
    }
    // One team per user: remove from all other teams, then add to this team
    await prisma.teamMember.deleteMany({
      where: { userId: joinRequest.userId },
    });
    await prisma.teamMember.create({
      data: { teamId, userId: joinRequest.userId },
    });
    await prisma.teamJoinRequest.update({
      where: { id: requestId },
      data: { status: 'approved', reviewedAt: now },
    });
    return NextResponse.json({ success: true, action: 'approved' });
  }

  await prisma.teamJoinRequest.update({
    where: { id: requestId },
    data: {
      status: 'denied',
      reviewedAt: now,
      denyReason: typeof denyReason === 'string' ? denyReason.trim().slice(0, 500) : null,
    },
  });
  return NextResponse.json({ success: true, action: 'denied' });
}
