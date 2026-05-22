// app/api/admin/accounts/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';
import { deleteUsersCascade } from '@/utils/delete-users-cascade';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Fetch all users with admin controls
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
    const search = url.searchParams.get('search') || '';
    const showHidden = url.searchParams.get('showHidden') === 'true';
    const showFrozen = url.searchParams.get('showFrozen') === 'true';

    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { telegramId: { contains: search } },
      ];
    }

    if (showFrozen) {
      whereClause.isFrozen = true;
    }

    if (showHidden) {
      whereClause.isHidden = true;
    }

    const totalUsers = await prisma.user.count({ where: whereClause });

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        telegramId: true,
        name: true,
        points: true,
        pointsBalance: true,
        whitePearls: true,
        bluePearlsPending: true,
        goldishPearls: true,
        region: true,
        isPremium: true,
        isFrozen: true,
        isHidden: true,
        createdAt: true,
        referralPointsEarned: true,
        mineLevelIndex: true,
        dailyRewardStreakDay: true,
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
      orderBy: { points: 'desc' },
      skip,
      take: limit,
    });

    const formattedUsers = users.map((user, index) => ({
      rank: skip + index + 1,
      id: user.id,
      telegramId: user.telegramId,
      name: user.name || 'Anonymous',
      points: Math.floor(user.points),
      pointsBalance: Math.floor(user.pointsBalance),
      whitePearls: Math.floor(user.whitePearls),
      bluePearls: Math.floor(user.bluePearlsPending),
      goldishPearls: Math.floor(user.goldishPearls),
      region: user.region,
      isPremium: user.isPremium,
      isFrozen: user.isFrozen,
      isHidden: user.isHidden,
      createdAt: user.createdAt,
      referralPointsEarned: Math.floor(user.referralPointsEarned),
      mineLevelIndex: user.mineLevelIndex,
      dailyRewardStreakDay: user.dailyRewardStreakDay,
      activities: {
        tasks: user._count.completedTasks,
        referrals: user._count.referrals,
        dailyCiphers: user._count.dailyCipherAttempts,
        dailyCombos: user._count.dailyComboAttempts,
        cards: user._count.ownedCards,
        stakes: user._count.stakes,
        miniGames: user._count.miniGameAttempts,
      },
    }));

    // Get summary stats
    const stats = await prisma.user.aggregate({
      _count: true,
      _sum: { points: true },
    });

    const frozenCount = await prisma.user.count({ where: { isFrozen: true } });
    const hiddenCount = await prisma.user.count({ where: { isHidden: true } });

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
      summary: {
        totalUsers: stats._count,
        totalPoints: Math.floor(stats._sum.points || 0),
        frozenCount,
        hiddenCount,
      },
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// POST: Account management actions
export async function POST(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });
  try {
    const body = await req.json();
    const { action, userIds, allUsers } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // Handle "all users" actions
    if (allUsers) {
      switch (action) {
        case 'reset_all': {
          // Reset all users: run each step sequentially (no transaction) so it works without a MongoDB replica set.
          try {
            await prisma.userTask.deleteMany({});
            await prisma.userDailyCipherAttempt.deleteMany({});
            await prisma.userDailyComboAttempt.deleteMany({});
            await prisma.userCard.deleteMany({});
            await prisma.userMiniGameAttempt.deleteMany({});
            await prisma.stake.deleteMany({});
            await prisma.userWeeklyProgress.deleteMany({});
            await prisma.onchainTaskCompletion.deleteMany({});
            await prisma.user.updateMany({
              data: {
                points: 0,
                pointsBalance: 0,
                referralPointsEarned: 0,
                offlinePointsEarned: 0,
                dailyRewardStreakDay: 0,
                lastDailyRewardClaimedAt: null,
                multitapLevelIndex: 0,
                energyLimitLevelIndex: 0,
                mineLevelIndex: 0,
                energy: 100,
                energyRefillsLeft: 6,
              },
            });
          } catch (err) {
            console.error('Reset all error:', err);
            const msg = err instanceof Error ? err.message : 'Reset failed';
            return NextResponse.json(
              { error: 'Failed to reset all. ' + msg },
              { status: 500 }
            );
          }
          return NextResponse.json({ success: true, message: 'All users reset successfully' });
        }

        case 'freeze_all':
          await prisma.user.updateMany({
            data: { isFrozen: true },
          });
          return NextResponse.json({ success: true, message: 'All users frozen' });

        case 'unfreeze_all':
          await prisma.user.updateMany({
            data: { isFrozen: false },
          });
          return NextResponse.json({ success: true, message: 'All users unfrozen' });

        case 'hide_all':
          await prisma.user.updateMany({
            data: { isHidden: true },
          });
          return NextResponse.json({ success: true, message: 'All users hidden' });

        case 'unhide_all':
          await prisma.user.updateMany({
            data: { isHidden: false },
          });
          return NextResponse.json({ success: true, message: 'All users unhidden' });

        default:
          return NextResponse.json({ error: 'Invalid action for all users' }, { status: 400 });
      }
    }

    // Handle individual/multiple user actions
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Missing userIds' }, { status: 400 });
    }

    switch (action) {
      case 'reset': {
        // Reset selected users (sequential, no transaction - works without MongoDB replica set)
        const userObjIds = userIds as string[];
        try {
          await prisma.userTask.deleteMany({ where: { userId: { in: userObjIds } } });
          await prisma.userDailyCipherAttempt.deleteMany({ where: { userId: { in: userObjIds } } });
          await prisma.userDailyComboAttempt.deleteMany({ where: { userId: { in: userObjIds } } });
          await prisma.userCard.deleteMany({ where: { userId: { in: userObjIds } } });
          await prisma.userMiniGameAttempt.deleteMany({ where: { userId: { in: userObjIds } } });
          await prisma.stake.deleteMany({ where: { userId: { in: userObjIds } } });
          await prisma.userWeeklyProgress.deleteMany({ where: { userId: { in: userObjIds } } });
          await prisma.onchainTaskCompletion.deleteMany({ where: { userId: { in: userObjIds } } });
          await prisma.user.updateMany({
            where: { id: { in: userObjIds } },
            data: {
              points: 0,
              pointsBalance: 0,
              referralPointsEarned: 0,
              offlinePointsEarned: 0,
              dailyRewardStreakDay: 0,
              lastDailyRewardClaimedAt: null,
              multitapLevelIndex: 0,
              energyLimitLevelIndex: 0,
              mineLevelIndex: 0,
              energy: 100,
              energyRefillsLeft: 6,
            },
          });
        } catch (err) {
          console.error('Reset users error:', err);
          const msg = err instanceof Error ? err.message : 'Reset failed';
          return NextResponse.json({ error: 'Failed to reset. ' + msg }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) reset successfully` });
      }

      case 'freeze':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isFrozen: true },
        });
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) frozen` });

      case 'unfreeze':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isFrozen: false },
        });
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) unfrozen` });

      case 'hide':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isHidden: true },
        });
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) hidden` });

      case 'unhide':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isHidden: false },
        });
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) unhidden` });

      case 'delete': {
        const userObjIds = userIds as string[];
        try {
          await deleteUsersCascade(prisma, userObjIds);
        } catch (err) {
          console.error('Delete users error:', err);
          const msg = err instanceof Error ? err.message : 'Delete failed';
          return NextResponse.json({ error: 'Failed to delete. ' + msg }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: `${userIds.length} user(s) deleted permanently` });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing accounts:', error);
    return NextResponse.json({ error: 'Failed to manage accounts' }, { status: 500 });
  }
}
