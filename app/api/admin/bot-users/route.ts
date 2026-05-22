// app/api/admin/bot-users/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_CHEATING_MESSAGE = 'Cheating is bad. Your account has been suspended.';

// GET: List users that are flagged as bot OR frozen with a suspension reason (cheaters)
export async function GET(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) {
    const res = NextResponse.json(authError.body, { status: authError.status });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const viewAll = url.searchParams.get('view') === 'all';
    const search = (url.searchParams.get('search') || '').trim();
    const skip = (page - 1) * limit;

    const suspectedFilter = {
      OR: [
        { flaggedAsBot: true },
        { isFrozen: true, suspensionReason: { not: null } },
        { botSuspicionCount: { gt: 0 } },
      ],
    };
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { telegramId: { contains: search } },
          ],
        }
      : null;
    const whereClause =
      searchFilter && viewAll
        ? searchFilter
        : searchFilter && !viewAll
          ? { AND: [suspectedFilter, searchFilter] }
          : viewAll
            ? {}
            : suspectedFilter;

    const total = await prisma.user.count({ where: whereClause });

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        telegramId: true,
        name: true,
        points: true,
        pointsBalance: true,
        totalTaps: true,
        isFrozen: true,
        suspensionReason: true,
        flaggedAsBot: true,
        botSuspicionCount: true,
        createdAt: true,
        _count: {
          select: {
            completedTasks: { where: { isCompleted: true } },
            referrals: true,
            dailyCipherAttempts: { where: { claimedAt: { not: null } } },
            dailyComboAttempts: { where: { claimedAt: { not: null } } },
            ownedCards: true,
            stakes: true,
            miniGameAttempts: { where: { claimedAt: { not: null } } },
          },
        },
      },
      orderBy: viewAll
        ? [{ botSuspicionCount: 'desc' }, { flaggedAsBot: 'desc' }, { points: 'desc' }]
        : [{ flaggedAsBot: 'desc' }, { botSuspicionCount: 'desc' }, { points: 'desc' }],
      skip,
      take: limit,
    });

    const formatted = users.map((u) => ({
      id: u.id,
      telegramId: u.telegramId,
      name: u.name || 'Anonymous',
      points: Math.floor(u.points),
      pointsBalance: Math.floor(u.pointsBalance),
      totalTaps: u.totalTaps ?? 0,
      isFrozen: u.isFrozen,
      suspensionReason: u.suspensionReason,
      flaggedAsBot: u.flaggedAsBot,
      botSuspicionCount: u.botSuspicionCount,
      createdAt: u.createdAt,
      activities: {
        tasks: u._count.completedTasks,
        referrals: u._count.referrals,
        dailyCiphers: u._count.dailyCipherAttempts,
        dailyCombos: u._count.dailyComboAttempts,
        cards: u._count.ownedCards,
        stakes: u._count.stakes,
        miniGames: u._count.miniGameAttempts,
      },
    }));

    return NextResponse.json({
      users: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bot users:', error);
    return NextResponse.json({ error: 'Failed to fetch bot users' }, { status: 500 });
  }
}

// POST: Actions: flag_as_bot, unflag_bot, freeze_cheating, unfreeze
export async function POST(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });
  try {
    const body = await req.json();
    const { action, userIds, suspensionMessage } = body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Missing action or userIds' }, { status: 400 });
    }

    const message = typeof suspensionMessage === 'string' && suspensionMessage.trim()
      ? suspensionMessage.trim()
      : DEFAULT_CHEATING_MESSAGE;

    switch (action) {
      case 'flag_as_bot':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { flaggedAsBot: true },
        });
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) flagged as bot` });

      case 'unflag_bot':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { flaggedAsBot: false },
        });
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) unflagged` });

      case 'freeze_cheating':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isFrozen: true, suspensionReason: message },
        });
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) frozen with suspension message` });

      case 'unfreeze':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isFrozen: false, suspensionReason: null },
        });
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) unfrozen` });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in bot-users action:', error);
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
