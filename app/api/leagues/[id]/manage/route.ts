/**
 * League management – owner only.
 * GET: league info, members (with moderation), announcements, opinions.
 * POST: removeMember, muteMember, unbanMember, banMember, punishMember, postAnnouncement, createOpinion.
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

  const { user } = validateTelegramWebAppData(initData);
  if (!user) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const league = await prisma.userCreatedLeague.findUnique({
    where: { id: leagueId },
    include: {
      creator: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      moderations: true,
      announcements: { orderBy: { createdAt: 'desc' }, take: 50, include: { author: { select: { name: true } } } },
      opinions: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true } }, votes: true } },
    },
  });
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });
  if (league.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the league owner can manage' }, { status: 403 });

  const modMap = new Map(league.moderations.map((m) => [m.userId, m]));
  const members = [
    { userId: league.creator.id, name: league.creator.name ?? 'Owner', isOwner: true, joinedAt: league.createdAt.toISOString(), mutedUntil: null as string | null, banned: false, punishmentNote: null as string | null },
    ...league.members.map((m) => {
      const mod = modMap.get(m.userId);
      return {
        userId: m.userId,
        name: m.user.name ?? 'Member',
        isOwner: false,
        joinedAt: m.joinedAt.toISOString(),
        mutedUntil: mod?.mutedUntil?.toISOString() ?? null,
        banned: mod?.banned ?? false,
        punishmentNote: mod?.punishmentNote ?? null,
      };
    }),
  ];

  const announcements = league.announcements.map((a) => ({
    id: a.id,
    text: a.text,
    authorName: a.author?.name ?? league.creator?.name ?? 'Owner',
    createdAt: a.createdAt.toISOString(),
  }));

  const opinions = league.opinions.map((o) => {
    const votesFor = o.votes.filter((v) => v.vote === 'for').length;
    const votesAgainst = o.votes.filter((v) => v.vote === 'against').length;
    return {
      id: o.id,
      title: o.title,
      body: o.body,
      authorName: o.author?.name ?? 'Owner',
      createdAt: o.createdAt.toISOString(),
      votesFor,
      votesAgainst,
    };
  });

  return NextResponse.json({
    league: { id: league.id, name: league.name, inviteCode: league.inviteCode },
    members,
    announcements,
    opinions,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leagueId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData, action, userId, punishmentNote, text, title, body: opinionBody } = body;

  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  const { user } = validateTelegramWebAppData(initData);
  if (!user) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const league = await prisma.userCreatedLeague.findUnique({ where: { id: leagueId }, include: { members: true } });
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });
  if (league.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the league owner can manage' }, { status: 403 });

  if (action === 'removeMember' && userId) {
    if (userId === league.creatorId) return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 });
    await prisma.userCreatedLeagueMember.deleteMany({ where: { leagueId, userId } });
    await prisma.leagueModeration.deleteMany({ where: { leagueId, userId } });
    return NextResponse.json({ message: 'Member removed', success: true });
  }

  if (action === 'muteMember' && userId) {
    const until = new Date();
    until.setHours(until.getHours() + 24);
    await prisma.leagueModeration.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId, mutedUntil: until },
      update: { mutedUntil: until },
    });
    return NextResponse.json({ message: 'Member muted for 24h', success: true });
  }

  if (action === 'banMember' && userId) {
    await prisma.leagueModeration.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId, banned: true },
      update: { banned: true },
    });
    await prisma.userCreatedLeagueMember.deleteMany({ where: { leagueId, userId } });
    return NextResponse.json({ message: 'Member banned and removed', success: true });
  }

  if (action === 'unbanMember' && userId) {
    await prisma.leagueModeration.updateMany({ where: { leagueId, userId }, data: { banned: false } });
    return NextResponse.json({ message: 'Member unbanned', success: true });
  }

  if (action === 'punishMember' && userId) {
    await prisma.leagueModeration.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId, punishmentNote: punishmentNote ?? null },
      update: { punishmentNote: punishmentNote ?? null },
    });
    return NextResponse.json({ message: 'Note saved', success: true });
  }

  if (action === 'postAnnouncement' && typeof text === 'string' && text.trim()) {
    await prisma.leagueAnnouncement.create({
      data: { leagueId, authorId: dbUser.id, text: text.trim() },
    });
    return NextResponse.json({ message: 'Announcement posted', success: true });
  }

  if (action === 'createOpinion' && typeof title === 'string' && title.trim()) {
    await prisma.leagueOpinion.create({
      data: { leagueId, authorId: dbUser.id, title: title.trim(), body: (opinionBody as string)?.trim() || null },
    });
    return NextResponse.json({ message: 'Opinion created', success: true });
  }

  return NextResponse.json({ error: 'Unknown action or missing params' }, { status: 400 });
}
