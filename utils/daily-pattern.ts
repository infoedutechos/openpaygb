/**
 * Daily pattern lock: 12-dot grid (4x3), indices 0–11.
 * Pattern length 4–12 dots. Reward configurable per day.
 */

import prisma from '@/utils/prisma';

import { PATTERN_GRID_SIZE, PATTERN_MIN_DOTS, PATTERN_MAX_DOTS, PATTERN_DOTS_REWARD } from '@/utils/consts';

function getStartOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Pool: 12 patterns, each 7 dots (indices 0–11). */
const PATTERN_POOL = [
  '0,1,2,4,5,6,9',
  '0,2,3,4,5,8,11',
  '1,2,3,4,6,7,10',
  '0,1,3,4,6,8,9',
  '0,1,2,3,5,7,11',
  '1,2,4,5,6,8,10',
  '0,2,3,4,6,9,11',
  '0,1,2,4,5,8,10',
  '0,1,3,5,6,9,11',
  '1,2,3,4,7,8,10',
  '0,2,4,5,6,8,11',
  '0,1,2,3,4,6,9',
];

/** Normalize pattern (order preserved, dedupe, valid indices 0–11 only). */
export function normalizePattern(indices: number[]): string {
  const seen = new Set<number>();
  const out: number[] = [];
  const max = PATTERN_GRID_SIZE - 1;
  for (const i of indices) {
    const n = Number(i);
    if (n >= 0 && n <= max && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out.join('-');
}

/** Compare user pattern with stored. Order matters. Length must be 4–12 and match. */
export function patternsMatch(userIndices: number[], storedPattern: string): boolean {
  const a = userIndices.map(Number).filter((n) => n >= 0 && n < PATTERN_GRID_SIZE);
  const b = storedPattern.split('-').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n));
  if (a.length !== b.length || a.length < PATTERN_MIN_DOTS || a.length > PATTERN_MAX_DOTS) return false;
  return a.every((v, i) => v === b[i]);
}

/** Get today's pattern string (from DB or pool). */
export async function getTodayPattern(): Promise<string> {
  const now = new Date();
  const today = getStartOfDayUTC(now);
  const existing = await prisma.dailyPattern.findUnique({
    where: { date: today },
  });
  if (existing) return existing.pattern;
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(Date.UTC(today.getUTCFullYear(), 0, 0)).getTime()) / (24 * 60 * 60 * 1000)
  );
  const index = dayOfYear % PATTERN_POOL.length;
  const pattern = PATTERN_POOL[index].replace(/,/g, '-');
  await prisma.dailyPattern.create({
    data: { date: today, pattern, isOverride: false },
  });
  return pattern;
}

/** Get today's reward (PEARLS) for the pattern game. Null in DB = default 1M. */
export async function getTodayPatternReward(): Promise<number> {
  const now = new Date();
  const today = getStartOfDayUTC(now);
  const row = await prisma.dailyPattern.findUnique({
    where: { date: today },
    select: { reward: true },
  });
  if (row?.reward != null && row.reward >= 0) return row.reward;
  return PATTERN_DOTS_REWARD;
}

/** For admin: set pattern and optional reward for today. Pattern length 4–12 dots. */
export async function setTodayPatternOverride(pattern: string, reward?: number | null): Promise<void> {
  const now = new Date();
  const today = getStartOfDayUTC(now);
  const normalized = normalizePattern(pattern.split(/[,\-]/).map((s) => parseInt(s.trim(), 10)));
  const len = normalized.split('-').length;
  if (len < PATTERN_MIN_DOTS || len > PATTERN_MAX_DOTS) {
    throw new Error(`Pattern must have ${PATTERN_MIN_DOTS}–${PATTERN_MAX_DOTS} dots`);
  }
  const rewardValue = reward != null && reward >= 0 ? reward : null;
  await prisma.dailyPattern.upsert({
    where: { date: today },
    create: { date: today, pattern: normalized, reward: rewardValue, isOverride: true },
    update: { pattern: normalized, reward: rewardValue, isOverride: true },
  });
}

/** Whether the Daily Pattern game is enabled (visible to users). Default true. */
export async function getDailyPatternEnabled(): Promise<boolean> {
  const row = await prisma.dailyPatternSettings.findFirst();
  return row?.enabled ?? true;
}

/** Set whether the Daily Pattern game is enabled. */
export async function setDailyPatternEnabled(enabled: boolean): Promise<void> {
  const existing = await prisma.dailyPatternSettings.findFirst();
  if (existing) {
    await prisma.dailyPatternSettings.update({
      where: { id: existing.id },
      data: { enabled },
    });
  } else {
    await prisma.dailyPatternSettings.create({
      data: { enabled },
    });
  }
}
