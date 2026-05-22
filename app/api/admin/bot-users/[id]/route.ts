// app/api/admin/bot-users/[id]/route.ts – full user detail + activities + transfers

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = getAdminAuthError(req);
  if (authError) {
    const res = NextResponse.json(authError.body, { status: authError.status });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }
  try {
    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        name: true,
        points: true,
        pointsBalance: true,
        totalTaps: true,
        region: true,
        isPremium: true,
        isFrozen: true,
        suspensionReason: true,
        flaggedAsBot: true,
        botSuspicionCount: true,
        referralPointsEarned: true,
        offlinePointsEarned: true,
        totalDonatedPoints: true,
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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [receivedTransfers, sentTransfers] = await Promise.all([
      prisma.transfer.findMany({
        where: { recipientId: userId, isFeeTransfer: false },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          sender: { select: { id: true, telegramId: true, name: true } },
        },
      }),
      prisma.transfer.findMany({
        where: { senderId: userId, isFeeTransfer: false },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          recipient: { select: { id: true, telegramId: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        name: user.name || 'Anonymous',
        points: Math.floor(user.points),
        pointsBalance: Math.floor(user.pointsBalance),
        totalTaps: user.totalTaps ?? 0,
        region: user.region,
        isPremium: user.isPremium,
        isFrozen: user.isFrozen,
        suspensionReason: user.suspensionReason,
        flaggedAsBot: user.flaggedAsBot,
        botSuspicionCount: user.botSuspicionCount,
        referralPointsEarned: Math.floor(user.referralPointsEarned),
        offlinePointsEarned: Math.floor(user.offlinePointsEarned),
        totalDonatedPoints: Math.floor(user.totalDonatedPoints),
        createdAt: user.createdAt,
        activities: {
          tasks: user._count.completedTasks,
          referrals: user._count.referrals,
          dailyCiphers: user._count.dailyCipherAttempts,
          dailyCombos: user._count.dailyComboAttempts,
          cards: user._count.ownedCards,
          stakes: user._count.stakes,
          miniGames: user._count.miniGameAttempts,
        },
      },
      receivedTransfers: receivedTransfers.map((t) => ({
        id: t.id,
        amount: Math.floor(t.amount),
        createdAt: t.createdAt,
        from: t.sender
          ? { id: t.sender.id, telegramId: t.sender.telegramId, name: t.sender.name || 'Anonymous' }
          : null,
      })),
      sentTransfers: sentTransfers.map((t) => ({
        id: t.id,
        amount: Math.floor(t.amount),
        createdAt: t.createdAt,
        to: t.recipient
          ? { id: t.recipient.id, telegramId: t.recipient.telegramId, name: t.recipient.name || 'Anonymous' }
          : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching bot user detail:', error);
    return NextResponse.json({ error: 'Failed to fetch user detail' }, { status: 500 });
  }
}
