// app/api/tasks/check/visit/route.ts

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
import { TASK_WAIT_TIME, LEAGUE_POINTS } from '@/utils/consts';
import { creditWhitePearlsInstant } from '@/utils/pearls';

interface CheckVisitTaskRequestBody {
    initData: string;
    taskId: string;
    /** User's answer (required when task has correctAnswer). Wrong answer = no reward. */
    answer?: string;
}

export async function POST(req: Request) {
    const requestBody: CheckVisitTaskRequestBody = await req.json();
    const { initData: telegramInitData, taskId, answer: userAnswer } = requestBody;

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

            // Check if the task is of type VISIT and has taskData
            if (task.type !== 'VISIT' || !task.taskData) {
                throw new Error('Invalid task type or missing task data for this operation');
            }

            
            if (typeof TASK_WAIT_TIME !== 'number') {
                throw new Error('Invalid timeToWait in task data');
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

            if (!userTask) {
                throw new Error('Task not started');
            }

            if (userTask.isCompleted) {
                throw new Error('Task already completed');
            }

            // Check if enough time has passed
            const waitEndTime = new Date(userTask.taskStartTimestamp.getTime() + TASK_WAIT_TIME);
            if (new Date() < waitEndTime) {
                const remainingTime = Math.ceil((waitEndTime.getTime() - Date.now()) / 1000); // in seconds
                return {
                    success: false,
                    message: `Not enough time has passed. Please wait ${remainingTime} more seconds.`,
                    remainingTime,
                };
            }

            // If task has a correct answer (e.g. Special / video tasks), validate user answer
            const taskData = task.taskData as { link?: string; correctAnswer?: string } | null;
            const correctAnswer = taskData?.correctAnswer?.trim();
            if (correctAnswer) {
                const submitted = (userAnswer ?? '').trim();
                if (!submitted) {
                    return { success: false, error: 'Please enter your answer.' };
                }
                if (submitted.toLowerCase() !== correctAnswer.toLowerCase()) {
                    return { success: false, error: 'Wrong answer. No reward granted.' };
                }
            }

            // Update the task as completed
            const updatedUserTask = await prisma.userTask.update({
                where: {
                    id: userTask.id,
                },
                data: {
                    isCompleted: true,
                },
            });

            // Add points to user's balance and get updated user so client can sync balance
            const updatedUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                    points: { increment: task.points },
                    pointsBalance: { increment: task.points },
                },
                select: { points: true, pointsBalance: true },
            });

            await creditWhitePearlsInstant(prisma, dbUser.id, task.points, `task_visit:${task.id}`, task.title);

            return {
                success: true,
                message: 'Task completed successfully',
                isCompleted: updatedUserTask.isCompleted,
                userId: dbUser.id,
                reward: task.points,
                points: updatedUser.points,
                pointsBalance: updatedUser.pointsBalance,
            };
        });

        type ResultWithPoints = { success: boolean; message: string; isCompleted?: boolean; userId?: string; reward?: number; points?: number; pointsBalance?: number; error?: string };
        const r = result as ResultWithPoints;
        if (r.success && r.userId && (r.reward != null || r.points != null)) {
            await trackWeeklyTaskComplete(prisma, r.userId, r.reward ?? r.points ?? 0);
            await addActivityPoints(prisma, r.userId, LEAGUE_POINTS.taskComplete);
        }

        if (result.success === false && 'error' in result && result.error) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: result.success,
            message: result.message,
            isCompleted: result.isCompleted,
            reward: r.reward,
            points: r.points,
            pointsBalance: r.pointsBalance,
        });

    } catch (error) {
        console.error('Error checking visit task:', error);
        return NextResponse.json({ 
            success: false,
            error: error instanceof Error ? error.message : 'Failed to check visit task' 
        }, { status: 500 });
    }
}