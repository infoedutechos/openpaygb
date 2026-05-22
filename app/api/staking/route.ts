// app/api/staking/route.ts

/**
 * Staking - lock points for duration, get bonus on unlock
 * GET: list user's stakes
 * POST: stake (create) or claim
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { STAKING_DURATIONS } from '@/utils/consts';

/** Max bonus from config - ignore any stored value above this (legacy bug guard). */
const MAX_BONUS_PERCENT = 25;

/** When true, new stakes are rejected (claim-only mode). */
const STAKING_NEW_STAKES_DISABLED = false;

/** Use canonical config so payouts are always correct (ignores any wrong stored bonusPercent). Falls back to stored if duration unknown, clamped to 0–25%. */
function getBonusPercentForDuration(durationId: string, fallbackStored?: number): number {
  const config = STAKING_DURATIONS.find((d) => d.id === durationId);
  if (config) return config.bonusPercent;
  if (fallbackStored == null || fallbackStored < 0 || fallbackStored > MAX_BONUS_PERCENT) return 0;
  return fallbackStored;
}

function computeStakeReturn(amountLocked: number, bonusPercent: number): { bonusAmount: number; totalReturn: number } {
  const bonusAmount = Math.floor((amountLocked * bonusPercent) / 100);
  return { bonusAmount, totalReturn: amountLocked + bonusAmount };
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

  const dbUser = await prisma.user.findUnique({
    where: { telegramId },
    include: { stakes: { orderBy: { lockedAt: 'desc' } } },
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const stakes = dbUser.stakes.map((s) => {
    const bonusPercent = getBonusPercentForDuration(s.duration, s.bonusPercent);
    const { bonusAmount, totalReturn } = computeStakeReturn(s.amountLocked, bonusPercent);
    return {
      id: s.id,
      amountLocked: s.amountLocked,
      bonusPercent,
      duration: s.duration,
      lockedAt: s.lockedAt.toISOString(),
      unlocksAt: s.unlocksAt.toISOString(),
      claimedAt: s.claimedAt?.toISOString() ?? null,
      bonusAmount,
      totalReturn,
    };
  });

  return NextResponse.json({ stakes, pointsBalance: dbUser.pointsBalance });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, action, amount, duration, stakeId } = body;

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

  const dbUser = await prisma.user.findUnique({ where: { telegramId } });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (action === 'claim') {
    const rawStakeId = typeof stakeId === 'string' ? stakeId.trim() : '';
    if (!rawStakeId) {
      return NextResponse.json({ error: 'Missing or invalid stakeId' }, { status: 400 });
    }

    const stake = await prisma.stake.findFirst({
      where: { id: rawStakeId, userId: dbUser.id },
    });

    if (!stake) {
      return NextResponse.json({ error: 'Stake not found' }, { status: 404 });
    }

    // Treat null/undefined as not claimed; any set value (e.g. Date) as claimed
    if (stake.claimedAt != null) {
      return NextResponse.json({
        error: 'Already claimed',
        message: 'This stake was already claimed. If you did not receive your PEARLS, please contact support.',
      }, { status: 400 });
    }

    if (stake.unlocksAt > new Date()) {
      return NextResponse.json({ error: 'Stake not yet unlocked' }, { status: 400 });
    }

    const rawLocked = Number(stake.amountLocked);
    const principal = Number.isFinite(rawLocked) && rawLocked > 0 ? Math.floor(rawLocked) : 0;
    if (principal <= 0) {
      return NextResponse.json({ error: 'Invalid stake amount' }, { status: 400 });
    }

    const bonusPercent = getBonusPercentForDuration(stake.duration, stake.bonusPercent);
    const { bonusAmount, totalReturn } = computeStakeReturn(principal, bonusPercent);
    // Balance gets principal + bonus; Total PEARLS (points) gets only the profit (bonus)
    const amountToBalance = totalReturn;
    const amountToTotalAlm = bonusAmount;

    // Atomic update: match both claimedAt: null AND claimedAt missing (MongoDB). Prisma's updateMany with claimedAt: null
    // can match 0 rows when the field was never set (missing), so we use a raw update with $or.
    const updateResult = await prisma.$runCommandRaw({
      update: 'Stake',
      updates: [
        {
          q: {
            _id: { $oid: stake.id },
            userId: { $oid: dbUser.id },
            $or: [{ claimedAt: null }, { claimedAt: { $exists: false } }],
          },
          u: { $set: { claimedAt: { $date: new Date().toISOString() } } },
        },
      ],
      ordered: true,
    }) as { n?: number; nModified?: number; ok?: number };

    const modified = updateResult?.nModified ?? updateResult?.n ?? 0;
    if (modified !== 1) {
      const current = await prisma.stake.findFirst({
        where: { id: stake.id, userId: dbUser.id },
        select: { claimedAt: true },
      });
      if (current?.claimedAt != null) {
        return NextResponse.json({
          error: 'Already claimed',
          message: 'This stake was already claimed. If you did not receive your PEARLS, contact support or ask admin to reset the claim.',
        }, { status: 400 });
      }
      console.error('[staking/claim] raw update matched 0 rows', { stakeId: stake.id, userId: dbUser.id, updateResult });
      return NextResponse.json({ error: 'Claim failed. Please try again or contact support.' }, { status: 500 });
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: dbUser.id },
        data: {
          points: { increment: amountToTotalAlm },
          pointsBalance: { increment: amountToBalance },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      reward: amountToBalance,
      pointsBalance: updatedUser.pointsBalance,
      points: updatedUser.points,
    });
  }

  if (action === 'stake') {
    if (STAKING_NEW_STAKES_DISABLED) {
      return NextResponse.json(
        { error: 'Staking is temporarily unavailable. You can only claim existing staked PEARLS.' },
        { status: 503 }
      );
    }
    const amt = Number(amount);
    const dur = String(duration ?? '24h');

    const config = STAKING_DURATIONS.find((d) => d.id === dur);
    if (!config) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    const minAmount = (config as { minAmount?: number }).minAmount ?? 1_000;
    if (!Number.isFinite(amt) || amt < minAmount) {
      return NextResponse.json({ error: `Minimum for ${config.label} is ${minAmount.toLocaleString()} PEARLS` }, { status: 400 });
    }

    const amountToLock = Math.floor(amt);

    if (dbUser.pointsBalance < amountToLock) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const unlocksAt = new Date(Date.now() + config.hours * 60 * 60 * 1000);

    const [updatedUser, stake] = await prisma.$transaction([
      prisma.user.update({
        where: { id: dbUser.id },
        data: { pointsBalance: { decrement: amountToLock } },
      }),
      prisma.stake.create({
        data: {
          userId: dbUser.id,
          amountLocked: amountToLock,
          bonusPercent: config.bonusPercent,
          duration: config.id,
          unlocksAt,
        },
      }),
    ]);

    const bonusAmount = Math.floor((amountToLock * config.bonusPercent) / 100);

    return NextResponse.json({
      success: true,
      stake: {
        id: stake.id,
        amountLocked: stake.amountLocked,
        bonusPercent: stake.bonusPercent,
        duration: stake.duration,
        unlocksAt: stake.unlocksAt.toISOString(),
        bonusAmount,
        totalReturn: amountToLock + bonusAmount,
      },
      pointsBalance: updatedUser.pointsBalance,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
