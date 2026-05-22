// app/api/mini-games/route.ts

/**
 * Mini games - Tap Challenge, Lucky Spin
 * GET: status (games with claimedToday)
 * POST: claim (miniGameId, tapCount for tap_challenge)
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { MINI_GAMES, TAP_CHALLENGE_MAX_ATTEMPTS, LEAGUE_POINTS } from '@/utils/consts';

const SAVANNA_MAX_SESSIONS = (MINI_GAMES.savanna_hunt as { maxSessionsPerDay?: number }).maxSessionsPerDay ?? 5;
import { addActivityPoints } from '@/utils/league-points';
import { getTodayPattern, patternsMatch, getDailyPatternEnabled, getTodayPatternReward } from '@/utils/daily-pattern';
import { getComboMultiplier, type InnovationTier } from '@/utils/drums-baobab-cards';
import { creditWhitePearlsInstant } from '@/utils/pearls';

function getStartOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
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
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const today = getStartOfDayUTC(new Date());
  const attempts = await prisma.userMiniGameAttempt.findMany({
    where: { userId: dbUser.id, date: today },
  });

  const claimedSet = new Set(attempts.filter((a) => a.claimedAt != null).map((a) => a.miniGameId));
  const tapAttempt = attempts.find((a) => a.miniGameId === 'tap_challenge');
  const tapAttemptsUsed = tapAttempt?.attemptsUsed ?? 0;
  const tapAttemptsLeft = Math.max(0, TAP_CHALLENGE_MAX_ATTEMPTS - tapAttemptsUsed);
  const savannaAttempt = attempts.find((a) => a.miniGameId === 'savanna_hunt');
  const savannaSessionsUsed = savannaAttempt?.attemptsUsed ?? 0;
  const savannaSessionsLeft = Math.max(0, SAVANNA_MAX_SESSIONS - savannaSessionsUsed);
  const [patternDotsEnabled, patternDotsReward] = await Promise.all([
    getDailyPatternEnabled(),
    getTodayPatternReward(),
  ]);

  const games = Object.entries(MINI_GAMES)
    .filter(([id]) => id !== 'pattern_dots' || patternDotsEnabled)
    .map(([id, config]) => {
    const base = { id, ...config, claimedToday: claimedSet.has(id) };
    if (id === 'tap_challenge') {
      return { ...base, attemptsLeft: tapAttemptsLeft, attemptsUsed: tapAttemptsUsed };
    }
    if (id === 'lucky_spin') {
      const spinConfig = config as { segmentRewards?: readonly number[] };
      const rewards = spinConfig.segmentRewards ?? [];
      const reward = rewards.length > 0 ? Math.max(...rewards) : 500_000;
      return { ...base, reward };
    }
    if (id === 'savanna_hunt') {
      const savannaConfig = config as { maxReward?: number };
      return { ...base, sessionsLeft: savannaSessionsLeft, sessionsUsed: savannaSessionsUsed, reward: savannaConfig.maxReward ?? 40000 };
    }
    if (id === 'pattern_dots') {
      return { ...base, reward: patternDotsReward };
    }
    return base;
  });

  return NextResponse.json({ games });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { initData, miniGameId, tapCount, accuracyPercent, segmentIndex: spinSegmentIndex, maxCombo, innovationTier, pattern: submittedPattern } = body;

  if (!initData || !miniGameId) {
    return NextResponse.json({ error: 'Missing initData or miniGameId' }, { status: 400 });
  }

  const config = MINI_GAMES[miniGameId as keyof typeof MINI_GAMES];
  if (!config) {
    return NextResponse.json({ error: 'Unknown mini game' }, { status: 400 });
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
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const today = getStartOfDayUTC(new Date());

  const attempt = await prisma.userMiniGameAttempt.upsert({
    where: {
      userId_miniGameId_date: {
        userId: dbUser.id,
        miniGameId,
        date: today,
      },
    },
    create: { userId: dbUser.id, miniGameId, date: today },
    update: {},
  });

  if (attempt.claimedAt) {
    return NextResponse.json({ error: 'Already claimed today', claimed: true }, { status: 400 });
  }

  // Umeme Run: 3 trials per day; each submit (success or fail) consumes one
  if (miniGameId === 'tap_challenge') {
    const used = attempt.attemptsUsed ?? 0;
    if (used >= TAP_CHALLENGE_MAX_ATTEMPTS) {
      return NextResponse.json({
        success: false,
        error: 'No attempts left today',
        attemptsLeft: 0,
      }, { status: 200 });
    }
  }

  // Savanna Hunt: max 5 sessions per day; each claim consumes one session
  if (miniGameId === 'savanna_hunt') {
    const used = attempt.attemptsUsed ?? 0;
    if (used >= SAVANNA_MAX_SESSIONS) {
      return NextResponse.json({
        success: false,
        error: 'No sessions left today',
        sessionsLeft: 0,
      }, { status: 200 });
    }
  }

  let reward: number;
  let segmentIndex: number | undefined;
  let valid = false;

  if (miniGameId === 'tap_challenge') {
    const tapConfig = config as { targetTaps?: number; reward?: number };
    const targetTaps = tapConfig.targetTaps ?? 18;
    const taps = Number(tapCount) ?? 0;
    valid = taps >= targetTaps;
    reward = valid ? (tapConfig.reward ?? 25000) : 0;
  } else if (miniGameId === 'lucky_spin') {
    valid = true;
    const spinConfig = config as { segmentRewards?: readonly number[] };
    const rewards = spinConfig.segmentRewards ?? [5_000, 10_000, 15_000, 25_000, 50_000, 75_000, 100_000, 200_000, 350_000, 500_000];
    segmentIndex = typeof spinSegmentIndex === 'number' ? spinSegmentIndex : Math.floor(Math.random() * rewards.length);
    reward = rewards[segmentIndex] ?? rewards[0];
  } else if (miniGameId === 'savanna_hunt') {
    const savannaConfig = config as { baseRewardPerPoint?: number; maxReward?: number; minScoreToClaim?: number };
    const basePerPoint = savannaConfig.baseRewardPerPoint ?? 80;
    const maxReward = savannaConfig.maxReward ?? 40000;
    const minScore = savannaConfig.minScoreToClaim ?? 5;
    const score = Math.max(0, Math.floor(Number(body.finalScore) ?? 0));
    valid = score >= minScore;
    reward = valid ? Math.min(maxReward, Math.round(score * basePerPoint)) : 0;
  } else if (miniGameId === 'drums_baobab') {
    const drumConfig = config as { reward?: number; minAccuracyPercent?: number };
    const baseReward = drumConfig.reward ?? 30000;
    const minAcc = drumConfig.minAccuracyPercent ?? 50;
    const acc = Math.min(100, Math.max(0, Number(accuracyPercent) ?? 0));
    valid = acc >= minAcc;
    const baseFromAccuracy = (baseReward * acc) / 100;
    const comboMult = getComboMultiplier(Math.min(12, Math.max(0, Number(maxCombo) ?? 0)), (innovationTier as InnovationTier) ?? 'none');
    reward = valid ? Math.round(baseFromAccuracy * comboMult) : 0;
  } else if (miniGameId === 'pattern_dots') {
    const todayPattern = await getTodayPattern();
    const arr = Array.isArray(submittedPattern) ? submittedPattern.map(Number) : [];
    valid = patternsMatch(arr, todayPattern);
    reward = valid ? await getTodayPatternReward() : 0;
  } else {
    return NextResponse.json({ error: 'Unknown mini game' }, { status: 400 });
  }

  if (miniGameId === 'savanna_hunt') {
    const sessionsUsedAfter = (attempt.attemptsUsed ?? 0) + 1;
    const minScore = (config as { minScoreToClaim?: number }).minScoreToClaim ?? 5;
    if (!valid || reward <= 0) {
      await prisma.userMiniGameAttempt.update({
        where: { id: attempt.id },
        data: { attemptsUsed: sessionsUsedAfter },
      });
      return NextResponse.json({
        success: false,
        message: `Score too low. Need at least ${minScore} points to claim. Session used.`,
        sessionsLeft: Math.max(0, SAVANNA_MAX_SESSIONS - sessionsUsedAfter),
      }, { status: 200 });
    }
    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: dbUser.id },
        data: { points: { increment: reward }, pointsBalance: { increment: reward } },
      });
      await creditWhitePearlsInstant(tx, dbUser.id, reward, 'mini_game_savanna_hunt', 'Savanna Hunt');
      await tx.userMiniGameAttempt.update({
        where: { id: attempt.id },
        data: { attemptsUsed: sessionsUsedAfter, claimedAt: new Date() },
      });
      return u;
    });
    await addActivityPoints(prisma, dbUser.id, LEAGUE_POINTS.miniGameWin);
    return NextResponse.json({
      success: true,
      claimed: true,
      reward,
      finalScore: Math.max(0, Math.floor(Number(body.finalScore) ?? 0)),
      points: updatedUser.points,
      pointsBalance: updatedUser.pointsBalance,
      sessionsLeft: Math.max(0, SAVANNA_MAX_SESSIONS - sessionsUsedAfter),
      message: `+${reward.toLocaleString()} PEARLS!`,
    });
  }

  if (miniGameId === 'tap_challenge') {
    // Consume one attempt (success or fail)
    const afterUsed = (attempt.attemptsUsed ?? 0) + 1;
    const attemptsLeft = Math.max(0, TAP_CHALLENGE_MAX_ATTEMPTS - afterUsed);

    if (!valid || reward <= 0) {
      await prisma.userMiniGameAttempt.update({
        where: { id: attempt.id },
        data: { attemptsUsed: afterUsed },
      });
      return NextResponse.json({
        success: false,
        message: 'Need more taps! Try again.',
        attemptsLeft,
      }, { status: 200 });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: dbUser.id },
        data: {
          points: { increment: reward },
          pointsBalance: { increment: reward },
        },
      });
      await creditWhitePearlsInstant(tx, dbUser.id, reward, 'mini_game_tap_challenge', 'Umeme Run');
      await tx.userMiniGameAttempt.update({
        where: { id: attempt.id },
        data: { claimedAt: new Date(), attemptsUsed: afterUsed },
      });
      return u;
    });
    await addActivityPoints(prisma, dbUser.id, LEAGUE_POINTS.miniGameWin);

    return NextResponse.json({
      success: true,
      claimed: true,
      reward,
      points: updatedUser.points,
      pointsBalance: updatedUser.pointsBalance,
      message: `+${reward.toLocaleString()} PEARLS!`,
    });
  }

  if (miniGameId === 'drums_baobab') {
    if (!valid || reward <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Need at least 50% accuracy to claim.',
      }, { status: 200 });
    }
    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: dbUser.id },
        data: { points: { increment: reward }, pointsBalance: { increment: reward } },
      });
      await creditWhitePearlsInstant(tx, dbUser.id, reward, 'mini_game_drums_baobab', 'Drums & Baobab');
      await tx.userMiniGameAttempt.update({
        where: { id: attempt.id },
        data: { claimedAt: new Date() },
      });
      return u;
    });
    await addActivityPoints(prisma, dbUser.id, LEAGUE_POINTS.miniGameWin);
    return NextResponse.json({
      success: true,
      claimed: true,
      reward,
      points: updatedUser.points,
      pointsBalance: updatedUser.pointsBalance,
      message: `+${reward.toLocaleString()} PEARLS!`,
    });
  }

  if (miniGameId === 'pattern_dots') {
    if (!valid || reward <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Wrong pattern. Try again tomorrow for a new pattern.',
      }, { status: 200 });
    }
    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: dbUser.id },
        data: { points: { increment: reward }, pointsBalance: { increment: reward } },
      });
      await creditWhitePearlsInstant(tx, dbUser.id, reward, 'mini_game_pattern_dots', 'Pattern dots');
      await tx.userMiniGameAttempt.update({
        where: { id: attempt.id },
        data: { claimedAt: new Date() },
      });
      return u;
    });
    await addActivityPoints(prisma, dbUser.id, LEAGUE_POINTS.miniGameWin);
    return NextResponse.json({
      success: true,
      claimed: true,
      reward,
      points: updatedUser.points,
      pointsBalance: updatedUser.pointsBalance,
      message: `+${reward.toLocaleString()} PEARLS!`,
    });
  }

  if (!valid || reward <= 0) {
    return NextResponse.json({
      success: false,
      message: 'Spin failed',
    }, { status: 200 });
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: dbUser.id },
      data: {
        points: { increment: reward },
        pointsBalance: { increment: reward },
      },
    });
    await creditWhitePearlsInstant(tx, dbUser.id, reward, 'mini_game_lucky_spin', 'Lucky Spin');
    await tx.userMiniGameAttempt.update({
      where: { id: attempt.id },
      data: { claimedAt: new Date() },
    });
    return u;
  });
  await addActivityPoints(prisma, dbUser.id, LEAGUE_POINTS.miniGameWin);

  return NextResponse.json({
    success: true,
    claimed: true,
    reward,
    segmentIndex: segmentIndex,
    points: updatedUser.points,
    pointsBalance: updatedUser.pointsBalance,
    message: `+${reward.toLocaleString()} PEARLS!`,
  });
}
