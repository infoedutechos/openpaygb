/**
 * POST: request to join a team (creates pending TeamJoinRequest; owner approves/denies via teams/[id]/requests).
 * Body: { initData, teamId }
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TEAM_MAX_MEMBERS } from '@/utils/consts';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, teamId, agreedToTerms } = body;

  if (!initData || !teamId) {
    return NextResponse.json({ error: 'Missing initData or teamId' }, { status: 400 });
  }
  if (agreedToTerms !== true) {
    return NextResponse.json({ error: 'You must agree to the Teams & Leagues Terms to request to join a team' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.creatorId === dbUser.id) return NextResponse.json({ error: 'You created this team' }, { status: 400 });
  const totalCount = 1 + team.members.length;
  if (totalCount >= TEAM_MAX_MEMBERS) {
    return NextResponse.json({ error: `This team has reached the maximum of ${TEAM_MAX_MEMBERS} members` }, { status: 400 });
  }

  const isMember = team.members.some((m) => m.userId === dbUser.id);
  if (isMember) return NextResponse.json({ error: 'Already in this team' }, { status: 400 });

  const existing = await prisma.teamJoinRequest.findUnique({
    where: { teamId_userId: { teamId, userId: dbUser.id } },
  });
  if (existing) {
    if (existing.status === 'pending') return NextResponse.json({ error: 'Request already pending' }, { status: 400 });
    // Allow new request if previously denied
  }

  await prisma.teamJoinRequest.upsert({
    where: { teamId_userId: { teamId, userId: dbUser.id } },
    create: { teamId, userId: dbUser.id, status: 'pending' },
    update: { status: 'pending', reviewedAt: null, denyReason: null },
  });

  return NextResponse.json({ success: true, teamId, teamName: team.name });
}
