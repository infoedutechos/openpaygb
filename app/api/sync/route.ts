// app/api/sync/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { calculateRestoredEnergy, calculatePointsPerClick, calculateEnergyLimit, calculateMinedPoints } from '@/utils/game-mechanics';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { trackWeeklySync } from '@/utils/weekly-event-tracker';

import { apiErrorResponse } from "@/lib/api-error";
interface SyncRequestBody {
  initData: string;
  unsynchronizedPoints: number;
  currentEnergy: number;
  syncTimestamp: number;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // milliseconds

export async function POST(req: Request) {
  const scope: { telegramId?: string } = {};
  try {
    const requestBody: SyncRequestBody = await req.json();
    const { initData: telegramInitData, unsynchronizedPoints, currentEnergy, syncTimestamp } = requestBody;

    console.log("Received data:", { telegramInitData, unsynchronizedPoints, currentEnergy, syncTimestamp });

    if (!telegramInitData) {
      return NextResponse.json({ error: 'Invalid request: missing telegramInitData' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    scope.telegramId = user.id?.toString();

    if (!scope.telegramId) {
      return NextResponse.json({ error: 'Invalid user data: missing telegramId' }, { status: 400 });
    }

    const dbUserCheck = await prisma.user.findUnique({
      where: { telegramId: scope.telegramId },
      select: { isFrozen: true, suspensionReason: true },
    });
    if (dbUserCheck?.isFrozen) {
      return NextResponse.json(
        { error: 'Account suspended', suspended: true, suspensionReason: dbUserCheck.suspensionReason || null },
        { status: 403 }
      );
    }

    if (typeof unsynchronizedPoints !== 'number' || typeof currentEnergy !== 'number' ||
      unsynchronizedPoints < 0 || currentEnergy < 0) {
      console.error('Invalid input data:', { unsynchronizedPoints, currentEnergy });
      throw new ValidationError(`Invalid input data: unsynchronizedPoints=${unsynchronizedPoints}, currentEnergy=${currentEnergy}`);
    }

    const MAX_TIME_DEVIATION = 60 * 1000; // 1 minute
    if (typeof syncTimestamp !== 'number' || syncTimestamp > (Date.now() + MAX_TIME_DEVIATION)) {
      throw new ValidationError(`Invalid syncTimestamp: ${syncTimestamp}`);
    }

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const result = await prisma.$transaction(async (prisma) => {
          const dbUser = await prisma.user.findUnique({
            where: { telegramId: scope.telegramId! },
          });

          if (!dbUser) {
            throw new ValidationError('User not found');
          }

          // When client timestamp is stale (e.g. device clock behind server), still apply their
          // taps but use server time so we don't lose points and don't show an error.
          const serverNow = Date.now();
          const effectiveTimestamp =
            syncTimestamp <= dbUser.lastPointsUpdateTimestamp.getTime() && unsynchronizedPoints > 0
              ? serverNow
              : syncTimestamp;

          if (syncTimestamp <= dbUser.lastPointsUpdateTimestamp.getTime() && unsynchronizedPoints === 0) {
            return {
              success: true,
              message: 'Sync successful',
              updatedPoints: dbUser.points,
              updatedPointsBalance: dbUser.pointsBalance,
              updatedEnergy: dbUser.energy,
              updatedTotalTaps: dbUser.totalTaps ?? 0,
            };
          }

          const maxEnergy = calculateEnergyLimit(dbUser.energyLimitLevelIndex);

          // Calculate restored energy (use effective timestamp for consistency)
          console.log("Last energy timestamp: ", dbUser.lastEnergyUpdateTimestamp.getTime());
          console.log("Effective timestamp: ", effectiveTimestamp);

          const restoredEnergy = calculateRestoredEnergy(dbUser.multitapLevelIndex, dbUser.lastEnergyUpdateTimestamp.getTime(), effectiveTimestamp);
          console.log("Restored energy: ", restoredEnergy);
          const expectedEnergy = Math.min(dbUser.energy + restoredEnergy, maxEnergy);
          console.log("DB energy: ", dbUser.energy);
          console.log("Expected energy: ", expectedEnergy);

          const pointsPerClick = calculatePointsPerClick(dbUser.multitapLevelIndex);

          // Clamp client energy to [0, maxEnergy] so sync never fails due to clock/state drift; use clamped value for validation
          const clampedEnergy = Math.max(0, Math.min(currentEnergy, maxEnergy));
          if (clampedEnergy < currentEnergy) {
            console.warn(`Sync: clamping client energy ${currentEnergy} to max ${maxEnergy}`);
          }

          // Allow 50% tolerance for clock drift and client/server energy calculation differences
          const POINTS_TOLERANCE = 1.5;
          const maxPossibleClicks = Math.floor((expectedEnergy - clampedEnergy) / pointsPerClick);
          const maxPossiblePoints = maxPossibleClicks <= 0
            ? unsynchronizedPoints * POINTS_TOLERANCE
            : (maxPossibleClicks * pointsPerClick) * POINTS_TOLERANCE;

          // Validate the unsynchronized points (reject only clear cheats, not minor drift)
          if (unsynchronizedPoints > maxPossiblePoints) {
            console.warn(
              `Sync validation failed: telegramId=${scope.telegramId} unsynchronized=${unsynchronizedPoints} maxPossible=${maxPossiblePoints} expectedEnergy=${expectedEnergy} clampedEnergy=${clampedEnergy} pointsPerClick=${pointsPerClick}`
            );
            throw new ValidationError(
              `Invalid points calculation: unsynchronized=${unsynchronizedPoints}, max possible=${maxPossiblePoints}. Check device time or refresh the app.`
            );
          }

          const minedPoints = calculateMinedPoints(
            dbUser.mineLevelIndex,
            dbUser.lastPointsUpdateTimestamp.getTime(),
            effectiveTimestamp
          );

          const taps = Math.floor(unsynchronizedPoints / pointsPerClick);
          const totalPoints = unsynchronizedPoints + minedPoints;

          // Update user: points, balance, totalTaps (for progress), energy
          const updatedUser = await prisma.user.update({
            where: {
              telegramId: scope.telegramId!,
              lastPointsUpdateTimestamp: dbUser.lastPointsUpdateTimestamp, // Optimistic lock
            },
            data: {
              points: { increment: totalPoints },
              pointsBalance: { increment: totalPoints },
              whitePearls: { increment: totalPoints },
              totalTaps: { increment: taps },
              energy: clampedEnergy,
              lastPointsUpdateTimestamp: new Date(effectiveTimestamp),
              lastEnergyUpdateTimestamp: new Date(effectiveTimestamp),
            },
          });

          return {
            success: true,
            message: 'Sync successful',
            updatedPoints: updatedUser.points,
            updatedPointsBalance: updatedUser.pointsBalance,
            updatedEnergy: updatedUser.energy,
            updatedTotalTaps: updatedUser.totalTaps,
            userId: dbUser.id,
            taps,
            totalPoints,
          };
        });

        if (result.userId != null && result.taps != null && result.totalPoints != null) {
          await trackWeeklySync(prisma, result.userId, result.taps, result.totalPoints);
        }

        return NextResponse.json({
          success: result.success,
          message: result.message,
          updatedPoints: result.updatedPoints,
          updatedPointsBalance: result.updatedPointsBalance,
          updatedEnergy: result.updatedEnergy,
          updatedTotalTaps: result.updatedTotalTaps,
        });
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2034') {
          // Optimistic locking failed, retry
          retries++;
          if (retries >= MAX_RETRIES) {
            throw new Error('Max retries reached for optimistic locking');
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
  } catch (e) {
    return apiErrorResponse(e, { route: "sync", fallback: "Failed to process user data: " });
  }
}