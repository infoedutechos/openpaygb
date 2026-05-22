// Guild hub: national pearl leaders, referral champions, area (region) boards, optional "me" summary

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getRegionDisplayName } from '@/utils/ranking-regions';

export const dynamic = 'force-dynamic';

const NATIONAL_LIMIT = 15;
const REFERRAL_LIMIT = 12;
const AREA_LIMIT = 8;
const PER_AREA_TOP = 5;

function mapLeader(
  u: {
    id: string;
    name: string | null;
    telegramId: string;
    points: number;
    region: string | null;
    _count?: { referrals: number };
  },
  rank: number,
) {
  return {
    rank,
    id: u.id,
    name: u.name || 'Anonymous',
    telegramId: u.telegramId,
    points: Math.floor(u.points),
    region: u.region,
    regionLabel: getRegionDisplayName(u.region),
    referrals: u._count?.referrals ?? undefined,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const initData = url.searchParams.get('initData') || '';

    const [nationalRaw, referrersPool, regionBuckets] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          telegramId: true,
          points: true,
          region: true,
        },
        orderBy: { points: 'desc' },
        take: NATIONAL_LIMIT,
      }),
      prisma.user.findMany({
        where: { referrals: { some: {} } },
        select: {
          id: true,
          name: true,
          telegramId: true,
          points: true,
          region: true,
          _count: { select: { referrals: true } },
        },
      }),
      prisma.user.groupBy({
        by: ['region'],
        _count: { _all: true },
      }),
    ]);

    const nationalLeaders = nationalRaw.map((u, i) => mapLeader(u, i + 1));

    const referralChampions = [...referrersPool]
      .sort((a, b) => b._count.referrals - a._count.referrals)
      .slice(0, REFERRAL_LIMIT)
      .map((u, i) => mapLeader(u, i + 1));

    const sortedBuckets = [...regionBuckets].sort((a, b) => b._count._all - a._count._all).slice(0, AREA_LIMIT);

    const areaBoards: Array<{
      regionCode: string;
      regionLabel: string;
      memberCount: number;
      leaders: ReturnType<typeof mapLeader>[];
    }> = [];

    for (const bucket of sortedBuckets) {
      const code = bucket.region ?? 'unknown';
      const leaders = await prisma.user.findMany({
        where: { region: bucket.region },
        select: {
          id: true,
          name: true,
          telegramId: true,
          points: true,
          region: true,
          _count: { select: { referrals: true } },
        },
        orderBy: { points: 'desc' },
        take: PER_AREA_TOP,
      });
      areaBoards.push({
        regionCode: code,
        regionLabel: getRegionDisplayName(bucket.region),
        memberCount: bucket._count._all,
        leaders: leaders.map((u, i) => mapLeader(u, i + 1)),
      });
    }

    let me: {
      globalRank: number;
      totalPlayers: number;
      referralCount: number;
      referralPearlsEarned: number;
      points: number;
      region: string | null;
      regionLabel: string;
      areaRank: number | null;
    } | null = null;

    if (initData) {
      const { validatedData, user } = validateTelegramWebAppData(initData);
      if (validatedData) {
        const telegramId = user.id?.toString();
        if (telegramId) {
          const dbUser = await prisma.user.findUnique({
            where: { telegramId },
            select: {
              id: true,
              points: true,
              region: true,
              referralPointsEarned: true,
            },
          });
          if (dbUser) {
            const [totalPlayers, aboveGlobal, referralCount, areaRankExtra] = await Promise.all([
              prisma.user.count(),
              prisma.user.count({ where: { points: { gt: dbUser.points } } }),
              prisma.user.count({ where: { referredById: dbUser.id } }),
              dbUser.region != null
                ? prisma.user.count({
                    where: {
                      region: dbUser.region,
                      points: { gt: dbUser.points },
                    },
                  })
                : Promise.resolve(0),
            ]);
            me = {
              globalRank: aboveGlobal + 1,
              totalPlayers,
              referralCount,
              referralPearlsEarned: Math.floor(dbUser.referralPointsEarned),
              points: Math.floor(dbUser.points),
              region: dbUser.region,
              regionLabel: getRegionDisplayName(dbUser.region),
              areaRank: dbUser.region != null ? areaRankExtra + 1 : null,
            };
          }
        }
      }
    }

    return NextResponse.json({
      nationalLeaders,
      referralChampions,
      areaBoards,
      me,
    });
  } catch (e) {
    console.error('[guild/overview]', e);
    return NextResponse.json({ error: 'Failed to load guild' }, { status: 500 });
  }
}
