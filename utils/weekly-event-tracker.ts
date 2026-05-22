// utils/weekly-event-tracker.ts - Track taps, tasks, points for weekly event

import type { PrismaClient } from '@prisma/client';
import { getWeekKey } from './week-utils';

export async function trackWeeklySync(
  prisma: PrismaClient,
  userId: string,
  taps: number,
  pointsEarned: number
) {
  const weekKey = getWeekKey();
  await prisma.userWeeklyProgress.upsert({
    where: { userId_weekKey: { userId, weekKey } },
    create: { userId, weekKey, taps, pointsEarned },
    update: { taps: { increment: taps }, pointsEarned: { increment: pointsEarned }, lastUpdatedAt: new Date() },
  });
}

export async function trackWeeklyTaskComplete(
  prisma: PrismaClient,
  userId: string,
  pointsEarned: number
) {
  const weekKey = getWeekKey();
  await prisma.userWeeklyProgress.upsert({
    where: { userId_weekKey: { userId, weekKey } },
    create: { userId, weekKey, tasksCompleted: 1, pointsEarned },
    update: {
      tasksCompleted: { increment: 1 },
      pointsEarned: { increment: pointsEarned },
      lastUpdatedAt: new Date(),
    },
  });
}
