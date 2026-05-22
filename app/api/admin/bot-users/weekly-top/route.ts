// app/api/admin/bot-users/weekly-top/route.ts – top 20 participants for current week

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';
import { getWeekKey } from '@/utils/week-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TOP = 20;

export async function GET(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) {
    const res = NextResponse.json(authError.body, { status: authError.status });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }
  try {
    const weekKey = getWeekKey();

    const progressList = await prisma.userWeeklyProgress.findMany({
      where: { weekKey },
      orderBy: { pointsEarned: 'desc' },
      take: TOP,
      select: {
        taps: true,
        tasksCompleted: true,
        pointsEarned: true,
        user: {
          select: {
            id: true,
            telegramId: true,
            name: true,
            points: true,
            totalTaps: true,
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
        },
      },
    });

    const userIds = progressList.map((p) => p.user.id);
    const [receivedByUser, sentByUser] = await Promise.all([
      prisma.transfer.groupBy({
        by: ['recipientId'],
        where: { recipientId: { in: userIds }, isFeeTransfer: false },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transfer.groupBy({
        by: ['senderId'],
        where: { senderId: { in: userIds }, isFeeTransfer: false },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    const receivedMap = new Map(receivedByUser.map((r) => [r.recipientId, { total: r._sum.amount ?? 0, count: r._count }]));
    const sentMap = new Map(sentByUser.map((s) => [s.senderId, { total: s._sum.amount ?? 0, count: s._count }]));

    const list = progressList.map((p, index) => {
      const rec = receivedMap.get(p.user.id);
      const sent = sentMap.get(p.user.id);
      return {
        rank: index + 1,
        weekKey,
        weekly: {
          taps: p.taps,
          tasksCompleted: p.tasksCompleted,
          pointsEarned: Math.floor(p.pointsEarned),
        },
        user: {
          id: p.user.id,
          telegramId: p.user.telegramId,
          name: p.user.name || 'Anonymous',
          points: Math.floor(p.user.points),
          totalTaps: p.user.totalTaps ?? 0,
          createdAt: p.user.createdAt,
          activities: {
            tasks: p.user._count.completedTasks,
            referrals: p.user._count.referrals,
            dailyCiphers: p.user._count.dailyCipherAttempts,
            dailyCombos: p.user._count.dailyComboAttempts,
            cards: p.user._count.ownedCards,
            stakes: p.user._count.stakes,
            miniGames: p.user._count.miniGameAttempts,
          },
        },
        receivedPoints: rec ? Math.floor(rec.total) : 0,
        receivedCount: rec?.count ?? 0,
        sentPoints: sent ? Math.floor(sent.total) : 0,
        sentCount: sent?.count ?? 0,
      };
    });

    return NextResponse.json({ weekKey, list });
  } catch (error) {
    console.error('Error fetching weekly top:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly top' }, { status: 500 });
  }
}
