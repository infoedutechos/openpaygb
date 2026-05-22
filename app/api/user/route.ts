// app/api/user/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/utils/prisma';
import { MAX_ENERGY_REFILLS_PER_DAY, energyUpgradeBaseBenefit, REFERRAL_BONUS_BASE, REFERRAL_BONUS_PREMIUM, LEVELS, LEAGUE_POINTS } from '@/utils/consts';
import { addActivityPoints } from '@/utils/league-points';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateEnergyLimit, calculateLevelIndex, calculateMinedPoints, calculateRestoredEnergy } from '@/utils/game-mechanics';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { isValidDistrictSlug } from '@/utils/uganda-districts';

const MAX_RETRIES = 3;

/** Optional `district` on POST body: canonical Uganda district slug, or empty string to clear. */
function districtUpdateFromBody(body: Record<string, unknown>): { district?: string | null } {
  if (!Object.prototype.hasOwnProperty.call(body, 'district')) return {};
  const raw = body.district;
  if (raw === null || raw === '') return { district: null };
  if (typeof raw !== 'string') return {};
  const s = raw.trim().toLowerCase();
  if (!s) return { district: null };
  if (!isValidDistrictSlug(s)) return {};
  return { district: s };
}
const RETRY_DELAY = 100; // milliseconds
const MAX_TX_ATTEMPTS = 3;

/** Retry on write conflicts, deadlocks, and transient MongoDB connection drops. */
function isTransientMongoError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    /write conflict|deadlock|Transaction failed due to a write conflict/i.test(msg) ||
    /TransientTransactionError|forcibly closed|connection.*closed|I\/O error|Server selection timeout|not primary|network timeout/i.test(
      msg
    )
  );
}

type UserWithReferrer = Prisma.UserGetPayload<{ include: { referredBy: true } }>;

export async function POST(req: Request) {
  console.log("SERVER USER CALL!!!");

  const body = await req.json();
  const { telegramInitData, referrerTelegramId } = body;

  console.log("Request body:", body);
  console.log("Telegram Init Data:", telegramInitData);
  console.log("Referrer Telegram ID:", referrerTelegramId);

  if (!telegramInitData) {
    return NextResponse.json({ error: 'Invalid request', message: 'Missing telegram init data' }, { status: 400 });
  }

  const { validatedData, user: telegramUser, message: validationMessage } = validateTelegramWebAppData(telegramInitData);

  console.log("Validated data", validatedData);
  console.log("User", telegramUser);
  console.log("Validation message", validationMessage);

  if (!validatedData) {
    return NextResponse.json(
      {
        error: 'Invalid Telegram data',
        message: validationMessage || 'Please open the game from the Telegram app.',
      },
      { status: 403 }
    );
  }

  console.log("User: ", telegramUser);

  const telegramId = telegramUser.id?.toString();

  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  const USER_TRANSACTION_TIMEOUT_MS = 15_000; // avoid timeout for new users (create + referrer update + league checks)

  try {
    let dbUserUpdated: UserWithReferrer | null = null;

    for (let txAttempt = 0; txAttempt < MAX_TX_ATTEMPTS; txAttempt++) {
      try {
        dbUserUpdated = await prisma.$transaction(async (tx) => {
          let dbUser = await tx.user.findUnique({
            where: { telegramId },
            include: { referredBy: true },
          });

          const currentTime = new Date();

          if (dbUser) {
            // Existing user logic
            let retries = 0;
            while (retries < MAX_RETRIES) {
              try {
                if (!dbUser) {
                  throw new Error('User data unexpectedly null');
                }
                const minedPoints = calculateMinedPoints(
                  dbUser.mineLevelIndex,
                  dbUser.lastPointsUpdateTimestamp.getTime(),
                  currentTime.getTime()
                );

                const newPoints = dbUser.points + minedPoints;
                const newLevelIndex = calculateLevelIndex(newPoints);
                const oldLevelIndex = calculateLevelIndex(dbUser.points);

                const lastEnergy = dbUser.energy;
                const restoredEnergy = calculateRestoredEnergy(dbUser.multitapLevelIndex, dbUser.lastEnergyUpdateTimestamp.getTime(), currentTime.getTime());
                const maxEnergyLimit = calculateEnergyLimit(dbUser.energyLimitLevelIndex);

                const lastRefillDate = new Date(dbUser.lastEnergyRefillsTimestamp);
                const isNewDay = currentTime.getUTCDate() !== lastRefillDate.getUTCDate() ||
                  currentTime.getUTCMonth() !== lastRefillDate.getUTCMonth() ||
                  currentTime.getUTCFullYear() !== lastRefillDate.getUTCFullYear();

                const isPremium = telegramUser?.is_premium || false;

                // Calculate additional referral points if user leveled up
                let additionalReferralPoints = 0;
                if (newLevelIndex > oldLevelIndex) {
                  for (let i = oldLevelIndex + 1; i <= newLevelIndex; i++) {
                    additionalReferralPoints += isPremium ? LEVELS[i].friendBonusPremium : LEVELS[i].friendBonus;
                  }
                }

                dbUser = await tx.user.update({
                  where: {
                    telegramId,
                    lastPointsUpdateTimestamp: dbUser.lastPointsUpdateTimestamp, // Optimistic lock
                  },
                  data: {
                    name: telegramUser?.first_name || "",
                    isPremium: isPremium,
                    points: newPoints,
                    pointsBalance: { increment: minedPoints },
                    whitePearls: { increment: minedPoints },
                    offlinePointsEarned: minedPoints,
                    lastPointsUpdateTimestamp: currentTime,
                    energy: Math.min(lastEnergy + restoredEnergy, maxEnergyLimit),
                    energyRefillsLeft: isNewDay ? MAX_ENERGY_REFILLS_PER_DAY : dbUser.energyRefillsLeft,
                    lastEnergyUpdateTimestamp: currentTime,
                    lastEnergyRefillsTimestamp: isNewDay ? currentTime : dbUser.lastEnergyRefillsTimestamp,
                    region: dbUser.region || telegramUser?.language_code || null,
                    ...districtUpdateFromBody(body as Record<string, unknown>),
                    // Ensure totalTaps exists for docs created before we added the field (persist across deployments)
                    ...(typeof dbUser.totalTaps !== 'number' && { totalTaps: 0 }),
                  },
                  include: { referredBy: true },
                });

                // Credit referrer when referred user levels up (points, balance, and referral bonus tracking)
                if (additionalReferralPoints > 0 && dbUser.referredBy) {
                  await tx.user.update({
                    where: { id: dbUser.referredBy.id },
                    data: {
                      points: { increment: additionalReferralPoints },
                      pointsBalance: { increment: additionalReferralPoints },
                      whitePearls: { increment: additionalReferralPoints },
                      referralPointsEarned: { increment: additionalReferralPoints },
                    },
                  });
                }

                break; // Exit the retry loop if successful
              } catch (error) {
                if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
                  // Optimistic locking failed, retry
                  retries++;
                  if (retries >= MAX_RETRIES) {
                    throw new Error('Max retries reached for optimistic locking');
                  }
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff

                  // Refresh user data before retrying
                  dbUser = await tx.user.findUnique({
                    where: { telegramId },
                    include: { referredBy: true },
                  });
                } else {
                  throw error;
                }
              }
            }
          } else {
            // New user creation — only link referrer if it's a valid different user (invitee gets own account)
            let referredByUser = null;
            const referrerId = typeof referrerTelegramId === 'string' ? referrerTelegramId.trim() : '';
            if (referrerId && /^\d+$/.test(referrerId) && referrerId !== telegramId) {
              referredByUser = await tx.user.findUnique({
                where: { telegramId: referrerId },
              });
            }

            const isPremium = telegramUser?.is_premium || false;
            // Referred users start with 0 points; only the referrer gets the sign-up bonus
            const referrerSignUpBonus = referredByUser ? (isPremium ? REFERRAL_BONUS_PREMIUM : REFERRAL_BONUS_BASE) : 0;

            dbUser = await tx.user.create({
              data: {
                telegramId,
                name: telegramUser?.first_name || "",
                isPremium,
                points: 0,
                pointsBalance: 0,
                totalTaps: 0,
                offlinePointsEarned: 0,
                referralPointsEarned: 0,
                multitapLevelIndex: 0,
                energy: energyUpgradeBaseBenefit,
                energyRefillsLeft: MAX_ENERGY_REFILLS_PER_DAY,
                energyLimitLevelIndex: 0,
                mineLevelIndex: 0,
                lastPointsUpdateTimestamp: currentTime,
                lastEnergyUpdateTimestamp: currentTime,
                lastEnergyRefillsTimestamp: currentTime,
                region: telegramUser?.language_code || null,
                ...districtUpdateFromBody(body as Record<string, unknown>),
                referredBy: referredByUser ? { connect: { id: referredByUser.id } } : undefined,
              },
              include: { referredBy: true },
            });

            if (referredByUser) {
              // Reward the referrer (sign-up bonus + record in referral bonus); level-up bonuses applied when referred user levels up
              await tx.user.update({
                where: { id: referredByUser.id },
                data: {
                  points: { increment: referrerSignUpBonus },
                  pointsBalance: { increment: referrerSignUpBonus },
                  whitePearls: { increment: referrerSignUpBonus },
                  referralPointsEarned: { increment: referrerSignUpBonus },
                  referrals: { connect: { id: dbUser.id } },
                },
              });
              // Do not call addActivityPoints inside transaction — it does userLeagueWeek/userTeamWeek upserts and can exceed 5s
            }
          }

          return dbUser;
        }, { timeout: USER_TRANSACTION_TIMEOUT_MS });
        break;
      } catch (error) {
        const p2002 = error instanceof PrismaClientKnownRequestError && error.code === 'P2002';
        const transient = isTransientMongoError(error);
        const retryable = p2002 || transient;
        if (retryable && txAttempt < MAX_TX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY * Math.pow(2, txAttempt)));
          continue;
        }
        if (p2002) {
          dbUserUpdated = await prisma.user.findUnique({
            where: { telegramId },
            include: { referredBy: true },
          });
          if (dbUserUpdated) break;
        }
        throw error;
      }
    }

    if (!dbUserUpdated) {
      dbUserUpdated = await prisma.user.findUnique({
        where: { telegramId },
        include: { referredBy: true },
      });
    }

    if (!dbUserUpdated) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    // Award referrer league/team points outside the transaction (avoids transaction timeout for new users)
    if (dbUserUpdated.referredBy) {
      addActivityPoints(prisma, dbUserUpdated.referredBy.id, LEAGUE_POINTS.referral).catch((err) =>
        console.error('Referrer activity points (league/team) failed:', err)
      );
    }

    // Always return totalTaps as a number (old DB docs may lack field so persist across deployments)
    const payload = { ...dbUserUpdated, totalTaps: dbUserUpdated.totalTaps ?? 0 };
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        console.log('User already exists:', error);
        return NextResponse.json({ error: 'User already exists', message: 'User already exists' }, { status: 409 });
      }
    }
    console.error('Error fetching/creating user:', error);
    const rawMsg = error instanceof Error ? error.message : 'Database or server error';
    const isBusy =
      isTransientMongoError(error) ||
      /transaction.*timeout|Transaction already closed|expired transaction/i.test(rawMsg);
    const message = isBusy
      ? 'The server is busy. Please try again in a moment.'
      : rawMsg;
    return NextResponse.json(
      { error: 'Failed to fetch/create user', message },
      { status: 500 }
    );
  }
}
