// app/api/daily-reward/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { DAILY_REWARDS, LEAGUE_POINTS } from '@/utils/consts';
import { addActivityPoints } from '@/utils/league-points';
import { creditWhitePearlsInstant } from '@/utils/pearls';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

function getStartOfDayUTC(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return x;
}

function isSameDayUTC(a: Date, b: Date): boolean {
  return (
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCFullYear() === b.getUTCFullYear()
  );
}

function isYesterdayUTC(claimDate: Date, now: Date): boolean {
  const startToday = getStartOfDayUTC(now);
  const startClaim = getStartOfDayUTC(claimDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  return startToday.getTime() - startClaim.getTime() === msPerDay;
}

async function getDailyRewardStatus(telegramId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: {
      lastDailyRewardClaimedAt: true,
      dailyRewardStreakDay: true,
    },
  });

  if (!user) {
    return null;
  }

  const now = new Date();
  const lastClaim = user.lastDailyRewardClaimedAt;
  const streakDay = user.dailyRewardStreakDay; // 0-9: next reward index to claim

  const claimedToday = lastClaim ? isSameDayUTC(lastClaim, now) : false;
  let canClaimToday = false;
  if (!lastClaim) {
    canClaimToday = true; // first claim
  } else if (claimedToday) {
    canClaimToday = false;
  } else if (isYesterdayUTC(lastClaim, now)) {
    canClaimToday = true; // consecutive day
  } else {
    canClaimToday = true; // missed day(s), can claim day 0 again
  }

  return {
    canClaimToday,
    claimedToday,
    currentStreakDay: streakDay,
    lastDailyRewardClaimedAt: lastClaim?.toISOString() ?? null,
    rewards: DAILY_REWARDS,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initData = searchParams.get('initData');

  if (!initData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(initData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  const status = await getDailyRewardStatus(telegramId);
  if (!status) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(status);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const telegramInitData = body.initData;

  if (!telegramInitData) {
    return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const dbUser = await tx.user.findUnique({
          where: { telegramId },
        });

        if (!dbUser) {
          throw new Error('User not found');
        }

        const now = new Date();
        const lastClaim = dbUser.lastDailyRewardClaimedAt;
        const streakDay = dbUser.dailyRewardStreakDay;

        let rewardIndex: number;
        let nextStreakDay: number;

        if (!lastClaim) {
          rewardIndex = 0;
          nextStreakDay = 1;
        } else if (isSameDayUTC(lastClaim, now)) {
          throw new Error('Already claimed today');
        } else if (isYesterdayUTC(lastClaim, now)) {
          rewardIndex = streakDay;
          nextStreakDay = (streakDay + 1) % DAILY_REWARDS.length;
        } else {
          rewardIndex = 0;
          nextStreakDay = 1;
        }

        const pointsToAdd = DAILY_REWARDS[rewardIndex];

        const updated = await tx.user.update({
          where: { telegramId },
          data: {
            points: { increment: pointsToAdd },
            pointsBalance: { increment: pointsToAdd },
            lastDailyRewardClaimedAt: now,
            dailyRewardStreakDay: nextStreakDay,
          },
        });

        await creditWhitePearlsInstant(tx, dbUser.id, pointsToAdd, 'daily_login', 'Karibu Daily');

        return {
          points: updated.points,
          pointsBalance: updated.pointsBalance,
          claimedReward: pointsToAdd,
          rewardIndex,
          nextStreakDay,
          lastDailyRewardClaimedAt: updated.lastDailyRewardClaimedAt?.toISOString() ?? null,
        };
      });

      const dbUser = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
      if (dbUser) await addActivityPoints(prisma, dbUser.id, LEAGUE_POINTS.dailyLogin);

      const status = await getDailyRewardStatus(telegramId);
      return NextResponse.json({
        success: true,
        ...result,
        status,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claim failed';
      if (message === 'Already claimed today') {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2034') {
        retries++;
        if (retries >= MAX_RETRIES) {
          return NextResponse.json({ error: 'Too many retries' }, { status: 500 });
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAY * Math.pow(2, retries)));
      } else {
        console.error('Daily reward claim error:', err);
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ error: 'Claim failed' }, { status: 500 });
}
