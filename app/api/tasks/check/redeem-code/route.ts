/**
 * Check/redeem a code for REDEEM_CODE tasks (e.g. Zoom event reward).
 * POST: { initData, taskId, code }. Validates code against task.taskData.validCodes, marks task complete and credits points.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { trackWeeklyTaskComplete } from '@/utils/weekly-event-tracker';
import { addActivityPoints } from '@/utils/league-points';
import { LEAGUE_POINTS } from '@/utils/consts';
import { creditWhitePearlsInstant } from '@/utils/pearls';

interface RedeemCodeRequestBody {
  initData: string;
  taskId: string;
  code: string;
}

export async function POST(req: Request) {
  const body: RedeemCodeRequestBody = await req.json().catch(() => ({}));
  const { initData: telegramInitData, taskId, code: rawCode } = body;

  if (!telegramInitData || !taskId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const code = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!code) {
    return NextResponse.json({ error: 'Please enter a code.' }, { status: 400 });
  }

  const { validatedData, user } = validateTelegramWebAppData(telegramInitData);
  if (!validatedData) {
    return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
  }

  const telegramId = user.id?.toString();
  if (!telegramId) {
    return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({ where: { telegramId } });
      if (!dbUser) throw new Error('User not found');

      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) throw new Error('Task not found');
      if (!task.isActive) throw new Error('This task is no longer active');
      if (task.type !== 'REDEEM_CODE') {
        throw new Error('Invalid task type for redeem code');
      }

      const taskData = task.taskData as { validCodes?: string[] } | null;
      const validCodes = Array.isArray(taskData?.validCodes) ? taskData.validCodes : [];
      const normalizedValid = validCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
      const codeUpper = code.toUpperCase();
      if (!normalizedValid.length || !normalizedValid.includes(codeUpper)) {
        return { success: false, error: 'Invalid code. Please check and try again.' };
      }

      const userTask = await tx.userTask.findUnique({
        where: {
          userId_taskId: { userId: dbUser.id, taskId: task.id },
        },
      });

      if (userTask?.isCompleted) {
        return { success: false, error: 'You have already redeemed a code for this task.' };
      }

      if (userTask) {
        await tx.userTask.update({
          where: { id: userTask.id },
          data: { isCompleted: true },
        });
      } else {
        await tx.userTask.create({
          data: {
            userId: dbUser.id,
            taskId: task.id,
            isCompleted: true,
          },
        });
      }

      const updatedUser = await tx.user.update({
        where: { id: dbUser.id },
        data: {
          points: { increment: task.points },
          pointsBalance: { increment: task.points },
        },
        select: { points: true, pointsBalance: true },
      });

      await creditWhitePearlsInstant(tx, dbUser.id, task.points, `task_redeem:${task.id}`, task.title);

      return {
        success: true,
        message: 'Code redeemed successfully!',
        isCompleted: true,
        userId: dbUser.id,
        reward: task.points,
        points: updatedUser.points,
        pointsBalance: updatedUser.pointsBalance,
      };
    });

    const r = result as { success: boolean; error?: string; userId?: string; reward?: number; points?: number; pointsBalance?: number; message?: string; isCompleted?: boolean };
    if (r.success && r.userId != null && (r.reward != null || r.points != null)) {
      await trackWeeklyTaskComplete(prisma, r.userId, r.reward ?? r.points ?? 0);
      await addActivityPoints(prisma, r.userId, LEAGUE_POINTS.attendEvent);
    }
    if (r.success === false && r.error) {
      return NextResponse.json({ success: false, error: r.error }, { status: 400 });
    }
    return NextResponse.json({
      success: r.success,
      message: r.message,
      isCompleted: r.isCompleted,
      reward: r.reward,
      points: r.points,
      pointsBalance: r.pointsBalance,
    });
  } catch (e) {
    console.error('[tasks/check/redeem-code]', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to redeem code' },
      { status: 500 }
    );
  }
}
