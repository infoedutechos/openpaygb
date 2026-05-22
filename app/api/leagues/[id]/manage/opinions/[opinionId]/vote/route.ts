/**
 * POST: vote on a league opinion (for | against). Must be league member.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; opinionId: string }> }
) {
  const { id: leagueId, opinionId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData, vote } = body;

  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  const { user } = validateTelegramWebAppData(initData);
  if (!user) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });

  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const league = await prisma.userCreatedLeague.findUnique({ where: { id: leagueId }, include: { members: true } });
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });
  const isMember = league.creatorId === dbUser.id || league.members.some((m) => m.userId === dbUser.id);
  if (!isMember) return NextResponse.json({ error: 'Only league members can vote' }, { status: 403 });

  const v = vote === 'against' ? 'against' : 'for';
  const opinion = await prisma.leagueOpinion.findFirst({ where: { id: opinionId, leagueId } });
  if (!opinion) return NextResponse.json({ error: 'Opinion not found' }, { status: 404 });

  await prisma.leagueOpinionVote.upsert({
    where: { opinionId_userId: { opinionId, userId: dbUser.id } },
    create: { opinionId, userId: dbUser.id, vote: v },
    update: { vote: v },
  });
  return NextResponse.json({ success: true, vote: v });
}
