// app/api/tasks/check/referral/route.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { trackWeeklyTaskComplete } from '@/utils/weekly-event-tracker';
import { addActivityPoints } from '@/utils/league-points';
import { LEAGUE_POINTS } from '@/utils/consts';
import { creditWhitePearlsInstant } from '@/utils/pearls';

import { apiErrorResponse } from "@/lib/api-error";
interface CheckReferralTaskRequestBody {
    initData: string;
    taskId: string;
}

class BadRequestError extends Error {
    statusCode = 400;
    constructor(message: string) {
        super(message);
        this.name = 'BadRequestError';
    }
}

export async function POST(req: Request) {
    const requestBody: CheckReferralTaskRequestBody = await req.json();
    const { initData: telegramInitData, taskId } = requestBody;

    if (!telegramInitData || !taskId) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
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
        const result = await prisma.$transaction(async (prisma) => {
            // Find the user
            const dbUser = await prisma.user.findUnique({
                where: { telegramId },
                include: { referrals: true }
            });

            if (!dbUser) {
                throw new Error('User not found');
            }

            // Find the task
            const task = await prisma.task.findUnique({
                where: { id: taskId },
            });

            if (!task) {
                throw new Error('Task not found');
            }

            // Check if the task is active
            if (!task.isActive) {
                throw new Error('This task is no longer active');
            }

            // Check if the task is of type REFERRAL
            if (task.type !== 'REFERRAL') {
                throw new BadRequestError('Invalid task type for this operation');
            }

            // Find the user's task
            const userTask = await prisma.userTask.findUnique({
                where: {
                    userId_taskId: {
                        userId: dbUser.id,
                        taskId: task.id,
                    },
                },
            });

            if (userTask?.isCompleted) {
                throw new BadRequestError('Task already completed');
            }

            if (!task.taskData || typeof task.taskData !== 'object') {
                throw new BadRequestError(
                    'This referral task is misconfigured (missing task data). Ask admin to re-save the task with a "Number of friends" set.'
                );
            }

            const raw = (task.taskData as Record<string, unknown>).friendsNumber;
            const requiredReferrals = Math.max(0, typeof raw === 'number' && Number.isFinite(raw) ? raw : Number(raw) || 0);
            if (requiredReferrals === 0) {
                throw new BadRequestError(
                    'This referral task is misconfigured (required count is 0). Ask admin to set "Number of friends" and save the task.'
                );
            }

            const currentReferrals = dbUser.referrals.length;

            console.log('[referral-task]', { taskId: task.id, userId: dbUser.id, telegramId: dbUser.telegramId, requiredReferrals, currentReferrals });

            if (currentReferrals < requiredReferrals) {
                return {
                    success: false,
                    message: `You need ${requiredReferrals - currentReferrals} more referrals to complete this task.`,
                    currentReferrals,
                    requiredReferrals,
                };
            }

            // Update or create the UserTask as completed
            const updatedUserTask = await prisma.userTask.upsert({
                where: {
                    userId_taskId: {
                        userId: dbUser.id,
                        taskId: task.id,
                    },
                },
                update: {
                    isCompleted: true,
                },
                create: {
                    userId: dbUser.id,
                    taskId: task.id,
                    isCompleted: true,
                },
            });

            // Add points to user's balance and return updated totals so client can sync balance
            const updatedUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                    points: { increment: task.points },
                    pointsBalance: { increment: task.points },
                },
                select: { points: true, pointsBalance: true },
            });

            await creditWhitePearlsInstant(prisma, dbUser.id, task.points, `task_referral:${task.id}`, task.title);

            return {
                success: true,
                message: 'Task completed successfully',
                isCompleted: updatedUserTask.isCompleted,
                currentReferrals,
                requiredReferrals,
                userId: dbUser.id,
                reward: task.points,
                points: updatedUser.points,
                pointsBalance: updatedUser.pointsBalance,
            };
        });

        type ResultWithPoints = { success: boolean; message: string; isCompleted?: boolean; currentReferrals?: number; requiredReferrals?: number; userId?: string; reward?: number; points?: number; pointsBalance?: number };
        const r = result as ResultWithPoints;
        if (r.success && r.userId && (r.reward != null || r.points != null)) {
            await trackWeeklyTaskComplete(prisma, r.userId, r.reward ?? r.points ?? 0);
            await addActivityPoints(prisma, r.userId, LEAGUE_POINTS.taskComplete);
        }

        return NextResponse.json({
            success: result.success,
            message: result.message,
            isCompleted: result.isCompleted,
            currentReferrals: result.currentReferrals,
            requiredReferrals: result.requiredReferrals,
            reward: r.reward,
            points: r.points,
            pointsBalance: r.pointsBalance,
        });

    } catch (e) {
    return apiErrorResponse(e, { route: "tasks/check/referral", fallback: "Request failed" });
  }
}