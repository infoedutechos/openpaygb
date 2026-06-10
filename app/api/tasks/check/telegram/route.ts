// app/api/tasks/check/telegram/route.ts

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
interface CheckTelegramTaskRequestBody {
    initData: string;
    taskId: string;
}

export async function POST(req: Request) {
    const botToken = process.env.BOT_TOKEN;

    if (!botToken) {
        return NextResponse.json({ error: 'Telegram bot token is missing' }, { status: 500 });
    }

    const requestBody: CheckTelegramTaskRequestBody = await req.json();
    const { initData: telegramInitData, taskId } = requestBody;

    if (!telegramInitData || !taskId) {
        return NextResponse.json({ error: 'Invalid request: missing initData or taskId' }, { status: 400 });
    }

    const { validatedData, user } = validateTelegramWebAppData(telegramInitData);

    if (!validatedData) {
        return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 403 });
    }

    const telegramId = user.id?.toString();

    if (!telegramId) {
        return NextResponse.json({ error: 'Invalid user data: missing telegramId' }, { status: 400 });
    }

    try {
        const result = await prisma.$transaction(async (prisma) => {
            // Find the user
            const dbUser = await prisma.user.findUnique({
                where: { telegramId },
            });

            if (!dbUser) {
                throw new Error('User not found in database');
            }

            // Find the task
            const task = await prisma.task.findUnique({
                where: { id: taskId },
            });

            if (!task) {
                throw new Error('Task not found in database');
            }

            // Check if the task is active
            if (!task.isActive) {
                throw new Error('This task is no longer active');
            }

            // Check if the task is of type TELEGRAM
            if (task.type !== 'TELEGRAM' || !task.taskData) {
                throw new Error('Invalid task type or missing task data for this operation');
            }

            const channelUsername = (task.taskData as { chatId?: string }).chatId;
            if (!channelUsername) {
                throw new Error('Missing Telegram channel/group username in task data');
            }

            // Check if the user is a member of the channel/group
            let isMember = false;
            try {
                let formattedChatId = channelUsername;
                if (!channelUsername.startsWith('@') && !channelUsername.startsWith('-100')) {
                    formattedChatId = '@' + channelUsername;
                }

                const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(formattedChatId)}&user_id=${telegramId}`;
                console.log('Checking membership with URL:', url);

                const response = await fetch(url);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Telegram API error:', response.status, errorText);
                    throw new Error(`Telegram API error: ${response.status} ${errorText}`);
                }

                const data = await response.json();
                console.log('Telegram API response:', data);

                if (data.ok) {
                    const status = data.result.status;
                    isMember = ['creator', 'administrator', 'member'].includes(status);
                } else {
                    throw new Error(`Telegram API returned false: ${JSON.stringify(data)}`);
                }
            } catch (error) {
                console.error('Error checking channel membership:', error);
                if (error instanceof Error) {
                    throw new Error(`Failed to check channel membership: ${error.message}`);
                } else {
                    throw new Error('Failed to check channel membership: Unknown error');
                }
            }

            if (!isMember) {
                return {
                    success: false,
                    message: 'You are not a member of the required Telegram channel/group.',
                };
            }

            // Check if the task is already completed
            const existingUserTask = await prisma.userTask.findUnique({
                where: {
                    userId_taskId: {
                        userId: dbUser.id,
                        taskId: task.id,
                    },
                },
            });

            if (existingUserTask?.isCompleted) {
                return {
                    success: false,
                    message: 'This task has already been completed.',
                    isCompleted: true,
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

            await creditWhitePearlsInstant(prisma, dbUser.id, task.points, `task_telegram:${task.id}`, task.title);

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

        type ResultWithPoints = { success: boolean; message: string; isCompleted?: boolean; userId?: string; reward?: number; points?: number; pointsBalance?: number };
        const r = result as ResultWithPoints;
        if (r.success && r.userId && (r.reward != null || r.points != null)) {
            await trackWeeklyTaskComplete(prisma, r.userId, r.reward ?? r.points ?? 0);
            await addActivityPoints(prisma, r.userId, LEAGUE_POINTS.taskComplete);
        }

        return NextResponse.json({
            success: result.success,
            message: result.message,
            isCompleted: result.isCompleted,
            reward: r.reward,
            points: r.points,
            pointsBalance: r.pointsBalance,
        });

    } catch (e) {
    return apiErrorResponse(e, { route: "tasks/check/telegram", fallback: "Request failed" });
  }
}