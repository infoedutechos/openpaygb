import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateLevelIndex } from '@/utils/game-mechanics';
import { LEVELS } from '@/utils/consts';
import { getDistrictDisplayName } from '@/utils/uganda-districts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const initData = url.searchParams.get('initData');

  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        name: true,
        points: true,
        pointsBalance: true,
        totalTaps: true,
        region: true,
        district: true,
        totalDonatedPoints: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const levelIndex = calculateLevelIndex(dbUser.points, dbUser.totalTaps ?? 0);
    const level = LEVELS[levelIndex];
    const nextLevel = levelIndex < LEVELS.length - 1 ? LEVELS[levelIndex + 1] : null;
    const pointsLeft = nextLevel ? Math.max(0, nextLevel.minPoints - dbUser.points) : 0;
    const tapsLeft = nextLevel ? Math.max(0, (nextLevel.minTaps ?? 0) - (dbUser.totalTaps ?? 0)) : 0;

    // Global rank: count users with more points, then rank = count + 1
    const usersAbove = await prisma.user.count({
      where: { points: { gt: dbUser.points } },
    });
    const totalPlayers = await prisma.user.count({});
    const rank = usersAbove + 1;

    return NextResponse.json({
      name: dbUser.name,
      rank,
      totalPlayers,
      points: dbUser.points,
      pointsBalance: dbUser.pointsBalance,
      totalTaps: dbUser.totalTaps ?? 0,
      region: dbUser.region,
      district: dbUser.district,
      districtName: getDistrictDisplayName(dbUser.district),
      totalDonatedPoints: Math.floor(dbUser.totalDonatedPoints ?? 0),
      gameLevelIndex: levelIndex,
      levelName: level.name,
      nextLevelName: nextLevel?.name ?? null,
      pointsLeft,
      tapsLeft,
      levels: LEVELS.map((l, i) => ({
        index: i + 1,
        name: l.name,
        minPoints: l.minPoints,
        minTaps: l.minTaps ?? 0,
      })),
    });
  } catch (e) {
    console.error('rankings/me:', e);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
