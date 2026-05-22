/**
 * GET: List active Quiz questions (ordered). Optional initData: if provided, returns hasCompleted and lastAttempt for the user.
 * Completion is daily (UTC): users can take the quiz again each new day after admin sets new questions.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { MITROLABS_QUIZ_REWARD_POINTS } from '@/utils/consts';
import { maybeApplyAutomatedQuizRotation } from '@/utils/quiz-auto-rotation';

export const dynamic = 'force-dynamic';

/** Normalize display reward to current per-question default (1,000 PEARLS). */
function effectivePointsPerQuestion(storedPoints: number | null | undefined): number {
  const p = Math.floor(Number(storedPoints ?? 0));
  if (!Number.isFinite(p) || p <= 0) return MITROLABS_QUIZ_REWARD_POINTS;
  return Math.min(p, MITROLABS_QUIZ_REWARD_POINTS);
}

function getStartOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(req: NextRequest) {
  try {
    await maybeApplyAutomatedQuizRotation();

    const questions = await prisma.quizQuestion.findMany({
      where: { isActive: true },
      orderBy: [{ branch: { order: 'asc' } }, { order: 'asc' }],
      select: {
        id: true,
        questionText: true,
        options: true,
        order: true,
        points: true,
        branchId: true,
        branch: { select: { id: true, name: true, order: true } },
      },
    });

    const settings = await prisma.quizSettings.findFirst();
    const completionBonusPoints = settings?.completionBonusPoints ?? 0;

    const initData = req.nextUrl.searchParams.get('initData');
    let hasCompleted = false;
    let lastAttempt: { correctCount: number; totalCount: number; pointsAwarded: number } | null = null;

    if (initData) {
      const { validatedData, user: telegramUser } = validateTelegramWebAppData(initData);
      if (validatedData && telegramUser?.id) {
        const telegramId = telegramUser.id.toString();
        const user = await prisma.user.findUnique({
          where: { telegramId },
          select: { id: true },
        });
        if (user) {
          const now = new Date();
          const startOfTodayUTC = getStartOfDayUTC(now);
          const startOfTomorrowUTC = new Date(startOfTodayUTC);
          startOfTomorrowUTC.setUTCDate(startOfTomorrowUTC.getUTCDate() + 1);
          const attempt = await prisma.userQuizAttempt.findFirst({
            where: {
              userId: user.id,
              completedAt: { gte: startOfTodayUTC, lt: startOfTomorrowUTC },
            },
          });
          if (attempt) {
            hasCompleted = true;
            lastAttempt = { correctCount: attempt.correctCount, totalCount: attempt.totalCount, pointsAwarded: attempt.pointsAwarded };
          }
        }
      }
    }

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: Array.isArray(q.options) ? q.options : [],
        order: q.order,
        points: effectivePointsPerQuestion(q.points),
        branchId: q.branchId,
        branchName: q.branch?.name ?? null,
      })),
      completionBonusPoints,
      hasCompleted,
      lastAttempt,
    });
  } catch (error) {
    console.error('Quiz GET error:', error);
    return NextResponse.json({ error: 'Failed to load quiz' }, { status: 500 });
  }
}
