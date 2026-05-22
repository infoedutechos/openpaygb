/**
 * Team management – owner only.
 * GET: team info, members (with moderation), announcements, opinions.
 * POST: removeMember, muteMember, unbanMember, banMember, punishMember, postAnnouncement, createOpinion.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { TEAM_MIN_MEMBERS } from '@/utils/consts';

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
    include: {
      creator: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
      moderations: true,
      announcements: { orderBy: { createdAt: 'desc' }, take: 50, include: { author: { select: { name: true } } } },
      opinions: { orderBy: { createdAt: 'desc' }, include: { author: { select: { name: true } }, votes: true } },
    },
  });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the team owner can manage' }, { status: 403 });

  const modMap = new Map(team.moderations.map((m) => [m.userId, m]));
  const members = [
    { userId: team.creator.id, name: team.creator.name ?? 'Owner', isOwner: true, joinedAt: team.createdAt.toISOString(), mutedUntil: null as string | null, banned: false, punishmentNote: null as string | null },
    ...team.members.map((m) => {
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

  const creatorName = team.creator?.name ?? 'Owner';
  const announcements = team.announcements.map((a) => ({
    id: a.id,
    text: a.text,
    authorName: a.author?.name ?? creatorName,
    createdAt: a.createdAt.toISOString(),
  }));

  const opinions = team.opinions.map((o) => {
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
    team: { id: team.id, name: team.name, inviteCode: team.inviteCode },
    members,
    announcements,
    opinions,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const body = await req.json().catch(() => ({}));
  const { initData, action, userId, punishmentNote, text, title, body: opinionBody } = body;

  if (!initData) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  const { user } = validateTelegramWebAppData(initData);
  if (!user) return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  const telegramId = user.id?.toString();
  if (!telegramId) return NextResponse.json({ error: 'Invalid user' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const team = await prisma.team.findUnique({ where: { id: teamId }, include: { members: true } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.creatorId !== dbUser.id) return NextResponse.json({ error: 'Only the team owner can manage' }, { status: 403 });

  if (action === 'removeMember' && userId) {
    if (userId === team.creatorId) return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 });
    const totalCount = 1 + team.members.length;
    if (totalCount <= TEAM_MIN_MEMBERS) {
      return NextResponse.json({ error: `Team must have at least ${TEAM_MIN_MEMBERS} members` }, { status: 400 });
    }
    await prisma.teamMember.deleteMany({ where: { teamId, userId } });
    await prisma.teamModeration.deleteMany({ where: { teamId, userId } });
    return NextResponse.json({ message: 'Member removed', success: true });
  }

  if (action === 'muteMember' && userId) {
    const until = new Date();
    until.setHours(until.getHours() + 24);
    await prisma.teamModeration.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, mutedUntil: until },
      update: { mutedUntil: until },
    });
    return NextResponse.json({ message: 'Member muted for 24h', success: true });
  }

  if (action === 'banMember' && userId) {
    const totalCount = 1 + team.members.length;
    if (totalCount <= TEAM_MIN_MEMBERS) {
      return NextResponse.json({ error: `Team must have at least ${TEAM_MIN_MEMBERS} members` }, { status: 400 });
    }
    await prisma.teamModeration.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, banned: true },
      update: { banned: true },
    });
    await prisma.teamMember.deleteMany({ where: { teamId, userId } });
    return NextResponse.json({ message: 'Member banned and removed', success: true });
  }

  if (action === 'unbanMember' && userId) {
    await prisma.teamModeration.updateMany({ where: { teamId, userId }, data: { banned: false } });
    return NextResponse.json({ message: 'Member unbanned', success: true });
  }

  if (action === 'punishMember' && userId) {
    await prisma.teamModeration.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, punishmentNote: punishmentNote ?? null },
      update: { punishmentNote: punishmentNote ?? null },
    });
    return NextResponse.json({ message: 'Note saved', success: true });
  }

  if (action === 'postAnnouncement' && typeof text === 'string' && text.trim()) {
    await prisma.teamAnnouncement.create({
      data: { teamId, authorId: dbUser.id, text: text.trim() },
    });
    return NextResponse.json({ message: 'Announcement posted', success: true });
  }

  if (action === 'createOpinion' && typeof title === 'string' && title.trim()) {
    await prisma.teamOpinion.create({
      data: { teamId, authorId: dbUser.id, title: title.trim(), body: (opinionBody as string)?.trim() || null },
    });
    return NextResponse.json({ message: 'Opinion created', success: true });
  }

  return NextResponse.json({ error: 'Unknown action or missing params' }, { status: 400 });
}
