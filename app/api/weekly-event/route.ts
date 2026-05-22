// app/api/weekly-event/route.ts

/**
 * Weekly Event - Mon-Sun, multi-tier objectives, leaderboard
 * GET: event config, user progress, leaderboard
 * POST: claim tier
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { getWeekKey, getWeekStartEnd } from '@/utils/week-utils';
import { WEEKLY_EVENT_DEFAULT_TIERS } from '@/utils/consts';
import { creditWhitePearlsInstant } from '@/utils/pearls';

interface TierConfig {
  taps: number;
  tasks: number;
  reward: number;
  referrals?: number; // new referrals this week only; required to unlock tier
}

/** Count referrals that joined this week (referred by userId). Does not count existing referrals. */
async function getReferralsThisWeek(userId: string, weekKey: string): Promise<number> {
  const { start, end } = getWeekStartEnd(weekKey);
  return prisma.user.count({
    where: {
      referredById: userId,
      createdAt: { gte: start, lt: end },
    },
  });
}

/** Ensure every tier has referrals: tier 1 = 1 ref, tier 2 = 2 refs, … tier 16 = 16 refs. Always enforced so overrides cannot show different values. */
function normalizeTiers(tiers: TierConfig[]): TierConfig[] {
  const out = tiers.map((t, i) => ({
    ...t,
    referrals: i === 0 ? 1 : Math.min(i + 1, 16),
  }));
  // Tier 1 reward is always 100k (fix old overrides that had 50k)
  if (out.length > 0 && out[0].reward === 50_000) {
    out[0] = { ...out[0], reward: 100_000 };
  }
  return out;
}

async function getTiersForWeek(weekKey: string): Promise<TierConfig[]> {
  const override = await prisma.weeklyEventOverride.findUnique({
    where: { weekKey },
  });
  if (override?.tiers && Array.isArray(override.tiers)) {
    return normalizeTiers(override.tiers as unknown as TierConfig[]);
  }
  return normalizeTiers([...WEEKLY_EVENT_DEFAULT_TIERS]);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  const weekKey = getWeekKey();
  const tiers = await getTiersForWeek(weekKey);

  // Leaderboard: top 20 this week. totalParticipants: all players (same scale as global rankings)
  const leaderboard = await prisma.userWeeklyProgress.findMany({
    where: { weekKey },
    include: { user: { select: { name: true, telegramId: true } } },
    orderBy: [{ taps: 'desc' }, { pointsEarned: 'desc' }],
    take: 20,
  });
  const totalParticipants = await prisma.user.count();

  const basePayload = {
    weekKey,
    tiers,
    leaderboard: leaderboard.map((e, i) => ({
      rank: i + 1,
      name: e.user.name || `User ${e.user.telegramId.slice(-4)}`,
      taps: e.taps,
      tasksCompleted: e.tasksCompleted,
      pointsEarned: e.pointsEarned,
    })),
    totalParticipants,
  };

  // Without valid initData: return public data only (leaderboard works like total taps / global rankings)
  if (!initData) {
    return NextResponse.json({
      ...basePayload,
      progress: null,
      myRank: null,
    });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({
      ...basePayload,
      progress: null,
      myRank: null,
    });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ ...basePayload, progress: null, myRank: null });
  }

  const dbUser = await prisma.user.findUnique({
    where: { telegramId },
    include: { weeklyProgress: true },
  });

  if (!dbUser) {
    return NextResponse.json({ ...basePayload, progress: null, myRank: null });
  }

  let progress = dbUser.weeklyProgress.find((p) => p.weekKey === weekKey);
  if (!progress) {
    progress = await prisma.userWeeklyProgress.create({
      data: { userId: dbUser.id, weekKey },
    });
  }

  const referralsThisWeek = await getReferralsThisWeek(dbUser.id, weekKey);

  // Full rank for current user: count participants ahead (by taps, then pointsEarned)
  const aheadByTaps = await prisma.userWeeklyProgress.count({
    where: { weekKey, taps: { gt: progress.taps } },
  });
  const aheadByPoints = await prisma.userWeeklyProgress.count({
    where: { weekKey, taps: progress.taps, pointsEarned: { gt: progress.pointsEarned } },
  });
  const myRank = aheadByTaps + aheadByPoints + 1;

  const claimedTiers = [
    progress.claimedTier1,
    progress.claimedTier2,
    progress.claimedTier3,
    progress.claimedTier4,
    progress.claimedTier5,
    progress.claimedTier6,
    progress.claimedTier7,
    progress.claimedTier8,
    progress.claimedTier9,
    progress.claimedTier10,
    progress.claimedTier11,
    progress.claimedTier12,
    progress.claimedTier13,
    progress.claimedTier14,
    progress.claimedTier15,
    progress.claimedTier16,
  ];

  return NextResponse.json({
    ...basePayload,
    progress: {
      taps: progress.taps,
      tasksCompleted: progress.tasksCompleted,
      pointsEarned: progress.pointsEarned,
      referralsThisWeek,
      claimedTiers,
    },
    myRank,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, action, tier } = body;

  if (!initData || action !== 'claim' || typeof tier !== 'number') {
    return NextResponse.json({ error: 'Missing initData, action, or tier' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const weekKey = getWeekKey();
  const tiers = await getTiersForWeek(weekKey);
  const tierIndex = tier - 1; // 1-based
  if (tierIndex < 0 || tierIndex >= tiers.length) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const t = tiers[tierIndex];

  let progress = await prisma.userWeeklyProgress.findUnique({
    where: { userId_weekKey: { userId: dbUser.id, weekKey } },
  });

  if (!progress) {
    progress = await prisma.userWeeklyProgress.create({
      data: { userId: dbUser.id, weekKey },
    });
  }

  const claimedFlags = [
    progress.claimedTier1, progress.claimedTier2, progress.claimedTier3, progress.claimedTier4,
    progress.claimedTier5, progress.claimedTier6, progress.claimedTier7, progress.claimedTier8,
    progress.claimedTier9, progress.claimedTier10, progress.claimedTier11, progress.claimedTier12,
    progress.claimedTier13, progress.claimedTier14, progress.claimedTier15, progress.claimedTier16,
  ];
  if (claimedFlags[tierIndex]) {
    return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
  }

  const meetsTaps = progress.taps >= t.taps;
  const meetsTasks = progress.tasksCompleted >= t.tasks;
  const requiredReferrals = t.referrals ?? 0;
  const referralsThisWeek = await getReferralsThisWeek(dbUser.id, weekKey);
  const meetsReferrals = requiredReferrals <= 0 || referralsThisWeek >= requiredReferrals;

  if (!meetsTaps || !meetsTasks || !meetsReferrals) {
    const parts = [];
    if (!meetsTaps) parts.push(`${t.taps} taps (you have ${progress.taps})`);
    if (!meetsTasks) parts.push(`${t.tasks} tasks (you have ${progress.tasksCompleted})`);
    if (!meetsReferrals) parts.push(`${requiredReferrals} new referrals this week (you have ${referralsThisWeek})`);
    return NextResponse.json({
      error: `Need: ${parts.join('; ')}.`,
    }, { status: 400 });
  }

  const tierFieldNames = ['claimedTier1', 'claimedTier2', 'claimedTier3', 'claimedTier4', 'claimedTier5', 'claimedTier6', 'claimedTier7', 'claimedTier8', 'claimedTier9', 'claimedTier10', 'claimedTier11', 'claimedTier12', 'claimedTier13', 'claimedTier14', 'claimedTier15', 'claimedTier16'] as const;
  const updateField = { [tierFieldNames[tierIndex]]: true };

  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: dbUser.id },
      data: {
        points: { increment: t.reward },
        pointsBalance: { increment: t.reward },
      },
    });
    await creditWhitePearlsInstant(
      tx,
      dbUser.id,
      t.reward,
      `weekly_event_tier_${tierIndex + 1}`,
      `Weekly event · Tier ${tierIndex + 1}`
    );
    await tx.userWeeklyProgress.update({
      where: { id: progress.id },
      data: updateField,
    });
    return u;
  });

  return NextResponse.json({
    success: true,
    reward: t.reward,
    pointsBalance: updatedUser.pointsBalance,
    points: updatedUser.points,
  });
}
