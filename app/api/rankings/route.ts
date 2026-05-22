// app/api/rankings/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import {
  CANONICAL_DISTRICT_SLUGS,
  DISTRICT_FILTER_NONE,
  DISTRICT_FILTER_OTHER,
  getDistrictDisplayName,
  UGANDA_DISTRICTS,
} from '@/utils/uganda-districts';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Region code to country name mapping
const REGION_NAMES: Record<string, string> = {
  en: 'English',
  ru: 'Russia',
  uk: 'Ukraine',
  uz: 'Uzbekistan',
  tr: 'Turkey',
  de: 'Germany',
  fr: 'France',
  es: 'Spain',
  it: 'Italy',
  pt: 'Portugal',
  ar: 'Arabic',
  zh: 'China',
  ja: 'Japan',
  ko: 'Korea',
  id: 'Indonesia',
  hi: 'India',
  bn: 'Bangladesh',
  vi: 'Vietnam',
  th: 'Thailand',
  ms: 'Malaysia',
  pl: 'Poland',
  nl: 'Netherlands',
  fa: 'Iran',
  he: 'Israel',
  cs: 'Czech Republic',
  ro: 'Romania',
  hu: 'Hungary',
  el: 'Greece',
  sv: 'Sweden',
  da: 'Denmark',
  fi: 'Finland',
  no: 'Norway',
  be: 'Belarus',
  kk: 'Kazakhstan',
  az: 'Azerbaijan',
  ka: 'Georgia',
  hy: 'Armenia',
  sr: 'Serbia',
  hr: 'Croatia',
  bg: 'Bulgaria',
  sk: 'Slovakia',
  sl: 'Slovenia',
  lt: 'Lithuania',
  lv: 'Latvia',
  et: 'Estonia',
  tg: 'Tajikistan',
  ky: 'Kyrgyzstan',
  tk: 'Turkmenistan',
  mn: 'Mongolia',
  my: 'Myanmar',
  ne: 'Nepal',
  si: 'Sri Lanka',
  km: 'Cambodia',
  lo: 'Laos',
  fil: 'Philippines',
  am: 'Ethiopia',
  sw: 'Swahili',
  af: 'South Africa',
  zu: 'Zulu',
};

// Region groups (continents/areas) → list of region codes (countries) for "countries under region" view
const REGION_GROUPS: Record<string, string[]> = {
  Europe: ['de', 'fr', 'es', 'it', 'pt', 'pl', 'nl', 'uk', 'cs', 'ro', 'hu', 'el', 'sv', 'da', 'fi', 'no', 'be', 'sr', 'hr', 'bg', 'sk', 'sl', 'lt', 'lv', 'et', 'az', 'ka', 'hy'],
  Asia: ['ru', 'uz', 'zh', 'ja', 'ko', 'id', 'hi', 'bn', 'vi', 'th', 'ms', 'fa', 'he', 'kk', 'tg', 'ky', 'tk', 'mn', 'my', 'ne', 'si', 'km', 'lo', 'fil'],
  Africa: ['am', 'sw', 'af', 'zu'],
  'Middle East': ['ar', 'tr'],
  Other: ['en'],
};

function getRegionName(code: string | null): string {
  if (!code) return 'Unknown';
  const key = code.toLowerCase();
  if (key === 'unknown') return 'Unknown';
  return REGION_NAMES[key] || code.toUpperCase();
}

function getSearchParams(req: Request): URLSearchParams {
  try {
    const url = req.url;
    if (url.startsWith('http')) {
      return new URL(url).searchParams;
    }
    const idx = url.indexOf('?');
    return new URLSearchParams(idx >= 0 ? url.slice(idx) : '');
  } catch {
    return new URLSearchParams();
  }
}

export async function GET(req: Request) {
  try {
    const searchParams = getSearchParams(req);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const search = searchParams.get('search') || '';
    const regionFilter = searchParams.get('region') || '';
    const regionGroup = searchParams.get('regionGroup') || '';
    const districtFilter = (searchParams.get('district') || '').trim().toLowerCase();

    const skip = (page - 1) * limit;

    // Build where clause. Do NOT filter by isHidden so all users show (production MongoDB
    // may have users without the isHidden field, and { not: true } can exclude them).
    const andParts: Record<string, unknown>[] = [];

    if (search) {
      andParts.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { telegramId: { contains: search } },
        ],
      });
    }

    if (districtFilter) {
      if (districtFilter === DISTRICT_FILTER_NONE) {
        andParts.push({ OR: [{ district: null }, { district: '' }] });
      } else if (districtFilter === DISTRICT_FILTER_OTHER) {
        andParts.push({
          AND: [
            { district: { not: null } },
            { district: { not: '' } },
            { district: { notIn: [...CANONICAL_DISTRICT_SLUGS] } },
          ],
        });
      } else {
        andParts.push({ district: districtFilter });
      }
    } else if (regionGroup && REGION_GROUPS[regionGroup]) {
      andParts.push({ region: { in: REGION_GROUPS[regionGroup] } });
    } else if (regionFilter) {
      andParts.push({ region: regionFilter });
    }

    const whereClause: Record<string, unknown> =
      andParts.length === 0 ? {} : andParts.length === 1 ? andParts[0]! : { AND: andParts };

    // Get total count
    const totalUsers = await prisma.user.count({
      where: whereClause,
    });

    // Get users with their activity stats
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        telegramId: true,
        name: true,
        points: true,
        pointsBalance: true,
        region: true,
        district: true,
        isPremium: true,
        isFrozen: true,
        createdAt: true,
        referralPointsEarned: true,
        mineLevelIndex: true,
        multitapLevelIndex: true,
        energyLimitLevelIndex: true,
        totalDonatedPoints: true,
        _count: {
          select: {
            completedTasks: {
              where: { isCompleted: true },
            },
            referrals: true,
            dailyCipherAttempts: {
              where: { claimedAt: { not: null } },
            },
            dailyComboAttempts: {
              where: { claimedAt: { not: null } },
            },
            ownedCards: true,
            stakes: true,
          },
        },
      },
      orderBy: {
        points: 'desc',
      },
      skip,
      take: limit,
    });

    // Calculate ranks
    const rankedUsers = users.map((user, index) => ({
      rank: skip + index + 1,
      id: user.id,
      telegramId: user.telegramId,
      name: user.name || 'Anonymous',
      points: Math.floor(user.points),
      pointsBalance: Math.floor(user.pointsBalance),
      region: user.region,
      regionName: getRegionName(user.region),
      district: user.district,
      districtName: getDistrictDisplayName(user.district),
      isPremium: user.isPremium,
      isFrozen: user.isFrozen,
      createdAt: user.createdAt,
      referralPointsEarned: Math.floor(user.referralPointsEarned),
      totalDonatedPoints: Math.floor(user.totalDonatedPoints ?? 0),
      mineLevelIndex: user.mineLevelIndex,
      multitapLevelIndex: user.multitapLevelIndex,
      energyLimitLevelIndex: user.energyLimitLevelIndex,
      activitiesCompleted: {
        tasks: user._count.completedTasks,
        referrals: user._count.referrals,
        dailyCiphers: user._count.dailyCipherAttempts,
        dailyCombos: user._count.dailyComboAttempts,
        cardsCollected: user._count.ownedCards,
        stakesCreated: user._count.stakes,
      },
    }));

    // Get unique regions for filtering (all users, no isHidden filter)
    const regions = await prisma.user.groupBy({
      by: ['region'],
      _count: { region: true },
      orderBy: { _count: { region: 'desc' } },
    });

    const regionStats = regions.map(r => ({
      code: r.region || 'unknown',
      name: getRegionName(r.region),
      count: r._count.region,
    }));

    const regionGroupsList = Object.keys(REGION_GROUPS).map((name) => ({ id: name, name }));

    const canonicalSlugSet = new Set(CANONICAL_DISTRICT_SLUGS);
    const districtGroups = await prisma.user.groupBy({
      by: ['district'],
      _count: { district: true },
    });
    let districtNoAssignCount = 0;
    let districtOtherCount = 0;
    const districtCountBySlug = new Map<string, number>();
    for (const row of districtGroups) {
      const raw = row.district;
      const c = row._count.district;
      if (raw == null || raw === '') {
        districtNoAssignCount += c;
        continue;
      }
      const key = raw.trim().toLowerCase();
      if (canonicalSlugSet.has(key)) {
        districtCountBySlug.set(key, c);
      } else {
        districtOtherCount += c;
      }
    }

    const districtStats = [...UGANDA_DISTRICTS]
      .map((d) => ({
        slug: d.slug,
        name: d.name,
        count: districtCountBySlug.get(d.slug) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const response = NextResponse.json({
      users: rankedUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
      regions: regionStats,
      regionGroups: regionGroupsList,
      districts: districtStats,
      districtMeta: {
        noDistrict: districtNoAssignCount,
        otherDistrict: districtOtherCount,
      },
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return response;
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}
